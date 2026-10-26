"""STAGED, not run: Python/PHP checkpoint wire-format and no-proof boundaries."""
from __future__ import annotations

import unittest
from pydantic import ValidationError
from jrei_orchestrator.worker_checkpoints import (
    WorkerCheckpoint, WorkerCheckpointHistory, checkpoint_digest,
    verify_worker_checkpoints,
)

MISSION="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
JOB="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
ZERO="0"*64


def checkpoint(seq=1, previous=ZERO, status="QUEUED",
               code="QUEUED_NO_EXECUTION_RECEIPT", revision=1, at=1761436800):
    row=dict(
        mission_id=MISSION,job_id=JOB,seq=seq,
        job_revision=revision,job_status=status,observation_code=code,
        leased_node_id=None,lease_fingerprint_sha256=None,result_digest=None,
        previous_sha256=previous,checkpoint_sha256="f"*64,observed_at=at,
    )
    row["checkpoint_sha256"]=checkpoint_digest(
        WorkerCheckpoint.model_validate(row))
    return row


def history(records, head=None):
    return WorkerCheckpointHistory.model_validate(dict(
        mission_id=MISSION,job_id=JOB,head_sequence=len(records),
        head_sha256=head or records[-1]["checkpoint_sha256"],
        checkpoints=records,
    ))


class SignedWorkerObservationContract(unittest.TestCase):
    def test_single_owner_queued_job_consistency_only(self):
        row=checkpoint()
        result=verify_worker_checkpoints(history([row]))
        self.assertEqual(result.decision,"CONSISTENT_SUPPLIED_HISTORY")
        self.assertFalse(result.signed_worker_receipt_verified)
        self.assertFalse(result.production_database_read)
        self.assertFalse(result.model_improvement_proven)

    def test_queued_and_reported_review_chain(self):
        first=checkpoint()
        second=checkpoint(2,first["checkpoint_sha256"],
            status="REVIEW_REQUIRED",code="WORKER_REPORTED_REVIEW_REQUIRED",
            revision=3,at=1761436805)
        result=verify_worker_checkpoints(history([first,second]))
        self.assertEqual(result.checked,2)
        self.assertFalse(result.source_evidence_independently_accepted)

    def test_tampered_checkpoint_is_rejected(self):
        row=checkpoint()
        row["job_revision"]=5
        got=verify_worker_checkpoints(history([row]))
        self.assertEqual(got.reason_code,"CHECKPOINT_DIGEST_MISMATCH")

    def test_incomplete_history_rejected(self):
        row=checkpoint()
        payload=WorkerCheckpointHistory.model_validate(dict(
            mission_id=MISSION,job_id=JOB,head_sequence=2,
            head_sha256=row["checkpoint_sha256"],checkpoints=[row]
        ))
        self.assertEqual(verify_worker_checkpoints(payload).reason_code,
                         "INCOMPLETE_OR_PAGINATED_WORKER_HISTORY")

    def test_reattached_checkpoint_to_other_job_rejected(self):
        row=checkpoint()
        payload=WorkerCheckpointHistory.model_validate(dict(
            mission_id=MISSION,job_id="cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            head_sequence=1,head_sha256=row["checkpoint_sha256"],
            checkpoints=[row]
        ))
        self.assertEqual(verify_worker_checkpoints(payload).reason_code,
                         "CHECKPOINT_BOUND_TO_OTHER_MISSION_OR_JOB")

    def test_source_revision_cannot_regress(self):
        first=checkpoint(revision=6)
        second=checkpoint(2,first["checkpoint_sha256"],revision=3,at=1761436801)
        self.assertEqual(verify_worker_checkpoints(history([first,second])).reason_code,
                         "REGRESSED_WORKER_REVISION_OR_OBSERVATION_TIME")

    def test_future_job_does_not_prove_worker_run(self):
        row=checkpoint(status="LEASED",
          code="SIGNED_NODE_LEASE_NOT_COMPLETION")
        value=verify_worker_checkpoints(history([row]))
        self.assertFalse(value.job_actually_executed_verified)

    def test_owner_review_is_not_scientific_validation(self):
        row=checkpoint(status="REVIEWED",
          code="OWNER_ACKNOWLEDGED_NOT_SCIENTIFICALLY_VERIFIED")
        result=verify_worker_checkpoints(history([row]))
        self.assertEqual(result.decision,"CONSISTENT_SUPPLIED_HISTORY")
        self.assertFalse(result.source_evidence_independently_accepted)
        self.assertFalse(result.model_improvement_proven)

    def test_queued_job_cannot_claim_result_digest(self):
        row=checkpoint()
        row["result_digest"]="d"*64
        with self.assertRaises(ValidationError):
            WorkerCheckpoint.model_validate(row)


if __name__=="__main__":
    unittest.main()
