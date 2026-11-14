"""OpenTelemetry instrumentation for the Agentvault backend (Phase 4).

When OTEL_ENABLED=true, this module:
- Configures an OTLP exporter (gRPC or HTTP to OTEL_EXPORTER_ENDPOINT)
- Creates a TracerProvider with service name "esakip-api"
- Instruments FastAPI with automatic span creation for each request
- Provides a `tracer` object for manual span creation in the RAG pipeline

When OTEL_ENABLED=false (default), all tracing functions become no-ops — zero overhead.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Generator

log = logging.getLogger(__name__)

_tracer = None
_initialized = False


class _NoOpSpan:
    """Stand-in span when OTel is disabled."""

    def set_attribute(self, key: str, value: Any) -> None:
        pass

    def set_status(self, status: Any) -> None:
        pass

    def record_exception(self, exc: BaseException) -> None:
        pass

    def add_event(self, name: str, attributes: dict | None = None) -> None:
        pass

    def end(self) -> None:
        pass

    def __enter__(self):
        return self

    def __exit__(self, *args):
        pass


_NOOP_SPAN = _NoOpSpan()


def init_tracing(service_name: str = "esakip-api", endpoint: str = "http://localhost:4318") -> None:
    """Initialize OpenTelemetry tracing. Called once at app startup when OTEL_ENABLED=true."""
    global _tracer, _initialized
    if _initialized:
        return
    _initialized = True
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        resource = Resource.create({
            "service.name": service_name,
            "service.version": "0.1.0",
        })
        provider = TracerProvider(resource=resource)
        exporter = OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces")
        provider.add_span_processor(BatchSpanProcessor(exporter))
        trace.set_tracer_provider(provider)
        _tracer = trace.get_tracer("esakip.rag")
        log.info("OpenTelemetry tracing initialized (endpoint=%s)", endpoint)
    except ImportError:
        log.info(
            "OpenTelemetry SDK not installed; tracing disabled. "
            "pip install opentelemetry-sdk opentelemetry-exporter-otlp-proto-http "
            "opentelemetry-instrumentation-fastapi"
        )
    except Exception:
        log.exception("Failed to initialize OpenTelemetry tracing")


def instrument_fastapi(app) -> None:
    """Add automatic request tracing to a FastAPI app."""
    if _tracer is None:
        return
    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        FastAPIInstrumentor.instrument_app(app)
        log.info("FastAPI instrumented with OpenTelemetry")
    except ImportError:
        log.info("opentelemetry-instrumentation-fastapi not installed; skipping auto-instrumentation")
    except Exception:
        log.exception("Failed to instrument FastAPI")


@contextmanager
def span(name: str, attributes: dict[str, Any] | None = None) -> Generator[Any, None, None]:
    """Create a traced span. No-op when OTel is disabled."""
    if _tracer is None:
        yield _NOOP_SPAN
        return
    with _tracer.start_as_current_span(name) as s:
        if attributes:
            for k, v in attributes.items():
                s.set_attribute(k, v)
        yield s


def start_span(name: str, attributes: dict[str, Any] | None = None) -> Any:
    """Start a span manually (must call .end()). Returns a no-op span when OTel is disabled."""
    if _tracer is None:
        return _NOOP_SPAN
    s = _tracer.start_span(name)
    if attributes:
        for k, v in attributes.items():
            s.set_attribute(k, v)
    return s


def add_event(name: str, attributes: dict[str, Any] | None = None) -> None:
    """Add an event to the current active span."""
    if _tracer is None:
        return
    try:
        from opentelemetry import trace
        current = trace.get_current_span()
        if current:
            current.add_event(name, attributes=attributes)
    except Exception:
        pass


def set_attribute(key: str, value: Any) -> None:
    """Set an attribute on the current active span."""
    if _tracer is None:
        return
    try:
        from opentelemetry import trace
        current = trace.get_current_span()
        if current:
            current.set_attribute(key, value)
    except Exception:
        pass


def shutdown() -> None:
    """Flush and shut down the tracer provider."""
    if _tracer is None:
        return
    try:
        from opentelemetry import trace
        provider = trace.get_tracer_provider()
        if hasattr(provider, "shutdown"):
            provider.shutdown()
    except Exception:
        log.exception("Error shutting down OpenTelemetry")
