from langgraph.graph import END, StateGraph

from app.agents.generator import generate
from app.agents.planner import plan
from app.agents.state import AgentState
from app.agents.verifier import verify
from app.connectors.base import SourceConnector
from app.core.config import get_settings
from app.services.context_engineering import build_context
from app.services.retriever import Retriever


def build_agent_graph(connectors: dict[str, SourceConnector]):
    """
    Builds the LangGraph pipeline:

        plan -> retrieve -> engineer_context -> generate -> verify -> END

    Each node is a plain function over AgentState, so any node can be
    unit-tested in isolation from the graph.

    Returns (compiled_graph, retriever) — the retriever is returned
    alongside the graph (rather than buried as a closure) so the app can
    expose its per-connector error state through /dashboard/connectors.
    """
    settings = get_settings()
    retriever = Retriever(connectors)

    async def retrieve_node(state: AgentState) -> AgentState:
        chunks, denied = await retriever.retrieve(
            query=state["query"],
            principal=state["principal"],
            requested_sources=state["planned_sources"],
            top_k_per_source=settings.top_k_per_source,
        )
        return {**state, "retrieved_chunks": chunks, "denied_sources": denied}

    def context_node(state: AgentState) -> AgentState:
        context, used = build_context(state["retrieved_chunks"], settings.max_context_tokens)
        return {**state, "context": context, "used_chunks": used}

    graph = StateGraph(AgentState)
    graph.add_node("plan", plan)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("engineer_context", context_node)
    graph.add_node("generate", generate)
    graph.add_node("verify", verify)

    graph.set_entry_point("plan")
    graph.add_edge("plan", "retrieve")
    graph.add_edge("retrieve", "engineer_context")
    graph.add_edge("engineer_context", "generate")
    graph.add_edge("generate", "verify")
    graph.add_edge("verify", END)

    return graph.compile(), retriever
