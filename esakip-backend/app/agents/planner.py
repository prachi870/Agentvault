"""
Agentic Planning with LangGraph — the planner node.

Given the user's question, decides:
  - which enterprise sources are plausibly relevant (so we don't fan a
    simple HR question out to Jira and SQL for no reason)
  - whether the question should be decomposed into sub-questions (useful
    for "compare X across the last two quarters' reports" style asks)

The current implementation is a fast heuristic keyword router so the
pipeline is runnable with zero LLM calls. Replace `plan` with an LLM-backed
planner (LangChain chat model + structured output) once a provider/model is
chosen — the interface (query in, sources+sub-questions out) doesn't change.
"""

from app.agents.state import AgentState

_SOURCE_KEYWORDS = {
    "local_files": [],  # always included as the baseline/default source
    "sharepoint": ["policy", "hr", "onboarding", "handbook"],
    "confluence": ["design doc", "architecture", "runbook", "spec"],
    "jira": ["ticket", "bug", "sprint", "issue"],
    "notion": ["notes", "roadmap", "meeting notes"],
    "sql": ["revenue", "metric", "database", "report number"],
    "email": ["thread", "email", "sent me"],
}


def plan(state: AgentState) -> AgentState:
    query_lower = state["query"].lower()

    sources = ["local_files"]
    for source, keywords in _SOURCE_KEYWORDS.items():
        if source == "local_files":
            continue
        if any(kw in query_lower for kw in keywords):
            sources.append(source)

    # TODO(LLM planner): decompose multi-part questions into sub_questions
    # and let the retriever run each sub-question independently before the
    # context engineering step merges results. Left as a single
    # pass-through sub-question for now.
    return {
        **state,
        "planned_sources": sources,
        "sub_questions": [state["query"]],
    }
