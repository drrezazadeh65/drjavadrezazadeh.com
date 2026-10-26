"""Model-free held-out challenger assessment; never promotes a model or skill.

The complete per-case inputs must come from an independently curated,
rights-cleared fixture. A caller's claims of rights and independence are NOT
evidence of either. The function deterministically evaluates supplied results
and preserves negative findings, not scientific certification.
"""
from __future__ import annotations

import hashlib
import json
import math
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract


class HeldoutCase(StrictContract):
    case_sha256: Digest
    language: Literal["fa", "en"]
    baseline_correct: bool
    candidate_correct: bool
    baseline_latency_ms: int = Field(ge=1, le=120_000)
    candidate_latency_ms: int = Field(ge=1, le=120_000)


class HeldoutReviewRequest(StrictContract):
    schema_version: Literal["jr.jrei.heldout-review.v1"] = "jr.jrei.heldout-review.v1"
    experiment_id: Identifier
    baseline_version: Identifier
    candidate_version: Identifier
    policy_version: Identifier
    fixture_sha256: Digest
    fixture_declared_independent: bool = False
    fixture_rights_declared_eligible: bool = False
    cases: list[HeldoutCase] = Field(min_length=1, max_length=300)

    @model_validator(mode="after")
    def unique_and_distinct(self) -> "HeldoutReviewRequest":
        if self.baseline_version == self.candidate_version:
            raise ValueError("BASELINE_AND_CANDIDATE_IDENTICAL")
        keys = [item.case_sha256 for item in self.cases]
        if len(keys) != len(set(keys)):
            raise ValueError("DUPLICATE_HELDOUT_CASE")
        return self


class HeldoutReviewResult(StrictContract):
    schema_version: Literal["jr.jrei.heldout-review-result.v1"] = "jr.jrei.heldout-review-result.v1"
    experiment_id: Identifier
    fixture_sha256: Digest
    input_evidence_sha256: Digest
    case_count: int
    case_count_by_language: dict[str, int]
    baseline_accuracy: float
    candidate_accuracy: float
    net_accuracy_change: float
    improved_cases: int
    regressed_cases: int
    negative_cases_sha256: Digest
    baseline_p95_ms: int
    candidate_p95_ms: int
    one_sided_discordant_p_value: float
    decision: Literal[
        "HOLD_RIGHTS_OR_LEAKAGE", "HOLD_LANGUAGE_REGRESSION",
        "HOLD_LATENCY_REGRESSION", "INSUFFICIENT_REVIEWED_SAMPLE",
        "NO_DEMONSTRATED_IMPROVEMENT", "REVIEW_CANDIDATE_ONLY",
    ]
    reason_codes: list[str]
    required_external_action: Literal["INDEPENDENT_OWNER_SCIENTIFIC_REVIEW"] = (
        "INDEPENDENT_OWNER_SCIENTIFIC_REVIEW"
    )
    independently_verified_by_service: Literal[False] = False
    model_weights_changed: Literal[False] = False
    promotion_executed: Literal[False] = False
    learning_strategy_improvement_proven: Literal[False] = False


def _p95(values: list[int]) -> int:
    ordered = sorted(values)
    return ordered[math.ceil(len(ordered) * 0.95) - 1]


def _one_sided_sign_test(improved: int, regressed: int) -> float:
    """Exact paired one-sided sign test on discordant cases only."""
    discordant = improved + regressed
    if not discordant:
        return 1.0
    # Under the null, challenger wins are Bernoulli(0.5).
    return min(1.0, sum(
        math.comb(discordant, k) for k in range(improved, discordant + 1)
    ) / (2 ** discordant))


def review_heldout(payload: HeldoutReviewRequest) -> HeldoutReviewResult:
    """Evaluate caller-supplied held-out results without any external IO."""
    cases = payload.cases
    count = len(cases)
    improved = sum(c.candidate_correct and not c.baseline_correct for c in cases)
    regressed = sum(c.baseline_correct and not c.candidate_correct for c in cases)
    base_accuracy = sum(c.baseline_correct for c in cases) / count
    candidate_accuracy = sum(c.candidate_correct for c in cases) / count
    by_lang = {lang: sum(c.language == lang for c in cases) for lang in ("fa", "en")}
    base_p95 = _p95([c.baseline_latency_ms for c in cases])
    candidate_p95 = _p95([c.candidate_latency_ms for c in cases])
    p_value = _one_sided_sign_test(improved, regressed)

    negative = sorted(c.case_sha256 for c in cases
                      if c.baseline_correct and not c.candidate_correct)
    negative_sha = hashlib.sha256(
        json.dumps(negative, separators=(",", ":")).encode("ascii")
    ).hexdigest()
    canonical = payload.model_dump(mode="json")
    evidence_sha = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, ensure_ascii=False,
                   separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    reasons = ["CALLER_SUPPLIED_RESULTS_NOT_INDEPENDENTLY_ATTESTED"]
    if not payload.fixture_declared_independent or not payload.fixture_rights_declared_eligible:
        decision = "HOLD_RIGHTS_OR_LEAKAGE"
        reasons.append("FIXTURE_RIGHTS_OR_INDEPENDENCE_UNPROVEN")
    elif any(sum(c.candidate_correct and not c.baseline_correct
                     for c in cases if c.language == lang) <
                 sum(c.baseline_correct and not c.candidate_correct
                     for c in cases if c.language == lang)
                 for lang in ("fa", "en")):
        decision = "HOLD_LANGUAGE_REGRESSION"
        reasons.append("NET_REGRESSION_IN_AT_LEAST_ONE_LANGUAGE")
    elif candidate_p95 > base_p95 * 1.2:
        decision = "HOLD_LATENCY_REGRESSION"
        reasons.append("P95_EXCEEDS_120_PERCENT_BASELINE")
    elif count < 200 or min(by_lang.values()) < 20:
        # Scientific minimum, NOT an arbitrary daily activity cap.
        decision = "INSUFFICIENT_REVIEWED_SAMPLE"
        reasons.append("MINIMUM_PAIRED_SAMPLE_OR_LANGUAGE_COVERAGE_UNMET")
    elif improved <= regressed or p_value >= 0.05:
        decision = "NO_DEMONSTRATED_IMPROVEMENT"
        reasons.append("PAIRED_SIGN_TEST_OR_NET_GAIN_UNSATISFIED")
    else:
        decision = "REVIEW_CANDIDATE_ONLY"
        reasons.append("STATISTICAL_CANDIDATE_REQUIRES_INDEPENDENT_REVIEW")
    return HeldoutReviewResult(
        experiment_id=payload.experiment_id,
        fixture_sha256=payload.fixture_sha256,
        input_evidence_sha256=evidence_sha,
        case_count=count,
        case_count_by_language=by_lang,
        baseline_accuracy=round(base_accuracy, 6),
        candidate_accuracy=round(candidate_accuracy, 6),
        net_accuracy_change=round(candidate_accuracy - base_accuracy, 6),
        improved_cases=improved,
        regressed_cases=regressed,
        negative_cases_sha256=negative_sha,
        baseline_p95_ms=base_p95,
        candidate_p95_ms=candidate_p95,
        one_sided_discordant_p_value=round(p_value, 9),
        decision=decision,
        reason_codes=reasons,
    )
