from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    secret_key: str = "change-me-dev-secret"
    access_token_expire_minutes: int = 60

    llm_provider: str = "anthropic"
    anthropic_api_key: str = ""
    llm_model: str = "claude-sonnet-4-6"

    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: str = ""
    qdrant_collection: str = "esakip_chunks"

    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "esakip"
    postgres_user: str = "esakip"
    postgres_password: str = "esakip"

    redis_url: str = "redis://localhost:6379/0"

    storage_backend: str = "local"
    s3_bucket: str = ""
    aws_region: str = "us-east-1"

    max_context_tokens: int = 6000
    top_k_per_source: int = 5

    @property
    def postgres_dsn(self) -> str:
        return (
            f"postgresql+psycopg2://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
