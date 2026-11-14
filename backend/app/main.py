from __future__ import annotations

import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.api.routes import health
from app.core.audit import should_audit, write_audit_log
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.core.logging import configure_logging
from app.core.tracing import init_tracing, instrument_fastapi, shutdown as shutdown_tracing
from app.services.container import Container, build_container

log = logging.getLogger("esakip")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.env, settings.log_format)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        from app.services.scheduler import start_scheduler

        if settings.otel_enabled:
            init_tracing("esakip-api", settings.otel_exporter_endpoint)
        app.state.container = build_container(settings)
        app.state.scheduler = start_scheduler(app.state.container)
        log.info("%s started (env=%s, llm=%s, embeddings=%s)", settings.app_name, settings.env, app.state.container.llm.name, app.state.container.embedder.name)
        yield
        if app.state.scheduler is not None:
            app.state.scheduler.shutdown(wait=False)
        app.state.container.engine.dispose()
        shutdown_tracing()

    app = FastAPI(title=f"{settings.app_name} API", version="0.1.0", lifespan=lifespan,
                  docs_url=None if settings.env == "prod" else "/docs", redoc_url=None)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True,
                       allow_methods=["*"], allow_headers=["*"])

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        t0 = time.perf_counter()
        response = await call_next(request)
        duration_ms = int((time.perf_counter() - t0) * 1000)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        if should_audit(request):
            # Awaited (off the event loop via to_thread) rather than fire-and-forget: a detached
            # background task can still be touching the DB connection when the app/engine shuts
            # down (e.g. end of a test's TestClient context), which is unsafe with SQLite.
            await asyncio.to_thread(write_audit_log, app.state, request, response, request_id, duration_ms)
        return response

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError):
        headers = {"Retry-After": "60"} if exc.status_code == 429 else None
        return JSONResponse({"detail": exc.message}, status_code=exc.status_code, headers=headers)

    app.include_router(health.router)
    app.include_router(api_router, prefix=settings.api_prefix)
    if settings.otel_enabled:
        instrument_fastapi(app)
    return app


app = create_app()  # uvicorn app.main:app
