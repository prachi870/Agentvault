# Agentvault Deployment Guide

## Current status

The repository contains an AWS ECS/Fargate deployment workflow, but this project has not been
deployed to AWS. The task definitions still need to be matched to real AWS resources, and the
production environment variables and secrets below must be configured before a release can succeed.
Do not treat a successful local build as proof of a production deployment.

The root `docker-compose.yml` is for local development only. It uses development service settings
and is not a production deployment configuration.

## Production services

The API requires:

- PostgreSQL, with schema changes applied by Alembic.
- Shared Redis, used for rate limits, cache, and queued connector/reindex jobs.
- A secured Qdrant service and API key.
- S3-compatible object storage.
- A configured cloud model provider. The included ECS task definition uses Gemini.

The production settings validator fails at API/worker startup when these services, secrets, or
providers are missing. Keep `AUTO_CREATE_TABLES=false`; the release workflow runs migrations before
updating the application services.

## AWS resources

Create and configure these resources before enabling a production release:

- ECR repositories: `esakip-api` and `esakip-frontend`.
- ECS cluster: `esakip-prod` (or set the `ECS_CLUSTER` environment variable).
- ECS services: `esakip-api-service`, `esakip-worker-service`, and
  `esakip-frontend-service`.
- Fargate task execution and application roles referenced by the task definitions.
- CloudWatch log groups: `/ecs/esakip-api`, `/ecs/esakip-worker`, and `/ecs/esakip-frontend`.
- PostgreSQL, Redis, Qdrant, S3, and the named AWS Secrets Manager entries referenced by
  `deploy/ecs/api-task-definition.json` and `deploy/ecs/worker-task-definition.json`.
- Private subnets and a security group that permits the tasks to reach the database, Redis,
  S3, Qdrant, and model provider. Provide NAT or suitable service endpoints for outbound access.
- Application Load Balancer target groups/listeners for the API (port 8000) and frontend (port
  3000). Route API requests to the API service and other requests to the frontend.

The API and worker task definitions use the same production secrets:

`esakip/prod/secret-key`, `esakip/prod/receipt-signing-key`,
`esakip/prod/database-url`, `esakip/prod/redis-url`, `esakip/prod/qdrant-url`,
`esakip/prod/qdrant-api-key`, and `esakip/prod/google-api-key`.

Use long, unique values for both signing secrets. Restrict task roles to the required S3 bucket
and Secrets Manager resources.

## GitHub environment configuration

Configure a GitHub environment named `production` and set:

**Environment secret**

- `AWS_ROLE_ARN`: IAM role assumed by GitHub Actions through OIDC. Configure its trust policy for
  this repository and the `production` GitHub environment; do not use static AWS access keys.

**Environment variables**

- `AWS_REGION`: region containing the ECR/ECS resources and task secrets.
- `ECS_CLUSTER`: optional; defaults to `esakip-prod`.
- `ECS_SUBNETS`: comma-separated private subnet IDs used for the one-off migration task.
- `ECS_SECURITY_GROUPS`: comma-separated security group IDs for that task.
- `PUBLIC_API_URL`: optional public API base URL; when set, CD checks its `/ready` endpoint.

The AWS role needs permissions to push to the two ECR repositories, describe the configured Secrets
Manager entries, register task definitions, run and inspect the migration task, update the three
ECS services, and wait for service stability. It also needs `iam:PassRole` for the ECS task roles.
Configure GitHub environment protection/required reviewers if production releases need approval.

## CI and release workflow

- CI runs backend tests, frontend lint/build, and Docker image builds on pull requests and pushes to
  `main`.
- CD runs only after a successful CI workflow on `main`, or when manually dispatched from `main`.
- CD builds and pushes versioned images, runs `alembic -c alembic.ini upgrade head` as a one-off
  Fargate task, then deploys the worker, API, and frontend services.
- Feature branch pushes do not deploy to production.

For CI/CD details, see `.github/workflows/ci.yml` and `.github/workflows/cd.yml`.

## Background jobs and scheduled sync

Connector and reindex jobs use the `esakip-sync` Redis queue. The ECS worker service consumes that
queue. Keep at least one worker task running when using queued jobs.

The API task definition leaves `SCHEDULER_ENABLED=false` to prevent duplicate schedulers when the
API scales horizontally. Periodic connector scheduling is not enabled by this ECS setup; enable it
only after deploying a single dedicated scheduler process.

## Local checks

From the repository root, validate the development Compose file and build the local images:

```powershell
docker compose config
docker compose build
```

These checks do not contact AWS or verify cloud credentials, network access, production secrets,
ECS services, or a live deployment.
