"""Evidence-aware value-of-learning planner for the JREI meta-learning cycle.

Determines which *question is worth investigating next* from aggregate,
hash-referenced evidence without requiring a model to invent a learning goal.
It does not browse, copy copyrighted sources, train models, claim evidence
independence, schedule worker jobs, authorize spending or mutate the mother DB.

Expected value is a transparent heuristic, NOT a calibrated probability of
success or evidence of student benefit. Review holds cannot be outweighed by
a high score. All numeric signals must come from external measurement.
"""
from __future__ import annotations

import hashlib
import json
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import (
    Digest, Identifier, StrictContract, Unit,
)

Method = Literal[
    "SOURCE_ACQUISITION_REVIEW", "RETRIEVAL_EXPERIMENT",
    "DETERMINISTIC_SKILL_PROPOSAL", "MODEL_ROUTING_REVIEW",
    "HUMAN_SCIENTIFIC_REVIEW", "RIGHTS_REVIEW",
]
Language = Literal["fa", "en", "bi"]


class LearningOpportunity(StrictContract):
    opportunity_id: Identifier
    domain: Identifier
    learning_question_sha256: Digest
    aggregated_failure_evidence_sha256: Digest
    measurement_version: Identifier
    language: Language
    # No raw student text, identifiers or proprietary question content.
    observed_cases: int = Field(ge=1, le=1_000_000)
    failure_prevalence: Unit
    learner_impact: Unit
    educational_importance: Unit
    coverage_gap: Unit
    epistemic_uncertainty: Unit
    # Heuristic *conditional* improvement signal, not a measured probability.
    expected_reduction_if_successful: Unit
    measurement_confidence: Unit
    proposed_method: Method
    source_id: Identifier | None = None
    legal_access_reviewed: bool = False
    independent_failure_review: bool = False
    published_source_withdrawn: bool = False
    privacy_or_child_consent_review_required: bool = False
    measured_negative_evidence_count: int = Field(ge=0, le=1_000_000)
    reviewer_verdict: Literal[
        "NOT_REVIEWED", "APPROVED_FOR_EXPERIMENT_DESIGN",
        "REJECTED", "SOURCE_RIGHTS_HOLD",
    ] = "NOT_REVIEWED"
    estimate_compute_seconds: int = Field(ge=0, le=259_200)
    estimate_transfer_bytes: int = Field(ge=0, le=1_099_511_627_776)
    estimate_storage_bytes: int = Field(ge=0, le=1_099_511_627_776)
    estimated_operational_risk: Unit

    @model_validator(mode="after")
    def coherent_inputs(self) -> "LearningOpportunity":
        if self.measured_negative_evidence_count > self.observed_cases:
            raise ValueError("NEGATIVE_EVIDENCE_OUTSIDE_OBSERVED_SAMPLE")
        if self.proposed_method == "SOURCE_ACQUISITION_REVIEW" and self.source_id is None:
            raise ValueError("SOURCE_ACQUISITION_REQUIRES_SOURCE_ID")
        if self.proposed_method == "RIGHTS_REVIEW" and self.source_id is None:
            raise ValueError("RIGHTS_REVIEW_REQUIRES_SOURCE_ID")
        return self


class ValueOfLearningRequest(StrictContract):
    schema_version: Literal["jr.jrei.learning-voi.v1"] = "jr.jrei.learning-voi.v1"
    policy_version: Identifier
    portfolio_id: Identifier
    policy_digest: Digest
    # Source policy and owner budget consent are external DB authorities.
    source_rights_policy_independently_attested: bool = False
    owner_budget_policy_approved: bool = False
    maximum_plannable_compute_seconds: int = Field(ge=0, le=604_800)
    remaining_authorized_transfer_bytes: int = Field(ge=0, le=1_099_511_627_776)
    remaining_authorized_storage_bytes: int = Field(ge=0, le=1_099_511_627_776)
    # This is a capacity ceiling for this *proposal*, never a daily crawl cap.
    maximum_proposals: int = Field(ge=1, le=100)
    opportunities: list[LearningOpportunity] = Field(min_length=1, max_length=300)

    @model_validator(mode="after")
    def reject_reused_opportunities(self) -> "ValueOfLearningRequest":
        identifiers = [x.opportunity_id for x in self.opportunities]
        if len(set(identifiers)) != len(identifiers):
            raise ValueError("DUPLICATE_OPPORTUNITY_ID")
        return self


class OpportunityDecision(StrictContract):
    opportunity_id: Identifier
    language: Language
    domain: Identifier
    proposed_method: Method
    # A bounded score for ranking proposals, NOT a statistical posterior.
    potential_learning_value: float = Field(ge=0, le=1)
    effective_sample_weight: float = Field(ge=0, le=1)
    risk_adjusted_value: float = Field(ge=0, le=1)
    value_per_compute_hour: float = Field(ge=0)
    negative_evidence_fraction: float = Field(ge=0, le=1)
    selection: Literal[
        "PROPOSE_REVIEW", "HOLD_RIGHTS", "HOLD_INDEPENDENCE",
        "HOLD_PRIVACY_OR_WITHDRAWAL", "HOLD_REJECTED",
        "HOLD_OWNER_BUDGET", "HOLD_RESOURCE_LIMIT",
        "HOLD_CAPACITY", "HOLD_LOW_CONFIDENCE",
    ]
    reasons: list[str] = Field(min_length=1, max_length=20)
    aggregate_evidence_sha256: Digest
    independent_verification_completed: Literal[False] = False
    job_lease_created: Literal[False] = False
    learning_claim_promoted: Literal[False] = False


class ValueOfLearningResult(StrictContract):
    schema_version: Literal["jr.jrei.learning-voi-result.v1"] = (
        "jr.jrei.learning-voi-result.v1"
    )
    portfolio_id: Identifier
    policy_version: Identifier
    input_sha256: Digest
    selections: list[OpportunityDecision]
    proposed_count: int
    held_count: int
    # A ranking order alone has no execution rights.
    source_attestation_independently_verified: Literal[False] = False
    measurement_scientifically_validated: Literal[False] = False
    learner_outcome_improved: Literal[False] = False
    network_or_worker_job_started: Literal[False] = False
    model_training_started: Literal[False] = False
    mother_database_written: Literal[False] = False


def _digest(model: StrictContract) -> str:
    canonical = json.dumps(
        model.model_dump(mode="json"), sort_keys=True, ensure_ascii=False,
        separators=(",", ":"),
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _indicators(opp: LearningOpportunity) -> tuple[float, float, float, float, float]:
    """Interpretable, bounded factors; no learned or hidden weights."""
    # Shrink small aggregate samples rather than pretending small N is
    # equivalent to a population measurement. This is a heuristic.
    effective_sample = opp.observed_cases / (opp.observed_cases + 200)
    negative_fraction = (
        opp.measured_negative_evidence_count / opp.observed_cases
    )
    impact = (
        0.35 * opp.learner_impact +
        0.25 * opp.educational_importance +
        0.20 * opp.coverage_gap +
        0.20 * opp.failure_prevalence
    )
    # High uncertainty makes learning potentially valuable only when the
    # evidence and potential educational impact justify investigation.
    uncertainty_multiplier = 0.45 + 0.55 * opp.epistemic_uncertainty
    potential = (
        impact * opp.expected_reduction_if_successful *
        uncertainty_multiplier *
        opp.measurement_confidence * effective_sample
    )
    # Do not erase negative results. They reduce expected value, and remain
    # independently observable in the returned receipt for future review.
    risk = max(0.0, min(1.0, potential *
                      (1.0 - 0.65 * opp.estimated_operational_risk) *
                      (1.0 - 0.40 * negative_fraction)))
    compute_hours = max(1 / 60, opp.estimate_compute_seconds / 3600)
    return (
        round(potential, 6), round(effective_sample, 6),
        round(risk, 6), round(risk / compute_hours, 6),
        round(negative_fraction, 6),
    )


def propose_learning_value(request: ValueOfLearningRequest) -> ValueOfLearningResult:
    """Rank all supplied opportunities; provide bounded, reviewed next steps.

    The model-free portfolio allocator never skips held records, and uses
    deterministic stable ordering so the same request yields the same digest.
    Nothing here confirms the upstream licence, source or measurements.
    """
    scored = [
        (opp, _indicators(opp)) for opp in request.opportunities
    ]
    # A multi-objective ordering: absolute expected educational value first;
    # resource-normalized value second, then stable identifier. No daily quota.
    scored.sort(key=lambda item: (
        -item[1][2], -item[1][3], item[0].opportunity_id
    ))
    compute_remaining = request.maximum_plannable_compute_seconds
    transfer_remaining = request.remaining_authorized_transfer_bytes
    storage_remaining = request.remaining_authorized_storage_bytes
    proposed = 0
    decisions: list[OpportunityDecision] = []

    for opp, (potential, sample, risk, efficiency, negative) in scored:
        holds: list[str] = []
        if opp.published_source_withdrawn or opp.privacy_or_child_consent_review_required:
            holds.append("WITHDRAWAL_OR_PRIVACY_REVIEW_REQUIRED")
            state = "HOLD_PRIVACY_OR_WITHDRAWAL"
        elif opp.reviewer_verdict == "REJECTED":
            holds.append("INDEPENDENT_REVIEW_REJECTED")
            state = "HOLD_REJECTED"
        elif (
            opp.reviewer_verdict == "SOURCE_RIGHTS_HOLD" or
            (opp.source_id is not None and not opp.legal_access_reviewed) or
            (opp.source_id is not None and not request.source_rights_policy_independently_attested)
        ):
            holds.append("LICENSE_OR_SOURCE_RIGHTS_HOLD")
            state = "HOLD_RIGHTS"
        elif (
            not opp.independent_failure_review or
            opp.reviewer_verdict != "APPROVED_FOR_EXPERIMENT_DESIGN"
        ):
            holds.append("OBSERVATIONS_OR_EXPERIMENT_NOT_INDEPENDENTLY_REVIEWED")
            state = "HOLD_INDEPENDENCE"
        elif opp.measurement_confidence <= 0 or risk <= 0:
            holds.append("NO_CONFIDENT_MEASURABLE_EXPECTED_VALUE")
            state = "HOLD_LOW_CONFIDENCE"
        elif not request.owner_budget_policy_approved:
            holds.append("OWNER_RESOURCE_POLICY_NOT_APPROVED")
            state = "HOLD_OWNER_BUDGET"
        elif (
            opp.estimate_compute_seconds > compute_remaining or
            opp.estimate_transfer_bytes > transfer_remaining or
            opp.estimate_storage_bytes > storage_remaining
        ):
            holds.append("REMAINING_APPROVED_RESOURCES_INSUFFICIENT")
            state = "HOLD_RESOURCE_LIMIT"
        elif proposed >= request.maximum_proposals:
            holds.append("CURRENT_PLANNING_CAPACITY_EXHAUSTED")
            state = "HOLD_CAPACITY"
        else:
            state = "PROPOSE_REVIEW"
            holds.append("INDEPENDENT_OWNER_EXP_DESIGN_AND_LEASE_STILL_REQUIRED")
            compute_remaining -= opp.estimate_compute_seconds
            transfer_remaining -= opp.estimate_transfer_bytes
            storage_remaining -= opp.estimate_storage_bytes
            proposed += 1

        decisions.append(OpportunityDecision(
            opportunity_id=opp.opportunity_id,
            language=opp.language, domain=opp.domain,
            proposed_method=opp.proposed_method,
            potential_learning_value=potential,
            effective_sample_weight=sample,
            risk_adjusted_value=risk,
            value_per_compute_hour=efficiency,
            negative_evidence_fraction=negative,
            selection=state, reasons=holds,
            aggregate_evidence_sha256=opp.aggregated_failure_evidence_sha256,
        ))

    return ValueOfLearningResult(
        portfolio_id=request.portfolio_id,
        policy_version=request.policy_version,
        input_sha256=_digest(request),
        selections=decisions,
        proposed_count=proposed,
        held_count=len(decisions) - proposed,
    )
