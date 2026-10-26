"""Fail-closed service-to-service HMAC for SOURCE-STAGED, read-only proposals.

This mechanism authenticates a configured internal gateway, NEVER an owner
human/MFA session. It does not allow execution, worker enrollment, DB writes,
news publication or provider activation. The nonce store is process-local;
the source-only API must not be horizontally deployed without a shared durable
replay ledger and independent private-network controls.
"""
from __future__ import annotations

import hashlib
import hmac
import os
import re
import threading
import time
from fastapi import HTTPException, Request

_NONCE = re.compile(r"^[A-Za-z0-9_-]{16,96}$")
_HEX = re.compile(r"^[0-9a-f]{64}$")
_WINDOW = 120
_MAX_NONCES = 10000
_seen: dict[str, int] = {}
_lock = threading.Lock()


async def require_internal_gateway(request: Request) -> None:
    if os.environ.get("JREI_PYTHON_PRIVATE_ENABLED") != "1":
        raise HTTPException(status_code=503, detail="PRIVATE_SERVICE_DISABLED")
    key = os.environ.get("JREI_PYTHON_HMAC_KEY", "")
    if len(key.encode("utf-8")) < 32:
        raise HTTPException(status_code=503, detail="INTERNAL_KEY_NOT_CONFIGURED")
    if request.url.query:
        raise HTTPException(status_code=400, detail="QUERY_STRING_NOT_SUPPORTED")
    if request.headers.get("x-jrei-service") != "bertina-owner-gateway":
        raise HTTPException(status_code=403, detail="UNTRUSTED_GATEWAY")
    stamp = request.headers.get("x-jrei-timestamp", "")
    nonce = request.headers.get("x-jrei-nonce", "")
    signature = request.headers.get("x-jrei-signature", "")
    if not stamp.isascii() or not stamp.isdigit() or len(stamp) != 10:
        raise HTTPException(status_code=401, detail="INVALID_TIMESTAMP")
    if not _NONCE.fullmatch(nonce) or not _HEX.fullmatch(signature):
        raise HTTPException(status_code=401, detail="INVALID_SIGNATURE_FORMAT")
    now = int(time.time())
    timestamp = int(stamp)
    if abs(now - timestamp) > _WINDOW:
        raise HTTPException(status_code=401, detail="SIGNATURE_EXPIRED")
    body = await request.body()
    if len(body) > 65536:
        raise HTTPException(status_code=413, detail="BODY_TOO_LARGE")
    prefix = (
        f"{request.method}\n{request.url.path}\n{stamp}\n{nonce}\n"
    ).encode("ascii")
    expected = hmac.new(key.encode("utf-8"), prefix + body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        raise HTTPException(status_code=401, detail="UNAUTHENTICATED_REQUEST")
    with _lock:
        expired = [n for n, expires in _seen.items() if expires < now]
        for n in expired:
            del _seen[n]
        if nonce in _seen:
            raise HTTPException(status_code=409, detail="REPLAYED_REQUEST")
        if len(_seen) >= _MAX_NONCES:
            raise HTTPException(status_code=503, detail="REPLAY_CAPACITY_EXCEEDED")
        _seen[nonce] = now + _WINDOW
