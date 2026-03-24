"""
langgraph_pipeline.py — LangGraph 3-Agent Pipeline for MergeGuard

PURPOSE
This module wires together three LLM agents using LangGraph to produce
a final merge recommendation from the outputs of the two analysis engines.

HOW TO USE
----------
    from agents.langgraph_pipeline import run_pipeline, run_pipeline_stream

    # Non-streaming — returns final RecommendationResult
    result = run_pipeline(blast_data, postmortem_data)

    # Streaming — yields SSE-formatted token strings
    async for token in run_pipeline_stream(blast_data, postmortem_data):
        yield token
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import AsyncGenerator, Optional, TypedDict

import ollama
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END

load_dotenv()

logger = logging.getLogger(__name__)

OLLAMA_HOST  = os.getenv("OLLAMA_HOST",  "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-coder")

class PipelineState(TypedDict):
    """
    Shared state that flows through every node in the LangGraph pipeline.

    Each agent reads from this dict and writes its output back into it.
    LangGraph merges partial updates automatically.

    Fields set at pipeline start (inputs):
        blast_data       — raw dict from analyze_blast_radius() via asdict()
        postmortem_data  — raw list from mine_association_rules()

    Fields written by agents:
        structural_risk  — Agent 1's plain English blast radius summary
        historical_risk  — Agent 2's plain English pattern summary
        verdict          — Agent 3's GREEN / YELLOW / RED decision
        explanation      — Agent 3's full explanation
        action           — Agent 3's one concrete action for the developer
    """
    blast_data:       dict
    postmortem_data:  list

    structural_risk:  Optional[str]
    historical_risk:  Optional[str]
    verdict:          Optional[str]
    explanation:      Optional[str]
    action:           Optional[str]

@dataclass
class RecommendationResult:
    verdict:      str   
    summary:      str  
    blast_risk:   str   
    pattern_risk: str   
    action:       str   


def _build_blast_prompt(blast_data: dict) -> str:
    risk_score = blast_data.get("risk_score", "unknown")
    risk_tier  = blast_data.get("risk_tier",  "unknown")
    direct     = blast_data.get("direct_dependents",     [])
    transitive = blast_data.get("transitive_dependents", [])
    uncovered  = blast_data.get("uncovered_nodes",       [])
    warnings   = blast_data.get("dynamic_import_warnings", [])

    return f"""You are a static analysis expert reviewing a pull request.

BLAST RADIUS DATA:
- Risk score: {risk_score} (tier: {risk_tier})
- Direct dependents ({len(direct)} modules): {", ".join(direct[:10]) or "none"}
- Transitive dependents ({len(transitive)} modules): {", ".join(transitive[:10]) or "none"}
- Uncovered nodes ({len(uncovered)}): {", ".join(uncovered[:5]) or "none"}
- Dynamic import warnings: {", ".join(warnings) or "none"}

Your task: Summarise the STRUCTURAL RISK ONLY in exactly 2 sentences.
- Sentence 1: describe how many modules are affected and at what depth.
- Sentence 2: describe the coverage situation and what that means for risk.

Do NOT mention history, past bugs, or make a GREEN/YELLOW/RED verdict.
Do NOT invent file names not present above.
Keep your response under 60 words."""


def _build_pattern_prompt(postmortem_data: list) -> str:
    if not postmortem_data:
        pattern_summary = "No historical failure patterns found for this changeset."
        top_rules = "none"
    else:
        top_rules_list = sorted(
            postmortem_data,
            key=lambda r: r.get("confidence", 0),
            reverse=True
        )[:3]
        top_rules = json.dumps(top_rules_list, indent=2)
        pattern_summary = f"{len(postmortem_data)} association rules found."

    return f"""You are a Git history analyst reviewing a pull request.

HISTORICAL PATTERN DATA:
{pattern_summary}

Top rules by confidence:
{top_rules}

Your task: Summarise the HISTORICAL FAILURE PATTERNS ONLY in exactly 2 sentences.
- Sentence 1: describe what files tend to break together based on the rules.
- Sentence 2: describe the confidence level and what that implies.

If no patterns exist, say so clearly in 1 sentence.
Do NOT comment on code structure or make a GREEN/YELLOW/RED verdict.
Do NOT invent commit hashes or file names not present above.
Keep your response under 60 words."""


def _build_orchestrator_prompt(
    structural_risk: str,
    historical_risk: str,
    risk_tier: str,
) -> str:
    """
    Build the prompt for Agent 3 — Orchestrator.

    The orchestrator receives only the two text summaries from agents 1 and 2,
    plus the risk tier from the engine. It never sees the raw JSON data.
    This keeps its context focused on decision-making, not data parsing.
    """
    return f"""You are a senior engineering lead making a merge decision.

STRUCTURAL RISK SUMMARY (from static analysis):
{structural_risk}

HISTORICAL PATTERN SUMMARY (from git history):
{historical_risk}

ENGINE RISK TIER: {risk_tier}

Your task: Make a final merge recommendation.

Respond in this EXACT format and nothing else:
VERDICT: <GREEN|YELLOW|RED>
SUMMARY: <one paragraph, max 50 words explaining the overall risk>
BLAST_RISK: <one sentence about structural risk>
PATTERN_RISK: <one sentence about historical pattern risk>
ACTION: <one concrete action the developer must take before merging>

Rules:
- GREEN = safe to merge with no concerns
- YELLOW = review recommended before merging
- RED = do not merge, significant risk identified
- Do NOT add any text outside the format above."""


def blast_interpreter_agent(state: PipelineState) -> dict:
    """
    Agent 1 — Blast Radius Interpreter.

    Reads blast_data from state.
    Writes structural_risk to state.
    """
    logger.info("Agent 1 — Blast Interpreter running")

    prompt = _build_blast_prompt(state["blast_data"])

    try:
        client   = ollama.Client(host=OLLAMA_HOST)
        response = client.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        structural_risk = response["message"]["content"].strip()
    except Exception as exc:
        logger.warning("Agent 1 Ollama call failed: %s", exc)
        structural_risk = (
            f"Blast radius analysis unavailable (LLM error). "
            f"Risk tier from engine: {state['blast_data'].get('risk_tier', 'unknown')}."
        )

    logger.info("Agent 1 complete — structural_risk: %s", structural_risk[:80])
    return {"structural_risk": structural_risk}


def pattern_explainer_agent(state: PipelineState) -> dict:
    """
    Agent 2 — Pattern Explainer.

    Reads postmortem_data from state.
    Writes historical_risk to state.
    """
    logger.info("Agent 2 — Pattern Explainer running")

    prompt = _build_pattern_prompt(state["postmortem_data"])

    try:
        client   = ollama.Client(host=OLLAMA_HOST)
        response = client.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        historical_risk = response["message"]["content"].strip()
    except Exception as exc:
        logger.warning("Agent 2 Ollama call failed: %s", exc)
        historical_risk = (
            "Historical pattern analysis unavailable (LLM error). "
            f"{len(state['postmortem_data'])} rules found by engine."
        )

    logger.info("Agent 2 complete — historical_risk: %s", historical_risk[:80])
    return {"historical_risk": historical_risk}


def orchestrator_agent(state: PipelineState) -> dict:
    """
    Agent 3 — Orchestrator.

    Reads structural_risk and historical_risk from state.
    Writes verdict, explanation, and action to state.
    """
    logger.info("Agent 3 — Orchestrator running")

    risk_tier = state["blast_data"].get("risk_tier", "MEDIUM")

    prompt = _build_orchestrator_prompt(
        structural_risk=state.get("structural_risk", "No structural analysis available."),
        historical_risk=state.get("historical_risk", "No historical analysis available."),
        risk_tier=risk_tier,
    )

    try:
        client   = ollama.Client(host=OLLAMA_HOST)
        response = client.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response["message"]["content"].strip()

        # Parse the structured response
        parsed = {
            line.split(":")[0].strip(): ":".join(line.split(":")[1:]).strip()
            for line in raw.splitlines()
            if ":" in line
        }

        verdict     = parsed.get("VERDICT",      "YELLOW").strip()
        explanation = parsed.get("SUMMARY",      raw).strip()
        action      = parsed.get("ACTION",       "Manual review recommended.").strip()

        # Sanitise verdict — only allow valid values
        if verdict not in {"GREEN", "YELLOW", "RED"}:
            verdict = "YELLOW"

    except Exception as exc:
        logger.warning("Agent 3 Ollama call failed: %s", exc)
        verdict     = "YELLOW"
        explanation = f"LLM unavailable: {exc}. Manual review recommended."
        action      = "Review the blast radius and historical patterns manually."

    logger.info("Agent 3 complete — verdict: %s", verdict)
    return {
        "verdict":     verdict,
        "explanation": explanation,
        "action":      action,
    }


# ---------------------------------------------------------------------------
# Graph construction — wire the three agents together
# ---------------------------------------------------------------------------

def _build_pipeline() -> StateGraph:
    """
    Build and compile the LangGraph pipeline.

    Graph structure:
        blast_interpreter → pattern_explainer → orchestrator → END

    Each agent runs sequentially. The shared PipelineState carries
    all data between nodes.
    """
    graph = StateGraph(PipelineState)

    graph.add_node("blast_interpreter", blast_interpreter_agent)
    graph.add_node("pattern_explainer", pattern_explainer_agent)
    graph.add_node("orchestrator",      orchestrator_agent)

    graph.set_entry_point("blast_interpreter")
    graph.add_edge("blast_interpreter", "pattern_explainer")
    graph.add_edge("pattern_explainer", "orchestrator")
    graph.add_edge("orchestrator",      END)

    return graph.compile()


# Compile once at module load — reused for every request
_pipeline = _build_pipeline()


# ---------------------------------------------------------------------------
# Public API — called by the FastAPI layer
# ---------------------------------------------------------------------------

def run_pipeline(
    blast_data:      dict,
    postmortem_data: list,
) -> RecommendationResult:
    """
    Run the full 3-agent pipeline synchronously.

    Called by POST /api/recommendation in main.py.
    Replaces the inline single-prompt approach with the 3-agent pipeline.

    Parameters
    ----------
    blast_data       : Output of dataclasses.asdict(analyze_blast_radius(...))
    postmortem_data  : Output of mine_association_rules(...)

    Returns
    -------
    RecommendationResult with verdict, summary, blast_risk, pattern_risk, action.
    """
    logger.info("Starting LangGraph pipeline (synchronous)")

    result = _pipeline.invoke({
        "blast_data":      blast_data,
        "postmortem_data": postmortem_data,
        "structural_risk": None,
        "historical_risk": None,
        "verdict":         None,
        "explanation":     None,
        "action":          None,
    })

    return RecommendationResult(
        verdict=      result.get("verdict",         "YELLOW"),
        summary=      result.get("explanation",     "No explanation available."),
        blast_risk=   result.get("structural_risk", "No structural analysis."),
        pattern_risk= result.get("historical_risk", "No historical analysis."),
        action=       result.get("action",          "Manual review recommended."),
    )


async def run_pipeline_stream(
    blast_data:      dict,
    postmortem_data: list,
) -> AsyncGenerator[str, None]:
    """
    Run the full 3-agent pipeline with SSE token streaming.

    Called by POST /api/analyze/stream in main.py.
    Runs agents 1 and 2 synchronously first (their output is not streamed),
    then streams Agent 3's tokens live as SSE events.

    Parameters
    ----------
    blast_data       : Output of dataclasses.asdict(analyze_blast_radius(...))
    postmortem_data  : Output of mine_association_rules(...)

    Yields
    ------
    SSE-formatted strings: "data: <token>\\n\\n"
    Final sentinel:        "data: [DONE]\\n\\n"
    """
    logger.info("Starting LangGraph pipeline (streaming)")

    # --- Agent 1: Blast Interpreter (synchronous) ---
    yield "data: [Agent 1] Analysing blast radius...\n\n"

    try:
        agent1_result = blast_interpreter_agent({
            "blast_data":      blast_data,
            "postmortem_data": postmortem_data,
            "structural_risk": None,
            "historical_risk": None,
            "verdict":         None,
            "explanation":     None,
            "action":          None,
        })
        structural_risk = agent1_result["structural_risk"]
    except Exception as exc:
        structural_risk = f"Blast analysis unavailable: {exc}"

    yield f"data: [Agent 1 complete]\n\n"

    # --- Agent 2: Pattern Explainer (synchronous) ---
    yield "data: [Agent 2] Analysing historical patterns...\n\n"

    try:
        agent2_result = pattern_explainer_agent({
            "blast_data":      blast_data,
            "postmortem_data": postmortem_data,
            "structural_risk": structural_risk,
            "historical_risk": None,
            "verdict":         None,
            "explanation":     None,
            "action":          None,
        })
        historical_risk = agent2_result["historical_risk"]
    except Exception as exc:
        historical_risk = f"Pattern analysis unavailable: {exc}"

    yield "data: [Agent 2 complete]\n\n"

    # --- Agent 3: Orchestrator (streaming) ---
    yield "data: [Agent 3] Generating recommendation...\n\n"

    risk_tier = blast_data.get("risk_tier", "MEDIUM")
    prompt    = _build_orchestrator_prompt(structural_risk, historical_risk, risk_tier)

    try:
        async_client = ollama.AsyncClient(host=OLLAMA_HOST)
        stream = await async_client.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        async for chunk in stream:
            token = chunk["message"]["content"]
            if token:
                yield f"data: {token}\n\n"

    except Exception as exc:
        logger.warning("Agent 3 streaming failed: %s", exc)
        yield f"data: VERDICT: YELLOW\n\n"
        yield f"data: SUMMARY: LLM unavailable — {exc}. Manual review recommended.\n\n"

    yield "data: [DONE]\n\n"