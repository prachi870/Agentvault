"""
Hallucination Reduction Engine — the verifier node.

Takes the draft answer plus the exact context it was generated from, and:
  1. Checks whether each claim in the draft is actually supported by the
     retrieved context (an LLM-as-judge call, or an NLI/entailment model).
  2. Produces a confidence score for the final answer.
  3. Strips or flags any claim it cannot ground in the retrieved context.

Currently implemented as a lightweight lexical-overlap heuristic so the
pipeline runs without an LLM key. Swap `verify` for a real LLM-as-judge or
entailment-model call — the surrounding graph doesn't change, since the
contract (draft + context in, verified answer + confidence + flags out)
stays the same.
"""

import re

from app.agents.state import AgentState

_MIN_OVERLAP_RATIO = 0.15


def _sentence_supported(sentence: str, context: str) -> bool:
    words = {w.lower() for w in re.findall(r"[a-zA-Z]{4,}", sentence)}
    if not words:
        return True
    context_lower = context.lower()
    hits = sum(1 for w in words if w in context_lower)
    return (hits / len(words)) >= _MIN_OVERLAP_RATIO


def verify(state: AgentState) -> AgentState:
    draft = state.get("draft_answer", "")
    context = state.get("context", "")

    if not context.strip():
        return {
            **state,
            "verified_answer": (
                "I don't have enough retrieved evidence to answer this confidently. "
                "This may be a knowledge gap — flagging for review."
            ),
            "confidence": 0.0,
            "unsupported_claims": [draft] if draft else [],
        }

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", draft) if s.strip()]
    unsupported = [s for s in sentences if not _sentence_supported(s, context)]

    supported_count = len(sentences) - len(unsupported)
    confidence = round(supported_count / len(sentences), 2) if sentences else 0.0

    verified_answer = draft
    if unsupported:
        caveat = "\n\n[Note: some statements above could not be fully grounded in retrieved sources.]"
        verified_answer = draft + caveat

    return {
        **state,
        "verified_answer": verified_answer,
        "confidence": confidence,
        "unsupported_claims": unsupported,
    }
