"""Embedding providers.

`hash` is a deterministic feature-hashing embedder (no network, no model download). It is good for
development, tests and demos, but it is lexical - use `openai` (or add another provider) for real
semantic retrieval in production.
"""
from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from typing import Protocol

from app.core.text import tokenize
from app.services.cache import Cache


class Embedder(Protocol):
    name: str
    dim: int

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...
    def embed_query(self, text: str) -> list[float]: ...


class HashEmbedder:
    name = "hash"

    def __init__(self, dim: int = 1024) -> None:
        self.dim = dim

    @staticmethod
    def _h(feature: str) -> int:
        return int.from_bytes(hashlib.blake2b(feature.encode(), digest_size=8).digest(), "big")

    def _embed(self, text: str) -> list[float]:
        toks = tokenize(text)
        feats = Counter(toks)
        feats.update(f"{a}_{b}" for a, b in zip(toks, toks[1:]))
        vec = [0.0] * self.dim
        for feat, count in feats.items():
            h = self._h(feat)
            idx = h % self.dim
            sign = 1.0 if (h >> 33) & 1 else -1.0
            vec[idx] += sign * (1.0 + math.log(count))
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)


class OpenAIEmbedder:
    name = "openai"
    _DIMS = {"text-embedding-3-small": 1536, "text-embedding-3-large": 3072, "text-embedding-ada-002": 1536}

    def __init__(self, model: str) -> None:
        from langchain_openai import OpenAIEmbeddings  # optional dependency (requirements-llm.txt)

        self._client = OpenAIEmbeddings(model=model)
        self.dim = self._DIMS.get(model) or len(self._client.embed_query("dimension probe"))

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._client.embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._client.embed_query(text)


class GeminiEmbedder:
    name = "gemini"
    _DIMS = {"models/text-embedding-004": 768, "models/embedding-001": 768}

    def __init__(self, model: str) -> None:
        from langchain_google_genai import GoogleGenerativeAIEmbeddings  # optional dependency (requirements-llm.txt)

        model = model if model.startswith("models/") else f"models/{model or 'text-embedding-004'}"
        self._client = GoogleGenerativeAIEmbeddings(model=model)
        self.dim = self._DIMS.get(model) or len(self._client.embed_query("dimension probe"))

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._client.embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        return self._client.embed_query(text)


class CachedEmbedder:
    """Caches query embeddings (safe to share across users: it only maps text -> vector)."""

    def __init__(self, inner: Embedder, cache: Cache, ttl: int = 3600) -> None:
        self.inner, self.cache, self.ttl = inner, cache, ttl
        self.name, self.dim = inner.name, inner.dim

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self.inner.embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        key = f"emb:{self.inner.name}:{hashlib.sha256(text.encode()).hexdigest()}"
        hit = self.cache.get(key)
        if hit:
            return json.loads(hit)
        vec = self.inner.embed_query(text)
        self.cache.set(key, json.dumps(vec), self.ttl)
        return vec


def build_embedder(provider: str, model: str, hash_dim: int, cache: Cache) -> Embedder:
    if provider == "openai":
        inner: Embedder = OpenAIEmbedder(model)
    elif provider == "gemini":
        inner = GeminiEmbedder(model)
    else:
        inner = HashEmbedder(hash_dim)
    return CachedEmbedder(inner, cache)
