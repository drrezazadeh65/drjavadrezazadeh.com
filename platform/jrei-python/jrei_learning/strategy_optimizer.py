"""Data-bound learning-to-learn strategy estimation for JREI.

A method is *suggested* by reproducible, paired bilingual outcomes across
completed experiments; source licence, scientific independence, experimental
control, causal claims and promotion still require mother-DB/owner authority.
No model calls, training, crawling, persistent writes or automatic releases.
Only experiment IDs, source fixture digests and bounded outcome booleans cross
this interface; raw private user/learner conversations are forbidden.
"""
from __future__ import annotations

import hashlib
import json
import math
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract, Unit
from jrei_learning.heldout import HeldoutReviewRequest, review_heldout

LearningMethod = Literal[
    "RIGHTS_REVIEW", "SOURCE_ACQUISITION_REVIEW", "RETRIEVAL_EXPERIMENT",
    "DETERMINISTIC_SKILL_PROPOSAL", "MODEL_ROUTING_REVIEW",
    "HUMAN_SCIENTIFIC_REVIEW",
]

_METHODS: tuple[str, ...] = (
    "RIGHTS_REVIEW", "SOURCE_ACQUISITION_REVIEW", "RETRIEVAL_EXPERIMENT",
    "DETERMINISTIC_SKILL_PROPOSAL", "MODEL_ROUTING_REVIEW",
    "HUMAN_SCIENTIFIC_REVIEW",
)
# The two kinds of reviews never become self-approved by scoring.
_REVIEW_ONLY = frozenset({"RIGHTS_REVIEW", "HUMAN_SCIENTIFIC_REVIEW"})


class LearningMethodEpisode(StrictContract):
    episode_id: Identifier
    domain: Identifier
    method: LearningMethod
    policy_version: Identifier
    # A case-level comparison is evaluated here, not a caller-supplied
    # subjective reward or a model-authored performance claim.
    heldout: HeldoutReviewRequest
    independent_experiment_review_id: Identifier | None = None
    source_policy_snapshot_sha256: Digest
    total_resource_cost: Unit
    observed_operational_risk: Unit
    evaluation_purpose: Literal["RETRIEVAL", "BILINGUAL_RESPONSE", "TOOL", "LATENCY"]
    candidate_was_promoted: bool = False

    @model_validator(mode="after")
    def strict_episode(self) -> "LearningMethodEpisode":
        if self.policy_version != self.heldout.policy_version:
            raise ValueError("EXPERIMENT_POLICY_NOT_COMPARABLE")
        if self.candidate_was_promoted:
            # A strategy recommendation cannot import already promoted
            # candidates as clean independent counterfactual evidence.
            raise ValueError("PREVIOUSLY_PROMOTED_EXPERIMENT_NOT_ISOLATED")
        return self


class StrategyLearningRequest(StrictContract):
    schema_version: Literal["jr.jrei.learning-strategy-evidence.v1"] = (
        "jr.jrei.learning-strategy-evidence.v1"
    )
    policy_version: Identifier
    target_domain: Identifier
    target_purpose: Literal["RETRIEVAL", "BILINGUAL_RESPONSE", "TOOL", "LATENCY"]
    policy_snapshot_sha256: Digest
    episodes: list[LearningMethodEpisode] = Field(max_length=400)
    # Exploration never grants execution. It merely ranks further
    # experiments where historic paired evidence is sparse.
    minimum_reviewed_episodes_per_method: int = Field(default=3, ge=1, le=100)
    exploration_coefficient: float = Field(
        default=0.10, ge=0, le=0.5, allow_inf_nan=False
    )
    resource_cost_penalty: float = Field(
        default=0.15, ge=0, le=1, allow_inf_nan=False
    )
    operational_risk_penalty: float = Field(
        default=0.25, ge=0, le=1, allow_inf_nan=False
    )

    @model_validator(mode="after")
    def unique_references(self) -> "StrategyLearningRequest":
        ids = [episode.episode_id for episode in self.episodes]
        evaluations = [episode.heldout.experiment_id for episode in self.episodes]
        if len(set(ids)) != len(ids) or len(set(evaluations)) != len(evaluations):
            raise ValueError("DUPLICATE_EXPERIMENT_EVIDENCE")
        if any(episode.policy_version != self.policy_version for episode in self.episodes):
            raise ValueError("HISTORICAL_POLICY_VERSION_MISMATCH")
        return self


class MethodEvidence(StrictContract):
    method: LearningMethod
    eligible_episode_count: int
    demonstrated_candidate_count: int
    negative_outcome_count: int
    ineligible_episode_count: int
    mean_cost: float
    mean_risk: float
    smoothed_observed_success_rate: float
    proposed_priority_score: float
    evidence_state: Literal[
        "NO_INDEPENDENTLY_ATTESTED_RECORDS",
        "INSUFFICIENT_PAIRED_EPISODES",
        "CANDIDATE_METHOD_FOR_REVIEW",
        "REVIEW_METHOD_REQUIRES_EXTERNAL_AUTHORITY",
    ]
    negative_evidence_sha256: Digest
    statistically_proven_superiority: Literal[False] = False


class StrategyLearningResult(StrictContract):
    schema_version: Literal["jr.jrei.learning-strategy-proposal.v1"] = (
        "jr.jrei.learning-strategy-proposal.v1"
    )
    policy_version: Identifier
    domain: Identifier
    purpose: str
    input_sha256: Digest
    compared_method_evidence: list[MethodEvidence]
    proposed_next_method: LearningMethod | None
    next_action: Literal[
        "OBTAIN_INDEPENDENT_EVIDENCE",
        "PREPARE_BOUNDED_HELDOUT_EXPERIMENT",
        "REQUEST_OWNER_METHOD_REVIEW",
    ]
    reason_codes: list[str]
    inputs_independently_attested_by_service: Literal[False] = False
    changes_executed: Literal[False] = False
    automatic_method_change_applied: Literal[False] = False
    model_weights_changed: Literal[False] = False
    scientific_improvement_proven: Literal[False] = False


def _digest(value: object) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True,
                         separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def propose_learning_method(
    payload: StrategyLearningRequest,
) -> StrategyLearningResult:
    """Use exact comparison results while preserving negative experiments.

    'REVIEW_CANDIDATE_ONLY' contributes one positive *candidate observation*,
    not a verified scientific improvement. Failed/neutral reviewed experiments
    count against it. Experiments lacking prerequisite independent review are
    quarantined rather than silently treated as successes.
    """
    records: dict[str, list[tuple[str, bool, float, float]]] = {
        method: [] for method in _METHODS
    }
    excluded: dict[str, int] = {method: 0 for method in _METHODS}
    negative: dict[str, list[str]] = {method: [] for method in _METHODS}
    regressions: dict[str, int] = {method: 0 for method in _METHODS}

    for episode in payload.episodes:
        if (episode.domain != payload.target_domain
                or episode.evaluation_purpose != payload.target_purpose):
            continue
        reviewed = review_heldout(episode.heldout)
        # A claimed review ID does not prove actual reviewer independence.
        # It is retained as an explicit externally verifiable requirement.
        eligible = (
            episode.independent_experiment_review_id is not None
            and episode.source_policy_snapshot_sha256
            == payload.policy_snapshot_sha256
            and reviewed.decision in (
                "REVIEW_CANDIDATE_ONLY",
                "NO_DEMONSTRATED_IMPROVEMENT",
                "HOLD_LANGUAGE_REGRESSION",
                "HOLD_LATENCY_REGRESSION",
            )
        )
        if not eligible:
            excluded[episode.method] += 1
            negative[episode.method].append(
                _digest([episode.episode_id, "UNVERIFIED_OR_INCOMPARABLE",
                         reviewed.negative_cases_sha256])
            )
            continue
        success = reviewed.decision == "REVIEW_CANDIDATE_ONLY"
        if reviewed.decision in ("HOLD_LANGUAGE_REGRESSION", "HOLD_LATENCY_REGRESSION"):
            regressions[episode.method] += 1
        records[episode.method].append((
            episode.episode_id, success, episode.total_resource_cost,
            episode.observed_operational_risk,
        ))
        if not success:
            negative[episode.method].append(
                _digest([episode.episode_id, reviewed.decision,
                         reviewed.negative_cases_sha256])
            )

    evidence: list[MethodEvidence] = []
    total_eligible = sum(len(values) for values in records.values())
    for method in _METHODS:
        series = records[method]
        n = len(series)
        success = sum(int(x[1]) for x in series)
        failures = n - success
        cost = sum(x[2] for x in series) / n if n else 0.0
        risk = sum(x[3] for x in series) / n if n else 0.0
        # Laplace-smoothed descriptive frequency, never a Bayesian
        # credible interval or a causal effect-size certificate.
        frequency = (success + 1) / (n + 2)
        uncertainty = (
            payload.exploration_coefficient
            * math.sqrt(math.log(2 + total_eligible) / (n + 1))
        )
        score = round(
            max(0.0, frequency - payload.resource_cost_penalty * cost
                - payload.operational_risk_penalty * risk + uncertainty),
            6,
        )
        if n == 0:
            state = "NO_INDEPENDENTLY_ATTESTED_RECORDS"
        elif n < payload.minimum_reviewed_episodes_per_method:
            state = "INSUFFICIENT_PAIRED_EPISODES"
        elif method in _REVIEW_ONLY:
            state = "REVIEW_METHOD_REQUIRES_EXTERNAL_AUTHORITY"
        else:
            state = "CANDIDATE_METHOD_FOR_REVIEW"
        evidence.append(MethodEvidence(
            method=method, eligible_episode_count=n,
            demonstrated_candidate_count=success, negative_outcome_count=failures,
            ineligible_episode_count=excluded[method], mean_cost=round(cost, 6),
            mean_risk=round(risk, 6),
            smoothed_observed_success_rate=round(frequency, 6),
            proposed_priority_score=score, evidence_state=state,
            negative_evidence_sha256=_digest(sorted(negative[method])),
        ))

    eligible_methods = [
        item for item in evidence
        if (item.evidence_state == "CANDIDATE_METHOD_FOR_REVIEW"
            and item.demonstrated_candidate_count > 0
            and item.demonstrated_candidate_count > item.negative_outcome_count
            and regressions[item.method] == 0)
    ]
    best = sorted(
        eligible_methods, key=lambda item: (-item.proposed_priority_score, item.method)
    )
    proposed = best[0].method if best else None
    if not any(item.eligible_episode_count for item in evidence):
        action = "OBTAIN_INDEPENDENT_EVIDENCE"
        reasons = ["NO_COMPARABLE_REVIEWED_EPISODES"]
    elif proposed is None:
        action = "PREPARE_BOUNDED_HELDOUT_EXPERIMENT"
        reasons = ["NO_METHOD_WITH_REVIEWED_POSITIVE_MAJORITY_OR_MINIMUM_EVIDENCE"]
    else:
        action = "REQUEST_OWNER_METHOD_REVIEW"
        reasons = ["OBSERVED_RELATIVE_METHOD_UTILITY_FOR_OWNER_REVIEW_ONLY"]
    reasons.append("CALLER_REVIEW_REFERENCES_REQUIRE_EXTERNAL_ATTESTATION")
    return StrategyLearningResult(
        policy_version=payload.policy_version,
        domain=payload.target_domain, purpose=payload.target_purpose,
        input_sha256=_digest(payload.model_dump(mode="json")),
        compared_method_evidence=evidence,
        proposed_next_method=proposed, next_action=action,
        reason_codes=reasons,
    )
