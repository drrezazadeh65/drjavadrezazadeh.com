"""Offline bounded provenance extraction from rights-reviewed JREI source bytes.

NO fetching, DB, host filesystem, JS execution, external fonts/assets, model
inference or auto-indexing. The content is untrusted EVEN from an official
website; any instruction within it is treated as data. Text remains private
caller input. The result is a compact SHA-anchored review proposal and does
not include full copyrighted source content. The original JREI-KA private
archive, human source rights reviewer, and CMS remain authoritative.
"""
from __future__ import annotations

import base64
from datetime import datetime
import hashlib
from html.parser import HTMLParser
import json
import re
from typing import Literal
import unicodedata

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract

_SPACE = re.compile(r"\s+", flags=re.UNICODE)
_BLOCKS = frozenset({
    "p", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote",
    "section", "article", "div", "td", "th", "pre"
})
_DROP = frozenset({
    "script", "style", "template", "noscript", "iframe", "object",
    "embed", "svg", "canvas", "head", "form", "button", "input"
})
_EMIT_LIMIT = 120
_MAX_DECODED_BYTES = 32_768
_MAX_CHARS = 32_768


class DocumentExtractionRequest(StrictContract):
    schema_version: Literal["jr.jrei.knowledge-extract.v1"] = (
        "jr.jrei.knowledge-extract.v1"
    )
    source_id: Identifier
    source_version_id: Identifier
    original_content_sha256: Digest
    observation_id: Identifier
    owner_policy_version: Identifier
    observed_at: datetime
    content_type: Literal["text/html", "text/plain"]
    content_base64: str = Field(min_length=4, max_length=44_000)
    # Caller assertions are never independent rights verification.
    independent_source_review_receipt_sha256: Digest | None = None
    private_analysis_rights_reviewed: bool = False
    source_not_withdrawn: bool = False
    approved_robots_terms_transport: bool = False
    review_use: Literal["PRIVATE_EVIDENCE_INDEX_PROPOSAL"] = (
        "PRIVATE_EVIDENCE_INDEX_PROPOSAL"
    )

    @model_validator(mode="after")
    def aware_observation(self) -> "DocumentExtractionRequest":
        if self.observed_at.utcoffset() is None:
            raise ValueError("DOCUMENT_OBSERVATION_TIMEZONE_REQUIRED")
        return self


class EvidenceTextAnchor(StrictContract):
    anchor_id: Identifier
    paragraph_sha256: Digest
    characters: int
    token_estimate: int
    paragraph_index: int
    short_review_excerpt: str | None = None
    source_text_untrusted: Literal[True] = True
    public_citation_rights_verified: Literal[False] = False


class DocumentExtractionResult(StrictContract):
    schema_version: Literal["jr.jrei.knowledge-extract-result.v1"] = (
        "jr.jrei.knowledge-extract-result.v1"
    )
    source_id: Identifier
    source_version_id: Identifier
    original_content_sha256: Digest
    extracted_text_sha256: Digest | None
    extraction_status: Literal[
        "HELD_SOURCE_POLICY", "NO_TEXT_EXTRACTABLE", "REVIEW_ANCHORS_PROPOSED"
    ]
    reviewed_input_bytes: int
    anchors: list[EvidenceTextAnchor]
    omitted_anchor_count: int
    rights_approved_by_extractor: Literal[False] = False
    original_document_licensed_by_extractor: Literal[False] = False
    data_sent_to_model: Literal[False] = False
    public_text_reproduced: Literal[False] = False
    source_truth_independently_verified: Literal[False] = False
    citations_indexed: Literal[False] = False
    database_modified: Literal[False] = False


class _HtmlParagraphs(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.accumulated: list[str] = []
        self.skip_depth = 0
        self.char_count = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in _DROP:
            self.skip_depth += 1
            return
        if self.skip_depth:
            return
        if tag in _BLOCKS or tag in ("br", "hr"):
            self._flush()

    def handle_endtag(self, tag: str) -> None:
        if tag in _DROP:
            if self.skip_depth:
                self.skip_depth -= 1
            return
        if not self.skip_depth and tag in _BLOCKS:
            self._flush()

    def handle_data(self, data: str) -> None:
        if self.skip_depth:
            return
        available = _MAX_CHARS - self.char_count
        if available <= 0:
            return
        excerpt = data[:available]
        self.char_count += len(excerpt)
        self.accumulated.append(excerpt)

    def _flush(self):
        if not self.accumulated:
            return
        part = _SPACE.sub(" ", "".join(self.accumulated)).strip()
        self.accumulated.clear()
        if part and len(self.parts) < 2_000:
            self.parts.append(part)

    def finish(self) -> list[str]:
        self._flush()
        return self.parts


def _sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def propose_private_extraction(
    payload: DocumentExtractionRequest,
) -> DocumentExtractionResult:
    """Hashes content-addressed spans; never returns entire source material."""
    try:
        document = base64.b64decode(payload.content_base64, validate=True)
    except Exception as exc:
        raise ValueError("INVALID_SOURCE_BASE64") from exc
    if not document or len(document) > _MAX_DECODED_BYTES:
        raise ValueError("SOURCE_INPUT_SIZE_OUT_OF_BOUNDS")
    if _sha(document) != payload.original_content_sha256:
        raise ValueError("PRIVATE_SOURCE_CONTENT_SHA256_MISMATCH")

    allowed = (
        payload.private_analysis_rights_reviewed
        and payload.source_not_withdrawn
        and payload.approved_robots_terms_transport
        and payload.independent_source_review_receipt_sha256 is not None
    )
    if not allowed:
        return DocumentExtractionResult(
            source_id=payload.source_id,
            source_version_id=payload.source_version_id,
            original_content_sha256=payload.original_content_sha256,
            extracted_text_sha256=None,
            extraction_status="HELD_SOURCE_POLICY",
            reviewed_input_bytes=len(document),
            anchors=[], omitted_anchor_count=0,
        )
    if b"\x00" in document:
        raise ValueError("BINARY_PAYLOAD_NOT_TEXT_SOURCE")
    try:
        decoded = document.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise ValueError("DOCUMENT_UTF8_REQUIRED") from exc
    decoded = unicodedata.normalize("NFC", decoded.lstrip("\ufeff"))
    if payload.content_type == "text/plain":
        paragraphs = [
            _SPACE.sub(" ", p).strip()
            for p in re.split(r"\n\s*\n", decoded)[:2_000]
        ]
    else:
        parser = _HtmlParagraphs()
        parser.feed(decoded)
        paragraphs = parser.finish()
    paragraphs = [p for p in paragraphs if p and not any(
        ch in p for ch in ("\x1b", "\u202e", "\u202d")
    )]
    joined = "\n".join(paragraphs).encode("utf-8")
    anchors: list[EvidenceTextAnchor] = []
    for index, paragraph in enumerate(paragraphs[:_EMIT_LIMIT]):
        text_digest = _sha(paragraph.encode("utf-8"))
        anchors.append(EvidenceTextAnchor(
            anchor_id="src.p." + str(index + 1).zfill(5),
            paragraph_sha256=text_digest, paragraph_index=index,
            characters=len(paragraph),
            token_estimate=max(1, (len(paragraph) + 3) // 4),
            short_review_excerpt=None,
        ))
    return DocumentExtractionResult(
        source_id=payload.source_id,
        source_version_id=payload.source_version_id,
        original_content_sha256=payload.original_content_sha256,
        extracted_text_sha256=_sha(joined) if paragraphs else None,
        extraction_status=("REVIEW_ANCHORS_PROPOSED" if anchors
                           else "NO_TEXT_EXTRACTABLE"),
        reviewed_input_bytes=len(document),
        anchors=anchors,
        omitted_anchor_count=max(0, len(paragraphs)-len(anchors)),
    )
