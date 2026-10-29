"""Additive private Python API; source stage, zero side-effect operations.

The existing PHP gateway remains authority for owner MFA, accounts, payment,
JREI worker authorization and the mother DB. These routes cannot turn a
proposal into an approved, saved, executed or published action.
"""
from __future__ import annotations

import os
import hashlib

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from jrei_core.auth import require_internal_gateway
from jrei_core.portability import source_portability_snapshot
from jrei_core.contracts import (
    LearningBatch, MissionProposal, MissionRequest, PrioritizedGoals,
)
from jrei_core.mission import MissionDependencyError, propose_mission
from jrei_core.local_model_draft import (
    LocalDraftRequest, LocalDraftResult, LocalModelUnavailable, create_local_owner_draft,
)
from jrei_learning.prioritizer import prioritize
from jrei_learning.news_claim_review import (
    NewsEditorialRequest, NewsEditorialPreflight, review_news_editorial,
)
from jrei_learning.exam_blueprint_review import (
    ExamReviewRequest, ExamBlueprintReview, review_exam_blueprint,
)
from jrei_learning.document_extraction import (
    DocumentExtractionRequest, DocumentExtractionResult, propose_private_extraction,
)
from jrei_learning.grounded_retrieval import (
    RetrievalRequest, GroundedRetrievalResult, select_grounded_excerpts,
)
from jrei_learning.answer_grounding_review import (
    AnswerReviewRequest, AnswerReviewResult, review_answer_grounding,
)
from jrei_learning.evidence_graph import (
    EvidenceGraphRequest, EvidenceGraphReview, review_evidence_graph,
)
from jrei_learning.knowledge_correction import (
    CorrectionReviewRequest, CorrectionReview, prepare_knowledge_corrections,
)
from jrei_learning.metacognitive_cycle import (
    MetacognitiveCycleRequest, MetacognitiveCycleResult, plan_metacognitive_cycle,
)
from jrei_learning.native_language_growth import (
    NativeLanguageGrowthRequest, NativeLanguageGrowthResult,
    plan_native_language_growth,
)
from jrei_core.model_portfolio import (
    ModelPortfolioRequest, ModelPortfolioResult, plan_model_portfolio,
)
from jrei_learning.self_improvement import (
    SelfImprovementCycleRequest, SelfImprovementCycleResult, plan_self_improvement,
)
from jrei_learning.value_of_information import (
    ValueOfLearningRequest, ValueOfLearningResult, propose_learning_value,
)
from jrei_learning.strategy_optimizer import (
    StrategyLearningRequest, StrategyLearningResult, propose_learning_method,
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
    OwnerMemoryListQuery, OwnerMemoryListResult,
    OwnerMemoryReadResult, OwnerMemoryRevokeReceipt,
)
from jrei_memory.store import (
    OwnerMemoryUnavailable, OwnerMemoryConflict,
    save_owner_note, read_owner_note, revoke_owner_note,
    list_owner_memory_metadata,
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
            "nonpublishing_exam_item_key_accessibility_blueprint_integrity_v1",
            "original_cms_news_bilingual_fact_rights_exception_preflight_v1",
            "bounded_exact_arithmetic_v1",
            "versioned_claim_dependency_and_revocation_review_v1",
            "source_change_news_exam_answer_retraction_review_only_v1",
            "sha_bound_bilingual_draft_claim_grounding_audit_v1",
            "gap_to_experiment_metacognitive_cycle_v1",
            "paired_outcome_strategy_learning_v1",
            "adaptive_24_7_capacity_placement_v1",
            "metacognitive_decision_to_scoped_mission_binding_v1",
            "experiment_feedback_on_learning_methods_v1",
            "bilingual_versioned_grounded_retrieval_proposal_v1",
            "offline_source_sha_anchored_document_extraction_v1",
            "separately_gated_owner_loopback_qwen_draft_source_v1",
        ],
        "live_model_inference": False,
        # Policy switches alone do not establish actual localhost Qwen uptime,
        # lawful model rights or acceptable response quality.
        "owner_local_draft_source_registered": True,
        "owner_local_draft_switches_enabled": (
            os.environ.get("JREI_PYTHON_OWNER_MODEL_DRAFT_ENABLED") == "1"
            and os.environ.get("JREI_PYTHON_LOCAL_MODEL_RIGHTS_OWNER_REVIEWED") == "1"
        ),
        "owner_local_model_health_independently_attested": False,
        "durable_missions": False,
        "mother_db_connected": False,
        "owner_memory_runtime": "NOT_ATTESTED_SOURCE_STAGED",
        "owner_actions": "NOT_IMPLEMENTED",
        "promotion_enabled": False,
        "public_chat_enabled": False,
    }


@app.get(
    "/internal/v1/architecture/portability",
    dependencies=[Depends(require_internal_gateway)],
)
async def private_portability_readiness():
    """Source-only status for a future independent AI domain.

    The future hostname comes only from locally owned service configuration;
    no request parameter changes routing or authorizes a migration. The
    existing authenticated internal gateway is required.
    """
    return source_portability_snapshot(
        os.environ.get("JREI_FUTURE_AI_PUBLIC_ORIGIN")
    )


@app.post(
    "/internal/v1/learning/prioritize",
    response_model=PrioritizedGoals,
    dependencies=[Depends(require_internal_gateway)],
)
async def prioritize_gaps(payload: LearningBatch):
    return prioritize(payload)


@app.post(
    "/internal/v1/knowledge/extraction/propose",
    response_model=DocumentExtractionResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def private_source_extraction_proposal(payload: DocumentExtractionRequest):
    # Only signed private gateway input. Source flags still require independent
    # canonical DB review; returns SHA anchors, not article text or licences.
    try:
        return propose_private_extraction(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post(
    "/internal/v1/knowledge/retrieval/propose",
    response_model=GroundedRetrievalResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def grounded_retrieval_proposal(payload: RetrievalRequest):
    # Caller metadata and excerpts are untrusted; no public response, model,
    # licence grant, DB query, or independent source attestation occurs.
    return await run_in_threadpool(select_grounded_excerpts, payload)


@app.post(
    "/internal/v1/learning/answers/grounding-review",
    response_model=AnswerReviewResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def review_bilingual_draft_grounding(payload: AnswerReviewRequest):
    # No raw learner/private conversation or copyrighted source text; never
    # attests citation truth, deploys a model, or publishes an answer.
    return review_answer_grounding(payload)


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
    "/internal/v1/knowledge/corrections/review",
    response_model=CorrectionReview,
    dependencies=[Depends(require_internal_gateway)],
)
async def knowledge_correction_preflight(payload: CorrectionReviewRequest):
    # Observes caller-supplied citation SHA and original CMS receipts only.
    # Revoked evidence yields a review recommendation, NOT a live withdrawal.
    return prepare_knowledge_corrections(payload)


@app.post(
    "/internal/v1/learning/native-language/plan",
    response_model=NativeLanguageGrowthResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def private_native_language_growth(payload: NativeLanguageGrowthRequest):
    # Model-free language competence planning. No source text or transcripts,
    # independent holdout never used to train, no weights changed.
    return await run_in_threadpool(plan_native_language_growth, payload)


@app.post(
    "/internal/v1/model/portfolio/plan",
    response_model=ModelPortfolioResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def private_model_portfolio(payload: ModelPortfolioRequest):
    # Selection proposal only. Does not contact or switch a provider.
    return await run_in_threadpool(plan_model_portfolio, payload)


@app.post(
    "/internal/v1/learning/self-improvement/plan",
    response_model=SelfImprovementCycleResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def private_self_improvement_plan(payload: SelfImprovementCycleRequest):
    # Coding and learning can be planned 24/7; decisions are not code writes.
    # External owner permission, independently verified held-out evidence,
    # isolated source changes and the existing deployment pipeline remain
    # mandatory. Missing or negative evidence always blocks auto-promotion.
    return await run_in_threadpool(plan_self_improvement, payload)


@app.post(
    "/internal/v1/learning/value-of-information/plan",
    response_model=ValueOfLearningResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def learning_value_portfolio(payload: ValueOfLearningRequest):
    # Bounded, evidence-driven choice of what to learn next. No external
    # sources, learner records, leases, tools, costs or publication are touched.
    return await run_in_threadpool(propose_learning_value, payload)


@app.post(
    "/internal/v1/learning/metacognitive/plan",
    response_model=MetacognitiveCycleResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def metacognitive_plan(payload: MetacognitiveCycleRequest, request: Request):
    # Select next learning method using aggregate gaps + supported claims +
    # paired bilingual comparison. Proposals only: no jobs or model training.
    # Echo the exact HMAC-gateway request hash so the existing mother-DB
    # journaling gateway can reject a stale/substituted Python response.
    result = await run_in_threadpool(plan_metacognitive_cycle, payload)
    payload_digest = hashlib.sha256(await request.body()).hexdigest()
    return result.model_copy(
        update={"submitted_payload_sha256": payload_digest}
    )


@app.post(
    "/internal/v1/learning/metacognitive/method-feedback",
    response_model=MethodFeedbackResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def metacognitive_method_feedback(payload: LearningMethodFeedbackRequest):
    return await run_in_threadpool(rank_learning_methods, payload)


@app.post(
    "/internal/v1/learning/metacognitive/mission-bind",
    response_model=LearningMissionBinding,
    dependencies=[Depends(require_internal_gateway)],
)
async def learning_mission_binding(payload: LearningMissionBindingRequest):
    return bind_learning_mission(payload)


@app.post(
    "/internal/v1/learning/strategy/propose",
    response_model=StrategyLearningResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def strategy_adaptation_proposal(payload: StrategyLearningRequest):
    # Learn which bounded evidence-acquisition or evaluation METHOD merits
    # isolated further study, from reviewed digest-referenced outcomes only.
    # This route never modifies a skill/model/DB, installs code or publishes.
    return await run_in_threadpool(propose_learning_method, payload)


@app.post(
    "/internal/v1/orchestration/capacity/plan",
    response_model=CapacityPlan,
    dependencies=[Depends(require_internal_gateway)],
)
async def adaptive_work_placement(payload: CapacityPlanRequest):
    # 24/7, no artificial daily cap; Tehran 02-05 boosts heavy-job PRIORITY
    # only. Measured headroom, approved resources/rights remain mandatory.
    return await run_in_threadpool(propose_capacity_placements, payload)


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
    "/internal/v1/news/official/editorial-preflight",
    response_model=NewsEditorialPreflight,
    dependencies=[Depends(require_internal_gateway)],
)
async def official_news_private_fact_preflight(payload: NewsEditorialRequest):
    # Claims, rights, original CMS authority and publication state are NOT
    # attested by caller metadata; this only emits a deterministic proposal.
    return review_news_editorial(payload)


@app.post(
    "/internal/v1/exams/blueprint/review",
    response_model=ExamBlueprintReview,
    dependencies=[Depends(require_internal_gateway)],
)
async def exam_blueprint_integrity_review(payload: ExamReviewRequest):
    # Metadata only: no private student/session records, question text,
    # independently attested correct keys, sale, timed exam or publication.
    return review_exam_blueprint(payload)


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
    "/internal/v1/model/owner-draft",
    response_model=LocalDraftResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def local_owner_model_draft(payload: LocalDraftRequest):
    # Independently opt-in, local Qwen only. The original MFA PHP owner
    # route, Python HMAC, separate model-rights approval and process-local
    # contention controls are additive. Never treat output as sourced fact.
    try:
        return await run_in_threadpool(create_local_owner_draft, payload)
    except LocalModelUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


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
        return await run_in_threadpool(save_owner_note, payload)
    except OwnerMemoryConflict as exc:
        raise HTTPException(status_code=409, detail="OWNER_MEMORY_IDEMPOTENCY_CONFLICT") from exc
    except OwnerMemoryUnavailable as exc:
        raise HTTPException(status_code=503, detail="OWNER_MEMORY_UNAVAILABLE") from exc


@app.post(
    "/internal/v1/memory/owner/read",
    response_model=OwnerMemoryReadResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def read_private_owner_memory(payload: OwnerMemoryRef):
    try:
        return await run_in_threadpool(read_owner_note, payload)
    except OwnerMemoryUnavailable as exc:
        raise HTTPException(status_code=503, detail="OWNER_MEMORY_UNAVAILABLE") from exc


@app.post(
    "/internal/v1/memory/owner/list",
    response_model=OwnerMemoryListResult,
    dependencies=[Depends(require_internal_gateway)],
)
async def list_private_owner_memory(payload: OwnerMemoryListQuery):
    # Metadata-only. An MFA session-bound PHP gateway supplies owner_account_id.
    # No plaintext, ciphertext, internal DB keys or global tenant lookup.
    try:
        return await run_in_threadpool(list_owner_memory_metadata, payload)
    except OwnerMemoryUnavailable as exc:
        raise HTTPException(status_code=503, detail="OWNER_MEMORY_UNAVAILABLE") from exc


@app.post(
    "/internal/v1/memory/owner/revoke",
    response_model=OwnerMemoryRevokeReceipt,
    dependencies=[Depends(require_internal_gateway)],
)
async def revoke_private_owner_memory(payload: OwnerMemoryRef):
    try:
        return await run_in_threadpool(revoke_owner_note, payload)
    except OwnerMemoryUnavailable as exc:
        raise HTTPException(status_code=503, detail="OWNER_MEMORY_UNAVAILABLE") from exc
