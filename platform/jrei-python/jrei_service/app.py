"""Additive private Python API; source stage, zero side-effect operations.

The existing PHP gateway remains authority for owner MFA, accounts, payment,
JREI worker authorization and the mother DB. These routes cannot turn a
proposal into an approved, saved, executed or published action.
"""
from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException
from jrei_core.auth import require_internal_gateway
from jrei_core.contracts import (
    LearningBatch, MissionProposal, MissionRequest, PrioritizedGoals,
)
from jrei_core.mission import MissionDependencyError, propose_mission
from jrei_learning.prioritizer import prioritize
from jrei_learning.heldout import HeldoutReviewRequest, HeldoutReviewResult, review_heldout
from jrei_skills import EvidenceTriageRequest, EvidenceTriageResult, triage_evidence_revision
from jrei_skills.registry import skill_catalog
from jrei_skills.arithmetic import ArithmeticRequest, ArithmeticResult, ArithmeticRejected, calculate_exact

app = FastAPI(
    title="JREI Private Intelligence Contracts",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


@app.middleware("http")
async def never_cache_private_metadata(request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.get("/internal/v1/health")
async def health():
    # HTTP process liveness is NOT live JREI capability evidence.
    return {
        "schema": "jr.jrei.python-health.v1",
        "service": "jrei-private-python",
        "service_process": "RESPONDING",
        "mother_db": "NOT_CONNECTED",
        "model_state": "UNKNOWN",
        "windows_nodes": "UNKNOWN",
        "owner_mfa": "NOT_HANDLED_HERE",
        "production_ready": False,
    }


@app.get(
    "/internal/v1/capabilities",
    dependencies=[Depends(require_internal_gateway)],
)
async def capabilities():
    return {
        "schema": "jr.jrei.python-capabilities.v1",
        "mode": "SOURCE_ONLY_MODEL_FREE",
        "executable_read_only_algorithms": [
            "aggregate_gap_prioritization_v1",
            "scoped_mission_dag_proposal_v1",
            "evidence_revision_triage_v1",
            "paired_bilingual_heldout_review_v1",
            "bounded_exact_arithmetic_v1",
        ],
        "live_model_inference": False,
        "durable_missions": False,
        "mother_db_connected": False,
        "owner_actions": "NOT_IMPLEMENTED",
        "promotion_enabled": False,
        "public_chat_enabled": False,
    }


@app.post(
    "/internal/v1/learning/prioritize",
    response_model=PrioritizedGoals,
    dependencies=[Depends(require_internal_gateway)],
)
async def prioritize_gaps(payload: LearningBatch):
    return prioritize(payload)


@app.post(
    "/internal/v1/missions/propose",
    response_model=MissionProposal,
    dependencies=[Depends(require_internal_gateway)],
)
async def mission_proposal(payload: MissionRequest):
    try:
        return propose_mission(payload)
    except MissionDependencyError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post(
    "/internal/v1/skills/catalog",
    dependencies=[Depends(require_internal_gateway)],
)
async def registered_skills():
    # Signed gateway only; the manifest conveys no privilege to a model.
    return skill_catalog()


@app.post(
    "/internal/v1/skills/evidence/triage",
    response_model=EvidenceTriageResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def evidence_revision_triage(payload: EvidenceTriageRequest):
    # Computation only. Source/rights approval stays with independent mother-DB review.
    return triage_evidence_revision(payload)


@app.post(
    "/internal/v1/learning/heldout/review",
    response_model=HeldoutReviewResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def heldout_evidence_review(payload: HeldoutReviewRequest):
    # Caller data only. No test fixture rights or independence is attested;
    # no knowledge or model promotion is applied, and no DB is changed.
    return review_heldout(payload)


@app.post(
    "/internal/v1/skills/arithmetic/calculate",
    response_model=ArithmeticResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def exact_arithmetic(payload: ArithmeticRequest):
    # Deterministic local-only computation; no model/provider, DB or learner data.
    try:
        return calculate_exact(payload)
    except ArithmeticRejected as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
