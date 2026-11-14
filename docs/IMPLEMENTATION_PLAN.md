# Agentvault — Implementation Plan

Enterprise Secure Agentic Knowledge Intelligence Platform: an agentic RAG platform that plans retrieval across
enterprise sources, verifies evidence, enforces permissions, and answers with citations and confidence.

## Stack (from the original project overview)

| Concern | Choice | Notes |
|---|---|---|
| Orchestration | **LangGraph** + **LangChain** | Graph = the agent; LangChain for splitters, messages, provider adapters |
| Vector DB | **Qdrant** (embedded in dev/tests, Qdrant Cloud in prod) | RBAC enforced in the query filter |
| Relational | **PostgreSQL** | Users, documents, connectors, receipts, knowledge gaps |
| Cache / limits | **Redis** | Rate limiting, query-embedding cache |
| Object store | **S3** (MinIO in dev) | Original files |
| Edge | **Vercel** in production; **Nginx** in local Docker Compose | API rewrite, TLS, local reverse proxy |
| Dev / CI / Prod | **Docker Compose** / **GitHub Actions** / **Vercel + Render** | |

The overview's "Technology Stack" heading is empty in the file, so the above is inferred from the rest of the
document. **Assumption to confirm:** API framework = **FastAPI**; frontend (not yet built) = React/Next.js.

## Architecture

```
Client ──> Nginx ──> FastAPI ──> QueryService ──> LangGraph pipeline
                        │                            guard_input → plan → retrieve → grade ─┬→ engineer_context
                        │                                              ▲                    │      → generate → verify → finalize
                        │                                              └── rewrite ◄────────┘ (weak evidence, retry once)
                        ├─ PostgreSQL  (users, documents, receipts, gaps, connectors)
                        ├─ Qdrant      (chunks + payload: allowed_roles, clearance_level, source_type, updated_at)
                        ├─ Redis       (rate limits, embedding cache)
                        └─ S3          (raw files)
```

## Feature → implementation map

| Feature (overview) | How it is built |
|---|---|
| Multi-source retrieval | Uniform ingestion path; connectors yield `RawItem`s tagged with `source_type`; planner adds source hints |
| Agentic planning (LangGraph) | `plan` node decomposes the question, picks source hints; `rewrite` node + conditional retry loop |
| Hallucination reduction | Evidence grading before generation → grounded-only prompt → claim-level verification → unsupported sentences removed → abstain if nothing survives |
| Context engineering | Dedupe (Jaccard), per-document cap, char budget, freshness annotations, delimiter neutralisation, numbered blocks |
| Enterprise security | JWT auth; role + clearance RBAC pushed into Qdrant filter **and** re-checked in Python; heuristic prompt-injection detection on queries and retrieved chunks (quarantine); 404-not-403 on hidden docs; read-only SQL connector; path-confined directory connector; rate limits |
| Context receipts | HMAC-signed JSON per query: plan, candidates + scores + text hashes, dropped chunks, context blocks, verification, security events, timings; `/receipts/{id}/verify` |
| Knowledge gap analytics | Abstentions / low-confidence answers aggregated per normalised query with occurrence counts; auto-resolved when later answered |
| AI health dashboard | `/dashboard/health`: answer/abstain/block rates, avg confidence & grounding, p50/p95 latency, injection events, stale-source rate, component status |

## Phases

Status legend: ✅ built and tested · 🟡 partial · ⏳ not started

### Phase 0 — Foundations ✅
Repo layout, settings, Docker Compose (API, Postgres, Redis, Qdrant, MinIO, Nginx), GitHub Actions CI (unit + integration against real services), Dockerfile.

### Phase 1 — Core backend ✅
Auth (bootstrap admin, login, users), RBAC model (roles × classification/clearance × per-document `allowed_roles`), document upload (PDF/TXT/MD/HTML/CSV/JSON/DOCX), chunking, embeddings (offline hash embedder; OpenAI optional), Qdrant store, S3/local storage.

### Phase 2 — Agentic RAG pipeline ✅
LangGraph graph, planner, evidence grader, context builder, LLM adapters (offline extractive baseline; OpenAI/Anthropic via LangChain), claim verifier, confidence scoring, abstention, receipts, knowledge gaps, health dashboard.

### Phase 3 — Enterprise connectors 🟡
- ✅ Directory connector (synced SharePoint/Drive exports, network shares) and read-only SQL connector, with incremental re-index by content hash and removal of source-deleted docs.
- ⏳ Native API connectors: Confluence, Jira, Notion, SharePoint (Graph API), Google Drive, email (IMAP/Graph). Each needs OAuth/service-account handling and **ACL mirroring** (map source permissions → `allowed_roles`/clearance) — this is the hard part, not the fetching.
- ⏳ Scheduled sync (cron / worker) and webhooks for freshness.

### Phase 4 — Quality and hardening ✅
1. ✅ **Evaluation harness**: golden Q&A set (21 cases) with answer accuracy, citation precision, abstention correctness, RBAC leak tests. `eval/run_eval.py --fail-under 1.0` gates CI.
2. ✅ Real embeddings + hybrid retrieval (dense + BM25 sparse in Qdrant via RRF) + cross-encoder reranker (`rag/reranker.py`).
3. ✅ Alembic migrations configured; `AUTO_CREATE_TABLES=false` enforced in prod (`validate_for_prod`).
4. ✅ Background workers (Redis-backed RQ queue, `workers/queue.py`); OCR for scanned PDFs (`pytesseract`, optional); DOCX parsing (`python-docx`, standard install); PPTX parsing (`python-pptx`, optional).
5. ✅ Endpoint to change a document's classification/roles and update Qdrant payloads in place (`ingestion.update_access`).
6. ✅ SSE streaming (`rag/service.run_stream`), audit log table (`core/audit.py`), OpenTelemetry traces (`core/tracing.py`), structured JSON logs (`core/logging.JSONFormatter`).
7. ✅ Stronger injection defence: TF-IDF + logistic-regression classifier ensemble (`services/injection_classifier.py`) + NLI-based claim verifier (`services/nli.py`, `rag/verifier.py`); multi-tenant isolation (`tenant_id` on all models, `rbac.same_tenant`).

### Phase 5 — Frontend ✅
React/Next.js: chat with inline citations and confidence, receipt viewer, knowledge-gap and health dashboards, connector admin, document manager. Full Next.js App Router app in `frontend/` with premium dark-mode design, SSE streaming, Docker + Nginx integration.

### Phase 6 — Production deployment 🟡
The active deployment target is Vercel for the Next.js frontend and Render for the FastAPI API,
worker, Postgres, and Key Value. The Render Blueprint and Vercel API proxy are maintained in
`render.yaml` and `frontend/next.config.mjs`. **Remaining**: provision cloud services and secrets,
connect the Git integrations, and verify a live deployment. See [DEPLOYMENT.md](../DEPLOYMENT.md).

### Phase 7 — Future scope ✅
- ✅ **Multi-agent collaboration**: supervisor agent with complexity analysis, specialist sub-agents (research, synthesis, fact-check, comparison, temporal), configurable merge strategies (`rag/agents/supervisor.py`).
- ✅ **Multilingual support**: language detection (13 languages, character-set + word patterns), LLM-based translation, cross-language prompt adaptation (`services/language.py`).
- ✅ **AI governance and compliance reports**: structured reports from receipt data covering quality, security, RBAC, data freshness, knowledge gaps, with pass/fail thresholds and recommendations (`services/governance.py`).
- ✅ **Model evaluation and cost optimisation**: per-query token counting, cost estimation from provider pricing tables, cost breakdown by operation and model, budget monitoring (`services/cost_tracker.py`).
- ⏳ Fine-tuned enterprise models (requires training data collection and model fine-tuning infrastructure).

## Known limitations of the current build
- The default `local` LLM is an **extractive baseline** (picks matching sentences); it cannot synthesise or reason. Use `LLM_PROVIDER=openai|anthropic|gemini` for real answers.
- The default `hash` embedder is lexical, not semantic. Thresholds (`MIN_EVIDENCE_SCORE`, `MIN_CONFIDENCE`, `CLAIM_SUPPORT_THRESHOLD`) were tuned against the small test corpus only and **must be re-tuned** with real embeddings and the Phase 4 evaluation set.
- Claim verification uses both lexical (word-overlap + number matching) and NLI (when sentence-transformers is installed). The NLI model catches paraphrase-level contradictions but is a small model — a fine-tuned NLI or LLM judge would be stronger.
- Prompt-injection detection uses regex heuristics + TF-IDF/LR ensemble; it is two layers, not a guarantee.
- Multi-agent collaboration routing is heuristic-based; an LLM-based supervisor would make better routing decisions.
- Multilingual language detection uses character/word heuristics; a dedicated langid model would be more accurate.
- Cost tracking uses token estimation (chars/4); tiktoken provides accurate counts for OpenAI models only.
- Connector sync runs inline or via RQ workers (fine for medium sources; very large corpora need a distributed pipeline).
- Document listing filters access in Python after loading rows (fine at MVP scale).
- Multi-tenant isolation adds `tenant_id` columns but tenant management UI is not yet built.
