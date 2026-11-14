"""Multilingual support for Agentvault (Phase 7).

Provides:
1. Language detection — identifies the language of a user's query
2. Query translation — translates non-English queries to English for retrieval
3. Answer translation — translates English answers back to the user's language
4. Cross-language prompt support — adapts system prompts for multilingual context

Language detection uses a lightweight heuristic (character-set analysis + common word patterns)
that requires no external dependencies. Translation goes through the LLM when available.
"""
from __future__ import annotations

import logging
import re
import unicodedata
from dataclasses import dataclass
from typing import Protocol

log = logging.getLogger(__name__)

# ISO 639-1 language codes and their common word patterns for detection
_LANG_PATTERNS: dict[str, tuple[re.Pattern, set[str]]] = {
    "es": (re.compile(r"[áéíóúñ¿¡]", re.I), {"el", "la", "los", "las", "de", "en", "que", "por", "para", "con", "es", "un", "una", "como", "pero", "más"}),
    "fr": (re.compile(r"[àâçéèêëîïôùûüÿœæ]", re.I), {"le", "la", "les", "de", "du", "des", "un", "une", "est", "et", "en", "que", "pour", "dans", "pas", "qui", "avec"}),
    "de": (re.compile(r"[äöüß]", re.I), {"der", "die", "das", "und", "ist", "ein", "eine", "auf", "für", "mit", "den", "von", "nicht", "sich", "des", "dem"}),
    "pt": (re.compile(r"[àáâãçéêíóôõú]", re.I), {"de", "do", "da", "dos", "das", "em", "que", "para", "com", "por", "uma", "um", "como", "mais", "não"}),
    "it": (re.compile(r"[àèéìíîòóùú]", re.I), {"il", "lo", "la", "di", "che", "per", "con", "del", "della", "sono", "non", "una", "anche", "più", "questo"}),
    "nl": (re.compile(r"(?:ij|IJ)", re.I), {"de", "het", "een", "van", "en", "in", "is", "dat", "op", "te", "met", "voor", "zijn", "niet", "ook", "maar"}),
    "ru": (re.compile(r"[\u0400-\u04FF]"), {"и", "в", "не", "на", "что", "он", "как", "это", "но", "по", "они", "все", "за", "так", "его"}),
    "zh": (re.compile(r"[\u4e00-\u9fff]"), set()),
    "ja": (re.compile(r"[\u3040-\u309f\u30a0-\u30ff]"), set()),
    "ko": (re.compile(r"[\uac00-\ud7af\u1100-\u11ff]"), set()),
    "ar": (re.compile(r"[\u0600-\u06FF]"), set()),
    "hi": (re.compile(r"[\u0900-\u097F]"), set()),
}

# Common English words for disambiguation
_EN_WORDS = {"the", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
             "will", "would", "could", "should", "may", "might", "shall", "can", "must", "need", "and", "or", "but",
             "not", "what", "which", "who", "when", "where", "how", "why", "this", "that", "these", "those", "with"}


@dataclass
class DetectionResult:
    """Result of language detection."""
    language: str        # ISO 639-1 code
    confidence: float    # 0.0 to 1.0
    is_english: bool

    @property
    def needs_translation(self) -> bool:
        return not self.is_english and self.confidence > 0.5


def detect_language(text: str) -> DetectionResult:
    """Detect the language of text using character patterns and common word analysis.
    Returns English as default when uncertain."""
    if not text or not text.strip():
        return DetectionResult(language="en", confidence=1.0, is_english=True)

    text_lower = text.lower().strip()
    words = set(re.findall(r"\b[a-zA-Z\u0080-\uffff]+\b", text_lower))

    # Script-based detection (high confidence for non-Latin scripts)
    for lang, (pattern, _) in _LANG_PATTERNS.items():
        char_matches = len(pattern.findall(text))
        if lang in ("zh", "ja", "ko", "ar", "hi", "ru") and char_matches > len(text) * 0.15:
            return DetectionResult(language=lang, confidence=0.95, is_english=False)

    # Latin-script languages: use diacritics + common words
    best_lang = "en"
    best_score = 0.0

    # English word score
    en_hits = len(words & _EN_WORDS)
    en_score = en_hits / max(len(words), 1)

    for lang, (pattern, common_words) in _LANG_PATTERNS.items():
        if lang in ("zh", "ja", "ko", "ar", "hi", "ru"):
            continue
        diacritic_score = min(1.0, len(pattern.findall(text)) / max(len(text) * 0.02, 1))
        word_hits = len(words & common_words) if common_words else 0
        word_score = word_hits / max(len(words), 1)
        score = 0.4 * diacritic_score + 0.6 * word_score
        if score > best_score and score > en_score * 0.5:
            best_score = score
            best_lang = lang

    if best_lang == "en" or best_score < 0.15:
        return DetectionResult(language="en", confidence=max(0.5, en_score), is_english=True)

    return DetectionResult(language=best_lang, confidence=min(0.95, best_score), is_english=False)


# --- Translation via LLM ---

_TRANSLATE_SYSTEM = """You are a precise translator. Translate the following text to {target_lang}.
Rules:
1. Preserve all numbers, dates, proper nouns, and technical terms exactly.
2. Do not add explanations or commentary.
3. Return ONLY the translation, nothing else."""


class Translator(Protocol):
    """Protocol for translation services."""
    def translate(self, text: str, source_lang: str, target_lang: str) -> str: ...


class LLMTranslator:
    """Translates text using the configured LLM provider."""

    def __init__(self, llm) -> None:
        self._llm = llm

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        if source_lang == target_lang:
            return text
        try:
            lang_names = _lang_name(target_lang)
            prompt = _TRANSLATE_SYSTEM.format(target_lang=lang_names)
            if hasattr(self._llm, '_invoke'):
                return self._llm._invoke(prompt, text)
            # Fallback: use generate_answer with empty blocks
            return text  # can't translate without invoke
        except Exception:
            log.exception("Translation failed from %s to %s", source_lang, target_lang)
            return text  # return original on failure


class PassthroughTranslator:
    """No-op translator for when multilingual is disabled."""

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        return text


def _lang_name(code: str) -> str:
    """Convert ISO 639-1 code to full language name."""
    names = {
        "en": "English", "es": "Spanish", "fr": "French", "de": "German",
        "pt": "Portuguese", "it": "Italian", "nl": "Dutch", "ru": "Russian",
        "zh": "Chinese", "ja": "Japanese", "ko": "Korean", "ar": "Arabic", "hi": "Hindi",
    }
    return names.get(code, code)


# --- Multilingual prompt support ---

MULTILINGUAL_SYSTEM_ADDENDUM = """
The user's query may be in a language other than English.
- Always answer in the SAME language the user used for their question.
- Translate relevant evidence into the user's language when composing your answer.
- Keep all citations in their original [N] format regardless of language.
- Numbers, dates, and proper nouns should be preserved exactly from the source."""


def multilingual_prompt_addendum(query_lang: str) -> str:
    """Returns additional system prompt instructions for non-English queries."""
    if query_lang == "en":
        return ""
    lang_name = _lang_name(query_lang)
    return f"\nIMPORTANT: The user's question is in {lang_name}. Respond in {lang_name}." + MULTILINGUAL_SYSTEM_ADDENDUM
