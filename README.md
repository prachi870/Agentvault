# Agentvault — Evidence-first enterprise knowledge workspace

Backend (FastAPI + LangGraph + LangChain + Qdrant + PostgreSQL + Redis + S3). See
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for architecture, phases and known limitations.
For the active Vercel + Render deployment setup, see [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Quick start (no Docker, no API keys)

PowerShell (Windows):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Bash:

```bash
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && python -m uvicorn app.main:app --reload
```

Defaults: SQLite file, embedded in-memory Qdrant (vectors are lost on restart; documents are re-indexable),
local disk storage, offline embeddings and an offline extractive "LLM". DOCX parsing is included in the
standard install; scanned-PDF OCR and PPTX parsing remain optional (`pip install -r requirements-parsers.txt`).
Then, in a second terminal:

```powershell
python scripts/seed_demo.py --base-url http://localhost:8000   # demo users, docs, sample questions
```

Interactive API docs: <http://localhost:8000/docs>

> Vectors live in memory by default, so they are lost when the server restarts. After a restart call `POST /api/v1/documents/reindex` (admin) to rebuild them from the stored files (connector-sourced documents: re-sync the connector). For persistence set `QDRANT_PATH=./data/qdrant` or `QDRANT_URL` (server / Qdrant Cloud).

## Full stack with Docker Compose

```bash
cp .env.example .env        # set SECRET_KEY / RECEIPT_SIGNING_KEY
docker compose up --build   # API behind Nginx on :80, Qdrant :6333, MinIO console :9001
```

## Real LLM / embeddings

```powershell
pip install -r requirements-llm.txt
$env:LLM_PROVIDER = "gemini"           # or openai / anthropic
$env:GOOGLE_API_KEY = "..."            # from Google AI Studio
$env:EMBEDDING_PROVIDER = "gemini"     # semantic retrieval; needs GOOGLE_API_KEY too
```

The local extractive model is an offline baseline, not a trained generative model: it selects supported
sentences but cannot reliably synthesize answers or understand broad paraphrases. For production-quality
generation and semantic retrieval, configure an approved LLM and embedding provider. Queries and retrieved
document excerpts are sent to the configured provider, so review its data-handling terms and your
organization's policy before enabling a hosted service.

If you switch embedding provider or model, the vector size changes: use a new `QDRANT_COLLECTION`, then call `POST /api/v1/documents/reindex` (and re-sync connectors).

## API (prefix `/api/v1`)

| Endpoint | Who | Purpose |
|---|---|---|
| `POST /auth/bootstrap` | anyone, once | Create first admin (409 afterwards) |
| `POST /auth/login`, `GET /auth/me` | all | JWT login (OAuth2 password form) |
| `POST/GET/PATCH /users` | admin | Manage users, roles, clearance |
| `POST /users/{id}/access-impact` | admin | Preview document access gained or lost before changing a user's role or clearance |
| `POST /documents` (multipart) | manager, admin | Upload + index; params: `classification`, `allowed_roles`, `source_type`, `source_updated_at` |
| `GET /documents`, `GET/DELETE /documents/{id}` | by access | Only documents you may see |
| `POST /documents/reindex` | admin | Rebuild vectors from stored originals |
| `POST /connectors`, `POST /connectors/{id}/sync` | admin | Directory / SQL connectors |
| `POST /query` | all | Agentic RAG answer: citations, confidence, grounding, plan, warnings, receipt id |
| `GET /receipts`, `GET /receipts/{id}`, `GET /receipts/{id}/verify` | owner / admin | Signed context receipts |
| `GET /dashboard/health` | manager, admin | AI health metrics |
| `GET /dashboard/knowledge-gaps`, `PATCH .../{id}/resolve` | manager, admin | Unanswered / low-confidence topics |
| `GET /dashboard/connectors` | manager, admin | Connector status + planned sources |
| `GET /health`, `GET /ready` | public | Liveness / readiness |

Roles: `viewer` (clearance 0) < `employee` (1) < `manager` (2) < `admin` (3, sees everything).
Classifications: `public`, `internal`, `confidential`, `restricted`. A document is visible when the user's clearance
≥ its classification **and** their role is in its `allowed_roles` (or `*`). Enforced in the Qdrant filter and re-checked after retrieval.

## Tests

```bash
cd backend
python -m pytest                                   # SQLite + embedded Qdrant, no services needed
# Against real services (what CI does):
TEST_DATABASE_URL=postgresql://esakip:esakip@localhost:5432/esakip_test \
TEST_REDIS_URL=redis://localhost:6379/0 TEST_QDRANT_URL=http://localhost:6333 python -m pytest
```

## Layout

```
backend/app/
  api/          routes + auth dependencies
  rag/          LangGraph pipeline: planner, grader, context, verifier, service (receipts, gaps)
  services/     ingestion, embeddings, llm, vector_store, storage, cache, rbac, injection, connectors/
  db/           SQLAlchemy models
backend/tests/  unit + API + connector + storage tests
deploy/nginx/   reverse-proxy config
```
