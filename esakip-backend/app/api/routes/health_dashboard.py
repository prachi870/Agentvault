"""
AI Health Dashboard: a read model over connector liveness + receipt history.
A frontend can poll this to show connector uptime, average confidence,
query volume, and top knowledge gaps in one view.
"""

from fastapi import APIRouter, Request

from app.models.schemas import GapReport
from app.services.gap_analytics import compute_gap_report

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/connectors")
async def connector_health(request: Request):
    connectors = request.app.state.connectors
    last_errors = getattr(request.app.state.agent_retriever, "last_errors", {})
    results = {}
    for name, connector in connectors.items():
        try:
            healthy = await connector.health_check()
        except Exception as exc:
            healthy = False
            last_errors[name] = str(exc)
        results[name] = {
            "healthy": healthy,
            "last_error": last_errors.get(name),
        }
    return results


@router.get("/knowledge-gaps", response_model=GapReport)
async def knowledge_gaps():
    return compute_gap_report()
