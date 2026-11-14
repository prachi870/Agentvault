from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SampleDocument:
    slug: str
    title: str
    content: str


SAMPLE_LIBRARY_VERSION = "v1"

SAMPLE_DOCUMENTS = (
    SampleDocument(
        slug="employee-leave",
        title="Demo: Employee Leave and Remote Work",
        content="""DEMO DATA - FICTIONAL POLICY
This document is sample content for testing Agentvault. It is not a real company policy.

Northstar Demo Company provides eligible full-time employees with 18 paid time-off days per calendar year. PTO accrues at 1.5 days per month. Employees may carry over up to 4 unused PTO days into the next calendar year; carried days must be used by March 31.

Submit planned PTO requests at least 5 business days before the first day away. A manager must approve the request before travel is booked. Sick leave is separate from PTO and provides 6 paid days per calendar year.

Employees may work remotely up to 2 days per week with manager approval. Teams may set shared in-office days. Remote work does not change standard working hours or data-handling requirements.
""",
    ),
    SampleDocument(
        slug="travel-expenses",
        title="Demo: Travel and Expense Policy",
        content="""DEMO DATA - FICTIONAL POLICY
This document is sample content for testing Agentvault. It is not a real company policy.

Northstar Demo Company employees must receive manager approval before booking business travel. The standard domestic lodging limit is 200 dollars per night before taxes. The meal reimbursement limit is 55 dollars per travel day.

Submit an expense report within 10 calendar days after returning from travel. Attach an itemized receipt for every individual expense above 25 dollars. Expenses above 750 dollars require written approval before purchase.

Managers should review complete expense reports within 5 business days. Personal purchases, alcohol, traffic fines, and expenses without a business purpose are not reimbursable.
""",
    ),
    SampleDocument(
        slug="security-incident-response",
        title="Demo: Security and Incident Response",
        content="""DEMO DATA - FICTIONAL POLICY
This document is sample content for testing Agentvault. It is not a real company policy.

Northstar Demo Company requires multi-factor authentication for all company accounts. Passwords must be at least 14 characters and must not be shared. Use the approved password manager for unique passwords.

Report a suspected phishing message through the Security Portal within 30 minutes. Do not click its links, open attachments, or forward it to coworkers. If credentials may have been entered on a suspicious page, change the password immediately and notify Security.

Report lost company devices, unexpected account access, or accidental data disclosure to the Security team immediately. Include when it happened, which device or account was involved, and what information may be affected. Do not delete potential evidence.
""",
    ),
    SampleDocument(
        slug="support-escalation",
        title="Demo: Customer Support Escalation Guide",
        content="""DEMO DATA - FICTIONAL PROCEDURE
This document is sample content for testing Agentvault. It is not a real company procedure.

Northstar Demo Company classifies customer support cases by impact. Severity 1 means a broad service outage or confirmed data exposure; acknowledge it within 15 minutes and provide customer updates at least every 30 minutes. Notify the on-call lead immediately.

Severity 2 means a major feature is unavailable for multiple customers; acknowledge it within 1 business hour and update the customer at least every 2 hours. Severity 3 means a limited feature issue with a workaround; acknowledge it within 4 business hours and provide one update each business day. Severity 4 covers general how-to questions and should receive a response within 1 business day.

Escalate any suspected security or privacy incident immediately, regardless of its severity label. Before escalating a regular technical case, record the affected account, the steps to reproduce the issue, the time it occurred, and any troubleshooting already completed.
""",
    ),
)
