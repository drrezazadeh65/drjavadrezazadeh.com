"""Source fixtures for future gated QA. Not production evidence.

Run only during the independently authorized integrated release assessment.
No network, DB, Qwen, GitHub or Bertina writes occur in these fixtures.
"""
from datetime import datetime, timezone
import unittest

from pydantic import ValidationError

from jrei_learning.evidence_graph import (
    EvidenceGraphRequest, EvidencePointer, KnowledgeClaim, SourceVersion,
)
from jrei_learning.knowledge_correction import (
    CitedArtifact, CorrectionReviewRequest, prepare_knowledge_corrections,
)


NOW = datetime(2026, 10, 27, 10, 0, tzinfo=timezone.utc)
SHA_A = "a" * 64
SHA_B = "b" * 64


def graph(*, revoked=False, changed=False):
    src = SourceVersion(
        source_id="source.001", version_id="version.001",
        content_sha256=SHA_B if changed else SHA_A, observed_at=NOW,
        rights_state="REVOKED" if revoked else "ALLOWED",
        scientific_review="INDEPENDENT_REVIEWED",
        issuer_review="VERIFIED", official_source=True,
    )
    upstream = KnowledgeClaim(
        claim_id="claim.001", language="fa", subject="education.policy",
        evidence=[EvidencePointer(
            source_id="source.001", version_id="version.001",
            content_sha256=SHA_A, anchor="page.001",
        )],
    )
    downstream = KnowledgeClaim(
        claim_id="claim.002", language="fa", subject="education.policy",
        evidence=[EvidencePointer(
            source_id="source.001", version_id="version.001",
            content_sha256=SHA_A, anchor="page.002",
        )],
        depends_on=["claim.001"],
    )
    return EvidenceGraphRequest(
        policy_version="policy.001", evaluated_at=NOW,
        max_source_age_days=30,
        sources=[src], claims=[upstream, downstream],
    )


def request(g, artifact):
    return CorrectionReviewRequest(
        policy_version="policy.001",
        original_cms_policy_sha256=SHA_A,
        graph=g, artifacts=[artifact],
    )


class KnowledgeCorrectionContracts(unittest.TestCase):
    def test_revoked_source_transitively_holds_live_news(self):
        artifact = CitedArtifact(
            artifact_id="news.001", artifact_kind="NEWS_ARTICLE",
            locale="fa", artifact_version="v1.0",
            artifact_sha256=SHA_B, cited_claim_ids=["claim.002"],
            lifecycle="LIVE", original_cms_publication_receipt_sha256=SHA_A,
        )
        review = prepare_knowledge_corrections(request(graph(revoked=True), artifact))
        self.assertEqual(review.affected_artifact_ids, ["news.001"])
        self.assertEqual(
            review.recommendations[0].recommendation,
            "REQUEST_ORIGINAL_CMS_CORRECTION",
        )
        self.assertIn("UPSTREAM_CLAIM_REVIEW_BLOCKED", review.recommendations[0].reason_codes)
        self.assertEqual(review.recommendations[0].urgency, "REQUIRES_OWNER_ATTENTION")
        self.assertFalse(review.correction_executed)
        self.assertFalse(review.live_urls_redirected_or_deleted)

    def test_changed_source_requires_original_exam_key_review(self):
        artifact = CitedArtifact(
            artifact_id="exam.001", artifact_kind="EXAM_ITEM", locale="en",
            artifact_version="v1.0", artifact_sha256=SHA_B,
            cited_claim_ids=["claim.001"], lifecycle="LIVE",
        )
        review = prepare_knowledge_corrections(request(graph(changed=True), artifact))
        self.assertEqual(
            review.recommendations[0].recommendation,
            "REQUEST_EXAM_KEY_OR_ITEM_HOLD",
        )
        self.assertFalse(review.publisher_or_exam_status_changed)

    def test_unknown_claim_is_held_without_inventing_evidence(self):
        artifact = CitedArtifact(
            artifact_id="answer.001", artifact_kind="EDUCATIONAL_ANSWER",
            locale="bi", artifact_version="v1.0", artifact_sha256=SHA_B,
            cited_claim_ids=["claim.missing"], lifecycle="DRAFT",
        )
        review = prepare_knowledge_corrections(request(graph(), artifact))
        self.assertEqual(review.recommendations[0].recommendation, "HOLD_DRAFT")
        self.assertIn(
            "ARTIFACT_REFERENCES_MISSING_CLAIM",
            review.recommendations[0].reason_codes,
        )

    def test_valid_caller_metadata_is_review_only_never_approval(self):
        artifact = CitedArtifact(
            artifact_id="index.001", artifact_kind="KNOWLEDGE_INDEX_ENTRY",
            locale="fa", artifact_version="v1.0", artifact_sha256=SHA_B,
            cited_claim_ids=["claim.001"], lifecycle="LIVE",
        )
        review = prepare_knowledge_corrections(request(graph(), artifact))
        self.assertEqual(review.affected_artifact_ids, [])
        self.assertEqual(
            review.recommendations[0].recommendation,
            "REVIEW_SOURCE_RECONCILIATION",
        )
        self.assertFalse(review.independently_verified_against_mother_db)

    def test_live_news_without_cms_receipt_rejected(self):
        with self.assertRaises(ValidationError):
            CitedArtifact(
                artifact_id="news.001", artifact_kind="NEWS_ARTICLE", locale="fa",
                artifact_version="v1.0", artifact_sha256=SHA_B,
                cited_claim_ids=["claim.001"], lifecycle="LIVE",
            )

    def test_duplicate_artifact_and_cycle_fail_closed(self):
        artifact = CitedArtifact(
            artifact_id="answer.001", artifact_kind="EDUCATIONAL_ANSWER",
            locale="fa", artifact_version="v1.0", artifact_sha256=SHA_B,
            cited_claim_ids=["claim.001"], lifecycle="LIVE",
        )
        with self.assertRaises(ValidationError):
            CorrectionReviewRequest(
                policy_version="policy.001", original_cms_policy_sha256=SHA_A,
                graph=graph(), artifacts=[artifact, artifact],
            )
        with self.assertRaises(ValidationError):
            EvidenceGraphRequest(
                policy_version="policy.001", evaluated_at=NOW,
                max_source_age_days=30, sources=[],
                claims=[
                    KnowledgeClaim(
                        claim_id="claim.001", language="fa",
                        subject="education.policy",
                        evidence=[EvidencePointer(
                            source_id="source.001", version_id="version.001",
                            content_sha256=SHA_A, anchor="page.001",
                        )],
                        depends_on=["claim.002"],
                    ),
                    KnowledgeClaim(
                        claim_id="claim.002", language="fa",
                        subject="education.policy",
                        evidence=[EvidencePointer(
                            source_id="source.001", version_id="version.001",
                            content_sha256=SHA_A, anchor="page.002",
                        )],
                        depends_on=["claim.001"],
                    ),
                ],
            )


if __name__ == "__main__":
    unittest.main()
