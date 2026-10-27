"""Opt-in, HTTPS-only public-source transport for a future JREI worker.

The operation is deliberately NOT exposed as a FastAPI route or a model tool.
It requires a short-lived HMAC permit issued by the authoritative, previously
reviewed JREI source/rights policy layer. A human assertion or model-written
URL is never enough. The original mother DB must atomically claim leases,
enforce robots/site terms, bytes budgets, rights and policy revocation BEFORE
issuing any signed transport permit.

Networking is disabled by default. This file alone does not schedule crawling,
license content or authorize publication. It returns only content digests and
private bytes to the explicitly authorized worker; never a public webpage.
"""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import hmac
import http.client
import ipaddress
import json
import os
import re
import socket
import ssl
import time
from urllib.parse import urlsplit

from pydantic import Field, model_validator

from jrei_core.contracts import Digest, Identifier, StrictContract

_HOST = re.compile(r"^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$")
_NONCE = re.compile(r"^[a-f0-9]{32}$")
_MAX_BODY = 2_097_152
_AGENT = "JREI-ReviewedSourceWorker/1.0 (+https://drjavadrezazadeh.com)"
_ALLOWED_TYPES = ("text/plain", "text/html", "application/pdf")


class AuthorizedTransportPermit(StrictContract):
    schema_version: str = "jr.jrei.approved-public-transport.v1"
    work_id: Identifier
    source_id: Identifier
    source_version_id: Identifier
    source_policy_digest: Digest
    lease_id: Identifier
    canonical_url: str = Field(min_length=12, max_length=1600)
    reviewed_host: str = Field(min_length=4, max_length=253)
    expected_content_type: str
    maximum_content_bytes: int = Field(ge=1, le=_MAX_BODY)
    issued_at: int = Field(ge=1)
    expires_at: int = Field(ge=1)
    nonce: str
    # The trusted issuer must set this only after independent rights,
    # robots, terms, transport, withdrawal and owner-authority checks.
    review_scope: str = "SOURCE_POLICY_AND_WORK_LEASE_REVIEWED"
    permit_signature: str

    @model_validator(mode="after")
    def validate_envelope(self) -> "AuthorizedTransportPermit":
        if self.schema_version != "jr.jrei.approved-public-transport.v1":
            raise ValueError("PERMIT_SCHEMA_UNSUPPORTED")
        if self.review_scope != "SOURCE_POLICY_AND_WORK_LEASE_REVIEWED":
            raise ValueError("SOURCE_RIGHTS_REVIEW_NOT_ATTESTED")
        if not _NONCE.fullmatch(self.nonce) or not re.fullmatch(
            r"[a-f0-9]{64}", self.permit_signature
        ):
            raise ValueError("PERMIT_SIGNATURE_FORMAT_INVALID")
        if self.expires_at <= self.issued_at or self.expires_at - self.issued_at > 120:
            raise ValueError("TRANSPORT_LEASE_WINDOW_UNACCEPTABLE")
        if self.expected_content_type not in _ALLOWED_TYPES:
            raise ValueError("SOURCE_CONTENT_TYPE_NOT_ALLOWLISTED")
        url = urlsplit(self.canonical_url)
        if url.scheme != "https" or url.username or url.password or url.fragment:
            raise ValueError("EXACT_HTTPS_CANONICAL_URL_REQUIRED")
        if url.port not in (None, 443):
            raise ValueError("NONSTANDARD_PUBLIC_SOURCE_PORT_DENIED")
        hostname = url.hostname
        if (not hostname or hostname != self.reviewed_host or
                not _HOST.fullmatch(hostname) or "." not in hostname or
                ".." in hostname or hostname.endswith(".") or
                not url.path.startswith(("/", ""))):
            raise ValueError("UNREVIEWED_SOURCE_HOST")
        try:
            ipaddress.ip_address(hostname)
        except ValueError:
            pass
        else:
            raise ValueError("DIRECT_IP_SOURCE_DENIED")
        if any(ord(c) < 32 for c in self.canonical_url):
            raise ValueError("INVALID_URL_CONTROL_CHARACTER")
        return self


@dataclass(frozen=True, slots=True)
class PrivateSourceReceipt:
    work_id: str
    source_id: str
    source_version_id: str
    canonical_url_sha256: str
    content_sha256: str
    mime_type: str
    byte_count: int
    status_code: int
    received_at: int
    # Caller-private content is deliberately not part of this receipt.


class TransportNotAuthorized(RuntimeError):
    """Rejects a source request without network side effects."""


def _permit_canonical(permit: AuthorizedTransportPermit) -> bytes:
    payload = permit.model_dump(exclude={"permit_signature"}, mode="json")
    return json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
    ).encode("utf-8")


def _authenticated(permit: AuthorizedTransportPermit, now: int) -> None:
    if os.environ.get("JREI_PYTHON_LICENSED_ACQUISITION_ENABLED") != "1":
        raise TransportNotAuthorized("PUBLIC_SOURCE_TRANSPORT_NOT_ENABLED")
    secret = os.environ.get("JREI_PYTHON_ACQUISITION_PERMIT_SECRET", "")
    if len(secret.encode("utf-8")) < 32:
        raise TransportNotAuthorized("SOURCE_PERMIT_ISSUER_UNCONFIGURED")
    expected = hmac.new(
        secret.encode("utf-8"), _permit_canonical(permit), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, permit.permit_signature):
        raise TransportNotAuthorized("SOURCE_PERMIT_SIGNATURE_INVALID")
    if now < permit.issued_at - 5 or now > permit.expires_at:
        raise TransportNotAuthorized("SOURCE_PERMIT_EXPIRED_OR_NOT_YET_VALID")


def _one_public_address(hostname: str) -> tuple[int, str]:
    try:
        answers = socket.getaddrinfo(
            hostname, 443, type=socket.SOCK_STREAM, proto=socket.IPPROTO_TCP
        )
    except (socket.gaierror, TimeoutError, OSError) as exc:
        raise TransportNotAuthorized("SOURCE_PUBLIC_DNS_UNAVAILABLE") from exc
    if not answers or len(answers) > 64:
        raise TransportNotAuthorized("SOURCE_DNS_ANSWER_UNBOUNDED")
    seen: set[tuple[int, str]] = set()
    for family, socktype, proto, canonical, sockaddr in answers:
        if family not in (socket.AF_INET, socket.AF_INET6):
            raise TransportNotAuthorized("SOURCE_UNAPPROVED_ADDRESS_FAMILY")
        address = str(sockaddr[0])
        try:
            parsed = ipaddress.ip_address(address)
        except ValueError as exc:
            raise TransportNotAuthorized("SOURCE_INVALID_RESOLVED_ADDRESS") from exc
        if not parsed.is_global:
            # Reject the WHOLE resolution when ANY address is nonpublic.
            # No localhost, private, metadata IP, link-local or mixed answers.
            raise TransportNotAuthorized("SOURCE_RESOLVES_TO_NONPUBLIC_ADDRESS")
        seen.add((family, address))
    return sorted(seen, key=lambda item: (item[0], item[1]))[0]


def download_one_permitted_source(
    permit: AuthorizedTransportPermit, *, now: int | None = None
) -> tuple[PrivateSourceReceipt, bytes]:
    """Perform ONE pinned TLS GET, no redirects, no proxy, no cookie, no retry.

    Requires an externally atomic, never-replayed signed lease. Local HMAC
    authenticates the issuer but cannot itself prove mother-DB lease uniqueness,
    rights or current robots state; it is not an independent crawler.
    """
    instant = int(time.time()) if now is None else now
    _authenticated(permit, instant)
    url = urlsplit(permit.canonical_url)
    family, address = _one_public_address(permit.reviewed_host)

    # Connect to one resolved *public* IP, then validate the TLS certificate
    # against the REVIEWED hostname. Bypass proxy and DNS re-resolution.
    sock: socket.socket | None = None
    stream = None
    try:
        sock = socket.socket(family, socket.SOCK_STREAM, socket.IPPROTO_TCP)
        sock.settimeout(8)
        target = (address, 443, 0, 0) if family == socket.AF_INET6 else (address, 443)
        sock.connect(target)
        context = ssl.create_default_context()
        stream = context.wrap_socket(sock, server_hostname=permit.reviewed_host)
        sock = None
        stream.settimeout(12)
        request_target = (url.path or "/") + (("?" + url.query) if url.query else "")
        request = (
            f"GET {request_target} HTTP/1.1\r\n"
            f"Host: {permit.reviewed_host}\r\n"
            f"User-Agent: {_AGENT}\r\n"
            "Accept: text/plain, text/html, application/pdf\r\n"
            "Accept-Encoding: identity\r\n"
            "Connection: close\r\n\r\n"
        ).encode("ascii")
        stream.sendall(request)
        response = http.client.HTTPResponse(stream, method="GET")
        response.begin()
        if response.status != 200:
            # In particular, a redirect to another host is NOT followed.
            raise TransportNotAuthorized("SOURCE_HTTP_STATUS_NOT_ACCEPTED")
        if response.getheader("Content-Encoding", "identity").lower() != "identity":
            raise TransportNotAuthorized("SOURCE_CONTENT_ENCODING_DENIED")
        if len(response.getheaders()) > 80:
            raise TransportNotAuthorized("SOURCE_RESPONSE_HEADERS_TOO_MANY")
        mime = response.getheader("Content-Type", "").split(";", 1)[0].strip().lower()
        if mime != permit.expected_content_type:
            raise TransportNotAuthorized("SOURCE_MIME_TYPE_MISMATCH")
        declared = response.getheader("Content-Length")
        if declared is not None:
            try:
                length = int(declared)
            except ValueError as exc:
                raise TransportNotAuthorized("SOURCE_CONTENT_LENGTH_INVALID") from exc
            if length < 0 or length > permit.maximum_content_bytes:
                raise TransportNotAuthorized("SOURCE_SIZE_LIMIT_EXCEEDED")
        content = response.read(permit.maximum_content_bytes + 1)
        if not content or len(content) > permit.maximum_content_bytes:
            raise TransportNotAuthorized("SOURCE_SIZE_LIMIT_EXCEEDED")
        receipt = PrivateSourceReceipt(
            work_id=permit.work_id,
            source_id=permit.source_id,
            source_version_id=permit.source_version_id,
            canonical_url_sha256=hashlib.sha256(
                permit.canonical_url.encode("utf-8")
            ).hexdigest(),
            content_sha256=hashlib.sha256(content).hexdigest(),
            mime_type=mime,
            byte_count=len(content),
            status_code=response.status,
            received_at=instant,
        )
        return receipt, content
    except (OSError, ssl.SSLError, http.client.HTTPException, UnicodeEncodeError) as exc:
        raise TransportNotAuthorized("SOURCE_HTTPS_TRANSPORT_FAILED") from exc
    finally:
        if stream is not None:
            stream.close()
        if sock is not None:
            sock.close()
