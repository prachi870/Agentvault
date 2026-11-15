# Vercel + Render Deployment

## Status

This project can be tried on free tiers for a demo, with significant durability and availability
limitations. The live API health and dependency checks currently pass, but `/ready` does not verify
the application schema. Sign-in previously failed because the `users` table was missing; the
migration-on-startup fix is prepared locally and must be deployed before sign-in can be verified.
See [`RENDER_FREE_DEPLOYMENT.md`](./RENDER_FREE_DEPLOYMENT.md) for deployment steps.

The root `docker-compose.yml` remains for local development. [`render.yaml`](./render.yaml) creates a
free Render API for demos; Supabase provides PostgreSQL, and the Next.js frontend is hosted on Vercel
and proxies API requests using [`frontend/next.config.mjs`](./frontend/next.config.mjs).

## Free demo services

The free Render Blueprint creates:

- One FastAPI web service from `backend/Dockerfile`.

Configure these dependencies in the Render API service:

- Supabase PostgreSQL via `DATABASE_URL` (use the Session pooler connection string).
- A secured Qdrant Cloud cluster and API key.
- Durable S3-compatible object storage, such as Cloudflare R2.
- A Google AI Studio API key. Gemini is configured for generation and embeddings.

On the free plan, the API sleeps when idle and its local filesystem is ephemeral. Supabase database
limits and availability depend on its plan. There is no worker service; Redis is omitted so queued
jobs fall back to inline execution. Do not use this setup for important or sensitive data. Details
and step-by-step configuration are in
[`RENDER_FREE_DEPLOYMENT.md`](./RENDER_FREE_DEPLOYMENT.md).

## Local checks

From the repository root:

```powershell
docker compose config
docker compose build
```

These checks validate local containers only; they do not provision or verify Render, Vercel, Qdrant,
or object-storage accounts.
