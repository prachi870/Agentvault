"""LLM adapters. `local` is an extractive, offline answerer (dev/tests); real providers go through LangChain."""
from __future__ import annotations

import json
import re
from typing import Protocol

from app.core.text import split_sentences, tokenize
from app.rag.prompts import INSUFFICIENT, PLANNER_PROMPT, SYSTEM_PROMPT, build_user_prompt
from app.rag.types import ContextBlock


class LLM(Protocol):
    name: str

    def generate_answer(self, question: str, blocks: list[ContextBlock], answer_mode: str = "detailed") -> str: ...
    def plan(self, question: str) -> dict | None: ...


class LocalExtractiveLLM:
    """Builds an answer by selecting the sentences that best match the question. No generation, so it
    cannot hallucinate - which also makes it a deterministic baseline for tests."""

    name = "local-extractive"

    def __init__(self, max_sentences: int = 7, min_coverage: float = 0.4) -> None:
        self.max_sentences = max_sentences
        self.min_coverage = min_coverage

    def generate_answer(self, question: str, blocks: list[ContextBlock], answer_mode: str = "detailed") -> str:
        from app.rag.planner import heuristic_plan

        q_sets = [set(tokenize(q)) for q in heuristic_plan(question).sub_queries]
        q_sets = [q for q in q_sets if q]
        if not q_sets or not blocks:
            return INSUFFICIENT

        query_tokens = set().union(*q_sets)
        focused_doc_ids: set[str] = set()
        if len(q_sets) == 1 and query_tokens:
            title_scores = {}
            for block in blocks:
                title_tokens = set(tokenize(block.title))
                title_scores[block.doc_id] = (
                    len(query_tokens & title_tokens) / len(query_tokens) if title_tokens else 0.0
                )
            best_title_score = max(title_scores.values(), default=0.0)
            if best_title_score >= 0.5:
                focused_doc_ids = {
                    doc_id for doc_id, score in title_scores.items() if score == best_title_score
                }

        summary_intent = re.search(
            r"\b(?:tell me about|tell me more about|explain|describe|summari[sz]e|overview|"
            r"what else|more details|more information|can you elaborate|"
            r"what (?:is|are) (?:in|about)|give me (?:a|an) (?:summary|overview))\b",
            question,
            re.IGNORECASE,
        ) is not None
        is_question = re.search(
            r"\b(?:what|which|who|when|where|why|how|does|do|is|are|can)\b",
            question,
            re.IGNORECASE,
        ) is not None
        if focused_doc_ids and len(query_tokens) <= 3 and not is_question:
            summary_intent = True

        answer_blocks = [b for b in blocks if b.doc_id in focused_doc_ids] if focused_doc_ids else blocks
        if summary_intent and not focused_doc_ids:
            doc_scores: dict[str, tuple[float, float]] = {}
            for block in blocks:
                score = (block.lexical, block.relevance)
                if block.doc_id not in doc_scores or score > doc_scores[block.doc_id]:
                    doc_scores[block.doc_id] = score
            best_doc_id = max(doc_scores, key=doc_scores.get)
            if doc_scores[best_doc_id][0] > 0:
                focused_doc_ids = {best_doc_id}
                answer_blocks = [b for b in blocks if b.doc_id == best_doc_id]

        limits = {"quick": 2, "detailed": self.max_sentences, "decision_brief": min(5, self.max_sentences)}
        limit = limits.get(answer_mode, self.max_sentences)

        if summary_intent and focused_doc_ids:
            summary_candidates: list[tuple[float, int, int, str, set[str]]] = []
            definition_pattern = re.compile(
                r"\b(?:means|stands for|refers to|is|are|provides|includes|requires|supports|allows|enables)\b",
                re.IGNORECASE,
            )
            for block in answer_blocks:
                for index, sentence in enumerate(split_sentences(block.text)):
                    clean = sentence.strip().lstrip("-*• ").strip()
                    tokens = set(tokenize(clean))
                    if len(tokens) < 4 or (clean.isupper() and len(tokens) < 12):
                        continue
                    if "candidate evaluation only" in clean.casefold():
                        continue
                    coverage = max(len(q & tokens) / len(q) for q in q_sets)
                    length_score = min(len(tokens), 40) / 40
                    definition_score = 1.0 if definition_pattern.search(clean) else 0.0
                    score = 0.35 * coverage + 0.25 * length_score + 0.25 * definition_score + 0.15 * block.relevance
                    summary_candidates.append((score, block.n, index, clean, tokens))

            ranked_summary = sorted(summary_candidates, key=lambda item: (-item[0], item[1], item[2]))
            selected_summary: list[tuple[float, int, int, str, set[str]]] = []
            for candidate in ranked_summary:
                if any(
                    len(candidate[4] & selected[4]) / len(candidate[4] | selected[4]) > 0.85
                    for selected in selected_summary
                ):
                    continue
                selected_summary.append(candidate)
                if len(selected_summary) >= limit:
                    break
            selected_summary.sort(key=lambda item: (item[1], item[2]))
            if selected_summary:
                return "\n".join(f"- {sentence.rstrip()} [{block_n}]" for _, block_n, _, sentence, _ in selected_summary)

        scored: list[tuple[float, int, int, str, set[str]]] = []
        for b in answer_blocks:
            for i, sent in enumerate(split_sentences(b.text)):
                s_tokens = set(tokenize(sent))
                if len(s_tokens) < 3:
                    continue
                coverage = max(len(q & s_tokens) / len(q) for q in q_sets)
                if coverage >= self.min_coverage:
                    score = coverage + 0.05 * b.relevance - 0.01 * b.n
                    scored.append((score, b.n, i, sent, s_tokens))
        if not scored:
            return INSUFFICIENT
        ranked = sorted(scored, key=lambda item: (-item[0], item[1], item[2]))
        best: list[tuple[float, int, int, str, set[str]]] = []
        for candidate in ranked:
            if any(
                len(candidate[4] & selected[4]) / len(candidate[4] | selected[4]) > 0.85
                for selected in best
            ):
                continue
            best.append(candidate)
            if len(best) >= limit:
                break
        best.sort(key=lambda item: (item[1], item[2]))  # keep source order for readability
        if answer_mode == "quick":
            return " ".join(f"{sent.rstrip()} [{n}]" for _, n, _, sent, _ in best)
        return "\n".join(f"- {sent.rstrip()} [{n}]" for _, n, _, sent, _ in best)

    def plan(self, question: str) -> dict | None:
        return None  # heuristic planner is used


class LangChainLLM:
    def __init__(self, provider: str, model: str) -> None:
        if provider == "openai":
            from langchain_openai import ChatOpenAI

            self.model = model or "gpt-4o-mini"
            self._chat = ChatOpenAI(model=self.model, temperature=0, max_tokens=2048)
        elif provider == "anthropic":
            from langchain_anthropic import ChatAnthropic

            self.model = model or "claude-sonnet-5"
            self._chat = ChatAnthropic(model=self.model, temperature=0, max_tokens=2048)
        elif provider == "gemini":
            from langchain_google_genai import ChatGoogleGenerativeAI

            self.model = model or "gemini-2.5-flash"
            self._chat = ChatGoogleGenerativeAI(model=self.model, temperature=0, max_output_tokens=2048)
        elif provider == "ollama":
            from langchain_ollama import ChatOllama
            import os

            self.model = model or "llama3"
            base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            self._chat = ChatOllama(model=self.model, temperature=0, base_url=base_url)
        else:
            raise ValueError(f"unknown llm provider {provider}")
        self.name = f"{provider}:{self.model}"

    @staticmethod
    def _text(content) -> str:
        if isinstance(content, str):
            return content
        return "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)

    def _invoke(self, system: str, user: str) -> str:
        from langchain_core.messages import HumanMessage, SystemMessage

        return self._text(self._chat.invoke([SystemMessage(content=system), HumanMessage(content=user)]).content).strip()

    def generate_answer(self, question: str, blocks: list[ContextBlock], answer_mode: str = "detailed") -> str:
        mode_instructions = {
            "quick": "Give the direct answer first in at most three sentences. Include only essential evidence.",
            "detailed": "Give a short overview followed by focused bullets. Include relevant steps, limits, and exceptions from the evidence.",
            "decision_brief": "Use the headings Decision, Evidence, Risks, and Next step only where the evidence supports them. Do not invent a recommendation.",
        }
        instruction = mode_instructions.get(answer_mode, mode_instructions["detailed"])
        return self._invoke(
            f"{SYSTEM_PROMPT}\n\nResponse mode ({answer_mode}): {instruction}",
            build_user_prompt(question, blocks, answer_mode),
        )

    def plan(self, question: str) -> dict | None:
        try:
            raw = self._invoke(PLANNER_PROMPT, question)
            raw = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
            data = json.loads(raw)
            if isinstance(data.get("sub_queries"), list) and data["sub_queries"]:
                return data
        except Exception:
            return None
        return None


def build_llm(provider: str, model: str) -> LLM:
    if provider == "local":
        return LocalExtractiveLLM()
    return LangChainLLM(provider, model)
