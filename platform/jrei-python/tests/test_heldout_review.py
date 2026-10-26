"""Source-staged held-out review contract cases. NOT run or production accepted."""
from __future__ import annotations

import unittest
from pydantic import ValidationError
from jrei_learning.heldout import HeldoutReviewRequest, review_heldout


def review_cases(total=200, *, mode="improvement", rights=True, independent=True):
    cases = []
    for i in range(total):
        language = "fa" if i < total // 2 else "en"
        baseline_correct = i % 4 != 0
        candidate_correct = True if mode == "improvement" else baseline_correct
        baseline_latency_ms = 100
        candidate_latency_ms = 110
        if mode == "regression_fa" and language == "fa" and i % 5 == 0:
            baseline_correct = True
            candidate_correct = False
        if mode == "slow":
            candidate_latency_ms = 200
        cases.append({
            "case_sha256": f"{i+1:064x}",
            "language": language,
            "baseline_correct": baseline_correct,
            "candidate_correct": candidate_correct,
            "baseline_latency_ms": baseline_latency_ms,
            "candidate_latency_ms": candidate_latency_ms,
        })
    return {
        "experiment_id": "experiment-001",
        "baseline_version": "baseline-v001",
        "candidate_version": "candidate-v002",
        "policy_version": "review-policy-v001",
        "fixture_sha256": "a" * 64,
        "fixture_declared_independent": independent,
        "fixture_rights_declared_eligible": rights,
        "cases": cases,
    }


class HeldoutReviewCases(unittest.TestCase):
    def test_strong_paired_gain_only_requests_review(self):
        result = review_heldout(HeldoutReviewRequest.model_validate(review_cases()))
        self.assertEqual(result.decision, "REVIEW_CANDIDATE_ONLY")
        self.assertLess(result.one_sided_discordant_p_value, 0.05)
        self.assertFalse(result.promotion_executed)
        self.assertFalse(result.independently_verified_by_service)
        self.assertFalse(result.learning_strategy_improvement_proven)

    def test_rights_unverified_blocks_promotion(self):
        result = review_heldout(
            HeldoutReviewRequest.model_validate(review_cases(rights=False))
        )
        self.assertEqual(result.decision, "HOLD_RIGHTS_OR_LEAKAGE")

    def test_fixture_independence_unverified_blocks(self):
        result = review_heldout(
            HeldoutReviewRequest.model_validate(review_cases(independent=False))
        )
        self.assertEqual(result.decision, "HOLD_RIGHTS_OR_LEAKAGE")

    def test_language_regression_overrides_overall_gain(self):
        result = review_heldout(
            HeldoutReviewRequest.model_validate(review_cases(mode="regression_fa"))
        )
        self.assertEqual(result.decision, "HOLD_LANGUAGE_REGRESSION")
        self.assertGreater(result.regressed_cases, 0)

    def test_latency_regression_holds(self):
        result = review_heldout(
            HeldoutReviewRequest.model_validate(review_cases(mode="slow"))
        )
        self.assertEqual(result.decision, "HOLD_LATENCY_REGRESSION")

    def test_paired_sample_minimum_is_not_daily_crawl_limit(self):
        result = review_heldout(
            HeldoutReviewRequest.model_validate(review_cases(total=40))
        )
        self.assertEqual(result.decision, "INSUFFICIENT_REVIEWED_SAMPLE")

    def test_without_gain_no_positive_claim(self):
        result = review_heldout(
            HeldoutReviewRequest.model_validate(review_cases(mode="unchanged"))
        )
        self.assertEqual(result.decision, "NO_DEMONSTRATED_IMPROVEMENT")

    def test_duplicate_heldout_case_rejected(self):
        data = review_cases(total=40)
        data["cases"][1]["case_sha256"] = data["cases"][0]["case_sha256"]
        with self.assertRaises(ValidationError):
            HeldoutReviewRequest.model_validate(data)

    def test_private_raw_text_forbidden(self):
        data = review_cases(total=40)
        data["cases"][0]["student_answer"] = "private transcript"
        with self.assertRaises(ValidationError):
            HeldoutReviewRequest.model_validate(data)

    def test_same_versions_rejected(self):
        data = review_cases(total=40)
        data["candidate_version"] = data["baseline_version"]
        with self.assertRaises(ValidationError):
            HeldoutReviewRequest.model_validate(data)


if __name__ == "__main__":
    unittest.main()
