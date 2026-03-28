"""Tests for agents/langgraph_pipeline.py — covers prompt builders, agent fallback paths,
and the RecommendationResult dataclass."""
from unittest.mock import patch, MagicMock

import pytest

from agents.langgraph_pipeline import (
    RecommendationResult,
    _build_blast_prompt,
    _build_pattern_prompt,
    _build_orchestrator_prompt,
    blast_interpreter_agent,
    pattern_explainer_agent,
    orchestrator_agent,
    PipelineState,
)


# ── Prompt builders ──

def test_build_blast_prompt_has_risk_info():
    prompt = _build_blast_prompt({"risk_score": 0.5, "risk_tier": "HIGH"})
    assert "0.5" in prompt
    assert "HIGH" in prompt


def test_build_blast_prompt_defaults():
    prompt = _build_blast_prompt({})
    assert "unknown" in prompt


def test_build_pattern_prompt_no_data():
    prompt = _build_pattern_prompt([])
    assert "No historical failure patterns" in prompt


def test_build_pattern_prompt_with_data():
    rules = [
        {"antecedents": ["a.py"], "consequents": ["b.py"], "confidence": 0.8, "support": 0.1},
        {"antecedents": ["c.py"], "consequents": ["d.py"], "confidence": 0.6, "support": 0.05},
    ]
    prompt = _build_pattern_prompt(rules)
    assert "2 association rules" in prompt
    assert "a.py" in prompt  # top rules included


def test_build_orchestrator_prompt_contains_all_parts():
    prompt = _build_orchestrator_prompt("struct risk text", "hist risk text", "HIGH")
    assert "struct risk text" in prompt
    assert "hist risk text" in prompt
    assert "HIGH" in prompt
    assert "VERDICT" in prompt


# ── Agent fallback paths (when Ollama is unavailable) ──

def _make_state(**overrides) -> dict:
    base = {
        "blast_data": {"risk_tier": "MEDIUM"},
        "postmortem_data": [],
        "structural_risk": None,
        "historical_risk": None,
        "verdict": None,
        "explanation": None,
        "action": None,
    }
    base.update(overrides)
    return base


@patch("agents.langgraph_pipeline.ollama.Client")
def test_blast_interpreter_fallback(mock_client_cls):
    """When Ollama is unreachable, agent 1 should return a fallback string."""
    mock_client_cls.return_value.chat.side_effect = ConnectionError("no server")
    state = _make_state()
    result = blast_interpreter_agent(state)
    assert "structural_risk" in result
    assert "unavailable" in result["structural_risk"].lower() or "error" in result["structural_risk"].lower()


@patch("agents.langgraph_pipeline.ollama.Client")
def test_pattern_explainer_fallback(mock_client_cls):
    """When Ollama is unreachable, agent 2 should return a fallback string."""
    mock_client_cls.return_value.chat.side_effect = ConnectionError("no server")
    state = _make_state()
    result = pattern_explainer_agent(state)
    assert "historical_risk" in result
    assert "unavailable" in result["historical_risk"].lower() or "error" in result["historical_risk"].lower()


@patch("agents.langgraph_pipeline.ollama.Client")
def test_orchestrator_fallback(mock_client_cls):
    """When Ollama is unreachable, orchestrator should default to YELLOW."""
    mock_client_cls.return_value.chat.side_effect = ConnectionError("no server")
    state = _make_state(structural_risk="test struct", historical_risk="test hist")
    result = orchestrator_agent(state)
    assert result["verdict"] == "YELLOW"
    assert "explanation" in result
    assert "action" in result


@patch("agents.langgraph_pipeline.ollama.Client")
def test_orchestrator_parses_valid_response(mock_client_cls):
    """When Ollama returns a valid structured response, it should be parsed correctly."""
    mock_response = {
        "message": {
            "content": "VERDICT: GREEN\nSUMMARY: All clear.\nBLAST_RISK: Low impact.\nPATTERN_RISK: No patterns.\nACTION: Merge freely."
        }
    }
    mock_client_cls.return_value.chat.return_value = mock_response
    state = _make_state(structural_risk="test", historical_risk="test")
    result = orchestrator_agent(state)
    assert result["verdict"] == "GREEN"


@patch("agents.langgraph_pipeline.ollama.Client")
def test_orchestrator_sanitises_invalid_verdict(mock_client_cls):
    """Invalid verdict strings should be normalised to YELLOW."""
    mock_response = {"message": {"content": "VERDICT: ORANGE\nSUMMARY: hmm\nACTION: check"}}
    mock_client_cls.return_value.chat.return_value = mock_response
    state = _make_state(structural_risk="test", historical_risk="test")
    result = orchestrator_agent(state)
    assert result["verdict"] == "YELLOW"


# ── RecommendationResult ──

def test_recommendation_result_fields():
    r = RecommendationResult(
        verdict="GREEN",
        summary="All clear",
        blast_risk="Low",
        pattern_risk="None",
        action="Merge",
    )
    assert r.verdict == "GREEN"
    assert r.summary == "All clear"
