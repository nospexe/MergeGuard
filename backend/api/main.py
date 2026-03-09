import asyncio
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from utils.path_validator import validate_repo_path



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

    return BlastRadiusResponse(
        nodes=[
            BlastRadiusNode(
                id="n0",
                file="auth/login.py",
                symbol="authenticate",
                coverage_status="covered",
                ring=0
            ),
            BlastRadiusNode(
                id="n1",
                file="auth/session.py",
                symbol="create_session",
                coverage_status="partial",
                ring=1
            ),
            BlastRadiusNode(
                id="n2",
                file="api/user_routes.py",
                symbol="get_user",
                coverage_status="uncovered",
                ring=2
            ),
        ],
        edges=[
            BlastRadiusEdge(source="n0", target="n1"),
            BlastRadiusEdge(source="n1", target="n2"),
        ],
        risk_score=0.62,
        risk_level="medium"
    )

@app.post("/api/postmortem", response_model=PostMortemResponse)
def get_postmortem(req: AnalyzeRequest):

    is_valid, error = validate_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    return PostMortemResponse(
        matches=[
            FingerprintMatch(
                pattern_id="FP-042",
                files=["auth/login.py", "auth/session.py"],
                support=7,
                confidence=0.78,
                evidence_commits=[
                    "a1b2c3d",
                    "e4f5g6h",
                    "i7j8k9l"
                ]
            ),
            FingerprintMatch(
                pattern_id="FP-017",
                files=["auth/login.py", "db/user_model.py"],
                support=4,
                confidence=0.61,
                evidence_commits=[
                    "m1n2o3p",
                    "q4r5s6t"
                ]
            ),
        ],
        top_risk_files=[
            "auth/login.py",
            "auth/session.py",
            "db/user_model.py"
        ]
    )

@app.post("/api/analyze/stream")
async def analyze_stream(req: AnalyzeRequest):

    is_valid, error = validate_repo_path(req.repo_path)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    async def token_generator():
        stub_tokens = [
            "Analyzing", " blast", " radius", " for",
            " branch", f" '{req.pr_branch}'...\n\n",
            "Found", " 3", " affected", " symbols.\n\n",
            "Checking", " historical", " failure", " patterns...\n\n",
            "Pattern", " FP-042", " matched", " with", " 78%", " confidence.\n\n",
            "VERDICT:", " YELLOW", " —", " Review", " recommended",
            " before", " merging."
        ]

        for token in stub_tokens:
            yield f"data: {token}\n\n"
            await asyncio.sleep(0.05)   

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        token_generator(),
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

    return RecommendationResponse(
        verdict="YELLOW",
        summary=(
            "This PR modifies the authentication layer which has 2 transitive "
            "dependents with incomplete test coverage. Historical patterns show "
            "a 78% correlation between changes to auth/login.py and subsequent "
            "bug-fix commits."
        ),
        blast_risk=(
            "2 uncovered transitive dependents detected in api/user_routes.py."
        ),
        pattern_risk=(
            "Pattern FP-042 matched — auth/login.py and auth/session.py were "
            "changed together in 7 prior bug-fix commits."
        )
    )






if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )