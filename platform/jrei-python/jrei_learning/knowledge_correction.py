"""JREI source-withdrawal and citation correction queue preparation.

Read-only bridge from the existing source/version evidence graph to review
of downstream news, exam, retrieval and educational-answer artefacts.
It NEVER edits a published URL, changes an exam key, deletes an article,
sends a notification or claims an original CMS publication receipt.
It is intentionally not an executable source of site authority.
"""
from __future__ import annotations

import hashlib
import json
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract
from jrei_learning.evidence_graph import EvidenceGraphRequest, review_evidence_graph


class CitedArtifact(StrictContract):
    artifact_id: Identifier
    artifact_kind: Literal[
        "NEWS_ARTICLE", "EXAM_ITEM", "EDUCATIONAL_ANSWER",
        "KNOWLEDGE_INDEX_ENTRY", "TEACHER_RESOURCE",
    ]
    locale: Literal["fa", "en", "bi"]
    artifact_version: Identifier
    artifact_sha256: Digest
    cited_claim_ids: list[Identifier] = Field(min_length=1, max_length=32)
    lifecycle: Literal[
        "DRAFT", "INDEPENDENT_REVIEW", "LIVE", "CORRECTION_PENDING",
        "WITHDRAWN", "ARCHIVED",
    ]
    original_cms_publication_receipt_sha256: Digest | None = None
    previous_correction_receipt_sha256: Digest | None = None

    @model_validator(mode="after")
    def coherent_artifact(self) -> "CitedArtifact":
        if len(self.cited_claim_ids) != len(set(self.cited_claim_ids)):
            raise ValueError("DUPLICATE_ARTIFACT_CLAIM")
        # Absence of a publication receipt is not a hint to infer publication.
        if self.lifecycle == "LIVE" and self.artifact_kind == "NEWS_ARTICLE" and (
            self.original_cms_publication_receipt_sha256 is None
        ):
            raise ValueError("LIVE_NEWS_REQUIRES_ORIGINAL_CMS_RECEIPT")
        return self


class CorrectionReviewRequest(StrictContract):
    schema_version: Literal["jr.jrei.knowledge-correction.v1"] = (
        "jr.jrei.knowledge-correction.v1"
    )
    policy_version: Identifier
    original_cms_policy_sha256: Digest
    graph: EvidenceGraphRequest
    artifacts: list[CitedArtifact] = Field(max_length=250)

    @model_validator(mode="after")
    def verify_policy_and_scope(self) -> "CorrectionReviewRequest":
        if self.graph.policy_version != self.policy_version:
            raise ValueError("CORRECTION_GRAPH_POLICY_MISMATCH")
        ids = [item.artifact_id for item in self.artifacts]
        if len(ids) != len(set(ids)):
            raise ValueError("DUPLICATE_PUBLISHED_ARTIFACT_ID")
        return self


class CorrectionRecommendation(StrictContract):
    artifact_id: Identifier
    artifact_kind: str
    lifecycle_seen: str
    affected_claim_ids: list[Identifier]
    reason_codes: list[str]
    recommendation: Literal[
        "REVIEW_SOURCE_RECONCILIATION",
        "HOLD_DRAFT",
        "REQUEST_ORIGINAL_CMS_CORRECTION",
        "REQUEST_EXAM_KEY_OR_ITEM_HOLD",
        "REQUEST_RETRIEVAL_INDEX_INVALIDATION",
        "REQUEST_ANSWER_CORRECTION",
        "REVIEW_ARCHIVED_ARTIFACT",
    ]
    urgency: Literal["NORMAL_REVIEW", "REQUIRES_OWNER_ATTENTION"]
    source_hold_confirmed_in_mother_db: Literal[False] = False
    cms_or_exam_action_issued: Literal[False] = False
    notification_delivered: Literal[False] = False


class CorrectionReview(StrictContract):
    schema_version: Literal["jr.jrei.knowledge-correction-result.v1"] = (
        "jr.jrei.knowledge-correction-result.v1"
    )
    policy_version: Identifier
    input_sha256: Digest
    evidence_graph_sha256: Digest
    recommendations: list[CorrectionRecommendation]
    affected_artifact_ids: list[Identifier]
    independently_verified_against_mother_db: Literal[False] = False
    source_rights_independently_attested: Literal[False] = False
    correction_executed: Literal[False] = False
    publisher_or_exam_status_changed: Literal[False] = False
    live_urls_redirected_or_deleted: Literal[False] = False
    notifications_sent: Literal[False] = False


def prepare_knowledge_corrections(
    request: CorrectionReviewRequest,
) -> CorrectionReview:
    """Provide a deterministic fail-closed impact report for owner review.

    Any revoked, stale, revised or unreviewed upstream citation affects every
    downstream artefact referencing its claim or its transitive dependencies.
    Caller-supplied rights, CMS receipts and review flags are not authenticated
    by this function; the original CMS/DB must decide what actually changes.
    """
    graph = review_evidence_graph(request.graph)
    claims = {c.claim_id: c for c in graph.claims}
    recommendations: list[CorrectionRecommendation] = []
    affected: list[str] = []
    for artifact in sorted(request.artifacts, key=lambda item: item.artifact_id):
        reasons: set[str] = set()
        affected_claims: list[str] = []
        for claim_id in sorted(artifact.cited_claim_ids):
            claim = claims.get(claim_id)
            if claim is None:
                reasons.add("ARTIFACT_REFERENCES_MISSING_CLAIM")
                affected_claims.append(claim_id)
            elif claim.blocked:
                affected_claims.append(claim_id)
                reasons.update(claim.reason_codes)
                reasons.add("ARTIFACT_REFERENCES_HELD_CLAIM")
        # The original CMS receipt is mandatory only for LIVE news
        # articles, as enforced by CitedArtifact. An index entry, exam item
        # or answer is not a news article and cannot be marked affected just
        # because it lacks a NEWS publication receipt.
        if (artifact.lifecycle == "LIVE"
                and artifact.artifact_kind == "NEWS_ARTICLE"
                and artifact.original_cms_publication_receipt_sha256 is None):
            reasons.add("ORIGINAL_PUBLICATION_RECEIPT_NOT_AVAILABLE")
        if affected_claims or reasons:
            affected.append(artifact.artifact_id)
            if artifact.lifecycle in ("WITHDRAWN", "ARCHIVED"):
                action = "REVIEW_ARCHIVED_ARTIFACT"
            elif artifact.lifecycle in ("DRAFT", "INDEPENDENT_REVIEW"):
                action = "HOLD_DRAFT"
            elif artifact.artifact_kind == "NEWS_ARTICLE":
                action = "REQUEST_ORIGINAL_CMS_CORRECTION"
            elif artifact.artifact_kind == "EXAM_ITEM":
                action = "REQUEST_EXAM_KEY_OR_ITEM_HOLD"
            elif artifact.artifact_kind == "KNOWLEDGE_INDEX_ENTRY":
                action = "REQUEST_RETRIEVAL_INDEX_INVALIDATION"
            else:
                action = "REQUEST_ANSWER_CORRECTION"
            urgency = (
                "REQUIRES_OWNER_ATTENTION"
                if artifact.lifecycle in ("LIVE", "CORRECTION_PENDING")
                else "NORMAL_REVIEW"
            )
        else:
            action = "REVIEW_SOURCE_RECONCILIATION"
            urgency = "NORMAL_REVIEW"
            reasons.add("NO_HELD_CITATIONS_IN_CALLER_GRAPH_NOT_EXTERNAL_ATTESTATION")

        recommendations.append(CorrectionRecommendation(
            artifact_id=artifact.artifact_id,
            artifact_kind=artifact.artifact_kind,
            lifecycle_seen=artifact.lifecycle,
            affected_claim_ids=affected_claims,
            reason_codes=sorted(reasons),
            recommendation=action, urgency=urgency,
        ))

    input_bytes = json.dumps(
        request.model_dump(mode="json"), ensure_ascii=False,
        sort_keys=True, separators=(",", ":"),
    ).encode("utf-8")
    return CorrectionReview(
        policy_version=request.policy_version,
        input_sha256=hashlib.sha256(input_bytes).hexdigest(),
        evidence_graph_sha256=graph.request_sha256,
        recommendations=recommendations,
        affected_artifact_ids=affected,
    )
