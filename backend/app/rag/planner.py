"""Retrieval planning: split the question into sub-queries and guess which enterprise sources to favour."""
from __future__ import annotations

import re

from app.core.text import tokenize
from app.rag.types import Plan
from app.services.rbac import SOURCE_TYPES

_HINTS: dict[str, re.Pattern[str]] = {
    "jira": re.compile(r"\b(tickets?|issues?|bugs?|sprints?|epics?|jira|backlog)\b", re.I),
    "confluence": re.compile(r"\b(wiki|confluence|runbooks?|playbooks?|how[- ]to|guide|architecture)\b", re.I),
    "sharepoint": re.compile(r"\b(sharepoint|polic(?:y|ies)|handbook|procedures?|compliance)\b", re.I),
    "pdf": re.compile(r"\b(pdf|contracts?|agreements?|whitepapers?|reports?)\b", re.I),
    "email": re.compile(r"\b(e-?mails?|threads?|inbox|sent)\b", re.I),
    "sql": re.compile(r"\b(customers?|revenue|sales|orders?|inventory|database|records?|accounts?)\b", re.I),
    "notion": re.compile(r"\b(notion|meeting notes?)\b", re.I),
    "drive": re.compile(r"\b(drive|folders?|shared files?)\b", re.I),
}
MAX_SUBQUERIES = 4


def _split(question: str) -> list[str]:
    parts = [p.strip(" ?.;") for p in re.split(r"[?;\n]+", question) if p.strip(" ?.;")]
    out: list[str] = []
    for part in parts:
        pieces = re.split(r"\s+(?:and also|as well as|and)\s+", part, flags=re.I)
        if len(pieces) > 1 and all(len(tokenize(p)) >= 3 for p in pieces):
            out.extend(pieces)
        else:
            out.append(part)
    return out


def heuristic_plan(question: str) -> Plan:
    q = question.strip()
    subs = [q]
    for part in _split(q):
        if part.lower() != q.lower().rstrip("?. ") and part not in subs:
            subs.append(part)
    hints = [name for name, pat in _HINTS.items() if pat.search(q)]
    return Plan(
        sub_queries=subs[:MAX_SUBQUERIES],
        source_hints=hints,
        rationale=("decomposed into %d sub-queries; " % (len(subs) - 1) if len(subs) > 1 else "single-topic question; ")
        + (f"favouring {', '.join(hints)}" if hints else "searching all permitted sources"),
    )


def sanitize_llm_plan(question: str, data: dict) -> Plan:
    subs = [s.strip() for s in data.get("sub_queries", []) if isinstance(s, str) and 3 <= len(s.strip()) <= 400]
    subs = subs[:MAX_SUBQUERIES] or [question]
    hints = [h for h in data.get("source_hints", []) if h in SOURCE_TYPES]
    return Plan(sub_queries=subs, source_hints=hints, rationale=str(data.get("rationale", ""))[:300], planner="llm")


def keyword_rewrite(question: str) -> str:
    toks = tokenize(question, do_stem=False)
    return " ".join(dict.fromkeys(toks)) or question
