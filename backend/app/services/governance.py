"""AI Governance and Compliance Reports (Phase 7).

Generates structured compliance reports from the receipt and audit data, covering:
- Query volume and answer quality trends
- RBAC enforcement verification
- Prompt injection incident reports
- Knowledge gap analysis
- Data freshness compliance
- Model usage and cost summary

These reports satisfy enterprise AI governance requirements by providing auditable,
time-bounded evidence of how the AI system behaved.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.db.base import as_utc, utcnow
from app.db.models import AuditLog, Document, KnowledgeGap, Receipt, User

log = logging.getLogger(__name__)


@dataclass
class ComplianceMetric:
    """A single compliance metric with pass/fail status."""
    name: str
    description: str
    value: float | int | str
    threshold: float | int | str | None = None
    status: str = "info"  # pass | fail | warning | info


@dataclass
class GovernanceReport:
    """A complete AI governance report for a time window."""
    report_id: str
    generated_at: str
    window_start: str
    window_end: str
    window_days: int
    summary: dict = field(default_factory=dict)
    quality_metrics: list[ComplianceMetric] = field(default_factory=list)
    security_metrics: list[ComplianceMetric] = field(default_factory=list)
    rbac_metrics: list[ComplianceMetric] = field(default_factory=list)
    data_metrics: list[ComplianceMetric] = field(default_factory=list)
    knowledge_metrics: list[ComplianceMetric] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)
    overall_status: str = "pass"  # pass | warning | fail


# --- Compliance thresholds ---
ANSWER_RATE_MIN = 0.50          # at least 50% of queries should get answers
CONFIDENCE_AVG_MIN = 0.55       # average confidence should be above 55%
GROUNDING_AVG_MIN = 0.60        # average grounding should be above 60%
INJECTION_RATE_MAX = 0.05       # injection events should be < 5% of queries
STALE_DOCS_RATE_MAX = 0.20      # stale documents should be < 20% of corpus
KNOWLEDGE_GAP_GROWTH_MAX = 10   # max new open gaps per report window


def generate_governance_report(
    db: Session, settings: Settings, days: int = 30
) -> GovernanceReport:
    """Generate a comprehensive AI governance and compliance report."""
    from app.db.models import new_id

    now = utcnow()
    since = now - timedelta(days=days)

    report = GovernanceReport(
        report_id=new_id(),
        generated_at=now.isoformat(),
        window_start=since.isoformat(),
        window_end=now.isoformat(),
        window_days=days,
    )

    # --- Query Volume & Quality ---
    receipts = db.execute(
        select(
            Receipt.status, Receipt.confidence, Receipt.grounding,
            Receipt.latency_ms, Receipt.injection_events, Receipt.used_stale_source
        ).where(Receipt.created_at >= since)
    ).all()

    total = len(receipts)
    answered = [r for r in receipts if r.status == "answered"]
    abstained = [r for r in receipts if r.status == "abstained"]
    blocked = [r for r in receipts if r.status == "blocked"]

    answer_rate = len(answered) / total if total else 0.0
    avg_confidence = sum(r.confidence for r in answered) / len(answered) if answered else 0.0
    avg_grounding = sum(r.grounding for r in answered) / len(answered) if answered else 0.0
    stale_answer_rate = sum(r.used_stale_source for r in answered) / len(answered) if answered else 0.0

    report.summary = {
        "total_queries": total,
        "answered": len(answered),
        "abstained": len(abstained),
        "blocked": len(blocked),
        "answer_rate": round(answer_rate, 3),
        "avg_confidence": round(avg_confidence, 3),
        "avg_grounding": round(avg_grounding, 3),
    }

    # Quality metrics
    report.quality_metrics = [
        ComplianceMetric(
            name="Answer Rate",
            description="Percentage of queries that received an answer",
            value=round(answer_rate * 100, 1),
            threshold=ANSWER_RATE_MIN * 100,
            status="pass" if answer_rate >= ANSWER_RATE_MIN else "warning",
        ),
        ComplianceMetric(
            name="Average Confidence",
            description="Mean confidence score across answered queries",
            value=round(avg_confidence * 100, 1),
            threshold=CONFIDENCE_AVG_MIN * 100,
            status="pass" if avg_confidence >= CONFIDENCE_AVG_MIN else "warning",
        ),
        ComplianceMetric(
            name="Average Grounding",
            description="Mean grounding score (claim verification rate)",
            value=round(avg_grounding * 100, 1),
            threshold=GROUNDING_AVG_MIN * 100,
            status="pass" if avg_grounding >= GROUNDING_AVG_MIN else "warning",
        ),
        ComplianceMetric(
            name="Stale Source Usage",
            description="Percentage of answers that cited outdated sources",
            value=round(stale_answer_rate * 100, 1),
            threshold=STALE_DOCS_RATE_MAX * 100,
            status="pass" if stale_answer_rate <= STALE_DOCS_RATE_MAX else "warning",
        ),
    ]

    # --- Security metrics ---
    total_injection_events = sum(r.injection_events for r in receipts)
    injection_rate = total_injection_events / total if total else 0.0

    report.security_metrics = [
        ComplianceMetric(
            name="Prompt Injection Events",
            description="Total prompt injection detections in the period",
            value=total_injection_events,
            status="pass" if total_injection_events == 0 else "warning",
        ),
        ComplianceMetric(
            name="Injection Rate",
            description="Injection events as percentage of total queries",
            value=round(injection_rate * 100, 2),
            threshold=INJECTION_RATE_MAX * 100,
            status="pass" if injection_rate <= INJECTION_RATE_MAX else "fail",
        ),
        ComplianceMetric(
            name="Blocked Queries",
            description="Queries blocked by security policy",
            value=len(blocked),
            status="info",
        ),
    ]

    # --- RBAC metrics ---
    user_count = db.scalar(select(func.count()).select_from(User)) or 0
    role_dist = db.execute(
        select(User.role, func.count()).group_by(User.role)
    ).all()
    role_summary = {role: count for role, count in role_dist}

    report.rbac_metrics = [
        ComplianceMetric(
            name="Total Users",
            description="Number of registered users",
            value=user_count,
            status="info",
        ),
        ComplianceMetric(
            name="Role Distribution",
            description="Users per role",
            value=str(role_summary),
            status="info",
        ),
        ComplianceMetric(
            name="Admin Count",
            description="Number of admin users (should be minimal)",
            value=role_summary.get("admin", 0),
            threshold=5,
            status="pass" if role_summary.get("admin", 0) <= 5 else "warning",
        ),
    ]

    # --- Data freshness metrics ---
    doc_rows = db.execute(
        select(Document.source_updated_at, Document.status, Document.classification)
    ).all()
    total_docs = len(doc_rows)
    stale_cutoff = now - timedelta(days=settings.stale_after_days)
    stale_docs = sum(1 for d in doc_rows if as_utc(d.source_updated_at) < stale_cutoff)
    stale_rate = stale_docs / total_docs if total_docs else 0.0

    classification_dist = {}
    for d in doc_rows:
        classification_dist[d.classification] = classification_dist.get(d.classification, 0) + 1

    report.data_metrics = [
        ComplianceMetric(
            name="Total Documents",
            description="Documents in the knowledge base",
            value=total_docs,
            status="info",
        ),
        ComplianceMetric(
            name="Stale Documents",
            description=f"Documents not updated in {settings.stale_after_days} days",
            value=stale_docs,
            threshold=f"<{STALE_DOCS_RATE_MAX * 100}% of total",
            status="pass" if stale_rate <= STALE_DOCS_RATE_MAX else "warning",
        ),
        ComplianceMetric(
            name="Classification Distribution",
            description="Documents per classification level",
            value=str(classification_dist),
            status="info",
        ),
    ]

    # --- Knowledge gap metrics ---
    open_gaps = db.scalar(
        select(func.count()).select_from(KnowledgeGap)
        .where(KnowledgeGap.status == "open")
    ) or 0
    new_gaps = db.scalar(
        select(func.count()).select_from(KnowledgeGap)
        .where(KnowledgeGap.first_seen >= since, KnowledgeGap.status == "open")
    ) or 0
    resolved_gaps = db.scalar(
        select(func.count()).select_from(KnowledgeGap)
        .where(KnowledgeGap.status == "resolved")
    ) or 0

    report.knowledge_metrics = [
        ComplianceMetric(
            name="Open Knowledge Gaps",
            description="Unanswered topics in the knowledge base",
            value=open_gaps,
            status="warning" if open_gaps > 20 else "pass",
        ),
        ComplianceMetric(
            name="New Gaps This Period",
            description=f"Knowledge gaps opened in the last {days} days",
            value=new_gaps,
            threshold=KNOWLEDGE_GAP_GROWTH_MAX,
            status="pass" if new_gaps <= KNOWLEDGE_GAP_GROWTH_MAX else "warning",
        ),
        ComplianceMetric(
            name="Resolved Gaps (All Time)",
            description="Knowledge gaps that were later resolved by new content",
            value=resolved_gaps,
            status="info",
        ),
    ]

    # --- Recommendations ---
    if answer_rate < ANSWER_RATE_MIN:
        report.recommendations.append(
            f"Answer rate ({answer_rate:.0%}) is below target ({ANSWER_RATE_MIN:.0%}). "
            "Consider adding documents for frequently asked topics (see Knowledge Gaps)."
        )
    if avg_confidence < CONFIDENCE_AVG_MIN:
        report.recommendations.append(
            f"Average confidence ({avg_confidence:.0%}) is below target ({CONFIDENCE_AVG_MIN:.0%}). "
            "Review retrieval settings (chunk size, evidence thresholds) or upgrade embeddings."
        )
    if stale_rate > STALE_DOCS_RATE_MAX:
        report.recommendations.append(
            f"{stale_docs} documents ({stale_rate:.0%}) are stale. "
            "Schedule connector re-syncs or manually update outdated sources."
        )
    if injection_rate > INJECTION_RATE_MAX:
        report.recommendations.append(
            f"High injection event rate ({injection_rate:.1%}). "
            "Review blocked queries for false positives and consider tuning thresholds."
        )
    if open_gaps > 20:
        report.recommendations.append(
            f"{open_gaps} open knowledge gaps. "
            "Prioritize adding content for the most frequently occurring gaps."
        )
    if not report.recommendations:
        report.recommendations.append("All governance metrics are within acceptable thresholds.")

    # --- Overall status ---
    all_metrics = (
        report.quality_metrics + report.security_metrics +
        report.rbac_metrics + report.data_metrics + report.knowledge_metrics
    )
    if any(m.status == "fail" for m in all_metrics):
        report.overall_status = "fail"
    elif any(m.status == "warning" for m in all_metrics):
        report.overall_status = "warning"
    else:
        report.overall_status = "pass"

    return report


def report_to_dict(report: GovernanceReport) -> dict:
    """Serialize a GovernanceReport to a dict for JSON output."""
    def metric_dict(m: ComplianceMetric) -> dict:
        d = {"name": m.name, "description": m.description, "value": m.value, "status": m.status}
        if m.threshold is not None:
            d["threshold"] = m.threshold
        return d

    return {
        "report_id": report.report_id,
        "generated_at": report.generated_at,
        "window": {
            "start": report.window_start,
            "end": report.window_end,
            "days": report.window_days,
        },
        "overall_status": report.overall_status,
        "summary": report.summary,
        "quality": [metric_dict(m) for m in report.quality_metrics],
        "security": [metric_dict(m) for m in report.security_metrics],
        "rbac": [metric_dict(m) for m in report.rbac_metrics],
        "data_freshness": [metric_dict(m) for m in report.data_metrics],
        "knowledge": [metric_dict(m) for m in report.knowledge_metrics],
        "recommendations": report.recommendations,
    }
