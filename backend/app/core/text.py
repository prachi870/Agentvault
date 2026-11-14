"""Small, dependency-free text utilities shared by embeddings, grading and verification."""
from __future__ import annotations

import re
import unicodedata

STOPWORDS = frozenset(
    """a an the and or but if then else of to in on at by for with from as is are was were be been being
    it its this that these those i you u ur he she we they them his her our your their my me tell explain describe
    summarize summary overview do does did done
    have has had having can could should would may might will shall not no yes so than too very just
    about into over under again more most other some such only own same what which who whom whose when please pls plz
    where why how all any both each few there here also per via""".split()
)

_TOKEN_RE = re.compile(r"[a-z0-9]+(?:[.,][0-9]+)*")
_SENT_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\[\(\"'])|\n+")
_ZERO_WIDTH_RE = re.compile("[\u200b\u200c\u200d\u2060\ufeff]")


def normalize_unicode(text: str) -> str:
    return _ZERO_WIDTH_RE.sub("", unicodedata.normalize("NFKC", text))


def stem(token: str) -> str:
    """Very light suffix stripping, good enough for lexical overlap checks."""
    if token.isdigit() or len(token) <= 3:
        return token
    for suffix in ("ingly", "edly", "ing", "ies", "ied", "ed", "es", "s", "ly"):
        if token.endswith(suffix) and len(token) - len(suffix) >= 3:
            base = token[: -len(suffix)]
            return base + "y" if suffix in ("ies", "ied") else base
    return token[:-1] if token.endswith("e") and len(token) > 4 else token  # cause/caused -> caus


def tokenize(text: str, *, drop_stopwords: bool = True, do_stem: bool = True) -> list[str]:
    tokens = _TOKEN_RE.findall(normalize_unicode(text).lower())
    if drop_stopwords:
        tokens = [t for t in tokens if t not in STOPWORDS]
    return [stem(t) for t in tokens] if do_stem else tokens


def split_sentences(text: str) -> list[str]:
    parts = [p.strip() for p in _SENT_SPLIT_RE.split(text)]
    return [p for p in parts if p]


def estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)
