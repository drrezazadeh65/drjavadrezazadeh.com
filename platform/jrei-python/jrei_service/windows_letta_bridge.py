"""Optional Letta Code (Apache-2.0) local agent adapter for JREI Windows.

References: https://github.com/letta-ai/letta-code and
https://docs.letta.com/self-hosting/app-server/quickstart

This is an opt-in, loopback-only *client* of a separately installed local
Letta App Server, not a fork, silent installer or alternate owner dashboard.
The existing JREI Qwen, owner SQLite, approval gates and website remain primary.
Do NOT enable until the chosen Letta agent has been inspected for capabilities:
the Letta server may execute its own tools during a completion. This adapter does not claim to sandbox those tools, prove the selected
agent's underlying model is local, or train a language model. The owner
must attest separately that the Letta server's model backend is local;
a loopback server alone might still forward requests to a cloud provider.

Private prompts remain on the same PC; Letta Cloud agents MUST NOT be selected.
"""
from __future__ import annotations

import hashlib
import hmac
import http.client
import json
import os
from pathlib import Path
import re

_ENDPOINT = ("127.0.0.1", 4500)
_CONFIGURATION = "letta-bridge.json"
_AGENT = re.compile(r"^[A-Za-z0-9._:-]{3,160}$")
_CONVERSATION = re.compile(r"^[a-f0-9]{32}$")
_MAX_BYTES = 24_000
_MAX_PROMPT = 3800


def _path(private: Path) -> Path:
    if private.is_symlink():
        raise ValueError("JREI_LETTA_PRIVATE_DIRECTORY_LINK")
    return private / _CONFIGURATION


def state(private: Path) -> dict:
    """Fail closed on corrupt or missing local owner-controlled settings."""
    file = _path(private)
    if file.is_symlink() or not file.is_file() or file.stat().st_size > 3500:
        return {"enabled": False, "agent_id": None,
                "state": "DISABLED_NOT_CONFIGURED"}
    try:
        data = json.loads(file.read_text(encoding="utf-8"))
        if (not isinstance(data, dict) or
                set(data) != {"enabled", "agent_id", "local_tools_reviewed", "local_model_reviewed"} or
                not isinstance(data["enabled"], bool) or
                not isinstance(data["local_tools_reviewed"], bool) or
                not isinstance(data["local_model_reviewed"], bool) or
                not isinstance(data["agent_id"], str) or
                not _AGENT.fullmatch(data["agent_id"])):
            raise ValueError("INVALID_LOCAL_CONFIG")
        if data["enabled"] and not (
                data["local_tools_reviewed"] and data["local_model_reviewed"]):
            raise ValueError("LOCAL_TOOLS_NOT_REVIEWED")
        return {**data, "state": ("ENABLED_OWNER_ATTESTED"
                                  if data["enabled"] else "DISABLED")}
    except (UnicodeError, ValueError, OSError, TypeError):
        return {"enabled": False, "agent_id": None,
                "state": "INVALID_CONFIG_DISABLED"}


def configure(private: Path, *, enabled: bool, agent_id: str,
              local_tools_reviewed: bool, local_model_reviewed: bool,
              confirmed: bool) -> dict:
    """Invoked exclusively from existing token-authenticated local owner API.

    Confirmation is an owner attestation, *not* independent verification of
    provider behaviour or its tools. No automatic tool-capability inference.
    """
    if (confirmed is not True or not isinstance(enabled, bool)
            or not isinstance(local_tools_reviewed, bool)
            or not isinstance(local_model_reviewed, bool)
            or not isinstance(agent_id, str)
            or not _AGENT.fullmatch(agent_id)
            or (enabled and not (local_tools_reviewed and local_model_reviewed))):
        raise ValueError("JREI_LETTA_OWNER_CONFIGURATION_INVALID")
    dest = _path(private)
    private.mkdir(parents=True, exist_ok=True)
    if dest.is_symlink():
        raise ValueError("JREI_LETTA_CONFIGURATION_LINK")
    temporary = private / "letta-bridge.json.tmp"
    if temporary.is_symlink():
        raise ValueError("JREI_LETTA_CONFIGURATION_TEMP_LINK")
    payload = {"enabled": enabled, "agent_id": agent_id,
               "local_tools_reviewed": local_tools_reviewed,
               "local_model_reviewed": local_model_reviewed}
    with temporary.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False)
        handle.flush()
        os.fsync(handle.fileno())
    temporary.replace(dest)
    return {"state": "OWNER_OPTION_ENABLED" if enabled else "OWNER_OPTION_DISABLED",
            "agent_id": agent_id, "local_only": True,
            "letta_process_started": False,
            "production_changed": False}


def _request(method: str, endpoint: str, payload: dict | None = None,
             *, chat_key: str | None = None) -> dict:
    """Exact 127.0.0.1:4500 only. No proxy, DNS, redirects or external URL."""
    if method not in ("GET", "POST") or endpoint not in (
            "/v1/models", "/v1/chat/completions"):
        raise ValueError("JREI_LETTA_ENDPOINT_NOT_ALLOWED")
    connection = http.client.HTTPConnection(*_ENDPOINT, timeout=26)
    try:
        body = (json.dumps(payload, ensure_ascii=False,
                           separators=(",", ":")).encode("utf-8")
                if payload is not None else None)
        if body is not None and len(body) > 13_000:
            raise ValueError("JREI_LETTA_REQUEST_TOO_LARGE")
        headers = {"Accept": "application/json", "Connection": "close"}
        if body is not None:
            headers["Content-Type"] = "application/json"
        if chat_key is not None:
            headers["X-Letta-Chat-Key"] = chat_key
        # Local App Server may be configured with separate authentication.
        # Only an explicit process environment token is permitted: never
        # reuse the JREI owner-panel bearer token at another service.
        secret = os.environ.get("JREI_LETTA_LOCAL_TOKEN", "").strip()
        if secret:
            if len(secret) > 4096 or "\n" in secret or "\r" in secret:
                raise ValueError("JREI_LETTA_AUTH_TOKEN_INVALID")
            headers["Authorization"] = "Bearer " + secret
        connection.request(method, endpoint, body=body, headers=headers)
        response = connection.getresponse()
        if response.status != 200:
            raise ValueError("JREI_LETTA_LOCAL_SERVER_UNAVAILABLE")
        length = response.getheader("Content-Length")
        if length is not None and int(length) > _MAX_BYTES:
            raise ValueError("JREI_LETTA_RESPONSE_TOO_LARGE")
        if "application/json" not in response.getheader("Content-Type", ""):
            raise ValueError("JREI_LETTA_RESPONSE_NOT_JSON")
        raw = response.read(_MAX_BYTES + 1)
        if len(raw) > _MAX_BYTES:
            raise ValueError("JREI_LETTA_RESPONSE_TOO_LARGE")
        value = json.loads(raw)
        if not isinstance(value, dict):
            raise ValueError("JREI_LETTA_RESPONSE_NOT_OBJECT")
        return value
    finally:
        connection.close()


def available_agents() -> dict:
    """List locally served Letta agents; does not touch owner chat history."""
    data = _request("GET", "/v1/models")
    values = data.get("data", [])
    if not isinstance(values, list):
        raise ValueError("JREI_LETTA_AGENTS_SCHEMA_INVALID")
    agents = []
    for item in values[:50]:
        if isinstance(item, dict) and isinstance(item.get("id"), str):
            identifier = item["id"]
            if _AGENT.fullmatch(identifier):
                agents.append({"id": identifier})
    return {"agents": agents, "endpoint": "127.0.0.1:4500",
            "local_only": True}


def local_reply(private: Path, *, conversation_id: str,
                prompt: str) -> dict | None:
    """Route a consensual ordinary chat to a specifically selected local agent.

    Returns None if disabled, so existing Qwen is unchanged. A Letta agent
    may autonomously use capabilities configured on its own server; never
    misrepresent this as enforcing tool restrictions.
    """
    config = state(private)
    if not config.get("enabled"):
        return None
    if not _CONVERSATION.fullmatch(conversation_id) or             not isinstance(prompt, str) or not 1 <= len(prompt) <= _MAX_PROMPT:
        raise ValueError("JREI_LETTA_CHAT_REQUEST_INVALID")
    owner_token = (private / "owner-token").read_bytes()
    if len(owner_token) < 32:
        raise ValueError("JREI_LETTA_CONVERSATION_KEY_UNAVAILABLE")
    key = hmac.new(owner_token, conversation_id.encode("ascii"),
                   hashlib.sha256).hexdigest()
    result = _request("POST", "/v1/chat/completions", {
        "model": config["agent_id"],
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "temperature": 0.25,
        "max_tokens": 650,
    }, chat_key=key)
    choices = result.get("choices")
    if not isinstance(choices, list) or not choices or             not isinstance(choices[0], dict):
        raise ValueError("JREI_LETTA_COMPLETION_SCHEMA_INVALID")
    message = choices[0].get("message")
    if not isinstance(message, dict) or             not isinstance(message.get("content"), str):
        raise ValueError("JREI_LETTA_COMPLETION_CONTENT_INVALID")
    answer = message["content"].strip()
    if not answer or len(answer) > 8000:
        raise ValueError("JREI_LETTA_COMPLETION_LENGTH_INVALID")
    return {"answer": answer, "quality": "UNVERIFIED_LETTA_LOCAL",
            "local_agent_id": config["agent_id"],
            "weights_updated": False}
