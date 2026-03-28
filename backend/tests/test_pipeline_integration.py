"""Tests for agents/langgraph_pipeline.py streaming path and run_pipeline integration."""
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock

import pytest

from agents.langgraph_pipeline import run_pipeline_stream, run_pipeline


# ── run_pipeline_stream ──

@pytest.mark.asyncio
async def test_stream_produces_agent_markers():
    """The stream should yield agent phase markers and a [DONE] sentinel."""
    chunks = []
    async for chunk in run_pipeline_stream(
        blast_data={"risk_tier": "LOW", "risk_score": 0.1},
        postmortem_data=[],
    ):
        chunks.append(chunk)

    text = "".join(chunks)
    assert "[Agent 1]" in text
    assert "[Agent 2]" in text
    assert "[Agent 3]" in text
    assert "[DONE]" in text


@pytest.mark.asyncio
async def test_stream_handles_ollama_failure_gracefully():
    """When all Ollama calls fail, stream should still complete with fallback text."""
    with patch("agents.langgraph_pipeline.ollama.Client") as mock_client_cls, \
         patch("agents.langgraph_pipeline.ollama.AsyncClient") as mock_async_cls:
        mock_client_cls.return_value.chat.side_effect = ConnectionError("no server")
        mock_async_cls.return_value.chat.side_effect = ConnectionError("no server")

        chunks = []
        async for chunk in run_pipeline_stream(
            blast_data={"risk_tier": "MEDIUM"},
            postmortem_data=[],
        ):
            chunks.append(chunk)

        text = "".join(chunks)
        assert "[DONE]" in text
        assert "YELLOW" in text or "unavailable" in text.lower()


# ── run_pipeline ──

@patch("agents.langgraph_pipeline.ollama.Client")
def test_run_pipeline_returns_recommendation(mock_client_cls):
    """Full pipeline should return a RecommendationResult even when LLM is unavailable."""
    mock_client_cls.return_value.chat.side_effect = ConnectionError("no server")

    result = run_pipeline(
        blast_data={"risk_tier": "LOW", "risk_score": 0.1},
        postmortem_data=[],
    )
    assert result.verdict in ("GREEN", "YELLOW", "RED")
    assert isinstance(result.summary, str)
    assert isinstance(result.blast_risk, str)
    assert isinstance(result.pattern_risk, str)
    assert isinstance(result.action, str)
