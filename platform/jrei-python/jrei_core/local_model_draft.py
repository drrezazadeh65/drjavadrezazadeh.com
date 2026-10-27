"""Opt-in *private owner draft* through the already installed local Qwen.

This is not a public AI product, an automatic citation engine or learning.
It never changes model files, calls cloud providers, browses, executes tools,
saves prompts, connects to MySQL or claims factual/scientific correctness.
The existing signed public Node/Qwen bridge remains untouched.

Only a separately approved private Python HMAC/MFA-origin request can call
this module. It makes one bounded local request to 127.0.0.1:8081 and returns
a clearly labelled unverified answer. No hidden worker bootstrap.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import threading
import time
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.request import (
    Request as UrlRequest, build_opener, HTTPRedirectHandler, ProxyHandler,
)

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract

_MODEL_NAME = "jrei-qwen3-4b-q4km"
_ENDPOINT = "http://127.0.0.1:8081/v1/chat/completions"
_RUNTIME_LOCK = threading.BoundedSemaphore(value=1)
_MAX_HTTP_BYTES = 32_768
_IDENTITY = re.compile(
    r"(?i)(?:\b(?:api[_ -]?key|bearer|password|secret|private[_ -]?key)\b\s*[:=]|"
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)"
)


class LocalDraftRequest(StrictContract):
    schema_version: Literal["jr.jrei.owner-local-model-draft.v1"] = (
        "jr.jrei.owner-local-model-draft.v1"
    )
    request_id: Identifier
    language: Literal["fa", "en"]
    question: str = Field(min_length=5, max_length=1000)
    # Owner explicit instruction to draft; not consent to access sensitive
    # records or an attestation that source content is licensed.
    purpose: Literal["PRIVATE_EDUCATIONAL_DRAFT"] = "PRIVATE_EDUCATIONAL_DRAFT"
    max_output_tokens: int = Field(default=384, ge=32, le=640)
    # Source-free drafting: citations and claimed research are prohibited.
    source_evidence_sha256: Digest | None = None

    @model_validator(mode="after")
    def reject_secrets(self) -> "LocalDraftRequest":
        if self.source_evidence_sha256 is not None:
            # No excerpts were provided: a digest cannot ground an answer.
            raise ValueError("DIGEST_ALONE_CANNOT_AUTHORIZE_CITATION")
        if any(ord(c) < 32 and c not in "\n\t" for c in self.question):
            raise ValueError("QUESTION_CONTAINS_CONTROL_CHARACTERS")
        if _IDENTITY.search(self.question):
            raise ValueError("QUESTION_MAY_CONTAIN_SECRET")
        return self


class LocalDraftResult(StrictContract):
    schema_version: Literal["jr.jrei.owner-local-model-draft-result.v1"] = (
        "jr.jrei.owner-local-model-draft-result.v1"
    )
    request_id: Identifier
    language: Literal["fa", "en"]
    result_state: Literal["UNVERIFIED_MODEL_DRAFT"] = "UNVERIFIED_MODEL_DRAFT"
    model_alias: Literal["jrei-qwen3-4b-q4km"] = "jrei-qwen3-4b-q4km"
    model_output: str = Field(min_length=1, max_length=6000)
    response_sha256: Digest
    inference_latency_ms: int = Field(ge=0)
    tokens_reported: int | None = Field(default=None, ge=0)
    output_has_source_citations: Literal[False] = False
    factual_accuracy_independently_verified: Literal[False] = False
    source_rights_verified: Literal[False] = False
    model_weights_modified: Literal[False] = False
    training_started: Literal[False] = False
    owner_scientific_review_required: Literal[True] = True
    public_publish_authorized: Literal[False] = False
    persisted_to_mother_db: Literal[False] = False


class LocalModelUnavailable(RuntimeError):
    pass


class _RejectRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise LocalModelUnavailable("QWEN_LOCAL_REDIRECT_DENIED")


def _decode_bounded(response) -> bytes:
    declared = response.headers.get("Content-Length")
    if declared is not None:
        try:
            if int(declared) > _MAX_HTTP_BYTES:
                raise LocalModelUnavailable("QWEN_RESPONSE_TOO_LARGE")
        except ValueError as exc:
            raise LocalModelUnavailable("QWEN_RESPONSE_LENGTH_INVALID") from exc
    data = response.read(_MAX_HTTP_BYTES + 1)
    if len(data) > _MAX_HTTP_BYTES:
        raise LocalModelUnavailable("QWEN_RESPONSE_TOO_LARGE")
    return data


def create_local_owner_draft(payload: LocalDraftRequest) -> LocalDraftResult:
    """Invoke only the loopback CPU model behind an independent OFF-by-default gate."""
    if os.environ.get("JREI_PYTHON_OWNER_MODEL_DRAFT_ENABLED") != "1":
        raise LocalModelUnavailable("OWNER_MODEL_DRAFT_NOT_ENABLED")
    # Never convert HMAC gateway presence into rights to call a provider.
    if os.environ.get("JREI_PYTHON_LOCAL_MODEL_RIGHTS_OWNER_REVIEWED") != "1":
        raise LocalModelUnavailable("MODEL_USE_OWNER_REVIEW_REQUIRED")
    if not _RUNTIME_LOCK.acquire(blocking=False):
        raise LocalModelUnavailable("LOCAL_MODEL_SINGLE_INFERENCE_BUSY")
    started = time.monotonic()
    try:
        instruction = (
            "You are a private academic writing assistant. Generate ONLY an "
            "unverified educational draft based on the user question. Do not "
            "pretend to have used a source, study, website or database. Never "
            "invent a bibliographic reference, DOI, quotation or citation. "
            "Do not request credentials, perform tool calls, or make claims "
            "about what has been published. Distinguish uncertainty, acknowledge "
            "limitations. Respond in Persian."
            if payload.language == "fa" else
            "You are a private academic writing assistant. Generate ONLY an "
            "unverified educational draft from the supplied question. Do not "
            "pretend to have browsed or consulted documents. Never invent a "
            "bibliographic reference, DOI, quotation or citation. Do not request "
            "credentials or tools. Qualify uncertain points. Respond in English."
        )
        body = {
            "model": _MODEL_NAME,
            "messages": [
                {"role": "system", "content": instruction},
                {"role": "user", "content": payload.question},
            ],
            "stream": False, "temperature": 0.15,
            "max_tokens": payload.max_output_tokens,
            "tools": [],
        }
        body_bytes = json.dumps(
            body, ensure_ascii=False, separators=(",", ":")
        ).encode("utf-8")
        req = UrlRequest(
            _ENDPOINT, data=body_bytes, method="POST", headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
        )
        # Explicitly forbid even environment-configured proxy routing.
        opener = build_opener(ProxyHandler({}), _RejectRedirects())
        try:
            with opener.open(req, timeout=28) as response:
                if response.status != 200:
                    raise LocalModelUnavailable("QWEN_NON_200")
                ctype = response.headers.get("Content-Type", "").lower()
                if not ctype.startswith("application/json"):
                    raise LocalModelUnavailable("QWEN_RESPONSE_NOT_JSON")
                data = _decode_bounded(response)
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            raise LocalModelUnavailable("QWEN_LOCAL_REQUEST_UNAVAILABLE") from exc
        try:
            parsed = json.loads(data.decode("utf-8"))
            if not isinstance(parsed, dict):
                raise ValueError("not a JSON object")
            if parsed.get("model") not in (_MODEL_NAME, None):
                raise ValueError("unexpected model alias")
            choices = parsed["choices"]
            if not isinstance(choices, list) or len(choices) != 1:
                raise ValueError("unexpected choice count")
            finish = choices[0].get("finish_reason")
            if finish not in ("stop", "length"):
                raise ValueError("unexpected finish reason")
            output = choices[0]["message"]["content"]
            if not isinstance(output, str):
                raise ValueError("unexpected content type")
            output = output.strip()
            if not output or len(output) > 6000:
                raise ValueError("output out of bounds")
            usage = parsed.get("usage")
            tokens = (usage.get("completion_tokens")
                      if isinstance(usage, dict) else None)
            if tokens is not None and (
                type(tokens) is not int or tokens < 0 or tokens > 4096
            ):
                raise ValueError("invalid token usage")
        except (ValueError, TypeError, KeyError, IndexError, AttributeError) as exc:
            raise LocalModelUnavailable("QWEN_RESPONSE_CONTRACT_INVALID") from exc
        return LocalDraftResult(
            request_id=payload.request_id,
            language=payload.language,
            model_output=output,
            response_sha256=hashlib.sha256(output.encode("utf-8")).hexdigest(),
            inference_latency_ms=max(0, int((time.monotonic() - started) * 1000)),
            tokens_reported=tokens,
        )
    finally:
        _RUNTIME_LOCK.release()
