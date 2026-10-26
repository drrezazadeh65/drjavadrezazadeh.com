"""Staged, NOT EXECUTED: model-free source triage and security negative cases.

Run under a deliberately controlled source-acceptance environment when authorised.
These cases do not verify live source rights, model quality, or host availability.
"""
from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from pydantic import ValidationError
from jrei_skills.evidence_revision import EvidenceTriageRequest, triage_evidence_revision
from jrei_skills.registry import skill_catalog

NOW = datetime(2026, 10, 26, 12, tzinfo=timezone.utc)
SHA_A = "a" * 64
SHA_B = "b" * 64


def metadata(*, revision="r001", digest=SHA_A, days_old=3,
             rights="ALLOWED", review="INDEPENDENT_REVIEWED",
             withdrawn=False, superseded=False):
    return {
        "source_id": "university-official-1",
        "version_id": revision,
        "content_sha256": digest,
        "retrieved_at": NOW - timedelta(days=days_old),
        "rights_state": rights,
        "review_state": review,
        "withdrawn": withdrawn,
        "superseded": superseded,
    }


def triage(current, previous=None, **extra):
    payload = {
        "current": current,
        "previous": previous,
        "evaluation_at": NOW,
        "max_observation_age_days": 30,
    }
    payload.update(extra)
    return triage_evidence_revision(EvidenceTriageRequest.model_validate(payload))


class EvidenceSkillCases(unittest.TestCase):
    def test_candidate_does_not_self_approve(self):
        got = triage(metadata(), metadata())
        self.assertEqual(got.decision, "REVIEW_SOURCE_CANDIDATE")
        self.assertFalse(got.approved_for_retrieval)
        self.assertFalse(got.source_rights_approved_by_skill)
        self.assertFalse(got.independently_verified_by_service)
        self.assertFalse(got.executed)

    def test_content_and_version_delta_require_review(self):
        got = triage(metadata(revision="r002", digest=SHA_B), metadata())
        self.assertEqual(got.decision, "REVIEW_REVISION_CHANGE")
        self.assertTrue(got.content_changed)
        self.assertTrue(got.metadata_version_changed)

    def test_rights_withdrawal_precedes_version_change(self):
        got = triage(metadata(revision="r002", digest=SHA_B, rights="REVOKED"),
                     metadata())
        self.assertEqual(got.decision, "HOLD_SOURCE_WITHDRAWN")

    def test_superseded_source_is_withheld(self):
        got = triage(metadata(superseded=True))
        self.assertEqual(got.decision, "HOLD_SOURCE_WITHDRAWN")

    def test_rights_pending_is_a_hold(self):
        got = triage(metadata(rights="PERMISSION_PENDING"))
        self.assertEqual(got.decision, "HOLD_RIGHTS_REVIEW")

    def test_scientific_review_pending_is_a_hold(self):
        got = triage(metadata(review="UNREVIEWED"))
        self.assertEqual(got.decision, "HOLD_INDEPENDENT_REVIEW")

    def test_stale_observation_is_flagged(self):
        got = triage(metadata(days_old=40), metadata(days_old=40))
        self.assertEqual(got.decision, "REVIEW_FRESHNESS")
        self.assertEqual(got.observed_age_days, 40)

    def test_no_source_id_cross_linking(self):
        original = metadata()
        older = metadata()
        older["source_id"] = "other-university-1"
        with self.assertRaises(ValidationError):
            triage(original, older)

    def test_future_timestamp_is_rejected(self):
        with self.assertRaises(ValidationError):
            triage(metadata(days_old=-1))

    def test_tz_naive_timestamp_is_rejected(self):
        meta = metadata()
        meta["retrieved_at"] = datetime(2026, 10, 26, 12)
        with self.assertRaises(ValidationError):
            triage(meta)

    def test_raw_source_text_field_denied(self):
        meta = metadata()
        meta["raw_student_answer"] = "private transcript"
        with self.assertRaises(ValidationError):
            triage(meta)

    def test_unbounded_age_threshold_denied(self):
        with self.assertRaises(ValidationError):
            triage(metadata(), max_observation_age_days=3651)

    def test_allowlist_has_no_execution_or_upload(self):
        catalog = skill_catalog()
        self.assertFalse(catalog["privileged_execution_enabled"])
        self.assertEqual(len(catalog["skills"]), 5)
        self.assertTrue(all(not s["mutates_mother_db"] and not s["network_access"]
                            for s in catalog["skills"]))
        catalog["skills"][0]["languages"].append("tampered")
        self.assertEqual(len(skill_catalog()["skills"][0]["languages"]), 2)


if __name__ == "__main__":
    unittest.main()
