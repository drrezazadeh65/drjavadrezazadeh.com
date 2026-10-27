"""Learn which *learning approaches* deserve review from past experiments.

This is descriptive meta-evaluation of reviewed, hash-referenced outcomes,
not gradient descent, causal proof, automatic tool selection or permission
to increase crawling. Negative evidence is retained in the denominators.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, GapKind, Identifier, StrictContract, Unit


Method = Literal[
    "RIGHTS_REVIEW", "SOURCE_ACQUISITION_REVIEW",
    "RETRIEVAL_EXPERIMENT", "DETERMINISTIC_SKILL_PROPOSAL",
    "MODEL_ROUTING_REVIEW", "HUMAN_SCIENTIFIC_REVIEW",
]
BenchmarkDecision = Literal[
    "HOLD_RIGHTS_OR_LEAKAGE", "HOLD_LANGUAGE_REGRESSION",
    "HOLD_LATENCY_REGRESSION", "INSUFFICIENT_REVIEWED_SAMPLE",
    "NO_DEMONSTRATED_IMPROVEMENT", "REVIEW_CANDIDATE_ONLY",
]


class LearningMethodTrial(StrictContract):
    trial_id: Identifier
    gap_kind: GapKind
    domain: Identifier
    learning_method: Method
    heldout_experiment_id: Identifier
    heldout_result_sha256: Digest
    fixture_sha256: Digest
    observed_at: datetime
    benchmark_decision: BenchmarkDecision
    sample_count: int = Field(ge=1, le=1_000_000)
    relative_resource_cost: Unit
    source_rights_independently_reviewed: bool = False
    benchmark_fixture_independently_reviewed: bool = False

    @model_validator(mode="after")
    def date_is_aware(self) -> "LearningMethodTrial":
        if self.observed_at.utcoffset() is None:
            raise ValueError("METHOD_TRIAL_TIMEZONE_REQUIRED")
        return self


class LearningMethodFeedbackRequest(StrictContract):
    schema_version: Literal["jr.jrei.method-feedback.v1"] = "jr.jrei.method-feedback.v1"
    policy_version: Identifier
    observed_until: datetime
    trials: list[LearningMethodTrial] = Field(min_length=1, max_length=300)

    @model_validator(mode="after")
    def unique_trials(self) -> "LearningMethodFeedbackRequest":
        if self.observed_until.utcoffset() is None:
            raise ValueError("METHOD_FEEDBACK_TIMEZONE_REQUIRED")
        ids = [(t.heldout_experiment_id, t.learning_method) for t in self.trials]
        if len(ids) != len(set(ids)):
            raise ValueError("DUPLICATE_METHOD_EXPERIMENT")
        if any(t.observed_at > self.observed_until for t in self.trials):
            raise ValueError("METHOD_EVALUATION_IN_FUTURE")
        return self


class MethodEvidence(StrictContract):
    domain: Identifier
    gap_kind: GapKind
    learning_method: Method
    considered_trials: int
    held_trials: int
    promising_trials: int
    unsuccessful_trials: int
    language_or_latency_regressions: int
    total_observed_cases: int
    smoothed_promising_fraction: float
    average_relative_cost: float
    review_priority_score: float
    reason_codes: list[str]


class MethodFeedbackResult(StrictContract):
    schema_version: Literal["jr.jrei.method-feedback-result.v1"] = (
        "jr.jrei.method-feedback-result.v1"
    )
    policy_version: Identifier
    request_sha256: Digest
    methods: list[MethodEvidence]
    suggested_method_by_domain: dict[str, str]
    input_review_attested_by_service: Literal[False] = False
    causal_method_superiority_proven: Literal[False] = False
    strategy_automatically_changed: Literal[False] = False
    model_weights_changed: Literal[False] = False
    knowledge_or_worker_jobs_modified: Literal[False] = False


def rank_learning_methods(payload: LearningMethodFeedbackRequest) -> MethodFeedbackResult:
    grouped: dict[tuple[str, GapKind, str], list[LearningMethodTrial]] = {}
    for trial in payload.trials:
        grouped.setdefault(
            (trial.domain, trial.gap_kind, trial.learning_method), []
        ).append(trial)
    summaries: list[MethodEvidence] = []

    for (domain, kind, method), trials in sorted(
        grouped.items(), key=lambda p: (p[0][0], p[0][1].value, p[0][2])
    ):
        approved = [
            t for t in trials
            if t.source_rights_independently_reviewed
            and t.benchmark_fixture_independently_reviewed
            and t.benchmark_decision not in (
                "HOLD_RIGHTS_OR_LEAKAGE", "INSUFFICIENT_REVIEWED_SAMPLE"
            )
        ]
        promising = sum(
            t.benchmark_decision == "REVIEW_CANDIDATE_ONLY" for t in approved
        )
        regression = sum(
            t.benchmark_decision in (
                "HOLD_LANGUAGE_REGRESSION", "HOLD_LATENCY_REGRESSION"
            ) for t in approved
        )
        unsuccessful = len(approved) - promising
        # Descriptive Beta(1,1) smoothing avoids dividing by zero or turning
        # 1/1 caller-supplied experiments into 100% certainty.
        fraction = (promising + 1) / (len(approved) + 2)
        mean_cost = (
            sum(t.relative_resource_cost for t in approved) / len(approved)
            if approved else 1.0
        )
        score = round(fraction * (1 - 0.25 * mean_cost)
                      * min(1.0, len(approved) / 6), 6)
        reasons = ["EXPERIMENT_RESULTS_CALLER_SUPPLIED_NOT_CAUSAL_PROOF"]
        if len(approved) < 3:
            reasons.append("INSUFFICIENT_INDEPENDENTLY_REVIEWED_TRIALS")
        if regression:
            reasons.append("OBSERVED_LANGUAGE_OR_LATENCY_REGRESSION")
        if len(approved) != len(trials):
            reasons.append("TRIALS_HELD_FOR_RIGHTS_FIXTURE_OR_SAMPLE_REVIEW")
        summaries.append(MethodEvidence(
            domain=domain, gap_kind=kind, learning_method=method,
            considered_trials=len(approved), held_trials=len(trials) - len(approved),
            promising_trials=promising, unsuccessful_trials=unsuccessful,
            language_or_latency_regressions=regression,
            total_observed_cases=sum(t.sample_count for t in approved),
            smoothed_promising_fraction=round(fraction, 6),
            average_relative_cost=round(mean_cost, 6),
            review_priority_score=score, reason_codes=reasons,
        ))

    suggested: dict[str, str] = {}
    by_domain: dict[str, list[MethodEvidence]] = {}
    for s in summaries:
        by_domain.setdefault(s.domain + ":" + s.gap_kind.value, []).append(s)
    for key, choices in sorted(by_domain.items()):
        reviewed = [s for s in choices if s.considered_trials >= 3]
        if reviewed:
            top = sorted(reviewed, key=lambda s: (
                -s.review_priority_score, s.learning_method
            ))[0]
            # This is *what to compare next* with an independent reviewer,
            # not a deployment decision or a ranking of licensed sources.
            suggested[key] = top.learning_method

    canonical = json.dumps(payload.model_dump(mode="json"), sort_keys=True,
                           ensure_ascii=False, separators=(",", ":"))
    return MethodFeedbackResult(
        policy_version=payload.policy_version,
        request_sha256=hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
        methods=summaries, suggested_method_by_domain=suggested,
    )
