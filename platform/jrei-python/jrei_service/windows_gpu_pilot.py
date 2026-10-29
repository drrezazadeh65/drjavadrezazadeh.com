"""Optional, owner-consented Qwen GPU pilot for the existing JREI Windows app.

This is NOT JREI's independently trained model. It never starts a process,
downloads weights, opens a port, publishes, or changes the native model registry.
Default: OFF. Requests only the already-running owner-private 127.0.0.1:8082.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import threading
import urllib.error
import urllib.request

MODEL_SHA = "7485fe6f11af29433bc51cab58009521f205840f5b4ae3a32fa7f92e8534fdf5"
CONSENT_SCHEMA = "jr.jrei.owner-private-gpu-pilot.v1"
OWNER_SCHEMA = "jr.jrei.owner-gpu-model.v4"
RUNTIME_SCHEMA = "jrei.rx580.8gb.owner-private.v1"
ENDPOINT = "http://127.0.0.1:8082/v1/chat/completions"
MODEL_ID = "jrei-gpu-lab"
_LOCK = threading.RLock()
_VERIFIED = set()


def _local_root() -> Path:
    base = os.environ.get("LOCALAPPDATA")
    if not base:
        raise ValueError("JREI_GPU_WINDOWS_OWNER_STORAGE_UNAVAILABLE")
    return Path(base)


def _regular_json(path: Path, *, max_bytes: int = 4096) -> dict:
    if path.is_symlink() or not path.is_file() or path.stat().st_size > max_bytes:
        raise ValueError("JREI_GPU_PRIVATE_MANIFEST_MISSING")
    result = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(result, dict):
        raise ValueError("JREI_GPU_PRIVATE_MANIFEST_INVALID")
    return result


def _sha(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for part in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(part)
    return digest.hexdigest()


def _owner_gate(private: Path) -> tuple[str, str]:
    root = _local_root()
    if private.resolve() != (root / "JREI" / "command-center").resolve():
        raise ValueError("JREI_GPU_OWNER_STORAGE_MISMATCH")
    consent = _regular_json(private / "gpu-pilot-consent.json")
    if (set(consent) != {"schema", "enabled", "external_model_acknowledged",
                         "owner_approved", "model_sha256"}
            or consent.get("schema") != CONSENT_SCHEMA
            or consent.get("enabled") is not True
            or consent.get("external_model_acknowledged") is not True
            or consent.get("owner_approved") is not True
            or consent.get("model_sha256") != MODEL_SHA):
        raise ValueError("JREI_GPU_PILOT_EXPLICIT_CONSENT_REQUIRED")

    lab = root / "JREI-GPU-Lab"
    sidecar = _regular_json(lab / "gpu-model-owner-v4.json")
    runtime = _regular_json(lab / "gpu-owner-16gb.json")
    model = lab / "models" / "Qwen3-4B-Q4_K_M.gguf"
    backend = lab / "llama-b11932-vulkan"
    binaries = list(backend.rglob("llama-server.exe")) if backend.is_dir() else []
    if (sidecar.get("schema") != OWNER_SCHEMA
            or sidecar.get("ownerApproved") is not True
            or sidecar.get("rightsReviewed") is not True
            or sidecar.get("publicChatEnabled") is not False
            or sidecar.get("modelSha256") != MODEL_SHA
            or not isinstance(sidecar.get("modelFile"), str)
            or os.path.normcase(str(model.resolve())) !=
               os.path.normcase(str(Path(sidecar["modelFile"]).resolve()))
            or runtime.get("schema") != RUNTIME_SCHEMA
            or runtime.get("owner") != sidecar.get("owner")
            or runtime.get("port") != 8082
            or runtime.get("layers") not in (8, 16, 37)
            or len(binaries) != 1
            or not isinstance(runtime.get("exeSha256"), str)
            or not re.fullmatch(r"[a-f0-9]{64}", runtime["exeSha256"])):
        raise ValueError("JREI_GPU_PILOT_APPROVED_RUNTIME_MISMATCH")
    if (model.is_symlink() or not model.is_file()
            or model.stat().st_size != 2497280256 or binaries[0].is_symlink()):
        raise ValueError("JREI_GPU_PILOT_ARTIFACT_MISSING")
    signature = (str(model.resolve()), model.stat().st_mtime_ns,
                 str(binaries[0].resolve()), binaries[0].stat().st_mtime_ns)
    with _LOCK:
        if signature not in _VERIFIED:
            if _sha(model) != MODEL_SHA or _sha(binaries[0]) != runtime["exeSha256"]:
                raise ValueError("JREI_GPU_PILOT_ARTIFACT_HASH_MISMATCH")
            _VERIFIED.clear()
            _VERIFIED.add(signature)
    return ENDPOINT, MODEL_ID


def _api_key(private: Path) -> str:
    """Read one owner-private key; no key material appears in responses/logs."""
    path = private / "gpu-pilot-api-key.txt"
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 128:
        raise ValueError("JREI_GPU_PILOT_AUTH_KEY_NOT_STAGED")
    token = path.read_text(encoding="ascii").strip()
    if not re.fullmatch(r"[a-f0-9]{64}", token):
        raise ValueError("JREI_GPU_PILOT_AUTH_KEY_INVALID")
    return token


def _client():
    # No system proxy or redirect may intercept owner-private inference.
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, request, fp, code, msg, headers, newurl):
            raise ValueError("JREI_GPU_PILOT_REDIRECT_BLOCKED")
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())


def _exchange(url: str, private: Path, *, payload: dict | None = None,
              timeout: float = 5) -> dict:
    if url not in ("http://127.0.0.1:8082/v1/models", ENDPOINT):
        raise ValueError("JREI_GPU_PILOT_ENDPOINT_NOT_ALLOWED")
    key = _api_key(private)
    data = None if payload is None else json.dumps(
        payload, ensure_ascii=False).encode("utf-8")
    if data is not None and len(data) > 48000:
        raise ValueError("JREI_GPU_PILOT_REQUEST_TOO_LARGE")
    request = urllib.request.Request(url, data=data,
        method="POST" if data is not None else "GET",
        headers={"Authorization": "Bearer " + key, "Accept": "application/json",
                 **({"Content-Type": "application/json"} if data is not None else {})})
    with _client().open(request, timeout=timeout) as response:
        if response.status != 200 or not (response.headers.get("content-type") or "").lower().startswith("application/json"):
            raise ValueError("JREI_GPU_PILOT_RESPONSE_UNTRUSTED")
        raw = response.read(180001)
    if len(raw) > 180000:
        raise ValueError("JREI_GPU_PILOT_RESPONSE_TOO_LARGE")
    document = json.loads(raw)
    if not isinstance(document, dict):
        raise ValueError("JREI_GPU_PILOT_RESPONSE_SCHEMA")
    return document


def _secure_server_attested() -> None:
    """Fail closed until server really enforces key auth and restricted CORS.

    We send no inference or owner text in these probes.
    /v1/models is protected in the pinned llama.cpp b11932 server.
    """
    opener = _client()
    unauth = urllib.request.Request("http://127.0.0.1:8082/v1/models",
                                   method="GET", headers={"Accept": "application/json"})
    try:
        with opener.open(unauth, timeout=3):
            raise ValueError("JREI_GPU_PILOT_SERVER_ALLOWS_UNAUTHENTICATED_API")
    except urllib.error.HTTPError as error:
        if error.code != 401:
            raise ValueError("JREI_GPU_PILOT_AUTH_NOT_CONFIRMED") from None

    hostile_origin = "https://gpu-pilot-origin-check.invalid"
    cors = urllib.request.Request("http://127.0.0.1:8082/v1/models",
        method="OPTIONS", headers={"Origin": hostile_origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization"})
    with opener.open(cors, timeout=3) as response:
        allowed = (response.headers.get("Access-Control-Allow-Origin") or "").strip()
        creds = (response.headers.get("Access-Control-Allow-Credentials") or "").lower()
    if allowed in ("*", hostile_origin) or creds == "true":
        raise ValueError("JREI_GPU_PILOT_CORS_NOT_RESTRICTED")


def discover(private: Path) -> tuple[str, str]:
    endpoint, alias = _owner_gate(private)
    _secure_server_attested()
    data = _exchange("http://127.0.0.1:8082/v1/models", private, timeout=3)
    rows = data.get("data")
    if not isinstance(rows, list) or not any(
            isinstance(row, dict) and row.get("id") == alias for row in rows):
        raise RuntimeError("JREI_GPU_PILOT_SERVER_NOT_READY")
    return endpoint, alias


def complete(private: Path, messages: list[dict], *, max_tokens: int = 320,
             temperature: float = 0.2) -> dict:
    endpoint, alias = discover(private)
    if (not isinstance(messages, list) or not 1 <= len(messages) <= 15
            or not isinstance(max_tokens, int) or not 1 <= max_tokens <= 850
            or not 0 <= temperature <= 0.6):
        raise ValueError("JREI_GPU_PILOT_REQUEST_INVALID")
    for msg in messages:
        if (not isinstance(msg, dict) or msg.get("role") not in
                ("system", "user", "assistant")
                or not isinstance(msg.get("content"), str)
                or len(msg["content"]) > 3500):
            raise ValueError("JREI_GPU_PILOT_MESSAGES_INVALID")
    payload = {
        "model": alias, "messages": messages, "stream": False,
        "max_tokens": max_tokens, "temperature": temperature,
        "chat_template_kwargs": {"enable_thinking": False},
    }
    response = _exchange(endpoint, private, payload=payload, timeout=90)
    choices = response.get("choices")
    message = choices[0].get("message") if isinstance(choices, list) and choices and isinstance(choices[0], dict) else None
    answer = message.get("content") if isinstance(message, dict) else None
    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError("JREI_GPU_PILOT_EMPTY_DRAFT")
    usage = response.get("usage")
    return {
        "answer": answer.strip()[:12000], "model": "Qwen3-4B (third-party pilot)",
        "backend": "QWEN_GPU_PILOT_UNVERIFIED",
        "output_tokens": usage.get("completion_tokens") if isinstance(usage, dict) else None,
        "quality": "EXTERNAL_MODEL_DRAFT_NOT_FACT_VERIFIED",
        "model_weights_training": False,
    }


def snapshot(private: Path) -> dict:
    try:
        endpoint, alias = discover(private)
        return {"state": "PRIVATE_PILOT_RESPONDING", "model_alias": alias,
                "third_party_weights": True, "jrei_native_weights": False,
                "gpu_layer_offload_verified": False, "external_public_route": False}
    except (OSError, ValueError, RuntimeError, UnicodeError, KeyError,
            TypeError, urllib.error.URLError, json.JSONDecodeError):
        return {"state": "OFF_OR_UNAVAILABLE", "third_party_weights": True,
                "jrei_native_weights": False, "gpu_layer_offload_verified": False,
                "external_public_route": False}
