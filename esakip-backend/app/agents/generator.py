"""
Answer generation node — calls the LLM with the engineered context and the
question, instructed to only answer from the given context and to cite
which numbered [Source N] block each claim comes from.

TODO: wire an actual LangChain chat model here, e.g.:

    from langchain_anthropic import ChatAnthropic
    llm = ChatAnthropic(model=settings.llm_model, api_key=settings.anthropic_api_key)
    response = await llm.ainvoke(prompt)
    draft = response.content

Left as a clearly-marked stub so this scaffold has no hard runtime
dependency on any single model provider's SDK/key being present.
"""

from app.agents.state import AgentState

_SYSTEM_INSTRUCTIONS = (
    "You are an enterprise knowledge assistant. Answer ONLY using the numbered "
    "[Source N] blocks provided as context. If the context does not contain the "
    "answer, say so explicitly rather than guessing. Cite the source number for "
    "every factual claim."
)


async def generate(state: AgentState) -> AgentState:
    context = state.get("context", "")
    query = state["query"]

    if not context.strip():
        return {**state, "draft_answer": ""}

    prompt = f"{_SYSTEM_INSTRUCTIONS}\n\nContext:\n{context}\n\nQuestion: {query}\n\nAnswer:"

    # TODO: replace with a real LLM call (see module docstring).
    draft = (
        "[LLM not yet wired — this is a placeholder draft assembled from the "
        f"top retrieved context for: '{query}']"
    )
    _ = prompt  # kept so the constructed prompt is visible once you wire a real call
    return {**state, "draft_answer": draft}
