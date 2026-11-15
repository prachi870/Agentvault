# Free-tier demo deployment

This setup runs the AgentVault API and PostgreSQL on Render's free plans, and the Next.js frontend
on Vercel's free plan. It is for demos and portfolio use, not production or sensitive data.

## What is and is not free

The Render Blueprint provisions one free API web service and one free PostgreSQL database. The
frontend can be deployed on Vercel for free. Qdrant Cloud, an S3-compatible object store such as
Cloudflare R2, and Google AI Studio are external services; check their current free quotas and terms
before use. The application cannot preserve uploaded files on Render's ephemeral filesystem.

Render's free API sleeps after 15 minutes without traffic, may take about a minute to wake, has
512 MB RAM, and can restart. Free Render Postgres is limited to 1 GB and expires after 30 days; after
a further 14-day recovery window, Render deletes it. Free Postgres has no backups. Render's free
Key Value also loses its data on restart, so this setup does not use it.

The API uses in-process caching and runs queued connector/reindex jobs inline. This is suitable only
for a small demo: long syncs or large reindexes can time out. There is no separate free Render worker
plan. The app still needs a secured Qdrant Cloud cluster and durable S3-compatible object storage.

## Deploy the Render services

1. Push the repository to GitHub and connect it to Render.
2. Select **New > Blueprint**, choose the repository and the `release-readiness` branch, and review
   `render.yaml`. It creates `agentvault-api-free` and `agentvault-postgres-free`, both on Render's
   free plan.
3. During Blueprint setup, provide the following for `agentvault-api-free`:
   - `QDRANT_URL` and `QDRANT_API_KEY` from Qdrant Cloud.
   - `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, and
     `AWS_SECRET_ACCESS_KEY` from your S3-compatible provider.
   - `GOOGLE_API_KEY` from Google AI Studio.
4. For Cloudflare R2, use `S3_REGION=auto` and an endpoint such as
   `https://<account-id>.r2.cloudflarestorage.com`. For AWS S3, set the region and bucket; leave
   `S3_ENDPOINT_URL` empty.
5. Render generates strong values for `SECRET_KEY` and `RECEIPT_SIGNING_KEY`. Keep these values
   private and stable.
6. The Blueprint uses `/health` as Render's liveness check and runs Alembic migrations in the API's
   start command. This avoids Render's paid-only pre-deploy migration feature.
7. Wait for the API deploy to finish. Open `https://<render-api-host>/health`; it should return
   `{"status":"ok"}`. Then open `/ready`; all dependency checks must be `true` before using the app.

`/health` only confirms that the API process is alive; it does not prove that the database, vector
store, or object storage is working. If `/ready` reports `503`, its JSON body identifies the failed
dependency. Check that service's URL, credentials, network access, and availability. Do not treat
changing the Render health path as a fix for a failing `/ready` dependency.

### If you already created paid resources

The free Blueprint uses separate `-free` resource names to avoid silently changing the existing
services. Render does not automatically delete resources removed from a Blueprint. After confirming
the new free API works, review the Render Dashboard and manually stop or remove any unused paid API,
worker, Key Value, or database services. Do not remove a database until you have decided whether to
keep or discard its data.

### For a manually created Render web service

If you prefer to reuse the service shown in your Render Dashboard instead of creating the Blueprint,
set its instance type to **Free**, use the `backend` directory as its root/build context and
`Dockerfile` as its Dockerfile, then set the Docker command to:

```sh
sh -c 'alembic -c alembic.ini upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers --forwarded-allow-ips="*"'
```

Set its health check path to `/health`. Set `FREE_TIER_MODE=true`, configure the database and
external-service variables listed above, and do not set `REDIS_URL` unless you also deploy and
operate a worker that consumes the queue.

## Deploy the frontend on Vercel

1. Import the same GitHub repository into Vercel and set **Root Directory** to `frontend`.
2. Set `API_PROXY_TARGET` in Vercel's Production and Preview environments to the Render API origin,
   for example `https://agentvault-api-free.onrender.com` (no trailing slash or path).
3. Deploy the frontend and use the Vercel URL to sign in.

## First use and verification

1. Open the Vercel app's `/bootstrap` page and create a unique administrator password. Do not use
   sample credentials from old guides or share this password.
2. Sign in, upload a small test document, and ask a question about it.
3. Check that `/ready` reports all dependencies healthy and that document retrieval works after
   waking the Render service.
4. Avoid real personal, confidential, or regulated information on this free demo setup.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the Vercel/Render overview and current release status.
