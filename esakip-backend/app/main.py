from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.agents.graph import build_agent_graph
from app.api.routes import health, health_dashboard, query, receipts
from app.connectors.registry import build_connector_registry
from app.services.vectorstore import VectorStoreClient

FRONTEND_INDEX = Path(__file__).resolve().parent.parent / "frontend" / "index.html"


@asynccontextmanager
async def lifespan(app: FastAPI):
    vector_store = VectorStoreClient()
    connectors = build_connector_registry(vector_store)
    agent_graph, agent_retriever = build_agent_graph(connectors)

    app.state.vector_store = vector_store
    app.state.connectors = connectors
    app.state.agent_graph = agent_graph
    # Exposed separately (not just buried in the graph closure) so
    # /dashboard/connectors can read per-connector error state.
    app.state.agent_retriever = agent_retriever

    yield
    # No explicit teardown needed yet; add connection closes here as
    # real connectors/DB pools are added.


app = FastAPI(
    title="ESAKIP — Enterprise Secure Agentic Knowledge Intelligence Platform",
    description="Agentic RAG backend: plans retrieval across enterprise sources, "
    "verifies evidence, enforces RBAC, and returns grounded, cited answers.",
    version="0.1.0",
    lifespan=lifespan,
)

# Dev-permissive CORS so the dashboard can be served separately (e.g. a
# different port, or opened as a static file) during development. Same-origin
# requests (the default — see the "/" route below) don't need this at all.
# TODO: restrict allow_origins to your real frontend origin(s) in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(query.router)
app.include_router(receipts.router)
app.include_router(health_dashboard.router)


@app.get("/", include_in_schema=False)
async def dashboard():
    """Serves the live-ops dashboard directly from the API — same origin as
    every endpoint it calls, so no CORS or CSP hoops in normal deployment."""
    return FileResponse(FRONTEND_INDEX)
