"""JREI claim-level provenance, source amendment and revocation impact.

Pure computation over bounded, caller-supplied metadata. No crawling, network,
MySQL, secrets, model execution, automatic publication or rights attestation.
A source marked APPROVED by a caller is still NOT independently attested here.
The original mother-DB rights/reviewer/CMS decisions remain authoritative.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract


class SourceVersion(StrictContract):
    source_id: Identifier
    version_id: Identifier
    content_sha256: Digest
    observed_at: datetime
    rights_state: Literal["UNKNOWN", "PENDING", "ALLOWED", "RESTRICTED", "REVOKED"]
    scientific_review: Literal["UNREVIEWED", "INDEPENDENT_REVIEWED", "REJECTED"]
    issuer_review: Literal["UNREVIEWED", "VERIFIED", "REJECTED"]
    withdrawn: bool = False
    superseded: bool = False
    official_source: bool = False

    @model_validator(mode="after")
    def time_is_aware(self) -> "SourceVersion":
        if self.observed_at.utcoffset() is None:
            raise ValueError("SOURCE_OBSERVATION_TIMEZONE_REQUIRED")
        return self


class EvidencePointer(StrictContract):
    source_id: Identifier
    version_id: Identifier
    content_sha256: Digest
    # A citation anchor, not raw copyrighted/source text.
    anchor: Identifier


class KnowledgeClaim(StrictContract):
    claim_id: Identifier
    language: Literal["fa", "en", "bi"]
    subject: Identifier
    # Referencing a claim is not a license to invent supporting evidence.
    evidence: list[EvidencePointer] = Field(min_length=1, max_length=16)
    depends_on: list[Identifier] = Field(default_factory=list, max_length=16)
    previous_evidence_sha256: Digest | None = None

    @model_validator(mode="after")
    def unique_references(self) -> "KnowledgeClaim":
        if self.claim_id in self.depends_on or len(self.depends_on) != len(set(self.depends_on)):
            raise ValueError("INVALID_CLAIM_DEPENDENCIES")
        keys = [(e.source_id, e.version_id, e.content_sha256, e.anchor)
                for e in self.evidence]
        if len(keys) != len(set(keys)):
            raise ValueError("DUPLICATE_CITATION_POINTER")
        return self


class EvidenceGraphRequest(StrictContract):
    schema_version: Literal["jr.jrei.evidence-graph.v1"] = "jr.jrei.evidence-graph.v1"
    policy_version: Identifier
    evaluated_at: datetime
    max_source_age_days: int = Field(ge=1, le=3650)
    sources: list[SourceVersion] = Field(max_length=500)
    claims: list[KnowledgeClaim] = Field(max_length=300)

    @model_validator(mode="after")
    def validate_graph(self) -> "EvidenceGraphRequest":
        if self.evaluated_at.utcoffset() is None:
            raise ValueError("EVALUATION_TIMEZONE_REQUIRED")
        source_keys = [(s.source_id, s.version_id) for s in self.sources]
        if len(source_keys) != len(set(source_keys)):
            raise ValueError("DUPLICATE_SOURCE_VERSION")
        claim_ids = [c.claim_id for c in self.claims]
        if len(claim_ids) != len(set(claim_ids)):
            raise ValueError("DUPLICATE_CLAIM_ID")
        edges = {c.claim_id: c.depends_on for c in self.claims}
        for s in self.sources:
            if s.observed_at > self.evaluated_at:
                raise ValueError("SOURCE_OBSERVATION_IN_FUTURE")
        visiting: set[str] = set()
        visited: set[str] = set()

        def visit(identifier: str) -> None:
            if identifier in visiting:
                raise ValueError("CYCLIC_KNOWLEDGE_DEPENDENCY")
            if identifier in visited:
                return
            visiting.add(identifier)
            for dependency in edges[identifier]:
                if dependency in edges:
                    visit(dependency)
            visiting.remove(identifier)
            visited.add(identifier)

        for identifier in sorted(edges):
            visit(identifier)
        return self


class ClaimReview(StrictContract):
    claim_id: Identifier
    decision: Literal[
        "HOLD_RIGHTS_OR_WITHDRAWAL",
        "HOLD_REVIEW_OR_SOURCE",
        "HOLD_REVISION",
        "HOLD_FRESHNESS",
        "HOLD_DEPENDENCY",
        "CANDIDATE_FOR_INDEPENDENT_REVIEW",
    ]
    reason_codes: list[str] = Field(min_length=1, max_length=32)
    evidence_manifest_sha256: Digest
    blocked: bool
    downstream_invalidated: bool
    # This field is intentionally false even when caller metadata looks good.
    approved_for_publication: Literal[False] = False


class EvidenceGraphReview(StrictContract):
    schema_version: Literal["jr.jrei.evidence-graph-review.v1"] = "jr.jrei.evidence-graph-review.v1"
    policy_version: Identifier
    request_sha256: Digest
    claims: list[ClaimReview]
    held_claim_ids: list[Identifier]
    affected_downstream_claim_ids: list[Identifier]
    inputs_independently_attested: Literal[False] = False
    citations_retrieved_or_verified: Literal[False] = False
    model_weights_changed: Literal[False] = False
    knowledge_promoted: Literal[False] = False
    publication_executed: Literal[False] = False


def _sha(data: object) -> str:
    return hashlib.sha256(json.dumps(
        data, sort_keys=True, ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")).hexdigest()


def review_evidence_graph(request: EvidenceGraphRequest) -> EvidenceGraphReview:
    """Fail closed for invalid, revoked, stale or changed source dependencies.

    Return review proposals only. Full-version SHA binding means a new source
    version cannot silently inherit the previous approval/citation.
    """
    known = {(s.source_id, s.version_id): s for s in request.sources}
    claims = {c.claim_id: c for c in request.claims}
    memo: dict[str, ClaimReview] = {}

    def review(claim_id: str) -> ClaimReview:
        if claim_id in memo:
            return memo[claim_id]
        claim = claims[claim_id]
        reasons: set[str] = set()
        severity = 0
        # 5 = revoked/withdrawn, 4 = missing/invalid, 3 = revision, 2 = old,
        # 1 = dependency, 0 = merely proposed; no status authorizes publication.
        evidence = [p.model_dump(mode="json") for p in claim.evidence]
        manifest_sha = _sha(sorted(
            evidence, key=lambda e: (e["source_id"], e["version_id"], e["anchor"])
        ))
        for pointer in claim.evidence:
            src = known.get((pointer.source_id, pointer.version_id))
            if src is None:
                reasons.add("CITED_SOURCE_VERSION_MISSING")
                severity = max(severity, 4)
                continue
            if src.withdrawn or src.superseded or src.rights_state in ("REVOKED", "RESTRICTED"):
                reasons.add("SOURCE_WITHDRAWN_RESTRICTED_OR_SUPERSEDED")
                severity = max(severity, 5)
            elif src.rights_state != "ALLOWED":
                reasons.add("SOURCE_RIGHTS_NOT_APPROVED")
                severity = max(severity, 5)
            if src.content_sha256 != pointer.content_sha256:
                reasons.add("SOURCE_CONTENT_DIGEST_MISMATCH")
                severity = max(severity, 3)
            if src.scientific_review != "INDEPENDENT_REVIEWED" or src.issuer_review != "VERIFIED":
                reasons.add("INDEPENDENT_SOURCE_OR_ISSUER_REVIEW_MISSING")
                severity = max(severity, 4)
            age_seconds = (request.evaluated_at - src.observed_at).total_seconds()
            if age_seconds > request.max_source_age_days * 86400:
                reasons.add("SOURCE_FRESHNESS_POLICY_EXCEEDED")
                severity = max(severity, 2)
        if claim.previous_evidence_sha256 is not None and (
            claim.previous_evidence_sha256 != manifest_sha
        ):
            reasons.add("CLAIM_CITATION_MANIFEST_CHANGED")
            severity = max(severity, 3)

        downstream = False
        for dependency_id in claim.depends_on:
            if dependency_id not in claims:
                reasons.add("REFERENCED_CLAIM_MISSING")
                severity = max(severity, 4)
            else:
                predecessor = review(dependency_id)
                if predecessor.blocked:
                    downstream = True
                    severity = max(severity, 1)
                    reasons.add("UPSTREAM_CLAIM_REVIEW_BLOCKED")

        outcome = {
            5: "HOLD_RIGHTS_OR_WITHDRAWAL",
            4: "HOLD_REVIEW_OR_SOURCE",
            3: "HOLD_REVISION",
            2: "HOLD_FRESHNESS",
            1: "HOLD_DEPENDENCY",
            0: "CANDIDATE_FOR_INDEPENDENT_REVIEW",
        }[severity]
        if severity == 0:
            reasons.add("CALLER_METADATA_NOT_INDEPENDENTLY_ATTESTED")
            reasons.add("MOTHER_DB_REVIEW_AND_PUBLICATION_APPROVAL_STILL_REQUIRED")
        result = ClaimReview(
            claim_id=claim_id, decision=outcome, reason_codes=sorted(reasons),
            evidence_manifest_sha256=manifest_sha, blocked=severity > 0,
            downstream_invalidated=downstream,
        )
        memo[claim_id] = result
        return result

    reviews = [review(identifier) for identifier in sorted(claims)]
    return EvidenceGraphReview(
        policy_version=request.policy_version,
        request_sha256=_sha(request.model_dump(mode="json")),
        claims=reviews,
        held_claim_ids=[r.claim_id for r in reviews if r.blocked],
        affected_downstream_claim_ids=[
            r.claim_id for r in reviews if r.downstream_invalidated
        ],
    )
