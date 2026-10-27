"""Compositional JREI 'learning to learn' decision cycle.

Turns aggregate quality gaps, versioned claim provenance and paired held-out
comparison into an interpretable next-learning-method decision. Does not crawl,
train, publish, edit the site or grant review/rights by inference. External
MFA, evidence certification, licensed acquisition and experiment custody stay
with the existing mother-DB/owner platform.
"""
from __future__ import annotations

import hashlib
import json
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import (
    Digest, Identifier, LearningBatch, StrictContract,
)
from jrei_learning.prioritizer import prioritize
from jrei_learning.evidence_graph import EvidenceGraphRequest, review_evidence_graph
from jrei_learning.heldout import (
    HeldoutReviewRequest, review_heldout,
)
from jrei_learning.strategy_optimizer import (
    StrategyLearningRequest, propose_learning_method,
)


class GapContext(StrictContract):
    gap_id: Identifier
    supporting_claim_ids: list[Identifier] = Field(max_length=16)
    experiment_id: Identifier | None = None

    @model_validator(mode="after")
    def claim_links(self) -> "GapContext":
        if len(self.supporting_claim_ids) != len(set(self.supporting_claim_ids)):
            raise ValueError("DUPLICATE_GAP_SUPPORTING_CLAIM")
        return self


class MetacognitiveCycleRequest(StrictContract):
    schema_version: Literal["jr.jrei.metacognitive-cycle.v1"] = "jr.jrei.metacognitive-cycle.v1"
    gaps: LearningBatch
    knowledge: EvidenceGraphRequest
    contexts: list[GapContext] = Field(min_length=1, max_length=200)
    heldout: list[HeldoutReviewRequest] = Field(default_factory=list, max_length=40)
    strategy_histories: list[StrategyLearningRequest] = Field(
        default_factory=list, max_length=16
    )

    @model_validator(mode="after")
    def compatible_evidence(self) -> "MetacognitiveCycleRequest":
        if self.gaps.policy_version != self.knowledge.policy_version:
            raise ValueError("INCONSISTENT_LEARNING_POLICY")
        gap_ids = {gap.gap_id for gap in self.gaps.gaps}
        context_ids = [item.gap_id for item in self.contexts]
        if len(set(context_ids)) != len(context_ids) or set(context_ids) != gap_ids:
            raise ValueError("GAP_CONTEXT_SET_MISMATCH")
        known_claims = {claim.claim_id for claim in self.knowledge.claims}
        for ctx in self.contexts:
            if set(ctx.supporting_claim_ids) - known_claims:
                raise ValueError("GAP_HAS_UNKNOWN_CLAIM_REFERENCE")
        experiment_ids = [e.experiment_id for e in self.heldout]
        if len(experiment_ids) != len(set(experiment_ids)):
            raise ValueError("DUPLICATE_HELDOUT_EXPERIMENT")
        connected_ids = [ctx.experiment_id for ctx in self.contexts if ctx.experiment_id]
        if len(connected_ids) != len(set(connected_ids)):
            raise ValueError("HELDOUT_EXPERIMENT_USED_BY_MULTIPLE_GAPS")
        if set(experiment_ids) - set(connected_ids):
            raise ValueError("UNRELATED_HELDOUT_EXPERIMENT")
        for evaluation in self.heldout:
            if evaluation.policy_version != self.gaps.policy_version:
                raise ValueError("HELDOUT_POLICY_MISMATCH")
        domain_ids = [history.target_domain for history in self.strategy_histories]
        if len(domain_ids) != len(set(domain_ids)):
            raise ValueError("DUPLICATE_METHOD_STRATEGY_DOMAIN")
        supported_domains = {gap.domain for gap in self.gaps.gaps}
        for history in self.strategy_histories:
            if (history.target_domain not in supported_domains or
                    history.policy_version != self.gaps.policy_version):
                raise ValueError("METHOD_STRATEGY_POLICY_OR_DOMAIN_MISMATCH")
        return self


class LearningDecision(StrictContract):
    gap_id: Identifier
    domain: Identifier
    score: float
    recommended_learning_method: str
    decision: Literal[
        "HOLD_RIGHTS_REVIEW",
        "HOLD_SOURCE_OR_CITATION",
        "HOLD_INDEPENDENT_EVIDENCE",
        "HOLD_HELDOUT_REGRESSION",
        "HOLD_INSUFFICIENT_BENCHMARK",
        "PROPOSE_ISOLATED_EXPERIMENT",
        "REVIEW_CHALLENGER_WITH_OWNER",
    ]
    next_action: Literal[
        "REQUEST_SOURCE_RIGHTS_REVIEW",
        "REPAIR_SOURCE_PROVENANCE",
        "OBTAIN_INDEPENDENT_EVIDENCE_REVIEW",
        "REVISE_OR_REJECT_CHALLENGER",
        "CURATE_PAIRED_BILINGUAL_HELDOUT",
        "DESIGN_BOUNDED_EXPERIMENT",
        "REQUEST_OWNER_SCIENTIFIC_DECISION",
    ]
    supporting_claim_ids: list[Identifier]
    reason_codes: list[str]
    heldout_decision: str | None = None
    negative_case_digest: Digest | None = None
    evidence_request_digest: Digest
    strategy_history_digest: Digest | None = None
    owner_approval_required: Literal[True] = True
    knowledge_promoted: Literal[False] = False
    model_training_started: Literal[False] = False
    mission_executed: Literal[False] = False


class MetacognitiveCycleResult(StrictContract):
    schema_version: Literal["jr.jrei.metacognitive-cycle-result.v1"] = (
        "jr.jrei.metacognitive-cycle-result.v1"
    )
    policy_version: Identifier
    request_sha256: Digest
    gap_count: int
    evidence_graph_sha256: Digest
    decisions: list[LearningDecision]
    learning_method_selection_executed: Literal[True] = True
    inputs_independently_verified_by_service: Literal[False] = False
    source_acquisition_started: Literal[False] = False
    knowledge_written: Literal[False] = False
    learning_improvement_proven: Literal[False] = False
    automatic_skill_promotion: Literal[False] = False
    autonomous_model_training_started: Literal[False] = False
    public_site_changed: Literal[False] = False


def plan_metacognitive_cycle(
    request: MetacognitiveCycleRequest,
) -> MetacognitiveCycleResult:
    """Select a reproducible next step for every known gap, including failure.

    Evidence and sample-size findings cannot silently disappear when a
    challenger regresses or a cited source is revoked. Improvements are
    *candidates for* independent evaluation, never automatic promotion.
    """
    goals = prioritize(request.gaps)
    evidence_review = review_evidence_graph(request.knowledge)
    claim_decisions = {c.claim_id: c for c in evidence_review.claims}
    contexts = {c.gap_id: c for c in request.contexts}
    comparisons = {x.experiment_id: review_heldout(x) for x in request.heldout}
    strategy_proposals = {
        x.target_domain: propose_learning_method(x)
        for x in request.strategy_histories
    }
    decisions: list[LearningDecision] = []

    for goal in goals.goals:
        context = contexts[goal.gap_id]
        reasons = set(goal.reason_codes)
        blocked = [
            claim_decisions[claim_id]
            for claim_id in context.supporting_claim_ids
            if claim_decisions[claim_id].blocked
        ]
        comparison = comparisons.get(context.experiment_id) if context.experiment_id else None
        if goal.decision == "REQUIRES_RIGHTS_REVIEW":
            decision = "HOLD_RIGHTS_REVIEW"
            action = "REQUEST_SOURCE_RIGHTS_REVIEW"
            reasons.add("GAP_RIGHTS_REVIEW_REQUIRED")
        elif not context.supporting_claim_ids or blocked:
            decision = "HOLD_SOURCE_OR_CITATION"
            action = "REPAIR_SOURCE_PROVENANCE"
            reasons.add("CITED_EVIDENCE_MISSING_BLOCKED_OR_STALE")
            for item in blocked:
                reasons.update(item.reason_codes)
        elif goal.decision == "REQUIRES_EVIDENCE_REVIEW":
            decision = "HOLD_INDEPENDENT_EVIDENCE"
            action = "OBTAIN_INDEPENDENT_EVIDENCE_REVIEW"
            reasons.add("GAP_EVIDENCE_INDEPENDENCE_NOT_VERIFIED")
        elif comparison is None:
            decision = "PROPOSE_ISOLATED_EXPERIMENT"
            action = "DESIGN_BOUNDED_EXPERIMENT"
            reasons.add("NO_PAIRED_CHALLENGER_EVALUATION")
        elif comparison.decision == "REVIEW_CANDIDATE_ONLY":
            decision = "REVIEW_CHALLENGER_WITH_OWNER"
            action = "REQUEST_OWNER_SCIENTIFIC_DECISION"
            reasons.add("CANDIDATE_BENCHMARK_NOT_AUTHORIZATION")
        elif comparison.decision in (
            "HOLD_LANGUAGE_REGRESSION", "HOLD_LATENCY_REGRESSION",
            "NO_DEMONSTRATED_IMPROVEMENT",
        ):
            decision = "HOLD_HELDOUT_REGRESSION"
            action = "REVISE_OR_REJECT_CHALLENGER"
            reasons.add("CHALLENGER_DID_NOT_OUTPERFORM_BASELINE")
        else:
            decision = "HOLD_INSUFFICIENT_BENCHMARK"
            action = "CURATE_PAIRED_BILINGUAL_HELDOUT"
            reasons.add("HELDOUT_RIGHTS_LEAKAGE_OR_SAMPLE_REVIEW_REQUIRED")

        if comparison is not None:
            reasons.update(comparison.reason_codes)
        method = goal.selected_method
        strategy = strategy_proposals.get(goal.domain)
        # A favorable held-out result does not erase a historically observed
        # regression for the proposed learning method. Keep the current
        # experiment in owner review, while refusing to reuse that method.
        strategy_has_regression = bool(
            strategy is not None and strategy.proposed_next_method is not None
            and any(
                entry.method == strategy.proposed_next_method
                and entry.negative_outcome_count > 0
                and entry.evidence_state != "NO_INDEPENDENTLY_ATTESTED_RECORDS"
                for entry in strategy.compared_method_evidence
            )
        )
        # A reviewed *historical method proposal* may influence only a
        # rights-eligible, evidence-eligible, unblocked NEXT experiment. It
        # cannot override a RIGHTS_REVIEW or independent evidence hold.
        if (strategy is not None and strategy.proposed_next_method is not None
                and goal.decision == "PROPOSED"
                and not strategy_has_regression
                and context.supporting_claim_ids and not blocked
                and decision in (
                    "PROPOSE_ISOLATED_EXPERIMENT", "REVIEW_CHALLENGER_WITH_OWNER",
                )):
            method = strategy.proposed_next_method
            reasons.add("HISTORICAL_METHOD_PROPOSAL_FOR_OWNER_REVIEW_ONLY")
        decisions.append(LearningDecision(
            gap_id=goal.gap_id, domain=goal.domain, score=goal.score,
            recommended_learning_method=method,
            decision=decision, next_action=action,
            supporting_claim_ids=sorted(context.supporting_claim_ids),
            reason_codes=sorted(reasons),
            heldout_decision=comparison.decision if comparison else None,
            negative_case_digest=comparison.negative_cases_sha256 if comparison else None,
            evidence_request_digest=evidence_review.request_sha256,
            strategy_history_digest=strategy.input_sha256 if strategy else None,
        ))

    payload = json.dumps(request.model_dump(mode="json"), sort_keys=True,
                         ensure_ascii=False, separators=(",", ":"))
    return MetacognitiveCycleResult(
        policy_version=request.gaps.policy_version,
        request_sha256=hashlib.sha256(payload.encode("utf-8")).hexdigest(),
        gap_count=len(decisions),
        evidence_graph_sha256=evidence_review.request_sha256,
        decisions=decisions,
    )
