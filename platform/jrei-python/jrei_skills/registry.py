"""Static skill registry. A model's text is never an executable tool declaration.

This file registers contracts, not privileged operations or third-party
plugins. Skills cannot reach the network, filesystem, SQL or a shell.
All capabilities are read-only and advisory until independent PHP/MFA gates.
"""
from __future__ import annotations

from types import MappingProxyType
from typing import Any

_SKILLS = (
    {
        "skill_id": "jrei.evidence.revision_triage.v1",
        "version": "1.0.0",
        "entry_route": "/internal/v1/skills/evidence/triage",
        "execution": "MODEL_FREE_DETERMINISTIC",
        "data_class": "PUBLIC_SOURCE_AGGREGATES_ONLY",
        "required_service_authority": "SIGNED_PRIVATE_GATEWAY",
        "owner_action_authorized": False,
        "mutates_mother_db": False,
        "network_access": False,
        "verified_source_grant": False,
        "languages": ["fa", "en"],
        "review": "INDEPENDENT_SOURCE_POLICY_REVIEW_REQUIRED",
    },
    {
        "skill_id": "jrei.learning.gap_prioritization.v1",
        "version": "1.0.0",
        "entry_route": "/internal/v1/learning/prioritize",
        "execution": "MODEL_FREE_DETERMINISTIC",
        "data_class": "REVIEWABLE_AGGREGATE_METRICS_ONLY",
        "required_service_authority": "SIGNED_PRIVATE_GATEWAY",
        "owner_action_authorized": False,
        "mutates_mother_db": False,
        "network_access": False,
        "verified_source_grant": False,
        "languages": ["fa", "en"],
        "review": "INDEPENDENT_BENCHMARK_EVIDENCE_REQUIRED",
    },
    {
        "skill_id": "jrei.learning.heldout_bilingual_review.v1",
        "version": "1.0.0",
        "entry_route": "/internal/v1/learning/heldout/review",
        "execution": "MODEL_FREE_DETERMINISTIC",
        "data_class": "HASH_IDENTIFIED_HELDOUT_OUTCOMES_ONLY",
        "required_service_authority": "SIGNED_PRIVATE_GATEWAY",
        "owner_action_authorized": False,
        "mutates_mother_db": False,
        "network_access": False,
        "verified_source_grant": False,
        "languages": ["fa", "en"],
        "review": "INDEPENDENT_FIXTURE_RIGHTS_AND_SCIENTIFIC_REVIEW_REQUIRED",
    },
    {
        "skill_id": "jrei.math.exact_arithmetic.v1",
        "version": "1.0.0",
        "entry_route": "/internal/v1/skills/arithmetic/calculate",
        "execution": "MODEL_FREE_DETERMINISTIC",
        "data_class": "EXPLICIT_BOUNDED_ARITHMETIC_EXPRESSION_ONLY",
        "required_service_authority": "SIGNED_PRIVATE_GATEWAY",
        "owner_action_authorized": False,
        "mutates_mother_db": False,
        "network_access": False,
        "verified_source_grant": False,
        "languages": ["fa", "en"],
        "review": "SOURCE_TESTS_AND_OWNER_ACCEPTANCE_REQUIRED",
    },
    {
        "skill_id": "jrei.orchestration.mission_dag.v1",
        "version": "1.0.0",
        "entry_route": "/internal/v1/missions/propose",
        "execution": "MODEL_FREE_DETERMINISTIC",
        "data_class": "REGISTERED_TASK_IDS_AND_POLICY_DIGEST_ONLY",
        "required_service_authority": "SIGNED_PRIVATE_GATEWAY",
        "owner_action_authorized": False,
        "mutates_mother_db": False,
        "network_access": False,
        "verified_source_grant": False,
        "languages": ["fa", "en"],
        "review": "OWNER_AND_TOOL_AUTHORIZATION_REQUIRED_FOR_EXECUTION",
    },
)
_IDS = tuple(skill["skill_id"] for skill in _SKILLS)
if len(set(_IDS)) != len(_IDS):
    raise RuntimeError("DUPLICATE_REGISTERED_SKILL")


def skill_catalog() -> dict[str, Any]:
    """A fresh JSON-compatible manifest; caller cannot mutate global registry."""
    return {
        "schema_version": "jr.jrei.skill-catalog.v1",
        "catalog_status": "SOURCE_ONLY_NOT_HOST_DEPLOYED",
        "registration_policy": "STATIC_REVIEWED_ALLOWLIST",
        "skills": [
            {k: list(v) if isinstance(v, list) else v for k, v in skill.items()}
            for skill in _SKILLS
        ],
        "privileged_execution_enabled": False,
        "model_weights_changed": False,
        "independent_acceptance_verified": False,
    }
