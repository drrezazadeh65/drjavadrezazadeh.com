"""JREI-owned local language backend; no hardwired Qwen, cloud or sidecar.

Config is owner-private, explicit and OFF if absent. We never discover legacy
Qwen endpoints, download weights, execute binaries or auto-switch a model.
Only an owner-selected non-Qwen local engine with an exact SHA256-verified
artifact may answer. Model responses are unverified drafts, not authority.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
import threading
import urllib.error
import urllib.request

SCHEMA = "jr.jrei.windows-language-engine.v1"
SHA = re.compile(r"^[a-f0-9]{64}$")
NAME = re.compile(r"^[A-Za-z0-9_.:/-]{2,120}$")
_LOCK = threading.RLock()
_VERIFIED = {}
LEGACY_PORTS = frozenset((8081, 8082))


def _file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _settings(private: Path) -> dict | None:
    path = private / "language-engine.json"
    if not path.exists():
        return None
    if path.is_symlink() or not path.is_file() or path.stat().st_size > 4096:
        raise ValueError("JREI_ENGINE_CONFIG_NOT_REGULAR")
    cfg = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(cfg, dict) or set(cfg) != {
        "schema", "engine_id", "family", "model_id", "endpoint",
        "model_file", "model_sha256", "rights_reviewed",
        "owner_approved", "enabled",
    } or cfg["schema"] != SCHEMA:
        raise ValueError("JREI_ENGINE_CONFIG_SCHEMA")
    if cfg["enabled"] is not True or cfg["owner_approved"] is not True:
        return None
    if cfg["rights_reviewed"] is not True:
        raise ValueError("JREI_ENGINE_RIGHTS_NOT_REVIEWED")
    for key in ("engine_id", "family", "model_id"):
        if not isinstance(cfg[key], str) or not NAME.fullmatch(cfg[key]):
            raise ValueError("JREI_ENGINE_ID_INVALID")
    # The owner requires a JREI-trained model, not another vendor's weights.
    # A local endpoint labelled JREI is not sufficient evidence of origin:
    # native family and a tied training provenance record are mandatory.
    if (cfg["family"] != "jrei-native" or
            not cfg["engine_id"].startswith("jrei-") or
            not cfg["model_id"].startswith("jrei-native-")):
        raise ValueError("JREI_THIRD_PARTY_MODEL_ROUTING_DISABLED")
    if not isinstance(cfg["endpoint"], str):
        raise ValueError("JREI_ENGINE_ENDPOINT_INVALID")
    from urllib.parse import urlsplit
    uri = urlsplit(cfg["endpoint"])
    if (uri.scheme != "http" or uri.hostname != "127.0.0.1"
            or uri.netloc != f"127.0.0.1:{uri.port}"
            or not uri.port or uri.port in LEGACY_PORTS
            or not 1024 <= uri.port <= 65535
            or uri.path != "/v1/chat/completions"
            or uri.query or uri.fragment or uri.username or uri.password):
        raise ValueError("JREI_ENGINE_LOCAL_ENDPOINT_REQUIRED")
    if not isinstance(cfg["model_sha256"], str) or not SHA.fullmatch(cfg["model_sha256"]):
        raise ValueError("JREI_ENGINE_MODEL_DIGEST_REQUIRED")
    if not isinstance(cfg["model_file"], str) or not cfg["model_file"]:
        raise ValueError("JREI_ENGINE_MODEL_FILE_REQUIRED")
    model = Path(cfg["model_file"])
    if not model.is_absolute() or model.is_symlink() or not model.is_file():
        raise ValueError("JREI_ENGINE_MODEL_FILE_UNAVAILABLE")
    # Only the private, owner-managed JREI model store is eligible.
    store = (private.parent / "models").resolve(strict=True)
    if not model.resolve(strict=True).is_relative_to(store):
        raise ValueError("JREI_ENGINE_MODEL_OUTSIDE_PRIVATE_STORE")
    st = model.stat()
    if st.st_size < 1024 or st.st_size > 2_199_023_255_552:
        raise ValueError("JREI_ENGINE_ARTIFACT_SIZE_INVALID")
    # Check the owner-private training provenance, not a name, logo, or
    # generic model server. Missing records always fail closed.
    provenance = model.with_name(model.name + ".jrei-provenance.json")
    if (provenance.is_symlink() or not provenance.is_file()
            or provenance.stat().st_size > 4096):
        raise ValueError("JREI_NATIVE_TRAINING_PROVENANCE_REQUIRED")
    proof = json.loads(provenance.read_text(encoding="utf-8"))
    if (not isinstance(proof, dict) or
            proof.get("schema") != "jr.jrei.trained-native-checkpoint.v1" or
            proof.get("weights_sha256") != cfg["model_sha256"] or
            proof.get("model_id") != cfg["model_id"] or
            proof.get("trained_from_scratch") is not True or
            proof.get("external_pretrained_weights_used") is not False or
            proof.get("owner_activation_approved") is not True or
            proof.get("integrated_evaluation_passed") is not True):
        raise ValueError("JREI_NATIVE_CHECKPOINT_NOT_APPROVED")
    signature = (str(model.resolve()), st.st_size, st.st_mtime_ns, cfg["model_sha256"])
    with _LOCK:
        if signature not in _VERIFIED:
            if _file_sha256(model) != cfg["model_sha256"]:
                raise ValueError("JREI_ENGINE_MODEL_SHA_MISMATCH")
            _VERIFIED.clear()
            _VERIFIED[signature] = True
    return cfg


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise ValueError("JREI_ENGINE_REDIRECT_REFUSED")


def _exchange(endpoint: str, *, body: bytes | None = None, timeout: float = 5):
    # An empty proxy map guarantees direct 127.0.0.1 only.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirect())
    request = urllib.request.Request(
        endpoint, data=body, method="POST" if body is not None else "GET",
        headers={"User-Agent": "JREI-Windows-Native/1",
                 "Accept": "application/json",
                 **({"Content-Type": "application/json"} if body is not None else {})},
    )
    with opener.open(request, timeout=timeout) as response:
        if response.status != 200:
            raise ValueError("JREI_ENGINE_NON_200")
        if not (response.headers.get("content-type") or "").lower().startswith("application/json"):
            raise ValueError("JREI_ENGINE_CONTENT_TYPE")
        if int(response.headers.get("content-length") or 0) > 180000:
            raise ValueError("JREI_ENGINE_RESPONSE_TOO_LARGE")
        raw = response.read(180001)
    if len(raw) > 180000:
        raise ValueError("JREI_ENGINE_RESPONSE_TOO_LARGE")
    data = json.loads(raw)
    if not isinstance(data, dict):
        raise ValueError("JREI_ENGINE_RESPONSE_SCHEMA")
    return data


def discover(private: Path) -> tuple[str | None, str | None]:
    """Find only the explicitly selected JREI model, never legacy endpoints."""
    cfg = _settings(private)
    if cfg is None:
        return None, None
    info = _exchange(cfg["endpoint"].removesuffix("/chat/completions") + "/models",
                     timeout=2.5)
    listed = info.get("data")
    if (not isinstance(listed, list)
            or cfg["model_id"] not in [m.get("id") for m in listed
                                     if isinstance(m, dict)]):
        return None, None
    return cfg["endpoint"], cfg["model_id"]


def complete(private: Path, messages: list[dict], *, max_tokens: int = 320,
             temperature: float = 0.6) -> dict:
    endpoint, model_id = discover(private)
    if not endpoint:
        raise RuntimeError("JREI_INDEPENDENT_MODEL_NOT_CONFIGURED")
    if (not isinstance(messages, list) or not 1 <= len(messages) <= 15
            or not isinstance(max_tokens, int) or not 1 <= max_tokens <= 2500):
        raise ValueError("JREI_ENGINE_CHAT_REQUEST_INVALID")
    data = _exchange(
        endpoint,
        body=json.dumps({"model": model_id, "messages": messages,
                         "temperature": temperature, "max_tokens": max_tokens,
                         "stream": False}, ensure_ascii=False).encode("utf-8"),
        timeout=115,
    )
    choices = data.get("choices")
    if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
        raise ValueError("JREI_ENGINE_CHOICES_INVALID")
    message = choices[0].get("message")
    answer = message.get("content") if isinstance(message, dict) else None
    if not isinstance(answer, str) or not answer.strip():
        raise RuntimeError("JREI_ENGINE_EMPTY_ANSWER")
    usage = data.get("usage")
    tokens = usage.get("completion_tokens") if isinstance(usage, dict) else None
    return {"answer": answer.strip()[:12000], "model": model_id,
            "backend": "JREI_LOCAL", "output_tokens": tokens,
            "quality": "MODEL_DRAFT_UNVERIFIED"}


def snapshot(private: Path) -> dict:
    """Never report a model as active merely because a config exists."""
    try:
        config = _settings(private)
        if config is None:
            return {"state": "NOT_CONFIGURED", "qwen_retired_from_routing": True,
                    "weights_training_started": False}
        endpoint, model = discover(private)
        return {"state": "LOCAL_MODEL_OBSERVED" if endpoint else "MODEL_OFFLINE",
                "engine_id": config["engine_id"], "family": config["family"],
                "model_id": model, "qwen_retired_from_routing": True,
                "weights_training_started": False,
                "bilingual_quality_independently_verified": False}
    except (OSError, ValueError, RuntimeError, UnicodeError,
            urllib.error.URLError, json.JSONDecodeError):
        return {"state": "INVALID_OR_UNAVAILABLE", "qwen_retired_from_routing": True,
                "weights_training_started": False}
