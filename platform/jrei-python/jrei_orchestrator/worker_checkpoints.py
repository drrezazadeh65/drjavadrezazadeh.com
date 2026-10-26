"""Cross-language JREI APEX signed-worker checkpoint consistency contract.

The PHP source of record adds observations to drjavad1_store; this pure Python
verifier reproduces the PHP SHA-256 encoding. A consistent supplied chain DOES
NOT independently verify an Ed25519 signature, actual worker run, DB contents,
dataset rights, scientific accuracy, or uninterrupted event history.
"""
from __future__ import annotations

import hashlib
import json
from typing import Annotated, Literal

from pydantic import Field, StringConstraints, model_validator

from jrei_core.contracts import Digest, StrictContract

UuidText = Annotated[
    str, StringConstraints(pattern=r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$")
]
Status = Literal[
    "QUEUED", "LEASED", "REVIEW_REQUIRED", "NEEDS_REVIEW", "EXPIRED",
    "CANCELLED", "REJECTED", "CLOSED_UNKNOWN",
]
ObservationCode = Literal[
    "QUEUED_NO_EXECUTION_RECEIPT",
    "LEASE_OVERDUE_RESULT_UNKNOWN",
    "SIGNED_NODE_LEASE_NOT_COMPLETION",
    "WORKER_REPORTED_REVIEW_REQUIRED",
    "WORKER_RESULT_UNKNOWN_REVIEW_REQUIRED",
    "QUEUE_EXPIRED_NOT_EXECUTED",
    "CANCEL_REQUESTED_EFFECTS_NOT_PROVEN",
    "OWNER_REJECTED_RESULT",
    "OWNER_CLOSED_UNKNOWN_RESULT",
    "UNRECOGNISED_WORKER_STATE",
]
VERSION = "jr.jrei.apex-worker-checkpoint.v1"
ZERO_SHA = "0" * 64


class WorkerCheckpoint(StrictContract):
    mission_id: UuidText
    job_id: UuidText
    seq: int = Field(ge=1, le=1_000_000)
    job_revision: int = Field(ge=1)
    job_status: Status
    observation_code: ObservationCode
    leased_node_id: UuidText | None = None
    lease_fingerprint_sha256: Digest | None = None
    result_digest: Digest | None = None
    previous_sha256: Digest
    checkpoint_sha256: Digest
    observed_at: int = Field(ge=1, le=253402300799)

    @model_validator(mode="after")
    def no_impossible_status_report(self) -> "WorkerCheckpoint":
        if self.job_status == "QUEUED" and (
            self.leased_node_id is not None or
            self.lease_fingerprint_sha256 is not None or
            self.result_digest is not None
        ):
            raise ValueError("QUEUED_JOB_CANNOT_HAVE_WORKER_RECEIPT")
        return self


class WorkerCheckpointHistory(StrictContract):
    schema_version: Literal["jr.jrei.apex-worker-checkpoints.v1"] = (
        "jr.jrei.apex-worker-checkpoints.v1"
    )
    mission_id: UuidText
    job_id: UuidText
    head_sequence: int = Field(ge=1, le=1000)
    head_sha256: Digest
    # Must be a complete, ascending history, not a bounded UI projection.
    checkpoints: list[WorkerCheckpoint] = Field(min_length=1, max_length=1000)


class WorkerCheckpointReview(StrictContract):
    schema_version: Literal["jr.jrei.apex-worker-checkpoint-review.v1"] = (
        "jr.jrei.apex-worker-checkpoint-review.v1"
    )
    decision: Literal["CONSISTENT_SUPPLIED_HISTORY", "INVALID_SUPPLIED_HISTORY"]
    checked: int = Field(ge=0)
    reason_code: str
    job_actually_executed_verified: Literal[False] = False
    source_evidence_independently_accepted: Literal[False] = False
    signed_worker_receipt_verified: Literal[False] = False
    production_database_read: Literal[False] = False
    model_improvement_proven: Literal[False] = False


def checkpoint_digest(checkpoint: WorkerCheckpoint) -> str:
    """Matches fixed PHP array in jrApexWorkerAppendCheckpoint()."""
    payload = [
        VERSION,
        checkpoint.mission_id,
        checkpoint.job_id,
        checkpoint.seq,
        checkpoint.job_revision,
        checkpoint.job_status,
        checkpoint.observation_code,
        checkpoint.leased_node_id,
        checkpoint.lease_fingerprint_sha256,
        checkpoint.result_digest,
        checkpoint.previous_sha256,
        checkpoint.observed_at,
    ]
    canonical = json.dumps(
        payload, ensure_ascii=False, separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def verify_worker_checkpoints(history: WorkerCheckpointHistory) -> WorkerCheckpointReview:
    """Verify supplied observations are sequential, intact and locally coherent."""
    def fail(n: int, reason: str) -> WorkerCheckpointReview:
        return WorkerCheckpointReview(
            decision="INVALID_SUPPLIED_HISTORY",
            checked=n, reason_code=reason,
        )

    if len(history.checkpoints) != history.head_sequence:
        return fail(0, "INCOMPLETE_OR_PAGINATED_WORKER_HISTORY")
    previous = ZERO_SHA
    previous_revision = -1
    previous_at = 0
    for seq, item in enumerate(history.checkpoints, 1):
        if item.mission_id != history.mission_id or item.job_id != history.job_id:
            return fail(seq-1, "CHECKPOINT_BOUND_TO_OTHER_MISSION_OR_JOB")
        if item.seq != seq or item.previous_sha256 != previous:
            return fail(seq-1, "BROKEN_CHECKPOINT_SEQUENCE_OR_CHAIN")
        if item.job_revision < previous_revision or item.observed_at < previous_at:
            return fail(seq-1, "REGRESSED_WORKER_REVISION_OR_OBSERVATION_TIME")
        if checkpoint_digest(item) != item.checkpoint_sha256:
            return fail(seq-1, "CHECKPOINT_DIGEST_MISMATCH")
        previous=item.checkpoint_sha256
        previous_revision=item.job_revision
        previous_at=item.observed_at
    if previous != history.head_sha256:
        return fail(len(history.checkpoints), "CHECKPOINT_HEAD_MISMATCH")
    return WorkerCheckpointReview(
        decision="CONSISTENT_SUPPLIED_HISTORY",
        checked=len(history.checkpoints),
        reason_code="SOURCE_SUPPLIED_CHAIN_CONSISTENT_NOT_INDEPENDENTLY_ATTESTED",
    )
