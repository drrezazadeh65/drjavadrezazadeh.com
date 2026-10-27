"""Additive private Python API; source stage, zero side-effect operations.

The existing PHP gateway remains authority for owner MFA, accounts, payment,
JREI worker authorization and the mother DB. These routes cannot turn a
proposal into an approved, saved, executed or published action.
"""
from __future__ import annotations

from fastapi import Depends, FastAPI, HTTPException, Request
from jrei_core.auth import require_internal_gateway
from jrei_core.contracts import (
    LearningBatch, MissionProposal, MissionRequest, PrioritizedGoals,
)
from jrei_core.mission import MissionDependencyError, propose_mission
from jrei_learning.prioritizer import prioritize
from jrei_learning.evidence_graph import (
    EvidenceGraphRequest, EvidenceGraphReview, review_evidence_graph,
)
from jrei_learning.metacognitive_cycle import (
    MetacognitiveCycleRequest, MetacognitiveCycleResult, plan_metacognitive_cycle,
)
from jrei_orchestrator.adaptive_capacity import (
    CapacityPlanRequest, CapacityPlan, propose_capacity_placements,
)
from jrei_learning.mission_binding import LearningMissionBindingRequest, LearningMissionBinding, bind_learning_mission
from jrei_learning.method_feedback import (
    LearningMethodFeedbackRequest, MethodFeedbackResult, rank_learning_methods,
)
from jrei_learning.heldout import HeldoutReviewRequest, HeldoutReviewResult, review_heldout
from jrei_skills import EvidenceTriageRequest, EvidenceTriageResult, triage_evidence_revision
from jrei_skills.registry import skill_catalog
from jrei_skills.arithmetic import ArithmeticRequest, ArithmeticResult, ArithmeticRejected, calculate_exact
from jrei_memory.contracts import (
    OwnerMemorySave, OwnerMemoryRef, OwnerMemoryReceipt,
    OwnerMemoryReadResult, OwnerMemoryRevokeReceipt,
)
from jrei_memory.store import (
    OwnerMemoryUnavailable, save_owner_note, read_owner_note, revoke_owner_note,
)

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
            "versioned_claim_dependency_and_revocation_review_v1",
            "gap_to_experiment_metacognitive_cycle_v1",
            "adaptive_24_7_capacity_placement_v1",
            "metacognitive_decision_to_scoped_mission_binding_v1",
            "experiment_feedback_on_learning_methods_v1",
        ],
        "live_model_inference": False,
        "durable_missions": False,
        "mother_db_connected": False,
        "owner_memory_runtime": "NOT_ATTESTED_SOURCE_STAGED",
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
    "/internal/v1/learning/evidence-graph/review",
    response_model=EvidenceGraphReview,
    dependencies=[Depends(require_internal_gateway)],
)
async def evidence_graph_review(payload: EvidenceGraphRequest):
    # SHA-bound evidence pointers, source withdrawal and transitive invalidation
    # are computed without claiming rights verification, retrieval or indexing.
    return review_evidence_graph(payload)


@app.post(
    "/internal/v1/learning/metacognitive/plan",
    response_model=MetacognitiveCycleResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def metacognitive_plan(payload: MetacognitiveCycleRequest):
    # Select next learning method using aggregate gaps + supported claims +
    # paired bilingual comparison. Proposals only: no jobs or model training.
    return plan_metacognitive_cycle(payload)


@app.post(
    "/internal/v1/learning/metacognitive/method-feedback",
    response_model=MethodFeedbackResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def metacognitive_method_feedback(payload: LearningMethodFeedbackRequest):
    return rank_learning_methods(payload)


@app.post(
    "/internal/v1/learning/metacognitive/mission-bind",
    response_model=LearningMissionBinding,
    dependencies=[Depends(require_internal_gateway)],
)
async def learning_mission_binding(payload: LearningMissionBindingRequest):
    return bind_learning_mission(payload)


@app.post(
    "/internal/v1/orchestration/capacity/plan",
    response_model=CapacityPlan,
    dependencies=[Depends(require_internal_gateway)],
)
async def adaptive_work_placement(payload: CapacityPlanRequest):
    # 24/7, no artificial daily cap; Tehran 02-05 boosts heavy-job PRIORITY
    # only. Measured headroom, approved resources/rights remain mandatory.
    return propose_capacity_placements(payload)


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


@app.post(
    "/internal/v1/worker/arithmetic",
    response_model=ArithmeticResult,
)
async def loopback_fixed_worker_canary(payload: ArithmeticRequest, request: Request):
    """Only the deterministic 12*7 canary; never model, learner or credentials.

    This endpoint is intentionally NOT a general unprotected tool gateway.
    Uvicorn MUST continue binding to 127.0.0.1, never 0.0.0.0.
    An external network source, even behind a proxy, must not be trusted.
    """
    peer = request.client.host if request.client is not None else None
    if peer not in ("127.0.0.1", "::1"):
        raise HTTPException(status_code=403, detail="LOOPBACK_REQUIRED")
    if payload.expression != "12*7":
        raise HTTPException(status_code=422, detail="FIXED_CANARY_ONLY")
    return calculate_exact(payload)


@app.post(
    "/internal/v1/memory/owner/save",
    response_model=OwnerMemoryReceipt,
    dependencies=[Depends(require_internal_gateway)],
)
async def save_private_owner_memory(payload: OwnerMemorySave):
    try:
        return save_owner_note(payload)
    except OwnerMemoryUnavailable as exc:
        raise HTTPException(status_code=503, detail="OWNER_MEMORY_UNAVAILABLE") from exc


@app.post(
    "/internal/v1/memory/owner/read",
    response_model=OwnerMemoryReadResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def read_private_owner_memory(payload: OwnerMemoryRef):
    try:
        return read_owner_note(payload)
    except OwnerMemoryUnavailable as exc:
        raise HTTPException(status_code=503, detail="OWNER_MEMORY_UNAVAILABLE") from exc


@app.post(
    "/internal/v1/memory/owner/revoke",
    response_model=OwnerMemoryRevokeReceipt,
    dependencies=[Depends(require_internal_gateway)],
)
async def revoke_private_owner_memory(payload: OwnerMemoryRef):
    try:
        return revoke_owner_note(payload)
    except OwnerMemoryUnavailable as exc:
        raise HTTPException(status_code=503, detail="OWNER_MEMORY_UNAVAILABLE") from exc
