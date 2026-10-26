"""Deterministic integrity check for original PHP/MariaDB owner mission events.

This is a hash-chain consistency verifier, NOT identity verification, an
append-only DB guarantee, a source-rights attestation, or a remote worker
completion receipt. Actual immutable anchoring and signed external evidence
must be separately reviewed for production-grade audit.
"""
from __future__ import annotations

import hashlib
import json
from typing import Literal

from pydantic import Field, model_validator
from jrei_core.contracts import Digest, StrictContract

_EVENT_CODES = {
    "MISSION_PLANNED",
    "OWNER_CANCELLED",
    "CANCEL_RESULT_UNKNOWN",
    "OWNER_REVIEW_REQUESTED",
}
_NEXT = {
    "MISSION_PLANNED": (None, "PLANNED"),
    "OWNER_CANCELLED": ({"PLANNED", "AUTHORIZED"}, "CANCELLED"),
    "CANCEL_RESULT_UNKNOWN": ({"RUNNING"}, "UNKNOWN_RESULT"),
    "OWNER_REVIEW_REQUESTED": ({"EXECUTED"}, "REQUIRES_REVIEW"),
}
_ZERO = "0" * 64


class MissionEvent(StrictContract):
    mission_id: str = Field(pattern=r"^[a-f0-9-]{36}$")
    seq: int = Field(ge=1, le=1_000_000)
    event_code: Literal[
        "MISSION_PLANNED", "OWNER_CANCELLED", "CANCEL_RESULT_UNKNOWN",
        "OWNER_REVIEW_REQUESTED",
    ]
    from_status: str | None = Field(default=None, max_length=32)
    to_status: str = Field(min_length=1, max_length=32)
    actor_account_id: str = Field(pattern=r"^[a-f0-9-]{36}$")
    previous_sha256: Digest
    event_sha256: Digest
    occurred_at: int = Field(ge=1, le=253402300799)


class MissionLedgerInput(StrictContract):
    schema_version: Literal["jr.jrei.apex-mission-integrity.v1"] = "jr.jrei.apex-mission-integrity.v1"
    mission_id: str = Field(pattern=r"^[a-f0-9-]{36}$")
    last_event_seq: int = Field(ge=1, le=1000)
    last_event_hash: Digest
    # This is a complete, ordered event stream; a paginated owner history
    # cannot be marked valid as if it were the entire ledger.
    events: list[MissionEvent] = Field(min_length=1, max_length=1000)


class MissionLedgerCheck(StrictContract):
    schema_version: Literal["jr.jrei.apex-mission-integrity-result.v1"] = (
        "jr.jrei.apex-mission-integrity-result.v1"
    )
    verdict: Literal["CONSISTENT_WITH_SUPPLIED_EVENTS", "INVALID_SUPPLIED_CHAIN"]
    checked_events: int = Field(ge=0)
    reason_code: str
    persisted_db_observed: Literal[False] = False
    signed_remote_evidence_verified: Literal[False] = False
    externally_anchored: Literal[False] = False
    model_tool_executed: Literal[False] = False


def _encoded_digest(event: MissionEvent) -> str:
    """Same canonical fixed-field array as jrApexMissionAppend() in PHP."""
    canonical = [
        "jr.jrei.apex-mission-event.v1",
        event.mission_id,
        event.seq,
        event.event_code,
        event.from_status,
        event.to_status,
        event.actor_account_id,
        event.previous_sha256,
        event.occurred_at,
    ]
    encoded = json.dumps(
        canonical, ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def verify_ledger(payload: MissionLedgerInput) -> MissionLedgerCheck:
    """Evaluate ONLY the submitted chain; never alter or approve actual data."""
    def failure(n: int, reason: str) -> MissionLedgerCheck:
        return MissionLedgerCheck(
            verdict="INVALID_SUPPLIED_CHAIN",
            checked_events=n,
            reason_code=reason,
        )

    if len(payload.events) != payload.last_event_seq:
        return failure(0, "INCOMPLETE_OR_PAGINATED_CHAIN")
    previous_hash = _ZERO
    last_state: str | None = None
    for expected_seq, event in enumerate(payload.events, 1):
        if event.mission_id != payload.mission_id or event.seq != expected_seq:
            return failure(expected_seq - 1, "MISSION_ID_OR_SEQUENCE_MISMATCH")
        if event.previous_sha256 != previous_hash:
            return failure(expected_seq - 1, "BROKEN_PREVIOUS_DIGEST")
        if event.event_code not in _EVENT_CODES:
            return failure(expected_seq - 1, "UNKNOWN_EVENT")
        required_prior, target = _NEXT[event.event_code]
        if (event.to_status != target
                or (event.event_code == "MISSION_PLANNED" and expected_seq != 1)
                or (event.event_code != "MISSION_PLANNED" and (
                    event.from_status not in required_prior
                    or event.from_status != last_state
                ))):
            return failure(expected_seq - 1, "INVALID_STATE_TRANSITION")
        if event.event_code == "MISSION_PLANNED" and event.from_status is not None:
            return failure(expected_seq - 1, "INVALID_INITIAL_STATE")
        if _encoded_digest(event) != event.event_sha256:
            return failure(expected_seq - 1, "EVENT_DIGEST_MISMATCH")
        previous_hash = event.event_sha256
        last_state = event.to_status
    if previous_hash != payload.last_event_hash:
        return failure(len(payload.events), "HEAD_DIGEST_MISMATCH")
    return MissionLedgerCheck(
        verdict="CONSISTENT_WITH_SUPPLIED_EVENTS",
        checked_events=len(payload.events),
        reason_code="SOURCE_ONLY_CHAIN_CONSISTENCY_NOT_RUNTIME_PROOF",
    )
