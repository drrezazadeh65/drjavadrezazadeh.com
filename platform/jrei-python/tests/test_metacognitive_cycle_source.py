"""Nonexecuted future-release JREI meta-learning negative-evidence fixtures."""
from datetime import datetime, timezone
import unittest

from pydantic import ValidationError

from jrei_core.contracts import GapKind, LearningBatch, LearningGap
from jrei_learning.evidence_graph import (
    EvidenceGraphRequest, EvidencePointer, KnowledgeClaim, SourceVersion,
)
from jrei_learning.heldout import HeldoutCase, HeldoutReviewRequest
from jrei_learning.metacognitive_cycle import (
    GapContext, MetacognitiveCycleRequest, plan_metacognitive_cycle,
)


SHA_A = "a" * 64
SHA_B = "b" * 64
NOW = datetime(2026, 10, 27, 11, 0, tzinfo=timezone.utc)


def cycle(*, rights="ALLOWED", experiment=False, independently_reviewed=True):
    gaps=LearningBatch(
        policy_version="policy.001",
        gaps=[LearningGap(
            gap_id="gap.001", domain="teacher.education",
            kind=GapKind.KNOWLEDGE_COVERAGE,
            aggregate_evidence_sha256=SHA_B,
            measurement_version="measure.001",
            observed_case_count=200,
            failure_rate=0.3,
            expected_user_benefit=0.8,
            scientific_importance=0.9,
            strategic_coverage=0.75,
            uncertainty=0.2,
            relative_resource_cost=0.1,
            operational_risk=0.15,
            rights_eligible=True,
            independent_evidence_reviewed=independently_reviewed,
        )],
    )
    graph=EvidenceGraphRequest(
        policy_version="policy.001", evaluated_at=NOW,
        max_source_age_days=30,
        sources=[SourceVersion(
            source_id="source.001", version_id="version.001",
            content_sha256=SHA_A, observed_at=NOW,
            rights_state=rights,
            scientific_review="INDEPENDENT_REVIEWED",
            issuer_review="VERIFIED",
        )],
        claims=[KnowledgeClaim(
            claim_id="claim.001", language="fa", subject="teacher.education",
            evidence=[EvidencePointer(
                source_id="source.001", version_id="version.001",
                content_sha256=SHA_A, anchor="page.010",
            )],
        )],
    )
    heldout=[]
    if experiment:
        heldout=[HeldoutReviewRequest(
            experiment_id="exp.001", baseline_version="base.001",
            candidate_version="cand.002", policy_version="policy.001",
            fixture_sha256=SHA_A, fixture_declared_independent=True,
            fixture_rights_declared_eligible=True,
            cases=[HeldoutCase(
                case_sha256=SHA_B, language="fa",
                baseline_correct=False, candidate_correct=True,
                baseline_latency_ms=100, candidate_latency_ms=100,
            )],
        )]
    return MetacognitiveCycleRequest(
        gaps=gaps, knowledge=graph,
        contexts=[GapContext(
            gap_id="gap.001", supporting_claim_ids=["claim.001"],
            experiment_id="exp.001" if experiment else None,
        )],
        heldout=heldout,
    )


class MetacognitiveSourceContracts(unittest.TestCase):
    def test_chooses_experiment_without_claiming_improvement(self):
        result=plan_metacognitive_cycle(cycle())
        item=result.decisions[0]
        self.assertEqual(item.decision, "PROPOSE_ISOLATED_EXPERIMENT")
        self.assertEqual(item.next_action, "DESIGN_BOUNDED_EXPERIMENT")
        self.assertFalse(result.learning_improvement_proven)
        self.assertFalse(result.knowledge_written)
        self.assertFalse(item.mission_executed)

    def test_revoked_citation_preempts_benchmark(self):
        result=plan_metacognitive_cycle(cycle(rights="REVOKED", experiment=True))
        item=result.decisions[0]
        self.assertEqual(item.decision, "HOLD_SOURCE_OR_CITATION")
        self.assertIn(
            "SOURCE_WITHDRAWN_RESTRICTED_OR_SUPERSEDED",
            item.reason_codes,
        )
        self.assertFalse(result.automatic_skill_promotion)

    def test_tiny_bilingual_fixture_cannot_certify_gain(self):
        result=plan_metacognitive_cycle(cycle(experiment=True))
        item=result.decisions[0]
        self.assertEqual(item.decision, "HOLD_INSUFFICIENT_BENCHMARK")
        self.assertEqual(
            item.next_action, "CURATE_PAIRED_BILINGUAL_HELDOUT",
        )
        self.assertEqual(item.heldout_decision, "INSUFFICIENT_REVIEWED_SAMPLE")
        self.assertIsNotNone(item.negative_case_digest)

    def test_unreviewed_gap_stays_held_even_with_clean_citation(self):
        result=plan_metacognitive_cycle(cycle(independently_reviewed=False))
        self.assertEqual(result.decisions[0].decision, "HOLD_INDEPENDENT_EVIDENCE")

    def test_no_unknown_gap_or_stale_experiment_attachments(self):
        payload=cycle().model_dump()
        payload["contexts"][0]["gap_id"]="gap.unknown"
        with self.assertRaises(ValidationError):
            MetacognitiveCycleRequest.model_validate(payload)
        payload=cycle().model_dump()
        payload["heldout"]=[HeldoutReviewRequest(
            experiment_id="exp.orphan", baseline_version="base.001",
            candidate_version="cand.002", policy_version="policy.001",
            fixture_sha256=SHA_A,
            cases=[HeldoutCase(
                case_sha256=SHA_B, language="fa",
                baseline_correct=True, candidate_correct=True,
                baseline_latency_ms=100, candidate_latency_ms=100,
            )],
        ).model_dump()]
        with self.assertRaises(ValidationError):
            MetacognitiveCycleRequest.model_validate(payload)

    def test_same_input_produces_same_digest_and_decision(self):
        request=cycle()
        a=plan_metacognitive_cycle(request)
        b=plan_metacognitive_cycle(request)
        self.assertEqual(a.request_sha256, b.request_sha256)
        self.assertEqual(a.decisions, b.decisions)


if __name__ == "__main__":
    unittest.main()
