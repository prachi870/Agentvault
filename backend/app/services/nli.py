"""Natural Language Inference (NLI) service for claim-level verification (Phase 4).

Replaces the lexical word-overlap verifier with a real NLI model that can detect:
- ENTAILMENT:     the evidence supports the claim
- CONTRADICTION:  the evidence contradicts the claim
- NEUTRAL:        the evidence is unrelated to the claim

Uses a cross-encoder model (e.g. cross-encoder/nli-deberta-v3-base) via sentence-transformers.
Falls back to None (lexical verification continues) when the dependency isn't installed.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache

log = logging.getLogger(__name__)

LABEL_ENTAILMENT = "entailment"
LABEL_CONTRADICTION = "contradiction"
LABEL_NEUTRAL = "neutral"

# Default model - small enough for CPU, strong enough for real NLI
DEFAULT_NLI_MODEL = "cross-encoder/nli-deberta-v3-xsmall"


@dataclass
class NLIResult:
    """Result of a single premise-hypothesis NLI check."""
    label: str          # entailment | contradiction | neutral
    entailment: float   # P(entailment) in [0, 1]
    contradiction: float  # P(contradiction) in [0, 1]
    neutral: float      # P(neutral) in [0, 1]

    @property
    def supports(self) -> bool:
        return self.label == LABEL_ENTAILMENT

    @property
    def contradicts(self) -> bool:
        return self.label == LABEL_CONTRADICTION


@lru_cache(maxsize=2)
def _load_nli_model(model_name: str):
    """Lazily load the NLI cross-encoder. Returns None if sentence-transformers isn't installed."""
    try:
        from sentence_transformers import CrossEncoder
    except ImportError:
        log.info(
            "sentence-transformers not installed; NLI verifier disabled "
            "(pip install -r requirements-ml.txt). Falling back to lexical verification."
        )
        return None
    try:
        model = CrossEncoder(model_name)
        log.info("NLI model loaded: %s", model_name)
        return model
    except Exception:
        log.exception("Failed to load NLI model %s", model_name)
        return None


class NLIService:
    """Wraps an NLI cross-encoder for claim verification against evidence blocks."""

    def __init__(self, model_name: str = DEFAULT_NLI_MODEL) -> None:
        self.model_name = model_name
        self._model = None
        self._available: bool | None = None

    @property
    def available(self) -> bool:
        if self._available is None:
            self._model = _load_nli_model(self.model_name)
            self._available = self._model is not None
        return self._available

    def check(self, premise: str, hypothesis: str) -> NLIResult | None:
        """Check if `premise` (evidence) entails/contradicts `hypothesis` (claim).
        Returns None if the model is not available."""
        if not self.available:
            return None
        try:
            scores = self._model.predict([(premise, hypothesis)])
            # cross-encoder/nli-* models return [contradiction, entailment, neutral] logits
            # but the order depends on the model's config. We handle both common orderings.
            score_list = scores[0] if hasattr(scores[0], '__len__') else [float(scores[0])]

            if len(score_list) == 3:
                # Standard NLI model with 3 classes
                import torch
                probs = torch.nn.functional.softmax(torch.tensor(score_list), dim=0).tolist()
                # Label mapping for nli-deberta: 0=contradiction, 1=entailment, 2=neutral
                labels_map = {0: LABEL_CONTRADICTION, 1: LABEL_ENTAILMENT, 2: LABEL_NEUTRAL}
                best_idx = max(range(3), key=lambda i: probs[i])
                return NLIResult(
                    label=labels_map[best_idx],
                    contradiction=probs[0],
                    entailment=probs[1],
                    neutral=probs[2],
                )
            else:
                # Binary model or single score — treat high score as entailment
                score = float(score_list[0]) if len(score_list) == 1 else float(score_list[1])
                label = LABEL_ENTAILMENT if score > 0.5 else LABEL_NEUTRAL
                return NLIResult(label=label, entailment=score, contradiction=0.0, neutral=1.0 - score)
        except ImportError:
            log.info("torch not available for softmax; NLI disabled")
            self._available = False
            return None
        except Exception:
            log.exception("NLI inference failed")
            return None

    def check_batch(self, pairs: list[tuple[str, str]]) -> list[NLIResult | None]:
        """Batch check multiple (premise, hypothesis) pairs."""
        if not self.available or not pairs:
            return [None] * len(pairs)
        try:
            scores = self._model.predict(pairs)
            results: list[NLIResult | None] = []
            for score_row in scores:
                score_list = score_row if hasattr(score_row, '__len__') else [float(score_row)]
                if len(score_list) == 3:
                    import torch
                    probs = torch.nn.functional.softmax(torch.tensor(score_list), dim=0).tolist()
                    labels_map = {0: LABEL_CONTRADICTION, 1: LABEL_ENTAILMENT, 2: LABEL_NEUTRAL}
                    best_idx = max(range(3), key=lambda i: probs[i])
                    results.append(NLIResult(
                        label=labels_map[best_idx],
                        contradiction=probs[0], entailment=probs[1], neutral=probs[2],
                    ))
                else:
                    score = float(score_list[0]) if len(score_list) == 1 else float(score_list[1])
                    label = LABEL_ENTAILMENT if score > 0.5 else LABEL_NEUTRAL
                    results.append(NLIResult(label=label, entailment=score, contradiction=0.0, neutral=1.0 - score))
            return results
        except Exception:
            log.exception("NLI batch inference failed")
            return [None] * len(pairs)

    def verify_claim_against_blocks(
        self, claim: str, block_texts: list[str], threshold: float = 0.5
    ) -> tuple[bool, int | None, float]:
        """Check a single claim against multiple evidence blocks.
        Returns (supported, best_block_index, best_entailment_score)."""
        if not self.available or not block_texts:
            return False, None, 0.0

        pairs = [(text, claim) for text in block_texts]
        results = self.check_batch(pairs)

        best_idx = None
        best_score = 0.0
        any_contradiction = False

        for i, r in enumerate(results):
            if r is None:
                continue
            if r.entailment > best_score:
                best_score = r.entailment
                best_idx = i
            if r.contradicts:
                any_contradiction = True

        supported = best_score >= threshold and not any_contradiction
        return supported, best_idx, best_score


# Module-level singleton — lazy-loaded on first use
_default_nli: NLIService | None = None


def get_nli_service(model_name: str = DEFAULT_NLI_MODEL) -> NLIService:
    """Get or create the module-level NLI service singleton."""
    global _default_nli
    if _default_nli is None or _default_nli.model_name != model_name:
        _default_nli = NLIService(model_name)
    return _default_nli
