# ESAKIP Backend

Enterprise Secure Agentic Knowledge Intelligence Platform — backend service.

This is a working MVP scaffold for the platform described in the project
overview. It is intentionally modular: every "Unique Feature" from the
overview has a corresponding module that currently does the simplest thing
that could work, so it can be deepened independently without reworking the
architecture.

## Feature → Module map

| Feature (from overview)                     | Module                                   |
|----------------------------------------------|-------------------------------------------|
| Multi-Source Enterprise Knowledge Retrieval   | `app/connectors/*`, `app/services/retriever.py` |
| Agentic Planning with LangGraph               | `app/agents/graph.py`, `app/agents/planner.py` |
| Hallucination Reduction Engine                | `app/agents/verifier.py` |
| Context Engineering Pipeline                  | `app/services/context_engineering.py` |
| Enterprise Security (RBAC + Prompt Injection) | `app/core/security.py`, `app/core/prompt_injection.py` |
| Context Receipts                              | `app/services/receipts.py` |
| Knowledge Gap Analytics                       | `app/services/gap_analytics.py` |
| AI Health Dashboard                           | `app/api/routes/health_dashboard.py` |

## Architecture

```
Client
  │
  ▼
FastAPI (app/main.py)
  │  ── auth/RBAC middleware (app/core/security.py)
  │  ── prompt-injection screen (app/core/prompt_injection.py)
  ▼
LangGraph agent (app/agents/graph.py)
  1. Planner        — decomposes the question, picks which sources to query
  2. Retriever       — fans out to connectors + vector store, permission-filtered
  3. Context Engine  — dedupes, ranks, compresses retrieved chunks into a context budget
  4. Verifier         — checks each claim in the draft answer against retrieved evidence,
                         attaches a confidence score, flags unsupported claims
  5. Receipt builder  — records exactly which chunks/sources backed the final answer
  ▼
Response: { answer, citations[], confidence, context_receipt, knowledge_gaps[] }
```

## Stack

- **API**: FastAPI + Uvicorn
- **Agent orchestration**: LangGraph + LangChain
- **Vector store**: Qdrant (local via Docker Compose; Qdrant Cloud in prod)
- **Relational store**: PostgreSQL (users, roles, documents metadata, audit log, receipts)
- **Cache / task queue backing**: Redis
- **Object storage**: S3 (or local disk in dev, via `app/services/storage.py`)
- **Dev orchestration**: Docker Compose
- **Prod**: AWS (EC2/ECS), Qdrant Cloud, RDS Postgres, ElastiCache Redis, S3, Nginx, GitHub Actions CI/CD

## Running locally

```bash
cp .env.example .env
docker compose up --build
```

The API will be at `http://localhost:8000`, docs at `/docs`.

## Frontend

The live-ops dashboard (`frontend/index.html`) is served directly by the
FastAPI app at `/` — same origin as every endpoint it calls, so there's no
CORS or separate deploy step in normal use. Open `http://localhost:8000/`
after starting the API.

It's wired to the real backend, not simulated data:
- Submitting a question in the input box calls `POST /query` for real and
  animates the actual pipeline result (verified / low-confidence / RBAC-blocked).
- `GET /dashboard/connectors` drives the connector health panel — including
  showing a connector's last error (e.g. once you wire embeddings, an auth
  failure shows up here instead of failing silently).
- `GET /receipts` (polled every 5s) feeds the query log, confidence gauge,
  RBAC alerts, and knowledge-gap panel, so it also picks up queries made by
  other clients hitting the API directly.
- `GET /dashboard/knowledge-gaps` backs the knowledge-gap summary.

Until an embedding model is wired in (see `app/services/vectorstore.py`),
every query will come back as "not enough evidence" with 0 confidence —
that's the correct, honest behavior of an unindexed system, not a bug.

## What's stubbed vs. real

- **Real**: FastAPI app wiring, LangGraph pipeline shape, RBAC-based retrieval
  filtering logic, Qdrant client wrapper, request/response schemas, Docker Compose
  topology.
- **Stubbed (clearly marked `TODO`)**: actual connector auth for SharePoint/
  Confluence/Jira/Notion/email/SQL (currently a local-files connector is
  implemented as the reference example), the LLM calls inside planner/verifier
  (wired to call an LLM via LangChain but you must supply an API key/model),
  and persistence migrations for Postgres (schema is defined, Alembic not yet
  wired).

## Suggested build order

1. Get `/query` working end-to-end against the local-files connector only, with a real LLM key — validates the LangGraph pipeline shape.
2. Add one real enterprise connector (recommend Confluence or SharePoint first — both have mature LangChain loaders).
3. Wire RBAC to a real identity source (even a static role table in Postgres is enough to start).
4. Build out the Hallucination Reduction Engine's verifier prompt + scoring.
5. Layer in Context Receipts and Knowledge Gap Analytics — both are mostly logging/aggregation once the pipeline is solid.
6. AI Health Dashboard last — it's a read model over the logs the pipeline already produces.
