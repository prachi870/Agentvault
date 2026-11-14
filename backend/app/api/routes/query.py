from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.responses import StreamingResponse

from app.api.deps import get_container, get_db, get_principal, rate_limit_query
from app.db.models import Conversation
from app.schemas.query import QueryRequest, QueryResponse
from app.services.container import Container
from app.services.rbac import Principal

router = APIRouter(tags=["query"])


def _validate_conversation(conversation_id: str | None, user_id: str, db: Session) -> None:
    if conversation_id and not db.scalar(
        select(Conversation.id).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    ):
        raise HTTPException(404, "Conversation not found")


@router.post("/query", response_model=QueryResponse, dependencies=[Depends(rate_limit_query)])
def query(body: QueryRequest, principal: Principal = Depends(get_principal), db: Session = Depends(get_db),
          container: Container = Depends(get_container)):
    _validate_conversation(body.conversation_id, principal.user_id, db)
    return container.query_service.run(
        db, principal, body.question.strip(), body.answer_mode, body.context_titles, body.excluded_chunk_ids,
        body.conversation_id,
    )


def _sse(event: dict) -> str:
    data = {**event}
    if "response" in data:
        data["response"] = json.loads(data["response"].model_dump_json())
    return f"data: {json.dumps(data)}\n\n"


@router.post("/query/stream", dependencies=[Depends(rate_limit_query)])
def query_stream(body: QueryRequest, principal: Principal = Depends(get_principal), db: Session = Depends(get_db),
                 container: Container = Depends(get_container)):
    """Server-Sent Events version of /query (Phase 4). Emits `progress` events as each pipeline
    stage completes, then one `result` event with the full, verified QueryResponse - see
    QueryService.run_stream for why the answer itself is not token-streamed."""
    _validate_conversation(body.conversation_id, principal.user_id, db)

    def gen():
        for event in container.query_service.run_stream(
            db, principal, body.question.strip(), body.answer_mode, body.context_titles,
            body.excluded_chunk_ids, body.conversation_id,
        ):
            yield _sse(event)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
