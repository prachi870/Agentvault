"""Wires all services together. Built once at startup and stored on app.state."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings
from app.db.session import init_db, make_engine, make_session_factory
from app.rag.graph import RAGDeps
from app.rag.service import QueryService
from app.services.cache import Cache, build_cache
from app.services.embeddings import Embedder, build_embedder
from app.services.ingestion import IngestionService
from app.services.llm import LLM, build_llm
from app.services.storage import LocalStorage, S3Storage, Storage
from app.services.vector_store import VectorStore


@dataclass
class Container:
    settings: Settings
    engine: Engine
    session_factory: sessionmaker[Session]
    cache: Cache
    embedder: Embedder
    vectors: VectorStore
    storage: Storage
    llm: LLM
    ingestion: IngestionService
    query_service: QueryService


def build_container(settings: Settings) -> Container:
    settings.validate_for_prod()
    engine = make_engine(settings.database_url)
    if settings.auto_create_tables:
        init_db(engine)
    cache = build_cache(settings.redis_url)
    embedder = build_embedder(settings.embedding_provider, settings.embedding_model, settings.hash_embedding_dim, cache)
    vectors = VectorStore(settings.qdrant_collection, embedder.dim, settings.qdrant_url, settings.qdrant_api_key,
                          settings.qdrant_path, hybrid=settings.hybrid_retrieval_enabled)
    storage: Storage = (
        S3Storage(settings.s3_bucket, settings.s3_region, settings.s3_endpoint_url)
        if settings.storage_backend == "s3"
        else LocalStorage(settings.local_storage_dir)
    )
    llm = build_llm(settings.llm_provider, settings.llm_model)
    ingestion = IngestionService(settings, embedder, vectors, storage)
    query_service = QueryService(settings, RAGDeps(settings=settings, embedder=embedder, vectors=vectors, llm=llm))
    return Container(settings, engine, make_session_factory(engine), cache, embedder, vectors, storage, llm, ingestion, query_service)
