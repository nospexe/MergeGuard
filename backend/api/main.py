import os
from dataclasses import asdict

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from collections import Counter

from engines.blast_radius import analyze_blast_radius
from engines.post_mortem import mine_association_rules
from utils.path_validator import validate_repo_path

load_dotenv()
OLLAMA_HOST  = os.getenv("OLLAMA_HOST",  "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-coder")


def translate_blast_radius(result) -> dict:

    raw = asdict(result)

    nodes = []

    for i, symbol in enumerate(raw["changed_symbols"]):
        nodes.append({
            "id": f"n{i}",
            "file": symbol.replace(".", "/") + ".py",
            "symbol": symbol.split(".")[-1],
            "coverage_status": "covered",
            "ring": 0
        })

    offset = len(nodes)
    for i, module in enumerate(raw["direct_dependents"]):
        nodes.append({
            "id": f"n{offset + i}",
            "file": module.replace(".", "/") + ".py",
            "symbol": module.split(".")[-1],
            "coverage_status": (
                "uncovered" if module in raw["uncovered_nodes"] else "covered"
            ),
            "ring": 1
        })

    offset = len(nodes)

    for i, module in enumerate(raw["transitive_dependents"]):
        nodes.append({
            "id": f"n{offset + i}",
            "file": module.replace(".", "/") + ".py",
            "symbol": module.split(".")[-1],
            "coverage_status": (
                "uncovered" if module in raw["uncovered_nodes"] else "partial"
            ),
            "ring": 2
        })

    module_to_id = {node["file"]: node["id"] for node in nodes}

    edges = []
    for edge in raw["dependency_edges"]:
        source_file = edge["from"].replace(".", "/") + ".py"
        target_file = edge["to"].replace(".", "/") + ".py"
        if source_file in module_to_id and target_file in module_to_id:
            edges.append({
                "source": module_to_id[source_file],
                "target": module_to_id[target_file]
            })

    tier_map = {
        "LOW":      "low",
        "MEDIUM":   "medium",
        "HIGH":     "high",
        "CRITICAL": "high"  
    }
    risk_level = tier_map.get(raw["risk_tier"], "medium")

    return {
        "nodes": nodes,
        "edges": edges,
        "risk_score": raw["risk_score"],
        "risk_level": risk_level
    }


def translate_postmortem(rules: list[dict]) -> dict:
    matches = []
    all_files = set()

    for i, rule in enumerate(rules):

        involved_files = list(rule["antecedents"]) + list(rule["consequents"])
        all_files.update(involved_files)

        support_count = max(1, round(rule["support"] * 500))

        matches.append({
            "pattern_id": f"FP-{i + 1:03d}",     
            "files": involved_files,
            "support": support_count,
            "confidence": rule["confidence"],
            "evidence_commits": []                  
        })


    file_counts = Counter(
        f for rule in rules
        for f in list(rule["antecedents"]) + list(rule["consequents"])
    )
    top_risk_files = [f for f, _ in file_counts.most_common(5)]

    return {
        "matches": matches,
        "top_risk_files": top_risk_files
    }


app = FastAPI(
    title="MergeGuard API",
    version="0.1.0",
    description="Pre-merge intelligence for engineering teams."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    allow_methods=["*"],                      
    allow_headers=["*"],                     
)


class AnalyzeRequest(BaseModel):
    repo_path: str        
    base_branch: str = "main"  
    pr_branch: str        


# Response Models

class BlastRadiusNode(BaseModel):
    id: str               
    file: str              
    symbol: str             
    coverage_status: str     
    ring: int               


class BlastRadiusEdge(BaseModel):
    source: str            
    target: str             


class BlastRadiusResponse(BaseModel):
    nodes: list[BlastRadiusNode]   
    edges: list[BlastRadiusEdge]
    risk_score: float             
    risk_level: str            

class FingerprintMatch(BaseModel):
    pattern_id: str             
    files: list[str]            
    support: int                 
    confidence: float           
    evidence_commits: list[str]  


class PostMortemResponse(BaseModel):
    matches: list[FingerprintMatch]  
    top_risk_files: list[str]         


class RecommendationResponse(BaseModel):
    verdict: str     
    summary: str       
    blast_risk: str  
    pattern_risk: str 



#Routes

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": "0.1.0"
    }

@app.post("/api/blast-radius", response_model=BlastRadiusResponse)
def get_blast_radius(req: AnalyzeRequest):

    is_valid, error = validate_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        result = analyze_blast_radius(
            repo_root=req.repo_path,
            changed_symbols=[req.pr_branch], 
            uncovered_nodes=[],
            use_rope=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"BlastRadius engine error: {str(e)}")
    translated = translate_blast_radius(result)
    return BlastRadiusResponse(**translated)



@app.post("/api/postmortem", response_model=PostMortemResponse)
def get_postmortem(req: AnalyzeRequest):

    is_valid, error = validate_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        rules = mine_association_rules(
            repo_path=req.repo_path,
            min_support=0.02,
            min_confidence=0.5
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PostMortem engine error: {str(e)}")

    if not rules:
        return PostMortemResponse(matches=[], top_risk_files=[])

    translated = translate_postmortem(rules)
    return PostMortemResponse(**translated)

@app.post("/api/analyze/stream")
async def analyze_stream(req: AnalyzeRequest):

    is_valid, error = validate_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        blast_result = analyze_blast_radius(
            repo_root=req.repo_path,
            changed_symbols=[req.pr_branch],
            uncovered_nodes=[],
            use_rope=False
        )
        blast_data = asdict(blast_result)
    except Exception as e:
        blast_data = {"error": str(e), "risk_tier": "MEDIUM"}

    try:
        postmortem_data = mine_association_rules(
            repo_path=req.repo_path,
            min_support=0.02,
            min_confidence=0.5
        )
    except Exception:
        postmortem_data = []

    from agents.langgraph_pipeline import run_pipeline_stream

    return StreamingResponse(
        run_pipeline_stream(blast_data, postmortem_data),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/recommendation", response_model=RecommendationResponse)
def get_recommendation(req: AnalyzeRequest):

    is_valid, error = validate_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    try:
        blast_result = analyze_blast_radius(
            repo_root=req.repo_path,
            changed_symbols=[req.pr_branch],
            uncovered_nodes=[],
            use_rope=False
        )
        blast_data = asdict(blast_result)
    except Exception as e:
        blast_data = {"error": str(e), "risk_tier": "MEDIUM"}

    try:
        postmortem_data = mine_association_rules(
            repo_path=req.repo_path,
            min_support=0.02,
            min_confidence=0.5
        )
    except Exception:
        postmortem_data = []

    from agents.langgraph_pipeline import run_pipeline
    result = run_pipeline(blast_data, postmortem_data)

    return RecommendationResponse(
        verdict=      result.verdict,
        summary=      result.summary,
        blast_risk=   result.blast_risk,
        pattern_risk= result.pattern_risk,
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )