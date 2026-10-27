"""Source QA: language growth must never fabricate a new trained model."""
from __future__ import annotations

import unittest
from pydantic import ValidationError

from jrei_learning.native_language_growth import (
    NativeLanguageGrowthRequest, plan_native_language_growth,
)
from jrei_core.model_portfolio import ModelPortfolioRequest, plan_model_portfolio

POLICY = "a" * 64


def episode(i: int, **options) -> dict:
    base = {
        "episode_id": f"episode.{i:03d}",
        "corpus_document_sha256": f"{i+10:064x}",
        "independent_fixture_sha256": f"{i+110:064x}",
        "response_sha256": f"{i+210:064x}",
        "language": "fa",
        "competency": "PERSIAN_ORTHOGRAPHY",
        "failure": "CJK_SCRIPT_INTRUSION",
        "data_role": "LEARNING",
        "rights_cleared": True,
        "independent_scientific_review": True,
        "model_version": "legacy-model-v001",
        "policy_sha256": POLICY,
        "impact": 0.7,
    }
    return dict(base, **options)


def model(i: str, **options) -> dict:
    base = {
        "engine_id": i,
        "family": "language-engine",
        "model_version": "candidate-v001",
        "model_sha256": "b" * 64,
        "runtime_sha256": "c" * 64,
        "endpoint": "http://127.0.0.1:8139/v1/chat/completions",
        "origin": "EXTERNAL_OPEN_WEIGHTS",
        "rights_cleared": True,
        "owner_approved_for_sandbox": True,
        "supported_languages": ["fa", "en"],
        "operating_cost": 0.5,
        "expected_quality": 0.7,
    }
    return dict(base, **options)


class JreiLanguageIndependenceTests(unittest.TestCase):
    def test_model_agnostic_persian_learning_plan_is_not_training(self):
        request = NativeLanguageGrowthRequest(
            cycle_id="language-cycle-001", policy_sha256=POLICY,
            episodes=[episode(1)],
        )
        result = plan_native_language_growth(request)
        self.assertEqual(result.goals[0].proposed_method,
                         "LICENSED_BILINGUAL_CURRICULUM")
        self.assertEqual(result.goals[0].action,
                         "DESIGN_PRIVATE_ISOLATED_EXPERIMENT")
        self.assertFalse(result.model_training_started)
        self.assertFalse(result.model_weights_updated)
        self.assertFalse(result.quality_promotion_executed)
        self.assertFalse(result.qwen_exclusive_dependency_required)

    def test_mathematics_needs_python_skill_not_prompt_memoization(self):
        request = NativeLanguageGrowthRequest(
            cycle_id="language-cycle-002", policy_sha256=POLICY,
            episodes=[episode(2, competency="MATHEMATICAL_LANGUAGE",
                              failure="INCORRECT")],
        )
        r = plan_native_language_growth(request)
        self.assertEqual(r.goals[0].proposed_method,
                         "DETERMINISTIC_PYTHON_SKILL_INTEGRATION")

    def test_unreviewed_failure_does_not_prove_learning(self):
        request = NativeLanguageGrowthRequest(
            cycle_id="language-cycle-003", policy_sha256=POLICY,
            episodes=[episode(3, independent_scientific_review=False)],
        )
        r = plan_native_language_growth(request)
        self.assertEqual(r.goals[0].action,
                         "COLLECT_FRESH_INDEPENDENT_EVIDENCE")
        self.assertEqual(r.goals[0].reviewed_failures, 0)

    def test_heldout_outcomes_not_used_in_learning_curriculum(self):
        r = plan_native_language_growth(NativeLanguageGrowthRequest(
            cycle_id="language-cycle-holdout", policy_sha256=POLICY,
            episodes=[
                episode(22, data_role="LEARNING"),
                episode(23, data_role="HELDOUT",
                        failure="CORRECT", competency="ASSESSMENT_CONCEPTS"),
            ],
        ))
        self.assertEqual(len(r.goals), 1)
        self.assertEqual(r.goals[0].competency, "PERSIAN_ORTHOGRAPHY")
        self.assertEqual(r.goals[0].reviewed_failures, 1)

    def test_unsafe_rights_require_review(self):
        r = plan_native_language_growth(NativeLanguageGrowthRequest(
            cycle_id="language-cycle-004", policy_sha256=POLICY,
            episodes=[episode(4, rights_cleared=False)],
        ))
        self.assertEqual(r.goals[0].action, "REQUEST_RIGHTS_AND_REVIEW")

    def test_holdout_never_shared_with_learning(self):
        with self.assertRaises(ValidationError):
            NativeLanguageGrowthRequest(
                cycle_id="language-cycle-005", policy_sha256=POLICY,
                episodes=[
                    episode(5, data_role="LEARNING"),
                    episode(6, data_role="HELDOUT",
                            corpus_document_sha256=episode(5)[
                                "corpus_document_sha256"
                            ]),
                ],
            )

    def test_model_portfolio_is_independent_of_qwen(self):
        r = plan_model_portfolio(ModelPortfolioRequest(
            policy_sha256=POLICY, task_language="fa",
            owner_emergency_stop=False,
            engines=[model("my-independent-model")],
        ))
        self.assertEqual(r.recommended_engine_id, "my-independent-model")
        self.assertFalse(r.production_switch_executed)
        self.assertFalse(r.language_independence_proven)

    def test_public_model_cannot_be_switched_by_portfolio(self):
        r = plan_model_portfolio(ModelPortfolioRequest(
            policy_sha256=POLICY, task_language="fa",
            purpose="PUBLIC_CHAT", owner_emergency_stop=False,
            engines=[model("my-independent-model")],
        ))
        self.assertIsNone(r.recommended_engine_id)
        self.assertFalse(r.production_switch_executed)

    def test_owner_emergency_stop_halts_all_routing(self):
        r = plan_model_portfolio(ModelPortfolioRequest(
            policy_sha256=POLICY, task_language="fa",
            owner_emergency_stop=True,
            engines=[model("candidate-model")],
        ))
        self.assertEqual(r.eligible_sandbox_engine_ids, [])
        self.assertIsNone(r.recommended_engine_id)

    def test_reject_external_model_endpoint(self):
        with self.assertRaises(ValidationError):
            ModelPortfolioRequest(
                policy_sha256=POLICY, task_language="en",
                owner_emergency_stop=False, engines=[
                    model("external-model",
                          endpoint="https://other-service.com/v1/chat/completions")
                ],
            )

    def test_no_native_model_capability_inferred_from_metadata(self):
        r = plan_model_portfolio(ModelPortfolioRequest(
            policy_sha256=POLICY, task_language="fa",
            owner_emergency_stop=False,
            engines=[model(
                "native-candidate",
                origin="JREI_TRAINED_WEIGHTS",
                bilingual_independent_evidence_sha256="d" * 64,
                independently_reviewed_fa=True,
                independently_reviewed_en=True,
            )],
        ))
        self.assertTrue(r.declared_native_jrei_candidate_has_review_metadata)
        self.assertFalse(r.actual_native_jrei_inference_independently_observed)
        self.assertFalse(r.language_independence_proven)


if __name__ == "__main__":
    unittest.main()
