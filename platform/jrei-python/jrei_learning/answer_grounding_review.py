"""JREI bilingual draft-answer citation coverage and revision-impact audit.

Pure, bounded, SHA-only quality gate. This does NOT read or trust a model's raw
answer, decide that a claim is true, independently verify an issuer, authorize
copyright use, or publish anything. Existing Bertina mother-DB evidence and
independent scientific/editorial decisions remain the source of authority.
"""
from __future__ import annotations

import hashlib
import json
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract
from jrei_learning.evidence_graph import (
    EvidenceGraphRequest, review_evidence_graph,
)


class DraftSentence(StrictContract):
    sentence_id: Identifier
    order: int = Field(ge=1, le=200)
    sentence_sha256: Digest
    # A fact-bearing sentence MUST have at least one identified reviewed claim.
    # A source pointer without a claim is not a substitute for evidence.
    is_factual_claim: bool = True
    supporting_claim_ids: list[Identifier] = Field(default_factory=list, max_length=16)

    @model_validator(mode="after")
    def unique_claim_refs(self) -> "DraftSentence":
        if len(set(self.supporting_claim_ids)) != len(self.supporting_claim_ids):
            raise ValueError("DUPLICATE_SENTENCE_CLAIM_REFERENCE")
        return self


class DeclaredContradiction(StrictContract):
    left_claim_id: Identifier
    right_claim_id: Identifier
    discrepancy_digest: Digest
    status: Literal["UNRESOLVED", "INDEPENDENTLY_REVIEW_REQUIRED"] = "UNRESOLVED"

    @model_validator(mode="after")
    def distinct_claims(self) -> "DeclaredContradiction":
        if self.left_claim_id == self.right_claim_id:
            raise ValueError("SELF_CONTRADICTION_REFERENCE")
        return self


class AnswerReviewRequest(StrictContract):
    schema_version: Literal["jr.jrei.answer-grounding-review.v1"] = (
        "jr.jrei.answer-grounding-review.v1"
    )
    response_id: Identifier
    policy_version: Identifier
    language: Literal["fa", "en", "bi"]
    answer_sha256: Digest
    graph: EvidenceGraphRequest
    sentences: list[DraftSentence] = Field(min_length=1, max_length=200)
    declared_contradictions: list[DeclaredContradiction] = Field(
        default_factory=list, max_length=40
    )
    # Cross-request custody is NOT attested by this caller-supplied digest.
    previous_answer_sha256: Digest | None = None

    @model_validator(mode="after")
    def validate_reference_scope(self) -> "AnswerReviewRequest":
        if self.policy_version != self.graph.policy_version:
            raise ValueError("ANSWER_EVIDENCE_POLICY_MISMATCH")
        orders = [item.order for item in self.sentences]
        identifiers = [item.sentence_id for item in self.sentences]
        if len(set(orders)) != len(orders) or sorted(orders) != list(
            range(1, len(orders) + 1)
        ):
            raise ValueError("INVALID_SENTENCE_ORDER")
        if len(set(identifiers)) != len(identifiers):
            raise ValueError("DUPLICATE_SENTENCE")
        known = {claim.claim_id for claim in self.graph.claims}
        # Unknown references are held in the *review*, not quietly omitted.
        contradiction_pairs = [
            tuple(sorted((item.left_claim_id, item.right_claim_id)))
            for item in self.declared_contradictions
        ]
        if len(set(contradiction_pairs)) != len(contradiction_pairs):
            raise ValueError("DUPLICATE_CONTRADICTION_PAIR")
        # Bind declared conflicts to the same graph rather than permitting a
        # false citation from another task, session or tenant.
        if any(a not in known or b not in known for a, b in contradiction_pairs):
            raise ValueError("CONTRADICTION_REFERENCES_UNKNOWN_CLAIM")
        return self


class SentenceReview(StrictContract):
    sentence_id: Identifier
    order: int
    sentence_sha256: Digest
    decision: Literal["HOLD", "CANDIDATE_REQUIRES_EDITORIAL_REVIEW"]
    reason_codes: list[str] = Field(min_length=1, max_length=48)
    source_claim_ids: list[Identifier] = Field(max_length=16)
    externally_verified: Literal[False] = False
    model_claim_checked_against_full_text: Literal[False] = False


class AnswerReviewResult(StrictContract):
    schema_version: Literal["jr.jrei.answer-grounding-review-result.v1"] = (
        "jr.jrei.answer-grounding-review-result.v1"
    )
    response_id: Identifier
    answer_sha256: Digest
    review_request_sha256: Digest
    evidence_request_sha256: Digest
    decision: Literal[
        "HOLD_UNGROUNDED_OR_CONFLICTING_DRAFT",
        "CANDIDATE_REQUIRES_INDEPENDENT_REVIEW",
    ]
    sentences: list[SentenceReview]
    held_sentence_ids: list[Identifier]
    contradiction_count: int
    source_claims_reviewed: int
    negative_evidence_retained: bool
    # Neither apparent full citation coverage nor supplied metadata is truth.
    claim_truth_verified: Literal[False] = False
    source_rights_independently_attested: Literal[False] = False
    citations_validated_in_mother_db: Literal[False] = False
    public_answer_authorized: Literal[False] = False
    published_answer_withdrawn: Literal[False] = False
    model_weights_changed: Literal[False] = False


def review_answer_grounding(payload: AnswerReviewRequest) -> AnswerReviewResult:
    graph_review = review_evidence_graph(payload.graph)
    claim_reviews = {claim.claim_id: claim for claim in graph_review.claims}
    original_claims = {claim.claim_id: claim for claim in payload.graph.claims}

    conflicts: dict[str, set[str]] = {}
    for item in payload.declared_contradictions:
        conflicts.setdefault(item.left_claim_id, set()).add(item.right_claim_id)
        conflicts.setdefault(item.right_claim_id, set()).add(item.left_claim_id)

    displayed_claims = {
        claim_id for sentence in payload.sentences
        for claim_id in sentence.supporting_claim_ids
    }
    held: list[str] = []
    findings: list[SentenceReview] = []
    for sentence in sorted(payload.sentences, key=lambda s: s.order):
        issues: set[str] = set()
        if sentence.is_factual_claim and not sentence.supporting_claim_ids:
            issues.add("FACTUAL_SENTENCE_WITHOUT_CITED_KNOWLEDGE_CLAIM")
        if not sentence.is_factual_claim and sentence.supporting_claim_ids:
            issues.add("NONFACTUAL_SENTENCE_HAS_UNNECESSARY_CLAIM_LINKS")
        for claim_id in sentence.supporting_claim_ids:
            if claim_id not in claim_reviews:
                issues.add("ANSWER_REFERENCES_UNKNOWN_KNOWLEDGE_CLAIM")
                continue
            underlying = original_claims[claim_id]
            if payload.language != "bi" and underlying.language not in (
                payload.language, "bi"
            ):
                issues.add("ANSWER_CITATION_LANGUAGE_MISMATCH")
            if claim_reviews[claim_id].blocked:
                issues.add("ANSWER_CITES_HELD_OR_REVOKED_CLAIM")
                issues.update(claim_reviews[claim_id].reason_codes)
            if claim_id in conflicts:
                issues.add("ANSWER_CITES_DECLARED_UNRESOLVED_CONTRADICTION")
        # One disputed claim is enough to hold an answer even if the other
        # side of the disagreement was conveniently omitted from the draft.
        if sentence.is_factual_claim and sentence.supporting_claim_ids:
            issues.add("SEMANTIC_CLAIM_SUPPORT_NOT_INDEPENDENTLY_VERIFIED")
        if issues:
            held.append(sentence.sentence_id)
        findings.append(SentenceReview(
            sentence_id=sentence.sentence_id,
            order=sentence.order,
            sentence_sha256=sentence.sentence_sha256,
            decision="HOLD" if issues else "CANDIDATE_REQUIRES_EDITORIAL_REVIEW",
            reason_codes=(sorted(issues) if issues else
                          ["NONFACTUAL_SENTENCE_EDITORIAL_REVIEW_REQUIRED"]),
            source_claim_ids=sentence.supporting_claim_ids,
        ))

    canonical = json.dumps(payload.model_dump(mode="json"),
                           ensure_ascii=False, sort_keys=True,
                           separators=(",", ":")).encode("utf-8")
    return AnswerReviewResult(
        response_id=payload.response_id,
        answer_sha256=payload.answer_sha256,
        review_request_sha256=hashlib.sha256(canonical).hexdigest(),
        evidence_request_sha256=graph_review.request_sha256,
        decision=(
            "HOLD_UNGROUNDED_OR_CONFLICTING_DRAFT" if held
            else "CANDIDATE_REQUIRES_INDEPENDENT_REVIEW"
        ),
        sentences=findings,
        held_sentence_ids=held,
        contradiction_count=len(payload.declared_contradictions),
        source_claims_reviewed=len(displayed_claims & set(claim_reviews)),
        negative_evidence_retained=True,
    )
