"""Deterministic 'learning to learn' goal ordering, not unattended model training.

This deliberately produces reviewable experiment PROPOSALS. Aggregate
measurements supplied by a caller are not independently attested here.
The JS held-out evaluator stays authoritative for existing retrieval policy
promotion; this Python module does not recreate or supersede that gate.
"""
from __future__ import annotations

from jrei_core.contracts import GapKind, LearningBatch, LearningGoal, PrioritizedGoals

# Interpretable policy v1: benefits and evidence gaps increase priority; high
# operational risk and cost decrease priority. All inputs are bounded [0, 1].
_WEIGHTS = {
    "expected_user_benefit": 0.30,
    "failure_rate": 0.24,
    "scientific_importance": 0.18,
    "strategic_coverage": 0.16,
    "uncertainty": 0.12,
    "relative_resource_cost": -0.12,
    "operational_risk": -0.18,
}
_METHODS: dict[GapKind, str] = {
    GapKind.RETRIEVAL: "RETRIEVAL_EXPERIMENT",
    GapKind.UNSUPPORTED_CLAIM: "HUMAN_SCIENTIFIC_REVIEW",
    GapKind.KNOWLEDGE_COVERAGE: "SOURCE_ACQUISITION_REVIEW",
    GapKind.TOOL_FAILURE: "DETERMINISTIC_SKILL_PROPOSAL",
    GapKind.MULTILINGUAL_QUALITY: "RETRIEVAL_EXPERIMENT",
    GapKind.LATENCY: "MODEL_ROUTING_REVIEW",
    GapKind.SOURCE_RIGHTS: "RIGHTS_REVIEW",
}


def prioritize(batch: LearningBatch) -> PrioritizedGoals:
    """Rank aggregate evidence gaps; never execute, approve or promote a change."""
    goals: list[LearningGoal] = []
    for gap in batch.gaps:
        raw = sum(getattr(gap, field) * weight for field, weight in _WEIGHTS.items())
        # Cost/risk need not be zero for a candidate to be proposed, but
        # they cannot cause automatic promotion or permission escalation.
        score = round(max(0.0, min(1.0, raw)), 6)
        reasons = ["AGGREGATE_UNATTESTED_INPUT"]
        if not gap.rights_eligible:
            decision = "REQUIRES_RIGHTS_REVIEW"
            method = "RIGHTS_REVIEW"
            reasons.append("RIGHTS_NOT_VERIFIED")
        elif not gap.independent_evidence_reviewed:
            decision = "REQUIRES_EVIDENCE_REVIEW"
            method = _METHODS[gap.kind]
            reasons.append("INDEPENDENT_EVIDENCE_REVIEW_MISSING")
        else:
            decision = "PROPOSED"
            method = _METHODS[gap.kind]
            reasons.append("ELIGIBLE_FOR_ISOLATED_EXPERIMENT_PLANNING_ONLY")
        if gap.observed_case_count < 200:
            reasons.append("SMALL_AGGREGATE_SAMPLE")
        goals.append(LearningGoal(
            gap_id=gap.gap_id, domain=gap.domain, score=score,
            selected_method=method, decision=decision, reason_codes=reasons,
        ))
    goals.sort(key=lambda g: (-g.score, g.gap_id))
    return PrioritizedGoals(policy_version=batch.policy_version, goals=goals)
