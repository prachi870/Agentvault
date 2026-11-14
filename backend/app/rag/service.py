"""QueryService: runs the graph, builds + signs the context receipt, records knowledge gaps.

Phase 7 additions: cost tracking per query, multilingual support, multi-agent routing.
"""
from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timezone
from typing import Iterator

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.security import sha256_hex
from app.core.tracing import span as otel_span
from app.core.text import tokenize
from app.db.models import Conversation, Document, Receipt, ReceiptEvidence, new_id
from app.rag.graph import RAGDeps, build_graph, confidence_label
from app.rag.planner import heuristic_plan
from app.schemas.query import CitationOut, QueryResponse
from app.services.analytics import record_gap, resolve_gaps_for_answered
from app.services.cost_tracker import QueryCostBreakdown, get_cost_tracker
from app.services.rbac import Principal, can_access, clearance_level
from app.services.receipts import sign_receipt

log = logging.getLogger(__name__)


class QueryService:
    def __init__(self, settings: Settings, deps: RAGDeps) -> None:
        self.settings, self.deps = settings, deps
        self.graph = build_graph(deps)
        self.cost_tracker = get_cost_tracker(enabled=settings.cost_tracking_enabled)

    def run(
        self, db: Session, principal: Principal, question: str, answer_mode: str = "detailed",
        context_titles: list[str] | None = None, excluded_chunk_ids: list[str] | None = None,
        conversation_id: str | None = None, record: bool = True,
    ) -> QueryResponse:
        with otel_span("query.run", {"query.length": len(question)}):
            t0 = time.perf_counter()
            receipt_id = new_id()

            # Phase 7: cost tracking
            cost = self.cost_tracker.start_query(receipt_id, self.deps.llm.name, self.deps.embedder.name) if record else None

            # Phase 7: multilingual — detect and optionally translate
            query_lang, display_question = self._handle_multilingual(question)
            retrieval_question, excluded = self._follow_up_context(
                display_question, context_titles or [], excluded_chunk_ids or []
            )

            state = self.graph.invoke({
                "question": retrieval_question, "answer_mode": answer_mode, "principal": principal,
                "title_doc_ids": self._title_doc_ids(db, principal, retrieval_question),
                "excluded_chunk_ids": excluded,
                "events": [], "timings": {},
            })
            latency_ms = int((time.perf_counter() - t0) * 1000)

            # Track costs for the query
            if cost is not None:
                self._track_query_costs(cost, state, display_question)
                self.cost_tracker.finish_query(cost)

            return self._finalize(
                db, principal, question, receipt_id, latency_ms, state, cost, query_lang, answer_mode, conversation_id,
                persist=record,
            )

    def run_stream(
        self, db: Session, principal: Principal, question: str, answer_mode: str = "detailed",
        context_titles: list[str] | None = None, excluded_chunk_ids: list[str] | None = None,
        conversation_id: str | None = None,
    ) -> Iterator[dict]:
        """Generator used by the SSE endpoint (Phase 4). Yields `{"type": "progress", ...}` as each
        pipeline stage completes, then a final `{"type": "result", "response": QueryResponse}`.

        Verification happens after generation, so the answer text itself is not safe to stream
        token-by-token (it can still be trimmed by the verifier); stage-level progress is what is
        streamed live, and the verified answer arrives in a single "result" event at the end. Clients
        that want a typing effect can animate the reveal of that final answer client-side.
        """
        t0 = time.perf_counter()
        receipt_id = new_id()
        cost = self.cost_tracker.start_query(receipt_id, self.deps.llm.name, self.deps.embedder.name)

        # Phase 7: multilingual
        query_lang, display_question = self._handle_multilingual(question)
        retrieval_question, excluded = self._follow_up_context(
            display_question, context_titles or [], excluded_chunk_ids or []
        )

        state: dict = {
            "question": retrieval_question, "answer_mode": answer_mode, "principal": principal,
            "title_doc_ids": self._title_doc_ids(db, principal, retrieval_question),
            "excluded_chunk_ids": excluded,
            "events": [], "timings": {},
        }
        try:
            for update in self.graph.stream(state, stream_mode="updates"):
                for node_name, node_out in update.items():
                    state = {**state, **node_out}
                    yield {"type": "progress", "stage": node_name}
        except Exception:
            log.exception("streamed query failed")
            yield {"type": "error", "message": "The query pipeline failed unexpectedly."}
            return
        latency_ms = int((time.perf_counter() - t0) * 1000)

        self._track_query_costs(cost, state, display_question)
        self.cost_tracker.finish_query(cost)

        response = self._finalize(
            db, principal, question, receipt_id, latency_ms, state, cost, query_lang, answer_mode, conversation_id
        )
        yield {"type": "result", "response": response}

    @staticmethod
    def _follow_up_context(
        question: str, context_titles: list[str], excluded_chunk_ids: list[str]
    ) -> tuple[str, list[str]]:
        follow_up = re.search(
            r"\b(?:what else|tell me more|more details|more information|can you elaborate|"
            r"elaborate on that|go deeper|expand on that|what about that)\b",
            question,
            re.IGNORECASE,
        )
        titles = list(dict.fromkeys(title.strip() for title in context_titles if title.strip()))[:3]
        if not follow_up or not titles:
            return question, []
        contextualized = f"Tell me more about {', '.join(titles)}. {question}"
        return contextualized, list(dict.fromkeys(excluded_chunk_ids))[:16]

    def _title_doc_ids(self, db: Session, principal: Principal, question: str) -> list[str]:
        """Find visible documents explicitly named in broad or short title-style questions."""
        intent = any(phrase in question.casefold() for phrase in (
            "tell me about", "tell me more about", "explain", "describe", "summarize", "summary", "overview",
        ))
        terms = set(tokenize(question, do_stem=False))
        question_form = any(token in terms for token in ("what", "which", "who", "when", "where", "why", "how"))
        if not intent and (question_form or len(terms) > 3):
            return []
        if not terms:
            return []

        title_conditions = [func.lower(Document.title).like(f"%{term}%") for term in terms]
        statement = select(Document).where(
            Document.status == "indexed",
            Document.chunk_count > 0,
            or_(*title_conditions),
        )
        if self.settings.multi_tenant_enabled:
            statement = statement.where(Document.tenant_id == principal.tenant_id)
        documents = db.scalars(statement.limit(100)).all()

        query_tokens = set(tokenize(question))
        visible = [
            (len(query_tokens & set(tokenize(doc.title))), doc.id)
            for doc in documents
            if can_access(principal, doc.allowed_roles or [], clearance_level(doc.classification))
        ]
        visible.sort(key=lambda item: (-item[0], item[1]))
        return [doc_id for overlap, doc_id in visible if overlap > 0][:10]

    def _handle_multilingual(self, question: str) -> tuple[str, str]:
        """Detect language and return (detected_lang, question_for_retrieval).
        When multilingual is disabled, returns ("en", original_question)."""
        if not self.settings.multilingual_enabled:
            return "en", question
        try:
            from app.services.language import detect_language
            detection = detect_language(question)
            if detection.needs_translation:
                log.info("Detected language: %s (confidence=%.2f)", detection.language, detection.confidence)
                # For retrieval, we keep the original query — the embedder handles cross-language
                # The language info is used to instruct the LLM to respond in the user's language
                return detection.language, question
            return detection.language, question
        except Exception:
            log.exception("Language detection failed")
            return "en", question

    def _track_query_costs(self, cost: QueryCostBreakdown, state: dict, question: str) -> None:
        """Estimate and record costs for the pipeline stages."""
        if not self.cost_tracker.enabled:
            return
        # Embedding costs (query embeddings)
        plan = state.get("plan")
        if plan:
            queries = plan.sub_queries
            self.cost_tracker.track_embedding(cost, queries, self.deps.embedder.name)

        # LLM generation costs
        answer = state.get("answer", "")
        if answer and state.get("status") == "answered":
            # Build approximate input (question + context)
            blocks = state.get("blocks", [])
            context_text = "\n".join(b.text for b in blocks) if blocks else ""
            input_text = question + "\n" + context_text
            self.cost_tracker.track_llm_call(cost, self.deps.llm.name, input_text, answer, "generate")

        # LLM planning costs (if LLM planner was used)
        if plan and plan.planner == "llm":
            self.cost_tracker.track_llm_call(cost, self.deps.llm.name, question, str(plan.sub_queries), "plan")

    def _finalize(
        self, db: Session, principal: Principal, question: str, receipt_id: str,
        latency_ms: int, state: dict, cost: QueryCostBreakdown | None = None,
        query_lang: str = "en", answer_mode: str = "detailed", conversation_id: str | None = None,
        persist: bool = True,
    ) -> QueryResponse:
        status = state["status"]
        blocks = state.get("blocks", [])
        cited = set(state.get("cited", []))
        confidence = float(state.get("confidence", 0.0))
        grounding = float(state.get("grounding", 0.0))
        events = state.get("events", [])
        plan = state.get("plan")
        plan_dict = {"sub_queries": plan.sub_queries, "source_hints": plan.source_hints, "rationale": plan.rationale, "planner": plan.planner} if plan else {}

        citations = [
            CitationOut(index=b.n, doc_id=b.doc_id, chunk_id=b.chunk_id, title=b.title, source_type=b.source_type,
                        snippet=b.text[:240], updated_at=b.updated_at, score=b.score, stale=b.stale)
            for b in blocks if status == "answered" and b.n in cited
        ]
        receipt_created_at = datetime.now(timezone.utc)
        payload = {
            "version": 2,  # bumped from 1 to 2 for Phase 7 additions
            "receipt_id": receipt_id,
            "created_at": receipt_created_at.isoformat(),
            "user": {"id": principal.user_id, "role": principal.role, "department": principal.department, "clearance": principal.clearance,
                     "tenant_id": principal.tenant_id},  # Phase 4: multi-tenant
            "query": question,
            "citations": [citation.model_dump(mode="json") for citation in citations],
            "answer_mode": answer_mode,
            "query_language": query_lang,  # Phase 7: multilingual
            "plan": plan_dict,
            "retrieval": {
                "attempts": state.get("attempt", 0) + 1 if plan else 0,
                "candidates": [
                    {"chunk_id": e.chunk_id, "doc_id": e.doc_id, "title": e.title, "source_type": e.source_type, "cosine": e.cosine,
                     "relevance": e.relevance, "freshness": e.freshness, "score": e.score, "stale": e.stale,
                     "text_sha256": sha256_hex(e.text)}
                    for e in state.get("evidence", [])
                ],
                "dropped": state.get("dropped", []),
            },
            "context": {
                "blocks": [{"n": b.n, "chunk_id": b.chunk_id, "doc_id": b.doc_id, "text_sha256": sha256_hex(b.text)} for b in blocks],
                "stats": state.get("context_stats", {}),
            },
            "generation": {"model": self.deps.llm.name, "answer_sha256": sha256_hex(state.get("answer", ""))},
            "verification": state.get("verification", {}),
            "security": {"events": events},
            "outcome": {"status": status, "abstain_reason": state.get("abstain_reason"), "confidence": confidence,
                        "confidence_label": confidence_label(confidence), "grounding": grounding,
                        "cited_blocks": sorted(cited), "answer": state.get("answer", ""), "warnings": state.get("warnings", []),
                        "answer_mode": answer_mode},
            "timings_ms": {**state.get("timings", {}), "total": latency_ms},
            "cost": cost.to_dict() if cost else None,  # Phase 7: cost tracking
        }
        injection_events = sum(1 for e in events if e["type"].startswith("prompt_injection"))
        if persist:
            conversation = db.get(Conversation, conversation_id) if conversation_id else None
            db.add(Receipt(
                id=receipt_id, user_id=principal.user_id, query=question, status=status, confidence=confidence, grounding=grounding,
                latency_ms=latency_ms, injection_events=injection_events,
                used_stale_source=any(c.stale for c in citations), payload=payload, signature=sign_receipt(payload, self.settings.receipt_signing_key),
                conversation_id=conversation.id if conversation else None, created_at=receipt_created_at,
            ))
            if conversation:
                conversation.updated_at = receipt_created_at
            if status == "answered":
                cited_document_ids = {
                    block.doc_id for block in blocks if block.n in cited
                }
                db.add_all(
                    ReceiptEvidence(
                        receipt_id=receipt_id,
                        document_id=document_id,
                        tenant_id=principal.tenant_id,
                        created_at=receipt_created_at,
                    )
                    for document_id in cited_document_ids
                )
            if status == "abstained":
                record_gap(db, question, state.get("abstain_reason") or "no_evidence", receipt_id)
            elif status == "answered":
                if confidence < 0.5:
                    record_gap(db, question, "low_confidence", receipt_id)
                else:
                    resolve_gaps_for_answered(db, question, receipt_id)
            db.commit()

        return QueryResponse(
            receipt_id=receipt_id, status=status, answer_mode=answer_mode, answer=state.get("answer", ""), confidence=confidence,
            confidence_label=confidence_label(confidence), grounding=grounding, abstain_reason=state.get("abstain_reason"),
            citations=citations, warnings=state.get("warnings", []), plan=plan_dict, latency_ms=latency_ms,
        )
