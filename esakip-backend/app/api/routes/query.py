from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.prompt_injection import screen_user_query
from app.core.security import Principal, get_current_principal
from app.models.schemas import QueryRequest, QueryResponse
from app.services.receipts import build_receipt, save_receipt

router = APIRouter(tags=["query"])


@router.post("/query", response_model=QueryResponse)
async def query(
    payload: QueryRequest,
    request: Request,
    principal: Principal = Depends(get_current_principal),
):
    try:
        screen_user_query(payload.question)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    agent = request.app.state.agent_graph

    initial_state = {
        "query": payload.question,
        "principal": principal,
    }
    if payload.sources:
        initial_state["planned_sources"] = payload.sources

    final_state = await agent.ainvoke(initial_state)

    receipt = build_receipt(
        query=payload.question,
        user_id=principal.user_id,
        sources_queried=final_state.get("planned_sources", []),
        sources_denied=final_state.get("denied_sources", []),
        all_chunks=final_state.get("retrieved_chunks", []),
        used_chunks=final_state.get("used_chunks", []),
        confidence=final_state.get("confidence", 0.0),
        unsupported_claims=final_state.get("unsupported_claims", []),
    )
    save_receipt(receipt)

    return QueryResponse(
        answer=final_state.get("verified_answer", ""),
        confidence=final_state.get("confidence", 0.0),
        citations=receipt.citations,
        receipt_id=receipt.receipt_id,
        denied_sources=final_state.get("denied_sources", []),
        unsupported_claims=final_state.get("unsupported_claims", []),
    )
