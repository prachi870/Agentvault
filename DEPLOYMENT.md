# Vercel + Render Deployment

## Status

This repository is prepared for a Vercel frontend and Render API/worker. No cloud services have
been provisioned and no live deployment has been verified. A successful CI run is not proof of a
live deployment.

The root `docker-compose.yml` remains for local development. Render's production services are
defined in [`render.yaml`](./render.yaml); the frontend's production API proxy is configured in
[`frontend/next.config.mjs`](./frontend/next.config.mjs).

## Services required

The Render Blueprint creates:

- A FastAPI web service and a background worker from `backend/Dockerfile`.
- Render Postgres and a private Render Key Value instance.

You must also provide:

- A secured Qdrant Cloud cluster and API key.
- An S3-compatible bucket. AWS S3 and Cloudflare R2 are supported; R2 requires its endpoint URL.
- A Google AI Studio API key. Gemini is configured for generation and embeddings.

The Blueprint uses paid baseline plans for the API, worker, Postgres, and persistent Key Value.
Review Render's current pricing before creating the Blueprint. Render's free services are not a
production substitute: free web services sleep, free Postgres expires, and free Key Value has no
persistence. Render requires a paid web-service plan for the configured pre-deploy migration.

## Deploy the backend and worker on Render

1. Push this repository to GitHub and connect it to Render.
2. In Render, choose **New > Blueprint**, select the repository and the branch to deploy, then
   review the resources in `render.yaml` before confirming. The region is set to Ohio; change it
   consistently for the services and database if another region is preferred.
3. During initial Blueprint setup, provide the prompted values for both `agentvault-api` and
   `agentvault-worker`:
   - `QDRANT_URL` and `QDRANT_API_KEY`
   - `S3_BUCKET`, `S3_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`
   - `GOOGLE_API_KEY`
4. Use the same credentials and bucket settings for the API and worker. For AWS S3, leave
   `S3_ENDPOINT_URL` unset. For Cloudflare R2, add `S3_ENDPOINT_URL` to both services (for example,
   `https://<account-id>.r2.cloudflarestorage.com`) and set `S3_REGION=auto`.
5. Render generates shared `SECRET_KEY` and `RECEIPT_SIGNING_KEY` values for the API and worker.
   Keep them private and do not replace them with short or development values.
6. The API's pre-deploy command runs `alembic -c alembic.ini upgrade head` before startup.
   Confirm the API reaches `https://<render-api-host>/ready`; the response must report all
   dependencies healthy. The worker should remain running and consume the `esakip-sync` queue.

If you add a new `sync: false` variable after the Blueprint's first creation, Render does not
prompt again; add it manually to both services in the Render Dashboard.

## Deploy the frontend on Vercel

1. Import the same GitHub repository into Vercel and set the project **Root Directory** to
   `frontend`.
2. Add `API_PROXY_TARGET` to the Vercel Production and Preview environments. Its value must be the
   Render API origin only, such as `https://agentvault-api.onrender.com` (no path or trailing API
   prefix).
3. Deploy. The Next.js rewrite forwards `/api/*` to Render while keeping browser requests
   same-origin. A Vercel build fails clearly if `API_PROXY_TARGET` is missing or malformed.

Keep the frontend and API on compatible branches. Vercel Git integration handles frontend builds;
Render's Blueprint uses `autoDeployTrigger: checksPass` so backend deploys wait for GitHub checks.
The former AWS/ECS release workflow has been removed. GitHub Actions now validates tests, lint,
builds, and Docker images; it does not deploy to AWS.

## First-run and smoke checks

1. After the API is healthy, create the first administrator once through
   `POST /api/v1/auth/bootstrap`; the endpoint is disabled after the first admin exists.
2. Sign in through the Vercel URL.
3. Verify document upload, chat, saved conversations, and a streamed answer. Confirm the uploaded
   document persists after a Render redeploy.
4. Check the Render API's `/health` (liveness) and `/ready` (dependency readiness) endpoints.

Do not share a résumé link until these checks pass against the actual deployed services. No
Render/Vercel account credentials or service URLs are stored in this repository.

## Local checks

From the repository root:

```powershell
docker compose config
docker compose build
```

These checks validate local containers only; they do not provision or verify Render, Vercel, Qdrant,
or object-storage accounts.
