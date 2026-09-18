"""
Prompt Injection Protection.

Two layers:
1. Input screening — heuristic + optional classifier pass on the raw user
   question before it ever reaches the planner.
2. Retrieved-content screening — every chunk pulled from a connector is
   scanned for embedded instructions ("ignore previous instructions", role
   markers, etc.) before it's placed in the LLM context. Flagged chunks are
   kept for citation purposes but stripped of any instruction-like content
   and tagged `untrusted_injection_suspected` in the context receipt.

The heuristic layer below is intentionally simple and fast (regex-based) so
it can run on every chunk without adding real latency. It is a first line
of defense, not a substitute for output-side verification in
app/agents/verifier.py.
"""

import re

_INJECTION_PATTERNS = [
    r"ignore (all )?(previous|prior|above) instructions",
    r"disregard (all )?(previous|prior|above) (instructions|context)",
    r"you are now (a|an) ",
    r"system prompt",
    r"act as (the )?(system|developer)",
    r"reveal your (instructions|prompt|system message)",
    r"</?(system|assistant|user)>",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in _INJECTION_PATTERNS]


def screen_text(text: str) -> tuple[bool, list[str]]:
    """Returns (is_suspicious, matched_patterns)."""
    matches = [p.pattern for p in _COMPILED if p.search(text)]
    return (len(matches) > 0, matches)


def sanitize_chunk(text: str) -> tuple[str, bool]:
    """
    Strip suspected injection spans from a retrieved chunk before it enters
    context. Returns (sanitized_text, was_flagged).
    """
    flagged = False
    sanitized = text
    for pattern in _COMPILED:
        if pattern.search(sanitized):
            flagged = True
            sanitized = pattern.sub("[redacted: suspected instruction injection]", sanitized)
    return sanitized, flagged


def screen_user_query(query: str) -> None:
    """
    Raises if the user query itself looks like an attempt to hijack the
    system prompt. Kept permissive by design — false positives block
    legitimate employee questions, which is worse than letting a borderline
    one through to the (also-screened) retrieval layer.
    """
    is_suspicious, matches = screen_text(query)
    if is_suspicious and len(matches) >= 2:
        raise ValueError(
            "Query blocked by prompt-injection screen. If this is a false positive, rephrase and retry."
        )
