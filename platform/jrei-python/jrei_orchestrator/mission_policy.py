"""Python-first typed policy for the owner mission ledger.

PHP persists the original mother-DB journal and is the SOLE authority to
perform authenticated mutations. This module makes deterministic advisory
state decisions without performing I/O, testing permissions on the caller,
fabricating a worker receipt, or interpreting natural-language shell commands.

The initial accepted PHP routes intentionally implement only PLANNED, CANCELLED,
UNKNOWN_RESULT, REQUIRES_REVIEW and emergency-stop / planning-only resume.
Future signed worker execution transitions require separate integration.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract
from jrei_core.envelope import MissionActionState

Action = Literal["PLAN", "CANCEL", "EMERGENCY_STOP", "RESUME_PLANNING"]
Decision = Literal[
    "ALLOW_PLAN_METADATA_ONLY", "ALLOW_CANCELLATION",
    "RECONCILE_UNKNOWN_RESULT", "ESCALATE_OWNER_REVIEW",
    "STOP_NEW_WORK", "ALLOW_PLANNING_ONLY",
    "NO_CHANGE_TERMINAL", "DENY",
]
INTENTS = frozenset({
    "SEO_ROBOTS_DIAGNOSTIC", "NEWS_INGESTION_DIAGNOSTIC",
    "JREI_NODE_HEALTH_REVIEW", "EDUCATION_SOURCE_GAP_REVIEW",
    "MOTHER_DB_METADATA_REVIEW", "LEARNING_EVIDENCE_REVIEW",
})


class MissionControl(StrictContract):
    schema_version: Literal["jr.jrei.apex-mission-controls.v1"] = "jr.jrei.apex-mission-controls.v1"
    owner_write_private_enabled: bool = False
    planning_enabled: bool = False
    emergency_stop: bool = True
    execution_enabled: bool = False
    control_revision: int = Field(ge=1)


class MissionStateSnapshot(StrictContract):
    mission_id: str
    intent_code: Identifier
    state: MissionActionState
    last_event_sequence: int = Field(ge=1)
    expiry: datetime

    @model_validator(mode="after")
    def valid_data(self) -> "MissionStateSnapshot":
        if self.expiry.tzinfo is None or self.expiry.utcoffset() is None:
            raise ValueError("MISSION_EXPIRY_NEEDS_TIMEZONE")
        if self.intent_code not in INTENTS:
            raise ValueError("UNREGISTERED_MISSION_INTENT")
        return self


class MissionTransition(StrictContract):
    schema_version: Literal["jr.jrei.apex-mission-transition.v1"] = "jr.jrei.apex-mission-transition.v1"
    action: Action
    decision: Decision
    from_state: MissionActionState | None
    proposed_state: MissionActionState | None
    event_code: str | None
    owner_mfa_required: Literal[True] = True
    requires_existing_mother_db_transaction: Literal[True] = True
    tool_executed: Literal[False] = False
    owner_permission_created: Literal[False] = False
    live_model_verified: Literal[False] = False
    result_known_by_this_function: Literal[False] = False


def _transition(action: Action, decision: Decision, before: MissionActionState | None,
                after: MissionActionState | None, event: str | None) -> MissionTransition:
    return MissionTransition(
        action=action, decision=decision, from_state=before,
        proposed_state=after, event_code=event,
    )


def evaluate_owner_action(
    action: Action,
    controls: MissionControl,
    mission: MissionStateSnapshot | None = None,
    *,
    requested_intent: str | None = None,
) -> MissionTransition:
    """Propose exactly the currently supported PHP transition; NO execution."""
    state = mission.state if mission else None
    if action == "EMERGENCY_STOP":
        return _transition(action, "STOP_NEW_WORK", state, state, None)
    if action == "RESUME_PLANNING":
        return _transition(
            action, "ALLOW_PLANNING_ONLY" if controls.owner_write_private_enabled
            else "DENY", state, state, None,
        )
    if action == "PLAN":
        if (state is not None or requested_intent not in INTENTS
                or not controls.owner_write_private_enabled
                or not controls.planning_enabled or controls.emergency_stop
                or controls.execution_enabled):
            return _transition(action, "DENY", state, None, None)
        return _transition(
            action, "ALLOW_PLAN_METADATA_ONLY", None,
            MissionActionState.PLANNED, "MISSION_PLANNED",
        )
    if action == "CANCEL":
        if state in (MissionActionState.PLANNED, MissionActionState.AUTHORIZED):
            return _transition(
                action, "ALLOW_CANCELLATION", state,
                MissionActionState.CANCELLED, "OWNER_CANCELLED",
            )
        if state == MissionActionState.RUNNING:
            # A cancel request cannot prove that a remote task has stopped.
            return _transition(
                action, "RECONCILE_UNKNOWN_RESULT", state,
                MissionActionState.UNKNOWN_RESULT, "CANCEL_RESULT_UNKNOWN",
            )
        if state == MissionActionState.EXECUTED:
            return _transition(
                action, "ESCALATE_OWNER_REVIEW", state,
                MissionActionState.REQUIRES_REVIEW, "OWNER_REVIEW_REQUESTED",
            )
        if state in (
            MissionActionState.VERIFIED, MissionActionState.FAILED,
            MissionActionState.CANCELLED, MissionActionState.UNKNOWN_RESULT,
            MissionActionState.REQUIRES_REVIEW,
        ):
            return _transition(action, "NO_CHANGE_TERMINAL", state, state, None)
    return _transition(action, "DENY", state, state, None)


def reconcile_interrupted_work(
    mission: MissionStateSnapshot,
    *,
    observation_time: datetime,
    lease_expiry: datetime | None,
    signed_completion_evidence: Digest | None = None,
) -> MissionTransition:
    """Assess an interrupted worker without inventing its outcome.

    A provided SHA alone is NOT a verified provider/worker signature; external
    authoritative correlation, lease and acceptance gates must still review it.
    This function cannot rewrite the PHP mother-DB state.
    """
    if observation_time.tzinfo is None or observation_time.utcoffset() is None:
        raise ValueError("RECONCILIATION_TIMEZONE_REQUIRED")
    if lease_expiry is not None and (
        lease_expiry.tzinfo is None or lease_expiry.utcoffset() is None
    ):
        raise ValueError("LEASE_EXPIRY_TIMEZONE_REQUIRED")
    if mission.state != MissionActionState.RUNNING:
        return _transition("CANCEL", "NO_CHANGE_TERMINAL",
                           mission.state, mission.state, None)
    if lease_expiry is None or observation_time <= lease_expiry:
        return _transition("CANCEL", "DENY", mission.state, mission.state, None)
    # Even if evidence hash is supplied, it is not independent attestation.
    return _transition(
        "CANCEL", "RECONCILE_UNKNOWN_RESULT",
        mission.state, MissionActionState.UNKNOWN_RESULT,
        "CANCEL_RESULT_UNKNOWN",
    )
