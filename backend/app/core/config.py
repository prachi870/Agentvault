"""Application settings. Everything is overridable via environment variables / .env."""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_SECRET = "change-me-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    app_name: str = "Agentvault"
    env: Literal["dev", "test", "prod"] = "dev"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://localhost:5173"])
    secret_key: str = _DEFAULT_SECRET
    receipt_signing_key: str = _DEFAULT_SECRET
    google_api_key: str | None = Field(default=None, repr=False)
    openai_api_key: str | None = Field(default=None, repr=False)
    anthropic_api_key: str | None = Field(default=None, repr=False)
    access_token_expire_minutes: int = 60
    bcrypt_rounds: int = 12

    # --- PostgreSQL (SQLite only for quick local runs / tests) ---
    database_url: str = "sqlite:///./esakip.db"
    auto_create_tables: bool = True  # set false in prod; apply schema changes with Alembic

    # --- Redis (rate limiting + embedding cache). Empty => in-process fallback ---
    redis_url: str | None = None
    rate_limit_per_minute: int = 60
    login_rate_limit_per_minute: int = 10

    # --- Qdrant. url => Qdrant Cloud / server; path => local on-disk; neither => in-memory ---
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None
    qdrant_path: str | None = None
    qdrant_collection: str = "esakip_chunks"

    # --- Object storage (S3 in prod, local disk in dev) ---
    storage_backend: Literal["local", "s3"] = "local"
    local_storage_dir: str = "./data/uploads"
    s3_bucket: str = "esakip-documents"
    s3_region: str = "us-east-1"
    s3_endpoint_url: str | None = None  # set for MinIO / localstack

    # --- Models ---
    embedding_provider: Literal["hash", "openai", "gemini"] = "hash"
    embedding_model: str = "text-embedding-3-small"
    hash_embedding_dim: int = 1024
    llm_provider: Literal["local", "openai", "anthropic", "gemini", "ollama"] = "local"
    llm_model: str = ""
    ollama_base_url: str = "http://localhost:11434"

    # --- Ingestion ---
    chunk_size: int = 800
    chunk_overlap: int = 120
    max_upload_mb: int = 25
    connector_allowed_root: str = "./data/connector_root"
    scheduler_enabled: bool = False  # opt-in periodic connector sync (Phase 3)

    # --- RAG behaviour ---
    retrieval_top_k: int = 8
    max_context_chars: int = 6000
    max_chunks_per_doc: int = 3
    min_evidence_score: float = 0.30
    min_confidence: float = 0.35
    claim_support_threshold: float = 0.60
    max_retrieval_retries: int = 1
    freshness_half_life_days: int = 365
    stale_after_days: int = 730
    injection_block_threshold: float = 0.70
    injection_classifier_enabled: bool = True  # ensemble a small ML classifier with the regex heuristics

    # --- Hybrid retrieval (Phase 4) ---
    hybrid_retrieval_enabled: bool = True  # dense (cosine) + sparse (BM25-ish) fused via Qdrant RRF
    reranker_enabled: bool = False  # cross-encoder rerank of fused candidates (needs requirements-ml.txt)
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    rerank_top_n: int = 20  # how many fused candidates to feed the reranker before truncating to top_k

    # --- Observability (Phase 4) ---
    log_format: Literal["text", "json"] = "text"
    otel_enabled: bool = False
    otel_exporter_endpoint: str = "http://localhost:4318"
    audit_log_enabled: bool = True

    # --- Multi-tenant isolation (Phase 4) ---
    multi_tenant_enabled: bool = False

    # --- NLI verification (Phase 4) ---
    nli_model: str = "cross-encoder/nli-deberta-v3-xsmall"
    nli_enabled: bool = True  # use NLI model for claim verification when sentence-transformers is installed

    # --- Multilingual (Phase 7) ---
    multilingual_enabled: bool = False  # enable language detection + cross-language support
    default_language: str = "en"
    supported_languages: list[str] = ["en", "es", "fr", "de", "pt", "it", "nl", "ru", "zh", "ja", "ko", "ar", "hi"]

    # --- Cost tracking (Phase 7) ---
    cost_tracking_enabled: bool = True  # track token usage and estimated cost per query

    @field_validator("redis_url", "qdrant_url", "qdrant_api_key", "qdrant_path", "s3_endpoint_url", mode="before")
    @classmethod
    def _blank_is_none(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

    def validate_for_prod(self) -> None:
        if self.env == "prod":
            for name, value in (
                ("SECRET_KEY", self.secret_key),
                ("RECEIPT_SIGNING_KEY", self.receipt_signing_key),
            ):
                if value == _DEFAULT_SECRET or len(value) < 32:
                    raise RuntimeError(f"{name} must be a non-default secret of at least 32 characters")
            if not self.database_url.startswith(("postgresql://", "postgresql+psycopg://")):
                raise RuntimeError("Use PostgreSQL (DATABASE_URL) in production")
            if self.auto_create_tables:
                raise RuntimeError(
                    "AUTO_CREATE_TABLES must be false in production (Phase 4) - run `alembic upgrade head` "
                    "as a release step instead; see backend/alembic/"
                )
            if not self.redis_url:
                raise RuntimeError("REDIS_URL must point to a shared Redis service in production")
            if not self.qdrant_url or not self.qdrant_api_key:
                raise RuntimeError("QDRANT_URL and QDRANT_API_KEY must point to a secured Qdrant service in production")
            if self.storage_backend != "s3" or not self.s3_bucket:
                raise RuntimeError("STORAGE_BACKEND=s3 and S3_BUCKET are required in production")
            if self.embedding_provider not in {"openai", "gemini"}:
                raise RuntimeError("EMBEDDING_PROVIDER must be openai or gemini in production")
            if self.llm_provider not in {"openai", "anthropic", "gemini"}:
                raise RuntimeError("LLM_PROVIDER must be openai, anthropic, or gemini in production")

            required_keys = set()
            if self.embedding_provider == "openai" or self.llm_provider == "openai":
                required_keys.add("OPENAI_API_KEY")
            if self.llm_provider == "anthropic":
                required_keys.add("ANTHROPIC_API_KEY")
            if self.embedding_provider == "gemini" or self.llm_provider == "gemini":
                required_keys.add("GOOGLE_API_KEY")
            configured_keys = {
                "OPENAI_API_KEY": self.openai_api_key,
                "ANTHROPIC_API_KEY": self.anthropic_api_key,
                "GOOGLE_API_KEY": self.google_api_key,
            }
            missing_keys = sorted(name for name in required_keys if not configured_keys[name])
            if missing_keys:
                raise RuntimeError(f"Missing production model API key(s): {', '.join(missing_keys)}")


@lru_cache
def get_settings() -> Settings:
    return Settings()
