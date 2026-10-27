"""Source-bound bilingual news *editorial preflight*, not a news publisher.

The ORIGINAL Bertina news CMS/independent publisher rights policy is final.
Urgency is ranking only, NEVER owner approval. Straightforward first-party
verified notices can receive a publication *candidate* recommendation under
the standing policy, while contradictions or issuer/source uncertainty require
the original owner MFA exception queue. No article text, crawler, DB, network,
or CMS writer is accessed here. All source claims are caller-supplied metadata.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Literal

from pydantic import Field, model_validator
from jrei_core.contracts import Digest, Identifier, StrictContract

Rights = Literal[
    "UNKNOWN", "PENDING", "PERMITTED_PRIVATE_ANALYSIS",
    "PERMITTED_REPRODUCTION", "RESTRICTED", "REVOKED",
]


class NewsSourceEvidence(StrictContract):
    source_id: Identifier
    source_version_id: Identifier
    source_content_sha256: Digest
    retrieved_at: datetime
    original_official_issuer: bool = False
    current_issuer_independently_verified: bool = False
    source_authority_receipt_sha256: Digest | None = None
    rights_state: Rights = "UNKNOWN"
    rights_evidence_sha256: Digest | None = None
    robots_terms_transport_reviewed: bool = False
    source_revoked_or_withdrawn: bool = False
    original_ka_archive_receipt_sha256: Digest | None = None

    @model_validator(mode="after")
    def timezone(self) -> "NewsSourceEvidence":
        if self.retrieved_at.utcoffset() is None:
            raise ValueError("NEWS_SOURCE_RETRIEVAL_TIMEZONE_REQUIRED")
        return self


class NewsFactEvidence(StrictContract):
    claim_id: Identifier
    source_id: Identifier
    source_version_id: Identifier
    source_content_sha256: Digest
    citation_anchor: Identifier
    position: Literal["SUPPORTS", "CONTRADICTS", "UNKNOWN"]
    independent_fact_review_receipt_sha256: Digest | None = None
    reviewed_current_fact: bool = False


class NewsBilingualDraft(StrictContract):
    language: Literal["fa", "en"]
    draft_sha256: Digest
    source_citation_manifest_sha256: Digest
    independently_checked_translation: bool = False
    article_claim_ids: list[Identifier] = Field(min_length=1, max_length=32)
    correction_or_withdrawal_pending: bool = False

    @model_validator(mode="after")
    def unique_claims(self) -> "NewsBilingualDraft":
        if len(self.article_claim_ids) != len(set(self.article_claim_ids)):
            raise ValueError("NEWS_DUPLICATE_DRAFT_CLAIM")
        return self


class NewsEditorialRequest(StrictContract):
    schema_version: Literal["jr.jrei.news-editorial-preflight.v1"] = (
        "jr.jrei.news-editorial-preflight.v1"
    )
    policy_version: Identifier
    original_cms_publication_policy_sha256: Digest
    article_id: Identifier
    observed_at: datetime
    urgency: Literal["P0", "P1", "P2", "P3"]
    original_cms_routes_preserved: bool = False
    standing_official_policy_declared_active: bool = False
    original_ka_acquisition_provenance_available: bool = False
    sources: list[NewsSourceEvidence] = Field(min_length=1, max_length=40)
    facts: list[NewsFactEvidence] = Field(min_length=1, max_length=120)
    drafts: list[NewsBilingualDraft] = Field(min_length=1, max_length=2)
    correction_of_publication_receipt_sha256: Digest | None = None

    @model_validator(mode="after")
    def crosscheck_identifiers(self) -> "NewsEditorialRequest":
        if self.observed_at.utcoffset() is None:
            raise ValueError("NEWS_EVALUATION_TIMEZONE_REQUIRED")
        keys = [(s.source_id, s.source_version_id) for s in self.sources]
        if len(keys) != len(set(keys)):
            raise ValueError("NEWS_DUPLICATE_SOURCE_VERSION")
        ids = [f.claim_id for f in self.facts]
        # Multiple independent sources MAY support the same claim, but an
        # exact claim+source version pair can never be repeated.
        pairs = [(f.claim_id, f.source_id, f.source_version_id) for f in self.facts]
        if len(pairs) != len(set(pairs)):
            raise ValueError("NEWS_DUPLICATE_SOURCE_CLAIM_EDGE")
        languages = [d.language for d in self.drafts]
        if len(languages) != len(set(languages)):
            raise ValueError("NEWS_DUPLICATE_LANGUAGE_DRAFT")
        known = set(ids)
        for draft in self.drafts:
            if set(draft.article_claim_ids) - known:
                raise ValueError("NEWS_DRAFT_HAS_UNKNOWN_CLAIM")
        return self


class NewsClaimFinding(StrictContract):
    claim_id: Identifier
    supported_versions: list[str]
    contradicting_versions: list[str]
    reason_codes: list[str]
    decision: Literal[
        "HOLD_CONTRADICTION", "HOLD_EVIDENCE_REVIEW",
        "CANDIDATE_VERIFIED_SOURCE_FACT",
    ]
    facts_independently_verified_by_python: Literal[False] = False


class NewsEditorialPreflight(StrictContract):
    schema_version: Literal["jr.jrei.news-editorial-preflight-result.v1"] = (
        "jr.jrei.news-editorial-preflight-result.v1"
    )
    policy_version: Identifier
    article_id: Identifier
    request_sha256: Digest
    urgency: Literal["P0", "P1", "P2", "P3"]
    decision: Literal[
        "TECHNICAL_OR_RIGHTS_HOLD", "OWNER_MFA_EXCEPTION_CANDIDATE",
        "OFFICIAL_NEWS_CMS_HANDOFF_CANDIDATE",
    ]
    reason_codes: list[str] = Field(min_length=1)
    claims: list[NewsClaimFinding]
    editorial_daily_article_quota_enforced: Literal[False] = False
    owner_per_article_approval_added: Literal[False] = False
    rights_independently_attested_by_service: Literal[False] = False
    original_cms_writes_performed: Literal[False] = False
    bilingual_pages_published: Literal[False] = False
    original_cms_receipts_created: Literal[False] = False
    facts_added_to_permanent_model_training: Literal[False] = False
    live_news_pipeline_proven: Literal[False] = False


def review_news_editorial(request: NewsEditorialRequest) -> NewsEditorialPreflight:
    sources = {(s.source_id, s.source_version_id): s for s in request.sources}
    claims = sorted({f.claim_id for f in request.facts})
    findings: list[NewsClaimFinding] = []
    systemic: set[str] = set()
    owner_exceptions: set[str] = set()

    if not (request.original_cms_routes_preserved and
            request.original_ka_acquisition_provenance_available and
            request.standing_official_policy_declared_active):
        systemic.add("ORIGINAL_CMS_KA_OR_STANDING_POLICY_UNAVAILABLE")
    if {d.language for d in request.drafts} != {"fa", "en"}:
        systemic.add("BILINGUAL_ORIGINAL_CMS_DRAFTS_INCOMPLETE")
    for draft in request.drafts:
        if draft.correction_or_withdrawal_pending:
            owner_exceptions.add("CORRECTION_OR_WITHDRAWAL_REQUIRES_ORIGINAL_CMS_REVIEW")
        if not draft.independently_checked_translation:
            systemic.add("INDEPENDENT_BILINGUAL_EDITORIAL_CHECK_MISSING")
        canonical = [
            {
                "claim_id": f.claim_id,
                "source_id": f.source_id,
                "source_version_id": f.source_version_id,
                "source_content_sha256": f.source_content_sha256,
                "citation_anchor": f.citation_anchor,
            }
            for f in request.facts if f.claim_id in draft.article_claim_ids
        ]
        actual = hashlib.sha256(json.dumps(
            sorted(canonical, key=lambda c: (
                c["claim_id"], c["source_id"], c["source_version_id"], c["citation_anchor"]
            )), ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode("utf-8")).hexdigest()
        if actual != draft.source_citation_manifest_sha256:
            systemic.add("BILINGUAL_DRAFT_CITATION_MANIFEST_MISMATCH")

    for claim in claims:
        supports: list[str] = []
        contradicts: list[str] = []
        reasons: set[str] = set()
        for fact in (f for f in request.facts if f.claim_id == claim):
            key = (fact.source_id, fact.source_version_id)
            src = sources.get(key)
            if src is None:
                reasons.add("NEWS_CITED_VERSION_NOT_IN_SOURCE_REGISTRY")
                continue
            if fact.source_content_sha256 != src.source_content_sha256:
                reasons.add("NEWS_CITATION_CONTENT_CHANGED")
                continue
            age = (request.observed_at - src.retrieved_at).total_seconds()
            if age < 0 or age > 365 * 86400:
                reasons.add("NEWS_SOURCE_OBSERVATION_NOT_CURRENT")
                continue
            if src.source_revoked_or_withdrawn or src.rights_state in ("REVOKED", "RESTRICTED"):
                reasons.add("NEWS_SOURCE_REVOKED_OR_WITHDRAWN")
                continue
            if (not src.original_official_issuer or
                not src.current_issuer_independently_verified or
                src.source_authority_receipt_sha256 is None):
                reasons.add("ORIGINAL_OFFICIAL_ISSUER_NOT_INDEPENDENTLY_VERIFIED")
                continue
            if (src.rights_state != "PERMITTED_REPRODUCTION" or
                not src.rights_evidence_sha256 or
                not src.robots_terms_transport_reviewed or
                not src.original_ka_archive_receipt_sha256):
                reasons.add("NEWS_REPRODUCTION_OR_ORIGINAL_ARCHIVE_PROOF_MISSING")
                continue
            if not fact.reviewed_current_fact or not fact.independent_fact_review_receipt_sha256:
                reasons.add("CURRENT_FACT_INDEPENDENT_REVIEW_MISSING")
                continue
            ref = src.source_id + ":" + src.source_version_id
            if fact.position == "SUPPORTS":
                supports.append(ref)
            elif fact.position == "CONTRADICTS":
                contradicts.append(ref)
            else:
                reasons.add("NEWS_SOURCE_FACT_POSITION_UNKNOWN")
        if contradicts:
            owner_exceptions.add("INDEPENDENT_OFFICIAL_SOURCE_CONTRADICTION")
            decision = "HOLD_CONTRADICTION"
            reasons.add("CONTRADICTORY_REVIEWED_EVIDENCE")
        elif reasons or not supports:
            systemic.add("SOME_CLAIMS_LACK_LICENSED_VERIFIED_SUPPORT")
            decision = "HOLD_EVIDENCE_REVIEW"
            reasons.add("NO_COMPLETE_CURRENT_VERIFIED_SUPPORT" if not supports
                        else "INCOMPLETE_CLAIM_EVIDENCE")
        else:
            decision = "CANDIDATE_VERIFIED_SOURCE_FACT"
            reasons.add("METADATA_ONLY_ORIGINAL_CMS_MUST_RECHECK")
        findings.append(NewsClaimFinding(
            claim_id=claim, supported_versions=sorted(set(supports)),
            contradicting_versions=sorted(set(contradicts)),
            reason_codes=sorted(reasons), decision=decision,
        ))

    if request.correction_of_publication_receipt_sha256 is not None:
        owner_exceptions.add("PRIOR_PUBLICATION_CORRECTION_REQUIRES_ORIGINAL_CMS_RECEIPT")
    if owner_exceptions:
        result = "OWNER_MFA_EXCEPTION_CANDIDATE"
    elif systemic:
        result = "TECHNICAL_OR_RIGHTS_HOLD"
    else:
        result = "OFFICIAL_NEWS_CMS_HANDOFF_CANDIDATE"
    raw = json.dumps(request.model_dump(mode="json"), sort_keys=True,
                     ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return NewsEditorialPreflight(
        policy_version=request.policy_version,
        article_id=request.article_id,
        request_sha256=hashlib.sha256(raw).hexdigest(),
        urgency=request.urgency,
        decision=result,
        reason_codes=sorted(systemic | owner_exceptions) or [
            "FINAL_PUBLICATION_DECISION_BELONGS_TO_ORIGINAL_CMS_STANDING_POLICY"
        ],
        claims=findings,
    )
