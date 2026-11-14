"""Heuristic prompt-injection detection for user queries and retrieved content.

This is one layer of defence-in-depth (the others: delimited untrusted context, a system prompt that
treats context as data, claim-level verification of the answer, and RBAC applied before retrieval).
Heuristics catch the common attacks; they are not a complete defence on their own.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.core.text import normalize_unicode

_RULES: list[tuple[str, re.Pattern[str], float]] = [
    ("ignore_instructions", re.compile(r"\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|any|your|the)\b[^.\n]{0,40}\b(instructions?|prompts?|rules?|guidelines?|directives?)\b"), 0.9),
    ("reveal_prompt", re.compile(r"\b(reveal|show|print|repeat|output|leak|display)\b[^.\n]{0,40}\b(system|hidden|initial|original)\b[^.\n]{0,20}\b(prompt|instructions?|message)\b"), 0.8),
    ("role_hijack", re.compile(r"\b(you are now|from now on you|act as (?:an? )?(?:unrestricted|jailbroken|dan)|pretend (?:to be|you are))\b"), 0.6),
    ("jailbreak_terms", re.compile(r"\b(jailbreak|developer mode|dan mode|do anything now|no restrictions)\b"), 0.7),
    ("bypass_security", re.compile(r"\b(bypass|disable|override|circumvent|skip)\b[^.\n]{0,30}\b(security|rbac|permissions?|access control|authorization|guardrails?|filters?|safety)\b"), 0.85),
    ("act_as_admin", re.compile(r"\b(i am|i'm|act as|treat me as|you must treat me as)\b[^.\n]{0,20}\b(admin|administrator|root|superuser)\b"), 0.5),
    ("chat_template_tokens", re.compile(r"(<\|?(?:im_start|im_end|system|assistant)\|?>|\[/?inst\]|<<sys>>|###\s*(?:system|instruction)s?\b)"), 0.75),
    ("conceal_from_user", re.compile(r"\b(do not|don't|never)\b[^.\n]{0,20}\b(tell|inform|mention|reveal|alert)\b[^.\n]{0,20}\b(the )?(user|human|operator)\b"), 0.7),
    ("exfiltration", re.compile(r"\b(send|post|upload|forward|exfiltrate|email)\b[^.\n]{0,60}\b(https?://|to\s+\S+@\S+)"), 0.6),
    ("dump_data", re.compile(r"\b(dump|list|print|show)\b[^.\n]{0,25}\b(all|every)\b[^.\n]{0,25}\b(documents?|records?|users?|passwords?|secrets?|credentials?|api keys?)\b"), 0.6),
]


@dataclass
class InjectionResult:
    score: float = 0.0
    matches: list[str] = field(default_factory=list)
    classifier_score: float | None = None

    def flagged(self, threshold: float) -> bool:
        return self.score >= threshold


def _sentence_score(sentence: str) -> tuple[float, list[str]]:
    normalized = normalize_unicode(sentence).lower()
    survive = 1.0
    matches: list[str] = []
    for name, pattern, weight in _RULES:
        if pattern.search(normalized):
            matches.append(name)
            survive *= 1.0 - weight
    return round(1.0 - survive, 3), matches


def sanitize_chunk(text: str, threshold: float) -> tuple[str, list[str], bool]:
    """Sentence-level quarantine (Phase 4): instead of dropping a whole retrieved chunk because one
    sentence in it looks like an injection attempt, drop only the offending sentence(s) and keep the
    rest as usable evidence. Returns (cleaned_text, removed_rule_names, any_removed).

    This matters in practice - an attacker only needs to plant one injected sentence next to
    otherwise-legitimate content to get the whole chunk (and any real facts in it) quarantined,
    which is a denial-of-service on retrieval, not just a prompt-injection defence.
    """
    from app.core.text import split_sentences

    sentences = split_sentences(text) or [text]
    kept: list[str] = []
    removed_rules: list[str] = []
    for sentence in sentences:
        score, matches = _sentence_score(sentence)
        if score >= threshold:
            removed_rules.extend(matches)
        else:
            kept.append(sentence)
    cleaned = " ".join(kept).strip()
    return cleaned, sorted(set(removed_rules)), len(kept) < len(sentences)


def scan_text(text: str) -> InjectionResult:
    from app.core.config import get_settings

    normalized = normalize_unicode(text).lower()
    survive = 1.0
    matches: list[str] = []
    for name, pattern, weight in _RULES:
        if pattern.search(normalized):
            matches.append(name)
            survive *= 1.0 - weight
    heuristic_score = round(1.0 - survive, 3)

    classifier_score: float | None = None
    combined = heuristic_score
    if get_settings().injection_classifier_enabled:
        from app.services.injection_classifier import classify

        classifier_score = classify(normalized)
        if classifier_score is not None:
            # Ensemble: take the stronger of the two signals, but let a confident classifier hit
            # raise the score even when no regex fired (paraphrased attacks), and vice versa.
            combined = max(heuristic_score, 0.5 * heuristic_score + 0.5 * classifier_score)
    return InjectionResult(score=round(combined, 3), matches=matches, classifier_score=classifier_score)


def neutralize_for_context(text: str) -> str:
    """Strip control characters and anything that could imitate our prompt delimiters."""
    text = normalize_unicode(text)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    text = re.sub(r"</?\s*(context|block|system|assistant|user)\b[^>]*>", "[tag removed]", text, flags=re.I)
    return text
