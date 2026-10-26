"""A practical, model-free evidence revision triage skill.

This advisory skill detects source withdrawal, rights problems, changed
versions, and stale observations using source metadata only. It does NOT
validate a source's real issuer, published content, licence or provenance.
Those facts are authoritative only after the existing JREI mother-DB source
review. No input text, URL, raw learner data, DB or network is handled here.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal
from pydantic import Field, model_validator
from jrei_core.contracts import Digest, Identifier, StrictContract


Rights = Literal["UNKNOWN", "PERMISSION_PENDING", "ALLOWED", "RESTRICTED", "REVOKED"]
Review = Literal["UNREVIEWED", "INDEPENDENT_REVIEWED", "REJECTED"]


class EvidenceMetadata(StrictContract):
    source_id: Identifier
    version_id: Identifier
    content_sha256: Digest
    retrieved_at: datetime
    rights_state: Rights
    review_state: Review
    withdrawn: bool = False
    superseded: bool = False

    @model_validator(mode="after")
    def ensure_utc_aware(self) -> "EvidenceMetadata":
        if self.retrieved_at.tzinfo is None or self.retrieved_at.utcoffset() is None:
            raise ValueError("TIMEZONE_REQUIRED")
        return self


class EvidenceTriageRequest(StrictContract):
    schema_version: Literal["jr.jrei.evidence-triage.v1"] = "jr.jrei.evidence-triage.v1"
    current: EvidenceMetadata
    previous: EvidenceMetadata | None = None
    evaluation_at: datetime
    max_observation_age_days: int = Field(ge=1, le=3650)

    @model_validator(mode="after")
    def comparable(self) -> "EvidenceTriageRequest":
        if self.evaluation_at.tzinfo is None or self.evaluation_at.utcoffset() is None:
            raise ValueError("TIMEZONE_REQUIRED")
        if self.previous and self.previous.source_id != self.current.source_id:
            raise ValueError("UNRELATED_SOURCE_IDS")
        if self.current.retrieved_at > self.evaluation_at:
            raise ValueError("OBSERVATION_IN_FUTURE")
        if self.previous and self.previous.retrieved_at > self.evaluation_at:
            raise ValueError("PREVIOUS_OBSERVATION_IN_FUTURE")
        if self.previous and self.previous.retrieved_at > self.current.retrieved_at:
            raise ValueError("REVISION_TIME_REVERSED")
        return self


class EvidenceTriageResult(StrictContract):
    schema_version: Literal["jr.jrei.evidence-triage-result.v1"] = "jr.jrei.evidence-triage-result.v1"
    source_id: Identifier
    current_version_id: Identifier
    current_sha256: Digest
    decision: Literal[
        "HOLD_SOURCE_WITHDRAWN", "HOLD_RIGHTS_REVIEW",
        "HOLD_INDEPENDENT_REVIEW", "REVIEW_REVISION_CHANGE",
        "REVIEW_FRESHNESS", "REVIEW_SOURCE_CANDIDATE"
    ]
    reason_codes: list[str] = Field(min_length=1, max_length=12)
    content_changed: bool | None
    metadata_version_changed: bool | None
    observed_age_days: int = Field(ge=0)
    next_action: Literal["PROPOSE_REVIEW_ONLY"] = "PROPOSE_REVIEW_ONLY"
    executed: Literal[False] = False
    approved_for_retrieval: Literal[False] = False
    source_rights_approved_by_skill: Literal[False] = False
    independently_verified_by_service: Literal[False] = False
    memory_mutated: Literal[False] = False


def triage_evidence_revision(request: EvidenceTriageRequest) -> EvidenceTriageResult:
    """Return actionable review reason codes without granting data authority."""
    current, previous = request.current, request.previous
    age = max(0, int((request.evaluation_at - current.retrieved_at).total_seconds() // 86400))
    changed = current.content_sha256 != previous.content_sha256 if previous else None
    version_changed = current.version_id != previous.version_id if previous else None
    reasons: list[str] = ["CALLER_SUPPLIED_METADATA_NOT_INDEPENDENTLY_ATTESTED"]

    if current.withdrawn or current.superseded or current.rights_state == "REVOKED":
        decision = "HOLD_SOURCE_WITHDRAWN"
        reasons.append("SOURCE_WITHDRAWN_SUPERSEDED_OR_REVOKED")
    elif current.rights_state != "ALLOWED":
        decision = "HOLD_RIGHTS_REVIEW"
        reasons.append("PUBLICATION_OR_EXTRACTION_PERMISSION_NOT_ESTABLISHED")
    elif current.review_state != "INDEPENDENT_REVIEWED":
        decision = "HOLD_INDEPENDENT_REVIEW"
        reasons.append("SCIENTIFIC_AND_ISSUER_REVIEW_REQUIRED")
    elif changed or version_changed:
        decision = "REVIEW_REVISION_CHANGE"
        reasons.append("SOURCE_VERSION_CHANGED_REVIEW_PROVENANCE_AND_CITATIONS")
        if changed:
            reasons.append("CONTENT_SHA256_CHANGED")
        if version_changed:
            reasons.append("VERSION_IDENTIFIER_CHANGED")
    elif age > request.max_observation_age_days:
        decision = "REVIEW_FRESHNESS"
        reasons.append("OBSERVATION_OLDER_THAN_POLICY_THRESHOLD")
    else:
        decision = "REVIEW_SOURCE_CANDIDATE"
        reasons.append("NO_CHANGE_DETECTED_NO_NEW_APPROVAL_GRANTED")

    # Never accept upstream self-asserted rights/review as authoritative.
    return EvidenceTriageResult(
        source_id=current.source_id,
        current_version_id=current.version_id,
        current_sha256=current.content_sha256,
        decision=decision, reason_codes=reasons,
        content_changed=changed, metadata_version_changed=version_changed,
        observed_age_days=age,
    )
