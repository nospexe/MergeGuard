"""
main.py — FastAPI Backend for MergeGuard
=========================================

PURPOSE
-------
This is the HTTP layer that sits between the analysis engines and the
React frontend. It exposes three endpoints:

  POST /api/analyze
      Takes a repo path + list of changed symbols.
      Runs the BlastRadius engine.
      Returns a JSON blast radius result.

  GET  /api/health
      Simple liveness probe. Used by Docker healthcheck and CI.

  GET  /api/stream/{analysis_id}
      Server-Sent Events (SSE) stream for LLM output.
      The LLM reasoning layer (Aayush's component) writes tokens here.
      Balaa's frontend subscribes to this to show streaming text.
      Currently a stub — fully wired in Week 3.

HOW SSE WORKS
-------------
Server-Sent Events (SSE) is a one-way channel from server to browser.
Instead of the browser repeatedly polling "any new data?", the server
keeps the HTTP connection open and pushes new lines as they arrive.

For MergeGuard, this means:
  1. Balaa's frontend opens GET /api/stream/{id}
  2. The connection stays open
  3. As the LLM generates tokens, each token is pushed immediately
  4. The user sees the risk brief appear word by word

CORS
----
We allow all origins in development so Balaa can run the frontend on
localhost:5173 (Vite's default port) while the backend runs on :8000.
In production this would be locked down to a specific origin.

HOW TO RUN
----------
  cd backend
  uvicorn api.main:app --reload --port 8000

Then open http://localhost:8000/docs for the interactive API explorer.
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from dataclasses import asdict
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator

from engines.blast_radius import analyze_blast_radius, BlastRadiusResult, ROPE_AVAILABLE

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="MergeGuard API",
    description="Pre-merge intelligence for engineering teams",
    version="0.1.0",
)

# Allow the Vite dev server (port 5173) and any localhost origin to call us.
# Balaa: no changes needed here for local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store for SSE streams.
# Key: analysis_id (str), Value: asyncio.Queue of token strings.
# Aayush's LLM layer puts tokens here; the SSE endpoint reads them.
_sse_queues: dict[str, asyncio.Queue] = {}


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    """
    Input for POST /api/analyze.

    Fields
    ------
    repo_root       : Absolute path to the local Git repo clone.
    changed_symbols : List of qualified symbol names that changed.
                      e.g. ["auth.utils.validate_token", "auth.utils.Token"]
    coverage_file   : Optional path to a .coverage file. If provided,
                      uncovered nodes are highlighted in the result.
    use_rope        : Whether to run rope call-site refinement.
                      Defaults to True if rope is installed.
    """

    repo_root: str
    changed_symbols: list[str]
    coverage_file: str | None = None
    use_rope: bool = True

    @field_validator("repo_root")
    @classmethod
    def repo_must_exist(cls, v: str) -> str:
        if not Path(v).is_dir():
            raise ValueError(f"repo_root does not exist or is not a directory: {v}")
        return v

    @field_validator("changed_symbols")
    @classmethod
    def symbols_must_not_be_empty(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("changed_symbols must contain at least one symbol")
        return v


class AnalyzeResponse(BaseModel):
    """
    Output of POST /api/analyze.
    Mirrors BlastRadiusResult exactly so the frontend can consume it directly.
    """
    changed_symbols: list[str]
    direct_dependents: list[str]
    transitive_dependents: list[str]
    uncovered_nodes: list[str]
    total_affected_files: int
    dependency_edges: list[dict]
    risk_score: float
    risk_tier: str
    dynamic_import_warnings: list[str]
    analysis_time_seconds: float
    rope_available: bool
    analysis_id: str   # used to subscribe to the SSE stream for LLM output


class HealthResponse(BaseModel):
    status: str
    rope_available: bool
    version: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/health", response_model=HealthResponse, tags=["Meta"])
def health() -> HealthResponse:
    """
    Liveness probe.
    Returns 200 if the backend is running.
    Balaa: poll this on startup to know the backend is ready.
    """
    return HealthResponse(
        status="ok",
        rope_available=ROPE_AVAILABLE,
        version="0.1.0",
    )


@app.post("/api/analyze", response_model=AnalyzeResponse, tags=["Analysis"])
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Run the full BlastRadius engine on a repo + changed symbol set.

    This is the primary endpoint. Balaa calls this when the user submits
    a diff for analysis. The response drives all three frontend panels:

      - direct_dependents + transitive_dependents → D3.js force graph
      - uncovered_nodes                           → red glowing nodes
      - risk_tier                                 → merge badge colour
      - analysis_id                               → SSE stream subscription

    The analysis runs synchronously (blocks until complete). For a 50k-LOC
    repo this takes 5–15 seconds. Week 4 may move this to a background task.
    """
    uncovered_nodes: list[str] = []

    # Optional: load coverage data if a .coverage file was provided
    if request.coverage_file:
        try:
            from engines.coverage_overlay import CoverageFileReader, SymbolCoverageAnnotator
            # This is a simplified integration — full integration in Week 3
            logger.info("Coverage file provided but full overlay integration is Week 3")
        except Exception as exc:
            logger.warning("Could not load coverage data: %s", exc)

    # Run the blast radius engine
    try:
        result: BlastRadiusResult = analyze_blast_radius(
            repo_root=request.repo_root,
            changed_symbols=request.changed_symbols,
            uncovered_nodes=uncovered_nodes,
            use_rope=request.use_rope,
        )
    except Exception as exc:
        logger.exception("BlastRadius analysis failed")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc

    # Create an SSE queue for this analysis so Aayush's LLM layer
    # can stream tokens to the frontend via /api/stream/{analysis_id}
    analysis_id = str(uuid.uuid4())
    _sse_queues[analysis_id] = asyncio.Queue()

    return AnalyzeResponse(
        **asdict(result),
        rope_available=ROPE_AVAILABLE,
        analysis_id=analysis_id,
    )


@app.get("/api/stream/{analysis_id}", tags=["Streaming"])
async def stream_llm_output(analysis_id: str) -> StreamingResponse:
    """
    Server-Sent Events stream for LLM token output.

    WHAT THIS IS
    ------------
    After the frontend calls POST /api/analyze, it gets back an analysis_id.
    It then opens this SSE endpoint to receive the LLM risk brief, word by
    word, as the local Ollama model generates it.

    CURRENT STATUS
    --------------
    This endpoint is a STUB. It currently sends a placeholder message and
    closes. Aayush wires the real LLM output in Week 3 by putting tokens
    into the queue via push_llm_token().

    HOW THE FRONTEND USES THIS (for Balaa)
    ---------------------------------------
    const source = new EventSource(`/api/stream/${analysisId}`);
    source.onmessage = (event) => {
        if (event.data === "[DONE]") { source.close(); return; }
        setLlmText(prev => prev + event.data);
    };

    SSE FORMAT
    ----------
    Each message is: `data: <token>\\n\\n`
    The special token "[DONE]" signals end of stream.
    """
    if analysis_id not in _sse_queues:
        raise HTTPException(status_code=404, detail=f"No stream for analysis_id: {analysis_id}")

    queue = _sse_queues[analysis_id]

    async def event_generator() -> AsyncGenerator[str, None]:
        """
        Pull tokens from the queue and format them as SSE messages.
        Yields until the sentinel value "[DONE]" is received.
        """
        try:
            # STUB: In Week 3, Aayush replaces this with real LLM tokens.
            # For now we send a placeholder so Balaa can test the SSE plumbing.
            stub_tokens = [
                "LLM ", "analysis ", "will ", "stream ", "here ",
                "in ", "Week ", "3. ", "Wired ", "by ", "Aayush."
            ]
            for token in stub_tokens:
                yield f"data: {token}\n\n"
                await asyncio.sleep(0.05)   # simulate token generation speed

            yield "data: [DONE]\n\n"
        finally:
            # Clean up the queue when the client disconnects
            _sse_queues.pop(analysis_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )


# ---------------------------------------------------------------------------
# Internal helper — called by Aayush's LLM layer in Week 3
# ---------------------------------------------------------------------------

async def push_llm_token(analysis_id: str, token: str) -> bool:
    """
    Push a single LLM token into the SSE queue for an analysis.

    Aayush: call this from the LangGraph pipeline as each token is generated.
    Returns False if the analysis_id is no longer active (client disconnected).

    Example
    -------
    # Inside the LangGraph agent:
    from api.main import push_llm_token
    await push_llm_token(analysis_id, "HIGH ")
    await push_llm_token(analysis_id, "risk ")
    await push_llm_token(analysis_id, "[DONE]")
    """
    if analysis_id not in _sse_queues:
        return False
    await _sse_queues[analysis_id].put(token)
    return True