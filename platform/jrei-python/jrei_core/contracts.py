"""Versioned, strictly typed internal contracts for the JREI Python workstream.

No user conversation, student record, model-generated shell command or secret
belongs in these aggregate metacognitive inputs. The existing JS/PHP code is
the compatibility baseline; no legacy contract is deprecated here.
"""
from __future__ import annotations

from enum import Enum
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator


Identifier = Annotated[str, StringConstraints(pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]{2,79}$")]
Digest = Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]
Unit = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]


class StrictContract(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)


class GapKind(str, Enum):
    RETRIEVAL = "RETRIEVAL"
    UNSUPPORTED_CLAIM = "UNSUPPORTED_CLAIM"
    KNOWLEDGE_COVERAGE = "KNOWLEDGE_COVERAGE"
    TOOL_FAILURE = "TOOL_FAILURE"
    MULTILINGUAL_QUALITY = "MULTILINGUAL_QUALITY"
    LATENCY = "LATENCY"
    SOURCE_RIGHTS = "SOURCE_RIGHTS"


class LearningGap(StrictContract):
    """Aggregate evidence references only: no identifiable or raw learner data."""
    gap_id: Identifier
    domain: Identifier
    kind: GapKind
    aggregate_evidence_sha256: Digest
    measurement_version: Identifier
    observed_case_count: int = Field(ge=1, le=1_000_000)
    failure_rate: Unit
    expected_user_benefit: Unit
    scientific_importance: Unit
    strategic_coverage: Unit
    uncertainty: Unit
    relative_resource_cost: Unit
    operational_risk: Unit
    rights_eligible: bool = False
    independent_evidence_reviewed: bool = False


class LearningBatch(StrictContract):
    schema_version: Literal["jr.jrei.metacognitive-gaps.v1"] = "jr.jrei.metacognitive-gaps.v1"
    policy_version: Identifier
    gaps: list[LearningGap] = Field(min_length=1, max_length=200)

    @model_validator(mode="after")
    def unique_ids(self) -> "LearningBatch":
        ids = [gap.gap_id for gap in self.gaps]
        if len(ids) != len(set(ids)):
            raise ValueError("DUPLICATE_GAP_ID")
        return self


class LearningGoal(StrictContract):
    gap_id: Identifier
    domain: Identifier
    score: float
    selected_method: Literal[
        "RIGHTS_REVIEW", "SOURCE_ACQUISITION_REVIEW", "RETRIEVAL_EXPERIMENT",
        "DETERMINISTIC_SKILL_PROPOSAL", "MODEL_ROUTING_REVIEW", "HUMAN_SCIENTIFIC_REVIEW"
    ]
    decision: Literal["REQUIRES_EVIDENCE_REVIEW", "REQUIRES_RIGHTS_REVIEW", "PROPOSED"]
    reason_codes: list[str]
    next_action: Literal["PREPARE_EXPERIMENT_ONLY"] = "PREPARE_EXPERIMENT_ONLY"
    promoted: Literal[False] = False
    model_weights_changed: Literal[False] = False


class PrioritizedGoals(StrictContract):
    schema_version: Literal["jr.jrei.metacognitive-goals.v1"] = "jr.jrei.metacognitive-goals.v1"
    policy_version: Identifier
    evaluation_type: Literal["DETERMINISTIC_SOURCE_ONLY"] = "DETERMINISTIC_SOURCE_ONLY"
    goals: list[LearningGoal]
    source_evidence_independently_verified_by_service: Literal[False] = False
    learning_improvement_claimed: Literal[False] = False


class MissionNode(StrictContract):
    id: Identifier
    kind: Literal[
        "PUBLIC_SOURCE_DISCOVERY", "RIGHTS_REVIEW", "PRIVATE_ACQUISITION",
        "EVIDENCE_INDEX_PROPOSAL", "EDUCATIONAL_RESPONSE_REVIEW", "EXAM_ITEM_DRAFT",
        "EXAM_ITEM_INDEPENDENT_REVIEW", "NEWS_PRIVATE_DRAFT", "NEWS_FACT_REVIEW",
        "SITE_CHANGE_OBSERVE", "SITE_PATCH_PROPOSAL"
    ]
    after: list[Identifier] = Field(default_factory=list, max_length=8)


class MissionRequest(StrictContract):
    schema_version: Literal["jr.jrei.scoped-mission.v1"] = "jr.jrei.scoped-mission.v1"
    mission_id: Identifier
    policy_digest: Digest
    # Mission graph size is independent of the physical fleet size.
    # Permit wide plans without implying that any worker is activated.
    nodes: list[MissionNode] = Field(min_length=1, max_length=128)

    @model_validator(mode="after")
    def unique_nodes(self) -> "MissionRequest":
        ids = [node.id for node in self.nodes]
        if len(set(ids)) != len(ids):
            raise ValueError("DUPLICATE_NODE_ID")
        return self


class MissionStep(StrictContract):
    id: Identifier
    kind: str
    after: list[str]
    status: Literal["PROPOSED_NOT_EXECUTED"] = "PROPOSED_NOT_EXECUTED"
    permission: Literal["INDEPENDENT_AUTHORITY_REQUIRED"] = "INDEPENDENT_AUTHORITY_REQUIRED"


class MissionProposal(StrictContract):
    schema_version: Literal["jr.jrei.scoped-mission.v1"] = "jr.jrei.scoped-mission.v1"
    mission_id: Identifier
    policy_digest: Digest
    graph: list[MissionStep]
    executed: Literal[False] = False
    authorized: Literal[False] = False
    site_modified: Literal[False] = False
    private_data_access_granted: Literal[False] = False
    model_training_started: Literal[False] = False
