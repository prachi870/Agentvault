"""Hallucination reduction: claim-level verification of the generated answer against the context blocks.

Every substantive sentence must be supported by at least one block (lexical coverage of its content
words) and every number/date it states must literally appear in the evidence. Unsupported sentences are
removed rather than shown, and citations are recomputed from the evidence, not trusted from the LLM.

Phase 4 enhancement: when an NLI model is available (sentence-transformers installed), lexical
verification is augmented with semantic entailment checking. A claim is considered supported when
EITHER the lexical coverage meets the threshold OR the NLI model predicts entailment with sufficient
confidence. This catches paraphrased support that word-overlap misses, while the lexical check
remains as a fast, deterministic fallback.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

from app.core.text import normalize_unicode, split_sentences, tokenize
from app.rag.types import ContextBlock

log = logging.getLogger(__name__)

_CITE_RE = re.compile(r"\s*\[(\d+)\]")
_NUM_RE = re.compile(r"\d+(?:[.,]\d+)*")
MIN_CLAIM_TOKENS = 3

# NLI thresholds
NLI_ENTAILMENT_THRESHOLD = 0.6   # P(entailment) above this => supported
NLI_CONTRADICTION_THRESHOLD = 0.7  # P(contradiction) above this => remove the claim


@dataclass
class Verification:
    answer: str = ""
    grounding: float = 0.0
    claims_total: int = 0
    claims_supported: int = 0
    cited: list[int] = field(default_factory=list)
    removed: list[dict] = field(default_factory=list)
    invalid_citations: list[int] = field(default_factory=list)
    nli_used: bool = False  # Phase 4: whether NLI model was used for verification


def _numbers(text: str) -> set[str]:
    return {n.replace(",", "") for n in _NUM_RE.findall(normalize_unicode(text))}


def _get_nli():
    """Lazy import of NLI service to avoid circular imports and keep it optional."""
    try:
        from app.services.nli import get_nli_service
        nli = get_nli_service()
        return nli if nli.available else None
    except Exception:
        return None


def _lexical_support(
    tokens: set[str], block_tokens: dict[int, set[str]], threshold: float
) -> tuple[int | None, float]:
    """Original lexical verification: returns (best_block_n, best_coverage)."""
    coverage = {n: len(tokens & bt) / len(tokens) for n, bt in block_tokens.items()}
    return max(coverage.items(), key=lambda kv: kv[1], default=(None, 0.0))


def _nli_support(
    claim: str, blocks: list[ContextBlock], nli
) -> tuple[int | None, float, bool]:
    """NLI-based verification: returns (best_block_n, entailment_score, any_contradiction).
    Checks each block's text against the claim using the NLI model."""
    if nli is None or not blocks:
        return None, 0.0, False

    pairs = [(b.text, claim) for b in blocks]
    results = nli.check_batch(pairs)

    best_n = None
    best_entailment = 0.0
    any_contradiction = False

    for i, r in enumerate(results):
        if r is None:
            continue
        if r.entailment > best_entailment:
            best_entailment = r.entailment
            best_n = blocks[i].n
        if r.contradiction > NLI_CONTRADICTION_THRESHOLD:
            any_contradiction = True

    return best_n, best_entailment, any_contradiction


def verify_answer(answer: str, blocks: list[ContextBlock], threshold: float) -> Verification:
    valid = {b.n for b in blocks}
    block_tokens = {b.n: set(tokenize(b.text)) for b in blocks}
    block_numbers = {b.n: _numbers(b.text) for b in blocks}
    all_numbers = set().union(*block_numbers.values()) if block_numbers else set()

    # Phase 4: try to load NLI model for semantic verification
    nli = _get_nli()

    result = Verification(nli_used=nli is not None)
    kept: list[str] = []
    cited: set[int] = set()
    invalid = {int(n) for n in _CITE_RE.findall(answer) if int(n) not in valid}
    result.invalid_citations = sorted(invalid)

    for sentence in split_sentences(answer):
        claimed = {int(n) for n in _CITE_RE.findall(sentence)}
        clean = _CITE_RE.sub("", sentence).strip()
        tokens = set(tokenize(clean))
        if len(tokens) < MIN_CLAIM_TOKENS:
            kept.append(clean)  # heading / connective text, not a factual claim
            continue
        result.claims_total += 1

        # --- Lexical verification (original) ---
        best_n_lex, best_cov = _lexical_support(tokens, block_tokens, threshold)
        unsupported_numbers = sorted(_numbers(clean) - all_numbers)
        lexical_ok = best_n_lex is not None and best_cov >= threshold and not unsupported_numbers

        # --- NLI verification (Phase 4) ---
        nli_ok = False
        nli_best_n = None
        nli_score = 0.0
        contradicted = False

        if nli is not None:
            nli_best_n, nli_score, contradicted = _nli_support(clean, blocks, nli)
            nli_ok = nli_score >= NLI_ENTAILMENT_THRESHOLD and not contradicted

        # --- Ensemble decision ---
        # A claim is supported if EITHER lexical OR NLI says it is, BUT:
        # - Unsupported numbers always cause rejection (NLI can't verify numbers reliably)
        # - NLI contradiction overrides lexical support (catches subtle factual errors)
        if contradicted and not unsupported_numbers:
            reason = "nli_contradiction"
            result.removed.append({
                "sentence": clean[:300], "reason": reason,
                "best_coverage": round(best_cov, 3),
                "nli_score": round(nli_score, 3),
            })
            continue

        if unsupported_numbers:
            # Numbers must literally appear in evidence — NLI can't verify this
            if not lexical_ok:
                reason = "unsupported_number"
                result.removed.append({
                    "sentence": clean[:300], "reason": reason,
                    "best_coverage": round(best_cov, 3),
                })
                continue

        if not lexical_ok and not nli_ok:
            reason = "no_supporting_evidence"
            detail = {"sentence": clean[:300], "reason": reason, "best_coverage": round(best_cov, 3)}
            if nli is not None:
                detail["nli_score"] = round(nli_score, 3)
            result.removed.append(detail)
            continue

        # Supported — pick the best supporting block from whichever method found it
        result.claims_supported += 1
        if nli_ok and (not lexical_ok or nli_score > best_cov):
            best_n = nli_best_n
        else:
            best_n = best_n_lex

        support = set()
        if best_n is not None:
            support.add(best_n)
        support |= {n for n in claimed & valid if block_tokens.get(n) and
                     len(tokens & block_tokens[n]) / len(tokens) >= threshold}
        cited |= support
        kept.append(clean + "".join(f" [{n}]" for n in sorted(support)))

    result.cited = sorted(cited)
    result.grounding = round(result.claims_supported / result.claims_total, 4) if result.claims_total else 0.0
    sep = "\n" if "\n" in answer.strip() else " "
    result.answer = sep.join(kept).strip() if result.claims_supported else ""
    return result
