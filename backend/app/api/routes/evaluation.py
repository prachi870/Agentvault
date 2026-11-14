from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_container, get_db, rate_limit_query, require_roles, to_principal
from app.db.models import Document, EvaluationCase, User
from app.schemas.evaluation import (
    EvaluationCaseCreate,
    EvaluationCaseOut,
    EvaluationCaseUpdate,
    EvaluationRunOut,
    EvaluationRunRequest,
    EvaluationRunResult,
    EvaluationSourceCheck,
    EvaluationSourceOut,
    EvaluationPhraseCheck,
)
from app.services.container import Container

router = APIRouter(prefix="/evaluation", tags=["evaluation"])
MAX_CASES_PER_RUN = 50


def _case_scope(statement, user: User, container: Container):
    if container.settings.multi_tenant_enabled:
        statement = statement.where(EvaluationCase.tenant_id == user.tenant_id)
    return statement


def _case_out(db: Session, case: EvaluationCase) -> EvaluationCaseOut:
    docs = {
        doc.id: doc.title
        for doc in db.scalars(select(Document).where(Document.id.in_(case.expected_document_ids or []))).all()
    }
    return EvaluationCaseOut(
        id=case.id,
        title=case.title,
        question=case.question,
        expected_sources=[
            EvaluationSourceOut(id=doc_id, title=docs.get(doc_id, "Deleted source"))
            for doc_id in case.expected_document_ids or []
        ],
        required_phrases=case.required_phrases or [],
        last_result=case.last_result,
        last_run_at=case.last_run_at,
        created_at=case.created_at,
    )


def _validate_sources(
    db: Session, document_ids: list[str], user: User, container: Container
) -> None:
    statement = select(Document).where(
        Document.id.in_(document_ids),
        Document.status == "indexed",
        Document.chunk_count > 0,
    )
    if container.settings.multi_tenant_enabled:
        statement = statement.where(Document.tenant_id == user.tenant_id)
    found = {doc.id for doc in db.scalars(statement).all()}
    if found != set(document_ids):
        raise HTTPException(422, "Each expected source must be an indexed document in your workspace.")


def _get_case(db: Session, case_id: str, user: User, container: Container) -> EvaluationCase:
    statement = _case_scope(select(EvaluationCase).where(EvaluationCase.id == case_id), user, container)
    case = db.scalar(statement)
    if not case:
        raise HTTPException(404, "Evaluation case not found.")
    return case


@router.get("/cases", response_model=list[EvaluationCaseOut])
def list_evaluation_cases(
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    statement = _case_scope(select(EvaluationCase).order_by(EvaluationCase.created_at.desc()), user, container)
    return [_case_out(db, case) for case in db.scalars(statement).all()]


@router.post("/cases", response_model=EvaluationCaseOut, status_code=201)
def create_evaluation_case(
    body: EvaluationCaseCreate,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    existing_count = db.scalar(
        _case_scope(select(func.count()).select_from(EvaluationCase), user, container)
    ) or 0
    if existing_count >= MAX_CASES_PER_RUN:
        raise HTTPException(422, f"A workspace can have at most {MAX_CASES_PER_RUN} evaluation cases.")
    _validate_sources(db, body.expected_document_ids, user, container)
    case = EvaluationCase(
        owner_id=user.id,
        tenant_id=user.tenant_id if container.settings.multi_tenant_enabled else None,
        title=body.title,
        question=body.question,
        expected_document_ids=list(dict.fromkeys(body.expected_document_ids)),
        required_phrases=body.required_phrases,
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    return _case_out(db, case)


@router.put("/cases/{case_id}", response_model=EvaluationCaseOut)
def update_evaluation_case(
    case_id: str,
    body: EvaluationCaseUpdate,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    case = _get_case(db, case_id, user, container)
    _validate_sources(db, body.expected_document_ids, user, container)
    case.title = body.title
    case.question = body.question
    case.expected_document_ids = list(dict.fromkeys(body.expected_document_ids))
    case.required_phrases = body.required_phrases
    case.last_result = None
    case.last_run_at = None
    db.commit()
    db.refresh(case)
    return _case_out(db, case)


@router.delete("/cases/{case_id}", status_code=204)
def delete_evaluation_case(
    case_id: str,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    case = _get_case(db, case_id, user, container)
    db.delete(case)
    db.commit()
    return Response(status_code=204)


@router.post("/run", response_model=EvaluationRunOut, dependencies=[Depends(rate_limit_query)])
def run_evaluation_cases(
    body: EvaluationRunRequest,
    user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
    container: Container = Depends(get_container),
):
    statement = _case_scope(select(EvaluationCase), user, container)
    if body.case_ids:
        statement = statement.where(EvaluationCase.id.in_(body.case_ids))
    elif (db.scalar(_case_scope(select(func.count()).select_from(EvaluationCase), user, container)) or 0) > MAX_CASES_PER_RUN:
        raise HTTPException(422, f"Run at most {MAX_CASES_PER_RUN} cases at a time.")
    else:
        statement = statement.order_by(EvaluationCase.created_at.asc())
    cases = db.scalars(statement).all()
    if body.case_ids and len(cases) != len(set(body.case_ids)):
        raise HTTPException(404, "One or more evaluation cases were not found.")

    results = []
    for case in cases:
        response = container.query_service.run(
            db,
            to_principal(user),
            case.question,
            answer_mode="detailed",
            record=False,
        )
        cited_ids = {citation.doc_id for citation in response.citations}
        docs = {
            doc.id: doc.title
            for doc in db.scalars(select(Document).where(Document.id.in_(case.expected_document_ids or []))).all()
        }
        source_checks = [
            EvaluationSourceCheck(
                id=doc_id,
                title=docs.get(doc_id, "Deleted source"),
                matched=doc_id in cited_ids,
            )
            for doc_id in case.expected_document_ids or []
        ]
        phrase_checks = [
            EvaluationPhraseCheck(phrase=phrase, matched=phrase.casefold() in response.answer.casefold())
            for phrase in case.required_phrases or []
        ]
        passed = (
            response.status == "answered"
            and all(item.matched for item in source_checks)
            and all(item.matched for item in phrase_checks)
        )
        result = EvaluationRunResult(
            case_id=case.id,
            title=case.title,
            passed=passed,
            status=response.status,
            answer=response.answer,
            sources=source_checks,
            phrases=phrase_checks,
            confidence=response.confidence,
            grounding=response.grounding,
            latency_ms=response.latency_ms,
        )
        case.last_run_at = datetime.now(timezone.utc)
        case.last_result = {
            "passed": passed,
            "status": response.status,
            "matched_sources": sum(item.matched for item in source_checks),
            "total_sources": len(source_checks),
            "matched_phrases": sum(item.matched for item in phrase_checks),
            "total_phrases": len(phrase_checks),
            "confidence": response.confidence,
            "grounding": response.grounding,
            "latency_ms": response.latency_ms,
        }
        results.append(result)
    db.commit()
    passed_count = sum(result.passed for result in results)
    return EvaluationRunOut(
        total=len(results),
        passed=passed_count,
        failed=len(results) - passed_count,
        results=results,
    )
