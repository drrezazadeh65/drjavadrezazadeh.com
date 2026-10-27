"""One authorised source observation, from signed acquisition to review anchors.

This is an opt-in private worker building block, NOT a scheduled crawler,
FastAPI endpoint, database migration or publication capability. The mother DB
must independently control sources, unique leases, rights, robots, terms,
budgets, revocation and trusted review receipts before issuing a permit.

A single signed transport call returns private bytes only to this function.
No content is retained between calls or reproduced in the returned receipt.
"""
from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract
from jrei_learning.authorized_source_transport import (
    AuthorizedTransportPermit, TransportNotAuthorized,
    download_one_permitted_source,
)
from jrei_learning.document_extraction import (
    DocumentExtractionRequest, DocumentExtractionResult,
    propose_private_extraction,
)


class SourceObservationScope(StrictContract):
    schema_version: Literal["jr.jrei.source-observation-scope.v1"] = (
        "jr.jrei.source-observation-scope.v1"
    )
    observation_id: Identifier
    owner_policy_version: Identifier
    source_review_receipt_sha256: Digest
    expected_content_sha256: Digest | None = None
    # These are issuer-signed review-state metadata, not Python attestations.
    reviewed_private_analysis_permission: bool = False
    source_current_and_not_withdrawn: bool = False
    robots_terms_and_transport_approved: bool = False
    source_policy_matches_lease: bool = False
    allow_model_consumption: Literal[False] = False
    allow_publishing: Literal[False] = False


class SourceObservationResult(StrictContract):
    schema_version: Literal["jr.jrei.source-observation.v1"] = (
        "jr.jrei.source-observation.v1"
    )
    work_id: Identifier
    source_id: Identifier
    source_version_id: Identifier
    observation_id: Identifier
    source_content_sha256: Digest
    original_url_sha256: Digest
    source_mime_type: str
    downloaded_bytes: int = Field(ge=1)
    extraction_status: Literal[
        "HOLD_REVIEW_POLICY", "HOLD_CONTENT_DIGEST",
        "HOLD_PDF_OR_OVERSIZE", "NO_TEXT_EXTRACTABLE",
        "REVIEW_ANCHORS_PROPOSED",
    ]
    extracted_text_sha256: Digest | None = None
    paragraph_anchor_count: int = 0
    paragraph_anchor_digests: list[Digest] = Field(max_length=120)
    content_persisted: Literal[False] = False
    source_rights_attested_by_python: Literal[False] = False
    full_text_exposed_to_site: Literal[False] = False
    model_inference_started: Literal[False] = False
    citations_verified_in_mother_db: Literal[False] = False
    database_written: Literal[False] = False
    publication_started: Literal[False] = False


class SourceObservationUnavailable(RuntimeError):
    pass


def observe_one_approved_source(
    permit: AuthorizedTransportPermit,
    scope: SourceObservationScope,
    *,
    now: int | None = None,
) -> SourceObservationResult:
    """Observe one already leased source; preserve all holds and digest proof.

    This function cannot mint/approve a permit or claim the lease. The permit
    signature and narrow approved URL are validated by the transport itself;
    future signed worker integration must separately verify the scope receipt
    against that exact mother-DB source policy and its still-active lease.
    """
    if not scope.source_policy_matches_lease:
        raise SourceObservationUnavailable("SOURCE_REVIEW_AND_LEASE_NOT_BOUND")
    if not (scope.reviewed_private_analysis_permission
            and scope.source_current_and_not_withdrawn
            and scope.robots_terms_and_transport_approved):
        raise SourceObservationUnavailable("SOURCE_REVIEW_AUTHORITY_NOT_PRESENT")

    receipt, private_content = download_one_permitted_source(permit, now=now)

    baseline = dict(
        work_id=permit.work_id,
        source_id=permit.source_id,
        source_version_id=permit.source_version_id,
        observation_id=scope.observation_id,
        source_content_sha256=receipt.content_sha256,
        original_url_sha256=receipt.canonical_url_sha256,
        source_mime_type=receipt.mime_type,
        downloaded_bytes=receipt.byte_count,
    )
    if scope.expected_content_sha256 is not None and (
        receipt.content_sha256 != scope.expected_content_sha256
    ):
        return SourceObservationResult(**baseline,
            extraction_status="HOLD_CONTENT_DIGEST")

    if receipt.mime_type not in ("text/plain", "text/html") or len(private_content) > 32768:
        # Never claim a PDF was parsed when no licensed, isolated parser was
        # invoked. PDF extraction must be a separately approved workload.
        return SourceObservationResult(**baseline,
            extraction_status="HOLD_PDF_OR_OVERSIZE")

    document = DocumentExtractionRequest(
        source_id=permit.source_id,
        source_version_id=permit.source_version_id,
        original_content_sha256=receipt.content_sha256,
        observation_id=scope.observation_id,
        owner_policy_version=scope.owner_policy_version,
        observed_at=datetime.fromtimestamp(
            receipt.received_at, tz=timezone.utc),
        content_type=receipt.mime_type,
        content_base64=base64.b64encode(private_content).decode("ascii"),
        independent_source_review_receipt_sha256=scope.source_review_receipt_sha256,
        private_analysis_rights_reviewed=True,
        source_not_withdrawn=True,
        approved_robots_terms_transport=True,
    )
    reviewed: DocumentExtractionResult = propose_private_extraction(document)
    # Only hashes leave the private worker. A newly extracted anchor is NOT an
    # approved citation and may not enter news or a public chatbot by default.
    state = (
        reviewed.extraction_status
        if reviewed.extraction_status != "HELD_SOURCE_POLICY"
        else "HOLD_REVIEW_POLICY"
    )
    return SourceObservationResult(
        **baseline,
        extraction_status=state,
        extracted_text_sha256=reviewed.extracted_text_sha256,
        paragraph_anchor_count=len(reviewed.anchors),
        paragraph_anchor_digests=[
            anchor.paragraph_sha256 for anchor in reviewed.anchors
        ],
    )
