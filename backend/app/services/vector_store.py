"""Qdrant wrapper. RBAC is pushed into the query filter so unauthorised chunks are never retrieved.

Phase 4: hybrid retrieval. When `hybrid` is enabled, each point carries both a named dense vector
("dense") and a named sparse vector ("sparse", see app.services.sparse), and search() fuses the two
result sets with Qdrant's built-in Reciprocal Rank Fusion. This is what lets an exact-keyword query
("policy ESK-4471") surface a chunk a purely dense embedding might rank low.
"""
from __future__ import annotations

import math
import threading
import uuid
from dataclasses import dataclass
from typing import Any

from qdrant_client import QdrantClient, models

from app.services.rbac import Principal
from app.services.sparse import sparse_vector

_NS = uuid.UUID("6f1c2a52-6a58-4a51-9a53-0f1f7a9c1e11")
DENSE_VEC, SPARSE_VEC = "dense", "sparse"


@dataclass
class ChunkRecord:
    chunk_id: str
    vector: list[float]
    payload: dict[str, Any]


@dataclass
class Hit:
    chunk_id: str
    score: float
    payload: dict[str, Any]


def point_id(chunk_id: str) -> str:
    return str(uuid.uuid5(_NS, chunk_id))


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1e-9
    nb = math.sqrt(sum(x * x for x in b)) or 1e-9
    return dot / (na * nb)


class VectorStore:
    def __init__(self, collection: str, dim: int, url: str | None = None, api_key: str | None = None,
                 path: str | None = None, hybrid: bool = True):
        self.collection = collection
        self.dim = dim
        self.hybrid = hybrid
        self._local = not url
        if url:
            self.client = QdrantClient(url=url, api_key=api_key, timeout=30)
        elif path:
            self.client = QdrantClient(path=path)
        else:
            self.client = QdrantClient(":memory:")
        self._lock = threading.RLock()  # the embedded (local) client is not fully thread-safe
        self.ensure_collection()

    def ensure_collection(self) -> None:
        with self._lock:
            existing = {c.name for c in self.client.get_collections().collections}
            if self.collection not in existing:
                kwargs: dict[str, Any] = {"vectors_config": {DENSE_VEC: models.VectorParams(size=self.dim, distance=models.Distance.COSINE)}}
                if self.hybrid:
                    kwargs["sparse_vectors_config"] = {SPARSE_VEC: models.SparseVectorParams()}
                self.client.create_collection(self.collection, **kwargs)
            for field, schema in () if self._local else (
                ("allowed_roles", models.PayloadSchemaType.KEYWORD),
                ("source_type", models.PayloadSchemaType.KEYWORD),
                ("doc_id", models.PayloadSchemaType.KEYWORD),
                ("clearance_level", models.PayloadSchemaType.INTEGER),
            ):
                try:
                    self.client.create_payload_index(self.collection, field, schema)
                except Exception:  # local mode ignores indexes; server mode may already have it
                    pass

    def upsert(self, records: list[ChunkRecord]) -> None:
        if not records:
            return
        points = []
        for r in records:
            vector: dict[str, Any] = {DENSE_VEC: r.vector}
            if self.hybrid:
                idx, val = sparse_vector(r.payload.get("text", ""))
                vector[SPARSE_VEC] = models.SparseVector(indices=idx, values=val)
            points.append(models.PointStruct(id=point_id(r.chunk_id), vector=vector, payload={**r.payload, "chunk_id": r.chunk_id}))
        with self._lock:
            for i in range(0, len(points), 128):
                self.client.upsert(self.collection, points=points[i : i + 128], wait=True)

    def _filter(self, principal: Principal, source_types: list[str] | None) -> models.Filter | None:
        must: list[models.Condition] = []
        if not principal.is_admin:
            must.append(models.FieldCondition(key="allowed_roles", match=models.MatchAny(any=[principal.role, "*"])))
            must.append(models.FieldCondition(key="clearance_level", range=models.Range(lte=principal.clearance)))
        if source_types:
            must.append(models.FieldCondition(key="source_type", match=models.MatchAny(any=source_types)))
        return models.Filter(must=must) if must else None

    def search(self, vector: list[float], principal: Principal, top_k: int, source_types: list[str] | None = None,
               query_text: str | None = None) -> list[Hit]:
        query_filter = self._filter(principal, source_types)
        with self._lock:
            if self.hybrid and query_text and query_text.strip():
                sp_idx, sp_val = sparse_vector(query_text)
                prefetch = [models.Prefetch(query=vector, using=DENSE_VEC, limit=top_k * 4, filter=query_filter)]
                if sp_idx:  # a query with no recognised tokens (e.g. pure punctuation) skips the sparse leg
                    prefetch.append(models.Prefetch(
                        query=models.SparseVector(indices=sp_idx, values=sp_val), using=SPARSE_VEC,
                        limit=top_k * 4, filter=query_filter,
                    ))
                res = self.client.query_points(
                    self.collection, prefetch=prefetch, query=models.FusionQuery(fusion=models.Fusion.RRF),
                    limit=top_k, with_payload=True, with_vectors=True,
                )
                hits = []
                for p in res.points:
                    dense = p.vector.get(DENSE_VEC) if isinstance(p.vector, dict) else None
                    # Fused RRF scores aren't on the same scale as cosine similarity, which the grader
                    # (app.rag.grader) is tuned against - recover the dense cosine so downstream
                    # scoring stays meaningful; fusion still decided *which* points came back.
                    score = _cosine(vector, dense) if dense else float(p.score)
                    hits.append(Hit(chunk_id=p.payload["chunk_id"], score=score, payload=dict(p.payload)))
                return hits
            else:
                res = self.client.query_points(
                    self.collection, query=vector, using=DENSE_VEC, query_filter=query_filter,
                    limit=top_k, with_payload=True,
                )
        return [Hit(chunk_id=p.payload["chunk_id"], score=float(p.score), payload=dict(p.payload)) for p in res.points]

    def search_document_chunks(
        self, vector: list[float], principal: Principal, doc_ids: list[str], top_k: int
    ) -> list[Hit]:
        """Fetch chunks for title-matched documents, including content with no title terms."""
        if not doc_ids:
            return []
        limit = max(16, top_k * 2)
        with self._lock:
            rbac_filter = self._filter(principal, None)
            hits: list[Hit] = []
            for doc_id in doc_ids:
                must: list[models.Condition] = [
                    models.FieldCondition(key="doc_id", match=models.MatchValue(value=doc_id))
                ]
                if rbac_filter:
                    must.extend(rbac_filter.must or [])
                points, _ = self.client.scroll(
                    self.collection,
                    scroll_filter=models.Filter(must=must),
                    limit=limit,
                    with_payload=True,
                    with_vectors=True,
                )
                for point in points:
                    stored = point.vector
                    dense = stored.get(DENSE_VEC) if isinstance(stored, dict) else stored
                    score = _cosine(vector, dense) if dense else 0.0
                    hits.append(Hit(
                        chunk_id=point.payload["chunk_id"],
                        score=score,
                        payload=dict(point.payload),
                    ))
        return hits

    def set_payload_for_document(self, doc_id: str, payload: dict[str, Any]) -> None:
        """Update classification/roles in place (Phase 4) without re-embedding - much cheaper than
        a full reindex when only access control changed, not the content."""
        with self._lock:
            self.client.set_payload(
                self.collection,
                payload=payload,
                points=models.Filter(must=[models.FieldCondition(key="doc_id", match=models.MatchValue(value=doc_id))]),
                wait=True,
            )

    def delete_document(self, doc_id: str) -> None:
        with self._lock:
            self.client.delete(
                self.collection,
                points_selector=models.FilterSelector(
                    filter=models.Filter(must=[models.FieldCondition(key="doc_id", match=models.MatchValue(value=doc_id))])
                ),
                wait=True,
            )

    def count(self) -> int:
        with self._lock:
            return int(self.client.count(self.collection, exact=True).count)

    def ping(self) -> bool:
        try:
            with self._lock:
                self.client.get_collections()
            return True
        except Exception:
            return False
