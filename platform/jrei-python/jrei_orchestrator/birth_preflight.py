"""Read-only first-version JREI birth checks on the Windows host.

Run in the installed local Python environment. No Windows service changes,
database connections, task dispatch, model training, deployment, or secrets.
Never call a local process heartbeat a mother-DB/production launch receipt.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import sqlite3
import time
from urllib.error import HTTPError, URLError
from urllib.request import build_opener, HTTPRedirectHandler, ProxyHandler, Request


class _NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def _local_json(url: str, max_size: int = 4096) -> dict | None:
    # No caller-controlled URL, proxy, credentials or outbound connection.
    if url not in (
        "http://127.0.0.1:8091/internal/v1/health",
        "http://127.0.0.1:8081/v1/models",
    ):
        raise ValueError("JREI_BIRTH_EXTERNAL_TARGET_REFUSED")
    try:
        opener = build_opener(ProxyHandler({}), _NoRedirects())
        with opener.open(Request(url, headers={"Accept": "application/json"}),
                         timeout=2.5) as response:
            if response.status != 200:
                return None
            if not response.headers.get("Content-Type", "").lower().startswith(
                "application/json"
            ):
                return None
            raw = response.read(max_size + 1)
            if len(raw) > max_size:
                return None
            result = json.loads(raw)
            return result if isinstance(result, dict) else None
    except (HTTPError, URLError, OSError, TimeoutError, ValueError, TypeError):
        return None


def inspect_local_birth(repo: Path, workspace: Path | None,
                        signed_manifest: Path | None) -> dict:
    now = int(time.time())
    python = _local_json("http://127.0.0.1:8091/internal/v1/health")
    qwen = _local_json("http://127.0.0.1:8081/v1/models")
    python_responding = bool(
        python is not None
        and python.get("schema") == "jr.jrei.python-health.v1"
        and python.get("service_process") == "RESPONDING"
        and python.get("production_ready") is False
    )
    models = qwen.get("data") if qwen else None
    # This checks the local name only, never sufficient to attest quality,
    # model rights, training activity, or a signed remote server response.
    qwen_listed = bool(
        isinstance(models, list)
        and any(isinstance(x, dict) and
                x.get("id") == "jrei-qwen3-4b-q4km" for x in models)
    )
    signed = False
    standing_discovery = False
    if signed_manifest is not None and signed_manifest.is_file() and (
        not signed_manifest.is_symlink()
    ):
        try:
            from jrei_orchestrator.continuous_autocode import _signed_manifest
            raw = signed_manifest.read_bytes()
            if len(raw) <= 100_000:
                grant = _signed_manifest(raw)
                signed = grant.owner_approved and not grant.emergency_stop
                standing_discovery = signed and grant.autonomous_source_discovery_enabled
        except (ValueError, RuntimeError, OSError):
            pass
    proposals = None
    agent_recent = False
    agent_last_status = "NOT_OBSERVED"
    if workspace is not None and workspace.is_dir() and (
        not workspace.is_symlink()
    ):
        status_file = workspace / "jrei-autocode-status.json"
        if status_file.is_file() and not status_file.is_symlink():
            try:
                raw = status_file.read_bytes()
                if len(raw) <= 4096:
                    state = json.loads(raw)
                    if state.get("schema") == "jr.jrei.sandbox-autocode-status.v1":
                        agent_last_status = state.get("status", "UNKNOWN")
                        stamp = state.get("observed_at")
                        agent_recent = (type(stamp) is int and
                                        0 <= now - stamp <= 240)
                        count = state.get("staged_unverified_proposals")
                        if type(count) is int and count >= 0:
                            proposals = count
            except (OSError, ValueError, TypeError):
                pass
    source_present = (repo / "platform" / "jrei-python" /
                      "jrei_orchestrator" / "continuous_autocode.py").is_file()
    return {
        "schema": "jr.jrei.first-birth-local-preflight.v1",
        "observed_at": now,
        "source_checkout_present": source_present,
        "python_loopback_process_responding": python_responding,
        "qwen_loopback_alias_observed": qwen_listed,
        "owner_signed_standing_grant_verified": signed,
        "continuous_discovery_permitted": standing_discovery,
        "autocode_heartbeat_recent": agent_recent,
        "autocode_last_status": agent_last_status,
        "staged_unverified_proposals": proposals,
        "site_to_worker_to_mother_db_roundtrip_attested": False,
        "live_site_owner_chat_test_attested": False,
        "learning_quality_improvement_proven": False,
        "production_release_accepted": False,
        "status": (
            "LOCAL_RUNTIME_OBSERVED_PRODUCTION_UNVERIFIED"
            if python_responding and qwen_listed
            else "LOCAL_RUNTIME_INCOMPLETE_OR_UNAVAILABLE"
        ),
        "note": "This read-only local observation is not deployment evidence.",
    }


if __name__ == "__main__":
    r = os.environ.get("JREI_AUTOCODE_CANONICAL_REPO")
    w = os.environ.get("JREI_AUTOCODE_PRIVATE_WORKSPACE")
    m = os.environ.get("JREI_AUTOCODE_OWNER_MANIFEST")
    if not r:
        raise SystemExit("JREI_LOCAL_REPO_PATH_NOT_CONFIGURED")
    report = inspect_local_birth(
        Path(r), Path(w) if w else None, Path(m) if m else None
    )
    print(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2))
