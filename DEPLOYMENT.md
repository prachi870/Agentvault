# Vercel + Render Deployment

## Status

This project can be tried on free tiers for a demo, with significant durability and availability
limitations. No cloud service configuration or live deployment has been verified. See
[`RENDER_FREE_DEPLOYMENT.md`](./RENDER_FREE_DEPLOYMENT.md) before creating Render resources.

The root `docker-compose.yml` remains for local development. [`render.yaml`](./render.yaml) creates a
free Render API and Postgres for demos; the Next.js frontend is hosted on Vercel and proxies API
requests using [`frontend/next.config.mjs`](./frontend/next.config.mjs).

## Free demo services

The free Render Blueprint creates:

- One FastAPI web service from `backend/Dockerfile`.
- One Render Postgres database.

Configure these external dependencies in the Render API service:

- A secured Qdrant Cloud cluster and API key.
- Durable S3-compatible object storage, such as Cloudflare R2.
- A Google AI Studio API key. Gemini is configured for generation and embeddings.

On the free plan, the API sleeps when idle, its local filesystem is ephemeral, and the included
Postgres database expires after 30 days (with a 14-day recovery period before deletion). There is
no worker service; Redis is omitted so queued jobs fall back to inline execution. Do not use this
setup for important or sensitive data. Details and step-by-step configuration are in
[`RENDER_FREE_DEPLOYMENT.md`](./RENDER_FREE_DEPLOYMENT.md).

## Local checks

From the repository root:

```powershell
docker compose config
docker compose build
```

These checks validate local containers only; they do not provision or verify Render, Vercel, Qdrant,
or object-storage accounts.
