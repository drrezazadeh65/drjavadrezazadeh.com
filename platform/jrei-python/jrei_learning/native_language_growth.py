"""JREI-owned Persian/English competency growth, not an LLM-weight trainer.

This module learns WHAT to study next from curated, independently reviewed
failure metadata, rather than pretending that Qwen responses are ground truth.
No raw user data, articles, prompts, student records or model outputs enter
this model. Outputs are reviewable curricula and proposed experiments.
It never updates weights, calls a model, opens files or deploys a service.

There are no arbitrary daily caps. Every decision is evidence-scoped and
requires external holdout custody before quality claims or model promotion.
"""
from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from typing import Literal

from pydantic import Field, model_validator
from jrei_core.contracts import Digest, Identifier, StrictContract, Unit

Competency = Literal[
    "PERSIAN_ORTHOGRAPHY", "PERSIAN_COMPREHENSION",
    "ENGLISH_COMPREHENSION", "MULTILINGUAL_INSTRUCTION_FOLLOWING",
    "MATHEMATICAL_LANGUAGE", "ASSESSMENT_CONCEPTS",
    "EVIDENCE_GROUNDED_EXPLANATION", "ACADEMIC_EXPRESSION",
]
TrainingMethod = Literal[
    "LICENSED_BILINGUAL_CURRICULUM",
    "DETERMINISTIC_PYTHON_SKILL_INTEGRATION",
    "CONCEPT_GLOSSARY_WITH_SOURCE_CITATIONS",
    "INDEPENDENT_BILINGUAL_MODEL_COMPARISON",
    "OWNER_REVIEWED_ADAPTER_TRAINING_PROPOSAL",
]
DataRole = Literal["LEARNING", "HELDOUT"]
FailureType = Literal[
    "INCORRECT", "CJK_SCRIPT_INTRUSION", "INSTRUCTION_FAILURE",
    "HALLUCINATED_SOURCE", "INCOHERENT", "INCOMPLETE",
    "LATENCY_REGRESSION", "CORRECT",
]


class LanguageEpisode(StrictContract):
    episode_id: Identifier
    corpus_document_sha256: Digest
    independent_fixture_sha256: Digest
    response_sha256: Digest
    language: Literal["fa", "en"]
    competency: Competency
    failure: FailureType
    data_role: DataRole
    rights_cleared: bool = False
    independent_scientific_review: bool = False
    model_version: Identifier
    policy_sha256: Digest
    impact: Unit = 0.5


class NativeLanguageGrowthRequest(StrictContract):
    schema_version: Literal["jr.jrei.native-language-growth.v1"] = (
        "jr.jrei.native-language-growth.v1"
    )
    cycle_id: Identifier
    policy_sha256: Digest
    episodes: list[LanguageEpisode] = Field(min_length=1, max_length=500)
    owner_has_authorized_training: bool = False
    # A real independent heldout must never be used as model-training data.
    heldout_corpus_never_used_to_train: bool = False

    @model_validator(mode="after")
    def prevent_leakage_and_bad_provenance(self) -> "NativeLanguageGrowthRequest":
        ids = [e.episode_id for e in self.episodes]
        if len(ids) != len(set(ids)):
            raise ValueError("DUPLICATE_LANGUAGE_EPISODE")
        if any(e.policy_sha256 != self.policy_sha256 for e in self.episodes):
            raise ValueError("LANGUAGE_EPISODE_POLICY_MISMATCH")
        roles: dict[str, set[str]] = defaultdict(set)
        fixtures: dict[str, set[str]] = defaultdict(set)
        for e in self.episodes:
            roles[e.corpus_document_sha256].add(e.data_role)
            fixtures[e.independent_fixture_sha256].add(e.data_role)
        if any(len(items) > 1 for items in (*roles.values(), *fixtures.values())):
            raise ValueError("LANGUAGE_HELDOUT_TRAINING_LEAKAGE")
        return self


class LanguageGrowthGoal(StrictContract):
    language: Literal["fa", "en"]
    competency: Competency
    reviewed_failures: int
    unreviewed_failures: int
    reviewed_successes: int
    uncovered_rights_failures: int
    negative_evidence_sha256: Digest
    priority: float = Field(ge=0, le=1)
    proposed_method: TrainingMethod
    action: Literal[
        "REQUEST_RIGHTS_AND_REVIEW",
        "COLLECT_FRESH_INDEPENDENT_EVIDENCE",
        "DESIGN_PRIVATE_ISOLATED_EXPERIMENT",
    ]
    study_and_test_are_separated: Literal[True] = True
    improvement_proven: Literal[False] = False
    training_performed: Literal[False] = False


class NativeLanguageGrowthResult(StrictContract):
    schema_version: Literal["jr.jrei.native-language-growth-result.v1"] = (
        "jr.jrei.native-language-growth-result.v1"
    )
    cycle_id: Identifier
    evidence_digest: Digest
    goals: list[LanguageGrowthGoal]
    independent_heldout_pairs_required: bool = True
    may_evaluate_multiple_model_families: bool = True
    qwen_exclusive_dependency_required: Literal[False] = False
    independently_verified: Literal[False] = False
    model_weights_updated: Literal[False] = False
    quality_promotion_executed: Literal[False] = False
    model_training_started: Literal[False] = False


def plan_native_language_growth(
    payload: NativeLanguageGrowthRequest,
) -> NativeLanguageGrowthResult:
    """Select language-learning experiments without reading or training data.

    Failure metadata alone never proves why a model failed; a concept or
    arithmetic problem may reflect missing knowledge OR faulty generation.
    This plan keeps independent evaluation distinct from training and never
    makes hard-coded benchmark-specific corrections.
    """
    grouped: dict[tuple[str, str], list[LanguageEpisode]] = defaultdict(list)
    for item in payload.episodes:
        grouped[(item.language, item.competency)].append(item)
    goals: list[LanguageGrowthGoal] = []
    methods: dict[str, TrainingMethod] = {
        "MATHEMATICAL_LANGUAGE": "DETERMINISTIC_PYTHON_SKILL_INTEGRATION",
        "ASSESSMENT_CONCEPTS": "CONCEPT_GLOSSARY_WITH_SOURCE_CITATIONS",
        "EVIDENCE_GROUNDED_EXPLANATION": "CONCEPT_GLOSSARY_WITH_SOURCE_CITATIONS",
        "PERSIAN_ORTHOGRAPHY": "LICENSED_BILINGUAL_CURRICULUM",
        "PERSIAN_COMPREHENSION": "LICENSED_BILINGUAL_CURRICULUM",
        "ENGLISH_COMPREHENSION": "LICENSED_BILINGUAL_CURRICULUM",
        "MULTILINGUAL_INSTRUCTION_FOLLOWING":
            "INDEPENDENT_BILINGUAL_MODEL_COMPARISON",
        "ACADEMIC_EXPRESSION": "OWNER_REVIEWED_ADAPTER_TRAINING_PROPOSAL",
    }
    for (lang, skill), episodes in sorted(grouped.items()):
        reviewed = [e for e in episodes if e.independent_scientific_review]
        failed = [e for e in reviewed if e.failure != "CORRECT"]
        successes = sum(e.failure == "CORRECT" for e in reviewed)
        unreviewed = sum(
            e.failure != "CORRECT" and not e.independent_scientific_review
            for e in episodes
        )
        rights = sum(not e.rights_cleared and e.failure != "CORRECT"
                     for e in episodes)
        evidence = sorted(
            [e.episode_id, e.response_sha256, e.failure]
            for e in episodes if e.failure != "CORRECT"
        )
        evidence_sha = hashlib.sha256(json.dumps(
            evidence, ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")).hexdigest()
        weighted_fail = sum(e.impact for e in failed)
        priority = round(min(1., weighted_fail / max(1., len(reviewed))), 6)
        if rights:
            action = "REQUEST_RIGHTS_AND_REVIEW"
        elif not failed or unreviewed:
            action = "COLLECT_FRESH_INDEPENDENT_EVIDENCE"
        else:
            action = "DESIGN_PRIVATE_ISOLATED_EXPERIMENT"
        goals.append(LanguageGrowthGoal(
            language=lang, competency=skill,
            reviewed_failures=len(failed),
            unreviewed_failures=unreviewed,
            reviewed_successes=successes,
            uncovered_rights_failures=rights,
            negative_evidence_sha256=evidence_sha,
            priority=priority,
            proposed_method=methods[skill],
            action=action,
        ))
    canonical = json.dumps(payload.model_dump(mode="json"),
        sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return NativeLanguageGrowthResult(
        cycle_id=payload.cycle_id,
        evidence_digest=hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
        goals=sorted(goals, key=lambda x: (-x.priority, x.language, x.competency)),
    )
