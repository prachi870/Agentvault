from fastapi import APIRouter

from app.api.routes import auth, connectors, conversations, dashboard, documents, evaluation, feedback, query, receipts, users, webhooks

api_router = APIRouter()
for module in (auth, users, documents, connectors, query, receipts, conversations, dashboard, webhooks, evaluation, feedback):
    api_router.include_router(module.router)
