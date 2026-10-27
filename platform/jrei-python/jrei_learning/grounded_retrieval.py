"""Version-bound, bilingual, model-free JREI evidence retrieval selection.

This function does NOT access the internet, a knowledge store, a model, student
records, or a publisher. It scores only supplied candidate excerpt *metadata*
and fixed-size excerpts, and withholds text that is withdrawn, stale, mismatched
or not reviewed for the proposed use. The original source-review tables remain
the authority for rights, identity, independently reviewed facts and consent.
Neither the input flags nor a selection decision are proof of those facts.
"""
from __future__ import annotations

from datetime import datetime
import hashlib
import json
import re
import unicodedata
from typing import Literal

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract
from jrei_learning.untrusted_source_guard import source_text_hold_reasons

_TOKEN = re.compile(r"[^\W_]+", flags=re.UNICODE)
_STOP_FA = frozenset({"در", "به", "از", "که", "این", "آن", "با", "برای", "و", "یا", "است"})
_STOP_EN = frozenset({"a", "an", "the", "is", "are", "of", "for", "to", "and", "or", "in", "on"})
_DIACRITIC = frozenset(chr(c) for c in range(0x064B, 0x0660))
_DIACRITIC = _DIACRITIC | frozenset({"ـ", "\u0670"})


def _normalise(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).casefold()
    text = text.replace("ي", "ی").replace("ك", "ک")
    return "".join(c for c in text if c not in _DIACRITIC)


def _tokens(text: str, lang: str) -> frozenset[str]:
    stop = _STOP_FA if lang == "fa" else _STOP_EN
    return frozenset(
        t for t in _TOKEN.findall(_normalise(text)) if len(t) > 1 and t not in stop
    )


class RetrievalCandidate(StrictContract):
    excerpt_id: Identifier
    source_id: Identifier
    source_version_id: Identifier
    source_sha256: Digest
    excerpt_sha256: Digest
    citation_anchor: Identifier
    observed_at: datetime
    language: Literal["fa", "en"]
    excerpt_text: str = Field(min_length=1, max_length=1200)
    source_kind: Literal["OFFICIAL", "RESEARCH", "BOOK", "NEWS", "OTHER"]
    rights_state: Literal["UNKNOWN", "PENDING", "ALLOWED", "RESTRICTED", "REVOKED"]
    independently_reviewed: bool = False
    issuer_verified: bool = False
    source_withdrawn: bool = False
    source_superseded: bool = False
    snippet_reuse_permitted: bool = False
    quote_display_permitted: bool = False
    # Recorded by independent source-quality process; not a model self-rating.
    evidence_quality: float = Field(ge=0, le=1, allow_inf_nan=False)
    contradiction_group: Identifier | None = None
    position: Literal["SUPPORTS", "CONTRADICTS", "NEUTRAL"] = "NEUTRAL"

    @model_validator(mode="after")
    def enforce_digest_and_time(self) -> "RetrievalCandidate":
        if self.observed_at.utcoffset() is None:
            raise ValueError("RETRIEVAL_OBSERVATION_TIMEZONE_REQUIRED")
        expected = hashlib.sha256(self.excerpt_text.encode("utf-8")).hexdigest()
        if expected != self.excerpt_sha256:
            raise ValueError("EXCERPT_DIGEST_MISMATCH")
        if any(ch in self.excerpt_text for ch in ("\x00", "\x1b")):
            raise ValueError("CONTROL_CHARACTERS_IN_EXCERPT")
        return self


class RetrievalRequest(StrictContract):
    schema_version: Literal["jr.jrei.grounded-retrieval.v1"] = "jr.jrei.grounded-retrieval.v1"
    policy_version: Identifier
    query_id: Identifier
    language: Literal["fa", "en"]
    query: str = Field(min_length=3, max_length=300)
    evaluated_at: datetime
    max_age_days: int = Field(ge=1, le=3650)
    top_k: int = Field(ge=1, le=12)
    minimum_quality: float = Field(ge=0, le=1, allow_inf_nan=False)
    requested_use: Literal["OWNER_RESEARCH", "INTERNAL_RETRIEVAL", "PUBLIC_QUOTATION"]
    candidates: list[RetrievalCandidate] = Field(max_length=200)

    @model_validator(mode="after")
    def verify_candidate_index(self) -> "RetrievalRequest":
        if self.evaluated_at.utcoffset() is None:
            raise ValueError("RETRIEVAL_EVALUATION_TIMEZONE_REQUIRED")
        keys = [e.excerpt_id for e in self.candidates]
        if len(keys) != len(set(keys)):
            raise ValueError("DUPLICATE_EXCERPT_ID")
        version_map: dict[tuple[str, str], str] = {}
        for c in self.candidates:
            if c.observed_at > self.evaluated_at:
                raise ValueError("FUTURE_SOURCE_OBSERVATION")
            key = (c.source_id, c.source_version_id)
            previous = version_map.setdefault(key, c.source_sha256)
            if previous != c.source_sha256:
                raise ValueError("SAME_SOURCE_VERSION_CONFLICTING_SHA")
        return self


class RetrievalSelection(StrictContract):
    excerpt_id: Identifier
    source_id: Identifier
    source_version_id: Identifier
    source_sha256: Digest
    excerpt_sha256: Digest
    citation_anchor: Identifier
    relevance_score: float
    language: Literal["fa", "en"]
    # A selection does NOT authorize exposing copyrighted excerpt text.
    excerpt_text: str | None = None
    evidence_quality: float
    contradiction_group: Identifier | None
    position: Literal["SUPPORTS", "CONTRADICTS", "NEUTRAL"]
    citation_validated_in_mother_db: Literal[False] = False
    source_rights_independently_attested_by_service: Literal[False] = False


class RetrievalHold(StrictContract):
    excerpt_id: Identifier
    reason_codes: list[str] = Field(min_length=1, max_length=12)


class GroundedRetrievalResult(StrictContract):
    schema_version: Literal["jr.jrei.grounded-retrieval-result.v1"] = (
        "jr.jrei.grounded-retrieval-result.v1"
    )
    policy_version: Identifier
    query_id: Identifier
    request_sha256: Digest
    selections: list[RetrievalSelection]
    withheld: list[RetrievalHold]
    contradictory_evidence_groups: list[Identifier]
    response_policy: Literal[
        "NO_USABLE_EVIDENCE", "EVIDENCE_SELECTED_UNVERIFIED",
        "CONTRADICTORY_EVIDENCE_REQUIRES_REVIEW",
    ]
    source_entitlements_verified_here: Literal[False] = False
    answer_generated: Literal[False] = False
    citation_anchors_retrieved: Literal[False] = False
    model_called: Literal[False] = False
    publication_authorized: Literal[False] = False


def select_grounded_excerpts(request: RetrievalRequest) -> GroundedRetrievalResult:
    """Select *candidate* anchors; do not answer without an independent gate."""
    terms = _tokens(request.query, request.language)
    usable: list[tuple[float, RetrievalCandidate]] = []
    holds: list[RetrievalHold] = []
    for item in request.candidates:
        problems: set[str] = set()
        if item.source_withdrawn or item.source_superseded or item.rights_state == "REVOKED":
            problems.add("SOURCE_WITHDRAWN_SUPERSEDED_OR_REVOKED")
        if item.rights_state != "ALLOWED":
            problems.add("SOURCE_RIGHTS_NOT_ALLOWED")
        if not item.issuer_verified or not item.independently_reviewed:
            problems.add("INDEPENDENT_SOURCE_REVIEW_MISSING")
        if not item.snippet_reuse_permitted:
            problems.add("EXCERPT_REUSE_PERMISSION_MISSING")
        if request.requested_use == "PUBLIC_QUOTATION" and not item.quote_display_permitted:
            problems.add("PUBLIC_QUOTATION_PERMISSION_MISSING")
        if (request.evaluated_at - item.observed_at).total_seconds() > request.max_age_days * 86400:
            problems.add("SOURCE_TOO_OLD_FOR_CURRENT_POLICY")
        if item.evidence_quality < request.minimum_quality:
            problems.add("QUALITY_BELOW_POLICY_THRESHOLD")
        if source_text_hold_reasons(item.excerpt_text):
            # Not proof of a malicious source: preserve SHA and require an
            # independent review before allowing the text into an AI context.
            problems.add("SOURCE_INSTRUCTION_OR_FORMAT_QUARANTINE")
        if problems:
            holds.append(RetrievalHold(
                excerpt_id=item.excerpt_id, reason_codes=sorted(problems),
            ))
            continue
        words = _tokens(item.excerpt_text, item.language)
        intersection = terms & words
        if not terms or not intersection:
            holds.append(RetrievalHold(
                excerpt_id=item.excerpt_id, reason_codes=["NO_SUPPORTED_QUERY_TOKEN_OVERLAP"],
            ))
            continue
        # Small, explainable scoring function rather than opaque model trust.
        overlap = len(intersection) / len(terms)
        language_weight = 1.0 if item.language == request.language else 0.85
        score = round((0.80 * overlap + 0.20 * item.evidence_quality)
                      * language_weight, 6)
        usable.append((score, item))
    usable.sort(key=lambda pair: (-pair[0], pair[1].source_id,
                                  pair[1].source_version_id, pair[1].excerpt_id))
    chosen = usable[:request.top_k]

    # Detect contradictory claims from the full eligible candidate pool, not
    # merely the top-k slice, so truncation cannot hide an observed dispute.
    groups: dict[str, set[str]] = {}
    for _, item in usable:
        if item.contradiction_group and item.position != "NEUTRAL":
            groups.setdefault(item.contradiction_group, set()).add(item.position)
    disputes = sorted(g for g, values in groups.items()
                      if "SUPPORTS" in values and "CONTRADICTS" in values)

    citations: list[RetrievalSelection] = []
    for score, item in chosen:
        citations.append(RetrievalSelection(
            excerpt_id=item.excerpt_id,
            source_id=item.source_id, source_version_id=item.source_version_id,
            source_sha256=item.source_sha256, excerpt_sha256=item.excerpt_sha256,
            citation_anchor=item.citation_anchor, relevance_score=score,
            language=item.language, evidence_quality=item.evidence_quality,
            contradiction_group=item.contradiction_group,
            position=item.position,
            excerpt_text=(
                item.excerpt_text
                if request.requested_use != "PUBLIC_QUOTATION" and
                item.snippet_reuse_permitted
                else None
            ),
        ))

    raw = json.dumps(request.model_dump(mode="json"), sort_keys=True,
                     ensure_ascii=False, separators=(",", ":"))
    return GroundedRetrievalResult(
        policy_version=request.policy_version, query_id=request.query_id,
        request_sha256=hashlib.sha256(raw.encode("utf-8")).hexdigest(),
        selections=citations, withheld=sorted(holds, key=lambda h: h.excerpt_id),
        contradictory_evidence_groups=disputes,
        response_policy=(
            "NO_USABLE_EVIDENCE" if not citations else
            "CONTRADICTORY_EVIDENCE_REQUIRES_REVIEW" if disputes else
            "EVIDENCE_SELECTED_UNVERIFIED"
        ),
    )
