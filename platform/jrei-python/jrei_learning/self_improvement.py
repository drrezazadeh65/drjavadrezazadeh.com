"""JREI evidence-driven, 24/7 eligible self-improvement and coding review.

The model is a proposer, never its own reviewer. A suggested code change is
bound to the current source hash, a reproducible independent acceptance record,
negative outcomes and owner-gated rollback. Neither code execution nor live
deployment occurs in this module. Can run at any hour with adaptive capacity:
Tehran 02-05 is an optional higher-priority window, not a duty-cycle limit.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import PurePosixPath
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract, Unit

Area = Literal[
    "PYTHON_INTELLIGENCE", "SELF_LEARNING", "WEBSITE_CODE",
    "SEO_GEO", "MOBILE_DESIGN", "NEWS_21", "EXAMINATIONS",
    "KNOWLEDGE_RETRIEVAL", "RESOURCE_EFFICIENCY",
]
Outcome = Literal[
    "IMPROVED", "REGRESSED", "NO_IMPROVEMENT",
    "INCONCLUSIVE", "REVIEW_HOLD",
]
ReviewState = Literal["NOT_REVIEWED", "INDEPENDENTLY_REVIEWED", "REJECTED"]


class CodingChangeCandidate(StrictContract):
    candidate_id: Identifier
    area: Area
    target_path: str = Field(min_length=8, max_length=180)
    base_source_sha256: Digest
    proposed_diff_sha256: Digest
    change_rationale_sha256: Digest
    expected_benefit: Unit
    urgency: Unit
    operational_risk: Unit
    owner_scoped: bool = False
    reversible: bool = False
    # A candidate must never claim to have executed the patch or changed
    # production; file paths are metadata, not paths to open or write.
    contains_secrets_or_personal_data: bool = False
    changes_auth_payments_or_student_data: bool = False

    @model_validator(mode="after")
    def bounded_code_scope(self) -> "CodingChangeCandidate":
        name = self.target_path
        path = PurePosixPath(name)
        if (path.is_absolute() or "\\" in name or
            path.as_posix() != name or
            any(part in ("", ".", "..") for part in name.split("/")) or
            path.suffix not in (".py", ".php", ".js", ".mjs", ".css", ".html", ".md") or
            not name.startswith(("platform/jrei-python/", "platform/jrei-v5/",
                                 "api/", "assets/", "docs/")) or
            any(x in name.lower() for x in (
                ".env", "secret", "private-key", "credentials",
                "password", "auth-token", "vendor/",
            ))):
            raise ValueError("SELF_CODE_TARGET_OUTSIDE_REVIEWED_SOURCE_SCOPE")
        if self.contains_secrets_or_personal_data:
            raise ValueError("SELF_CODE_SENSITIVE_PAYLOAD_FORBIDDEN")
        return self


class IndependentChangeObservation(StrictContract):
    observation_id: Identifier
    candidate_id: Identifier
    baseline_sha256: Digest
    proposed_diff_sha256: Digest
    environment_sha256: Digest
    fixture_sha256: Digest
    observed_at: datetime
    review_state: ReviewState
    independent_review_id: Identifier | None = None
    measured_cases: int = Field(ge=1, le=1_000_000)
    outcome: Outcome
    bilingual_regression: bool = False
    accessibility_regression: bool = False
    performance_regression: bool = False
    security_regression: bool = False
    rollback_evidence_sha256: Digest | None = None
    # These are independently *claimed* identifiers; Python alone cannot
    # verify reviewer identity or benchmark custody.
    negative_case_sha256: Digest | None = None

    @model_validator(mode="after")
    def coherent_review(self) -> "IndependentChangeObservation":
        if self.observed_at.utcoffset() is None:
            raise ValueError("SELF_CODE_OBSERVATION_TIMEZONE_REQUIRED")
        if self.review_state == "INDEPENDENTLY_REVIEWED":
            if self.independent_review_id is None:
                raise ValueError("SELF_CODE_REVIEW_ID_REQUIRED")
        elif self.independent_review_id is not None:
            raise ValueError("SELF_CODE_UNATTESTED_REVIEW_ID")
        if (self.outcome == "IMPROVED" and
            (self.bilingual_regression or self.accessibility_regression or
             self.performance_regression or self.security_regression)):
            raise ValueError("SELF_CODE_IMPROVEMENT_CONTRADICTS_REGRESSION")
        return self


class SelfImprovementCycleRequest(StrictContract):
    schema_version: Literal["jr.jrei.self-improvement-cycle.v1"] = (
        "jr.jrei.self-improvement-cycle.v1"
    )
    cycle_id: Identifier
    owner_policy_digest: Digest
    observed_until: datetime
    emergency_stop: bool = True
    owner_scope_approved: bool = False
    minimum_independently_reviewed_observations: int = Field(default=3, ge=2, le=20)
    candidates: list[CodingChangeCandidate] = Field(min_length=1, max_length=100)
    observations: list[IndependentChangeObservation] = Field(default_factory=list, max_length=400)

    @model_validator(mode="after")
    def references_are_consistent(self) -> "SelfImprovementCycleRequest":
        if self.observed_until.utcoffset() is None:
            raise ValueError("SELF_CODE_CYCLE_TIMEZONE_REQUIRED")
        by_id = {c.candidate_id: c for c in self.candidates}
        if len(by_id) != len(self.candidates):
            raise ValueError("SELF_CODE_DUPLICATE_CANDIDATE")
        if len({o.observation_id for o in self.observations}) != len(self.observations):
            raise ValueError("SELF_CODE_DUPLICATE_OBSERVATION")
        if len({(o.environment_sha256, o.fixture_sha256, o.candidate_id)
                for o in self.observations}) != len(self.observations):
            raise ValueError("SELF_CODE_REUSED_EXPERIMENT_FIXTURE")
        review_ids = [o.independent_review_id for o in self.observations
                      if o.independent_review_id is not None]
        if len(review_ids) != len(set(review_ids)):
            raise ValueError("SELF_CODE_DUPLICATE_INDEPENDENT_REVIEW")
        for o in self.observations:
            target = by_id.get(o.candidate_id)
            if target is None:
                raise ValueError("SELF_CODE_UNKNOWN_CANDIDATE_REFERENCE")
            if o.baseline_sha256 != target.base_source_sha256 or (
                o.proposed_diff_sha256 != target.proposed_diff_sha256
            ):
                raise ValueError("SELF_CODE_SOURCE_OR_DIFF_MISMATCH")
            if o.observed_at > self.observed_until:
                raise ValueError("SELF_CODE_FUTURE_OBSERVATION")
        return self


class SelfImprovementDecision(StrictContract):
    candidate_id: Identifier
    area: Area
    target_path: str
    base_source_sha256: Digest
    proposed_diff_sha256: Digest
    independent_reviewed_count: int
    observed_improvements: int
    observed_regressions: int
    held_count: int
    negative_evidence_sha256: Digest
    review_priority: float = Field(ge=0, le=1)
    decision: Literal[
        "HOLD_EMERGENCY_STOP", "HOLD_OWNER_SCOPE",
        "HOLD_SENSITIVE_CHANGE", "HOLD_INSUFFICIENT_EVIDENCE",
        "HOLD_REGRESSION", "HOLD_NONREVERSIBLE",
        "PROPOSE_ISOLATED_CODE_REVIEW",
    ]
    next_action: Literal[
        "REQUEST_OWNER_SCOPE", "COLLECT_INDEPENDENT_RESULTS",
        "REPAIR_OR_ROLL_BACK_CANDIDATE",
        "PREPARE_ISOLATED_CODE_REVIEW",
    ]
    owner_approval_required: Literal[True] = True
    patch_applied: Literal[False] = False
    deployment_started: Literal[False] = False
    learning_proven_by_python: Literal[False] = False


class SelfImprovementCycleResult(StrictContract):
    schema_version: Literal["jr.jrei.self-improvement-cycle-result.v1"] = (
        "jr.jrei.self-improvement-cycle-result.v1"
    )
    cycle_id: Identifier
    request_sha256: Digest
    decisions: list[SelfImprovementDecision]
    continuous_planning_eligible: bool
    # The clock window is a boost only; scheduled work remains eligible 24/7.
    heavy_priority_window_tehran: bool
    only_verified_external_evidence_can_promote: Literal[True] = True
    independent_review_attested_by_this_service: Literal[False] = False
    self_code_written: Literal[False] = False
    self_learning_model_weights_updated: Literal[False] = False
    tests_run: Literal[False] = False
    production_deployed: Literal[False] = False
    autonomous_background_loop_running: Literal[False] = False


def plan_self_improvement(payload: SelfImprovementCycleRequest) -> SelfImprovementCycleResult:
    try:
        clock = ZoneInfo("Asia/Tehran")
        hour = payload.observed_until.astimezone(clock).hour
    except ZoneInfoNotFoundError:
        # The local civil clock has permanently used UTC+03:30 since 2023.
        # If historical tzdata is unavailable, do not guess.
        if payload.observed_until.year < 2023:
            raise ValueError("SELF_CODE_TEHRAN_TIMEZONE_UNAVAILABLE")
        from datetime import timedelta
        hour = payload.observed_until.astimezone(
            timezone(timedelta(hours=3, minutes=30))
        ).hour
    heavy = 2 <= hour < 5
    grouped: dict[str, list[IndependentChangeObservation]] = {
        c.candidate_id: [] for c in payload.candidates
    }
    for obs in payload.observations:
        grouped[obs.candidate_id].append(obs)
    decisions = []
    for candidate in payload.candidates:
        records = grouped[candidate.candidate_id]
        valid = [o for o in records
                 if o.review_state == "INDEPENDENTLY_REVIEWED"]
        improved = sum(o.outcome == "IMPROVED" for o in valid)
        regressions = sum(
            o.outcome == "REGRESSED" or o.security_regression or
            o.bilingual_regression or o.accessibility_regression or
            o.performance_regression
            for o in valid
        )
        negatives = sorted([
            (o.observation_id, o.outcome, o.negative_case_sha256)
            for o in records
            if o.outcome != "IMPROVED" or o.security_regression or
               o.bilingual_regression or o.accessibility_regression or
               o.performance_regression
        ])
        negative_digest = hashlib.sha256(json.dumps(
            negatives, separators=(",", ":"), ensure_ascii=False
        ).encode("utf-8")).hexdigest()
        # A source change cannot erase failure history via a new label.
        priority = round(min(1.0, (
            0.45*candidate.urgency + 0.35*candidate.expected_benefit +
            0.20*(1 - candidate.operational_risk)
        )*(1.10 if heavy else 1.0)), 6)
        if payload.emergency_stop:
            state, action = "HOLD_EMERGENCY_STOP", "REQUEST_OWNER_SCOPE"
        elif not payload.owner_scope_approved or not candidate.owner_scoped:
            state, action = "HOLD_OWNER_SCOPE", "REQUEST_OWNER_SCOPE"
        elif candidate.changes_auth_payments_or_student_data:
            state, action = "HOLD_SENSITIVE_CHANGE", "REQUEST_OWNER_SCOPE"
        elif regressions:
            state, action = "HOLD_REGRESSION", "REPAIR_OR_ROLL_BACK_CANDIDATE"
        elif not candidate.reversible:
            state, action = "HOLD_NONREVERSIBLE", "REQUEST_OWNER_SCOPE"
        elif len(valid) < payload.minimum_independently_reviewed_observations or (
            improved <= len(valid) - improved
        ):
            state, action = "HOLD_INSUFFICIENT_EVIDENCE", "COLLECT_INDEPENDENT_RESULTS"
        else:
            state, action = "PROPOSE_ISOLATED_CODE_REVIEW", "PREPARE_ISOLATED_CODE_REVIEW"
        decisions.append(SelfImprovementDecision(
            candidate_id=candidate.candidate_id, area=candidate.area,
            target_path=candidate.target_path,
            base_source_sha256=candidate.base_source_sha256,
            proposed_diff_sha256=candidate.proposed_diff_sha256,
            independent_reviewed_count=len(valid),
            observed_improvements=improved,
            observed_regressions=regressions,
            held_count=len(records)-len(valid),
            negative_evidence_sha256=negative_digest,
            review_priority=priority, decision=state, next_action=action,
        ))
    canonical = json.dumps(payload.model_dump(mode="json"), sort_keys=True,
        separators=(",", ":"), ensure_ascii=False)
    return SelfImprovementCycleResult(
        cycle_id=payload.cycle_id,
        request_sha256=hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
        decisions=sorted(decisions, key=lambda d:(-d.review_priority, d.candidate_id)),
        continuous_planning_eligible=not payload.emergency_stop and
            payload.owner_scope_approved,
        heavy_priority_window_tehran=heavy,
    )
