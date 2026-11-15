# Free-tier demo deployment

This setup runs the AgentVault API on Render's free plan, uses Supabase PostgreSQL as an external
database, and hosts the Next.js frontend on Vercel's free plan. It is for demos and portfolio use,
not production or sensitive data.

## What is and is not free

The Render Blueprint provisions one free API web service. Supabase PostgreSQL, Qdrant Cloud, an
S3-compatible object store such as Cloudflare R2, and Google AI Studio are external services; check
their current free quotas and terms before use. The frontend can be deployed on Vercel for free.
The application cannot preserve uploaded files on Render's ephemeral filesystem.

Render's free API sleeps after 15 minutes without traffic, may take about a minute to wake, has
512 MB RAM, and can restart. Supabase plan limits, pausing behavior, and backups are governed by
Supabase; review its current terms. Render's free Key Value loses its data on restart, so this setup
does not use it.

The API uses in-process caching and runs queued connector/reindex jobs inline. This is suitable only
for a small demo: long syncs or large reindexes can time out. There is no separate free Render worker
plan. The app still needs a secured Qdrant Cloud cluster and durable S3-compatible object storage.

## Deploy the Render services

1. Push the repository to GitHub and connect it to Render.
2. Select **New > Blueprint**, choose the repository and the `release-readiness` branch, and review
   `render.yaml`. It creates the `agentvault-api-free` web service; it does not create a Render
   database.
3. During Blueprint setup, provide the following for `agentvault-api-free`:
   - `DATABASE_URL` from Supabase. Use the **Session pooler** connection string for Render and
     require TLS with `sslmode=require`. The direct database host may not be reachable from Render.
     URL-encode special characters in the database password.
   - `QDRANT_URL` and `QDRANT_API_KEY` from Qdrant Cloud.
   - `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, and
     `AWS_SECRET_ACCESS_KEY` from your S3-compatible provider.
   - `GOOGLE_API_KEY` from Google AI Studio.
4. For Cloudflare R2, use `S3_REGION=auto` and an endpoint such as
   `https://<account-id>.r2.cloudflarestorage.com`. For AWS S3, set the region and bucket; leave
   `S3_ENDPOINT_URL` empty. The AWS access key must allow `s3:ListBucket` on the bucket and
   `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on its objects. For other S3-compatible
   providers, set their documented S3 endpoint.
5. Render generates strong values for `SECRET_KEY` and `RECEIPT_SIGNING_KEY`. Keep these values
   private and stable.
6. The image's startup script runs Alembic migrations before starting the API. Leave Render's
   **Docker Command** override blank so it uses the command in `backend/Dockerfile`. The Blueprint
   uses `/health` as Render's liveness check; this avoids the paid-only pre-deploy command feature.
7. Wait for the API deploy to finish. Open `https://<render-api-host>/health`; it should return
   `{"status":"ok"}`. Then open `/ready`; all dependency checks must be `true` before using the app.

`/health` only confirms that the API process is alive; it does not prove that the database, vector
store, or object storage is working. If `/ready` reports `503`, its JSON body identifies the failed
dependency. Check that service's URL, credentials, network access, and availability. Do not treat
changing the Render health path as a fix for a failing `/ready` dependency.

### If you already created paid resources

Render does not automatically delete resources removed from a Blueprint. After confirming the free
API works, review the Render Dashboard and stop or remove any unused paid API, worker, Key Value, or
database services. Do not remove a database until you have decided whether to keep or discard its
data.

### For a manually created Render web service

If you prefer to reuse the service shown in your Render Dashboard instead of creating the Blueprint,
set its instance type to **Free**, use the `backend` directory as its root/build context and
`Dockerfile` as its Dockerfile. Leave the **Docker Command** override blank so the image runs its
startup script, which applies Alembic migrations before starting the API. If a command override is
already set, clear it and save the service settings.

Set its health check path to `/health`. Set `FREE_TIER_MODE=true`, configure `DATABASE_URL` using
the Supabase guidance above, and configure the external-service variables listed above. Do not set
`REDIS_URL` unless you also deploy and operate a worker that consumes the queue.

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
