"""24/7-capable opt-in JREI local self-coding worker.

Consumes ONLY owner-authorized, source-pinned task manifests and stages
bilingual local Qwen patch proposals. Every proposal is deduplicated in
durable SQLite, has source/evidence/policy hashes, and is NEVER applied,
committed, tested or deployed by this process. Independent code review and
the canonical GitHub/production release gates remain external authorities.

There is no daily task quota and no restricted operating window. Idle or
resource-pressured devices back off; the Tehran 02-05 window only raises
priority of approved heavier jobs. Run with an OS supervisor AFTER the
separate owner activation and worker integration checks are complete.
"""
from __future__ import annotations

import hashlib
import base64
import json
import os
from pathlib import Path, PurePosixPath
import re
import signal
import sqlite3
import threading
import time
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import Field, model_validator
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from typing import Literal

from jrei_core.contracts import Digest, Identifier, StrictContract, Unit
from jrei_orchestrator.standing_discovery import discover_candidates
from jrei_orchestrator.sandbox_patch import SandboxPatchRequest, materialize_preview
from jrei_core.local_model_draft import (
    LocalDraftRequest, LocalModelUnavailable, create_local_owner_draft,
)

_ENABLE_ENV = "JREI_CONTINUOUS_AUTOCODE_ENABLED"
_TASKS_MAX = 60
_SOURCE_LIMIT = 24576
_SENSITIVE = re.compile(
    r"(?i)(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|"
    r"\b(?:api[_-]?key|secret|password|private[_-]?key)\b\s*[:=]\s*"
    r"\S{8,}|authorization\s*:\s*bearer\s+\S+|"
    r"bearer\s+[a-z0-9._-]{16,})"
)
_SCOPE_PREFIXES = (
    "platform/jrei-python/jrei_learning/",
    "platform/jrei-python/jrei_orchestrator/",
    "assets/css/",
)
_EXIT = threading.Event()


class ContinuousCodingTask(StrictContract):
    task_id: Identifier
    path: str = Field(min_length=12, max_length=180)
    source_sha256: Digest
    owner_scope_digest: Digest
    evidence_sha256: Digest
    goal: str = Field(min_length=12, max_length=320)
    language: Literal["fa", "en"] = "en"
    priority: Unit = 0.5
    requires_heavy_window_priority: bool = False
    owner_authorized: bool = False
    expires_at: int = Field(ge=1)

    @model_validator(mode="after")
    def constrain_target(self) -> "ContinuousCodingTask":
        value = self.path
        parsed = PurePosixPath(value)
        if (not value.startswith(_SCOPE_PREFIXES) or parsed.is_absolute() or
            parsed.as_posix() != value or "\\" in value or
            any(p in (".", "..", "") for p in value.split("/")) or
            parsed.suffix not in (".py", ".css") or
            _SENSITIVE.search(value) or _SENSITIVE.search(self.goal)):
            raise ValueError("UNAUTHORIZED_AUTOCODE_SOURCE_OR_GOAL")
        return self


class SignedCodingEnvelope(StrictContract):
    schema_version: Literal["jr.jrei.continuous-autocode-envelope.v1"] = (
        "jr.jrei.continuous-autocode-envelope.v1"
    )
    issued_at: int = Field(ge=1)
    expires_at: int | None = Field(default=None, ge=1)
    manifest: dict
    signature_b64: str = Field(min_length=86, max_length=90)


class ContinuousCodingManifest(StrictContract):
    schema_version: Literal["jr.jrei.continuous-autocode-manifest.v1"] = (
        "jr.jrei.continuous-autocode-manifest.v1"
    )
    policy_digest: Digest
    owner_approved: bool = False
    emergency_stop: bool = True
    # One standing approval enables discovery without owner confirmation
    # for every individual source-gap proposal. Production stays separate.
    autonomous_source_discovery_enabled: bool = False
    per_pass_source_scan: int = Field(default=80, ge=1, le=400)
    tasks: list[ContinuousCodingTask] = Field(max_length=_TASKS_MAX)

    @model_validator(mode="after")
    def unique_scope(self) -> "ContinuousCodingManifest":
        if len({t.task_id for t in self.tasks}) != len(self.tasks):
            raise ValueError("DUPLICATE_AUTOCODE_TASK")
        if any(t.owner_scope_digest != self.policy_digest for t in self.tasks):
            raise ValueError("AUTOCODE_POLICY_SCOPE_MISMATCH")
        return self


def _signed_manifest(raw: bytes) -> ContinuousCodingManifest:
    envelope = SignedCodingEnvelope.model_validate_json(raw)
    now = int(time.time())
    if (envelope.issued_at > now + 60 or
        (envelope.expires_at is not None and envelope.expires_at <= now) or
        (envelope.expires_at is not None and
         envelope.expires_at < envelope.issued_at)):
        raise ValueError("AUTOCODE_OWNER_GRANT_EXPIRED_OR_FUTURE")
    encoded_key = os.environ.get("JREI_AUTOCODE_OWNER_PUBLIC_KEY_B64", "")
    try:
        public_key = base64.b64decode(encoded_key, validate=True)
        signature = base64.b64decode(envelope.signature_b64, validate=True)
        if len(public_key) != 32 or len(signature) != 64:
            raise ValueError("AUTOCODE_OWNER_SIGNATURE_FORMAT_INVALID")
        canonical = json.dumps([
            envelope.schema_version, envelope.issued_at, envelope.expires_at,
            envelope.manifest,
        ], sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        message = b"JREI-AUTOCODE-OWNER-GRANT-V1\\n" + canonical.encode("utf-8")
        Ed25519PublicKey.from_public_bytes(public_key).verify(signature, message)
    except (InvalidSignature, ValueError, TypeError) as exc:
        raise ValueError("AUTOCODE_OWNER_SIGNATURE_INVALID") from exc
    return ContinuousCodingManifest.model_validate(envelope.manifest)


def _open_private_db(root: Path) -> sqlite3.Connection:
    root.mkdir(parents=True, exist_ok=True)
    file = root / "jrei-autocode-queue.sqlite3"
    if file.is_symlink():
        raise RuntimeError("AUTOCODE_DB_SYMLINK_DENIED")
    conn = sqlite3.connect(str(file), timeout=4)
    conn.execute("PRAGMA busy_timeout=4000")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=FULL")
    conn.execute(
        "CREATE TABLE IF NOT EXISTS source_proposals ("
        " proposal_key TEXT PRIMARY KEY, task_id TEXT NOT NULL,"
        " policy_digest TEXT NOT NULL, source_sha256 TEXT NOT NULL,"
        " evidence_sha256 TEXT NOT NULL, response_sha256 TEXT NOT NULL,"
        " model_name TEXT NOT NULL, proposal_path TEXT NOT NULL,"
        " recorded_at INTEGER NOT NULL, status TEXT NOT NULL"
        " CHECK(status='STAGED_UNVERIFIED'))"
    )
    conn.commit()
    return conn


def _task_key(task: ContinuousCodingTask) -> str:
    canonical = json.dumps([
        "jr.jrei.autocode-task.v1", task.task_id, task.path,
        task.source_sha256, task.owner_scope_digest,
        task.evidence_sha256, task.goal, task.language
    ], ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _source_slice(repo: Path, task: ContinuousCodingTask) -> str:
    real_repo = repo.resolve(strict=True)
    source = repo.joinpath(*PurePosixPath(task.path).parts)
    # Symlinks are never followed even if their final target is in repo.
    if any(p.is_symlink() for p in (source, *source.parents) if p != repo):
        raise ValueError("AUTOCODE_SYMLINK_SOURCE_DENIED")
    real_source = source.resolve(strict=True)
    if not real_source.is_relative_to(real_repo) or not real_source.is_file():
        raise ValueError("AUTOCODE_SOURCE_OUTSIDE_REPOSITORY")
    if real_source.stat().st_size > _SOURCE_LIMIT:
        raise ValueError("AUTOCODE_SOURCE_TOO_LARGE")
    raw = real_source.read_bytes()
    if hashlib.sha256(raw).hexdigest() != task.source_sha256:
        raise ValueError("AUTOCODE_SOURCE_VERSION_CHANGED")
    code = raw.decode("utf-8")
    if _SENSITIVE.search(code):
        raise ValueError("AUTOCODE_SOURCE_MAY_CONTAIN_CREDENTIALS")
    # Show the model the actual defect marker, not just a license/header.
    # The excerpt is bounded to the original local-model input contract and
    # is still untrusted source data, never an instruction to run a tool.
    match = re.search(
        r"(?im)^.{0,150}(?:TODO|FIXME|NotImplementedError|"
        r"\b(?:not implemented|needs review|regression|deprecated)\b).{0,150}$",
        code,
    )
    pivot = match.start() if match else 0
    begin = max(0, pivot - 100)
    if begin:
        eol = code.find("\n", begin, pivot)
        if eol >= 0:
            begin = eol + 1
    excerpt = code[begin:begin + 430]
    if _SENSITIVE.search(excerpt):
        raise ValueError("AUTOCODE_EXCERPT_MAY_CONTAIN_CREDENTIALS")
    return excerpt


def _maybe_build_sandbox_preview(
    repo: Path, workspace: Path, manifest: ContinuousCodingManifest,
    task: ContinuousCodingTask, output: str,
) -> dict | None:
    """Try an isolated source copy; never execute arbitrary model output."""
    try:
        suggestion = json.loads(output)
        if not isinstance(suggestion, dict) or set(suggestion) != {
            "original_fragment", "replacement_fragment"
        }:
            return None
        patch = SandboxPatchRequest(
            proposal_id=task.task_id,
            owner_policy_digest=manifest.policy_digest,
            target_path=task.path,
            original_sha256=task.source_sha256,
            evidence_sha256=task.evidence_sha256,
            original_fragment=suggestion["original_fragment"],
            replacement_fragment=suggestion["replacement_fragment"],
        )
        result = materialize_preview(
            repo, workspace / "sandbox-previews", patch,
        )
        return result.model_dump(mode="json")
    except (ValueError, TypeError, KeyError, OSError, RuntimeError):
        # A Qwen proposal may be prose, invalid JSON, an ambiguous edit or an
        # unsafe diff. Retain the draft for review without pretending a
        # patch was materialized or that a test succeeded.
        return None


def _tehran_heavy_window() -> bool:
    now = datetime.now(timezone.utc)
    try:
        hour = now.astimezone(ZoneInfo("Asia/Tehran")).hour
    except ZoneInfoNotFoundError:
        hour = now.astimezone(timezone(timedelta(hours=3, minutes=30))).hour
    return 2 <= hour < 5


def _headroom() -> bool:
    """Require measured idle CPU and free RAM, without a new pip dependency."""
    try:
        import psutil  # type: ignore[import-not-found]
        sample = psutil.cpu_percent(interval=0.15)
        available = psutil.virtual_memory().available
        return sample < 72.0 and available >= 1_073_741_824
    except (ImportError, OSError, AttributeError):
        pass

    if os.name == "nt":
        # Standard-library Windows performance and memory APIs; do not
        # assume an optional offline psutil wheel was installed on Node A.
        import ctypes
        from ctypes import wintypes

        class MemoryStatus(ctypes.Structure):
            _fields_ = [
                ("length", wintypes.DWORD), ("memory_load", wintypes.DWORD),
                ("total_phys", ctypes.c_ulonglong),
                ("avail_phys", ctypes.c_ulonglong),
                ("total_page", ctypes.c_ulonglong),
                ("avail_page", ctypes.c_ulonglong),
                ("total_virtual", ctypes.c_ulonglong),
                ("avail_virtual", ctypes.c_ulonglong),
                ("avail_extended_virtual", ctypes.c_ulonglong),
            ]

        def ticks(v: wintypes.FILETIME) -> int:
            return (v.dwHighDateTime << 32) | v.dwLowDateTime

        def cpu_snapshot() -> tuple[int, int, int] | None:
            idle, kernel, user = (wintypes.FILETIME() for _ in range(3))
            if not ctypes.windll.kernel32.GetSystemTimes(
                ctypes.byref(idle), ctypes.byref(kernel), ctypes.byref(user)
            ):
                return None
            return ticks(idle), ticks(kernel), ticks(user)

        mem = MemoryStatus()
        mem.length = ctypes.sizeof(MemoryStatus)
        if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(mem)):
            return False
        if mem.avail_phys < 1_073_741_824:
            return False
        first = cpu_snapshot()
        time.sleep(0.15)
        second = cpu_snapshot()
        if first is None or second is None:
            return False
        idle = second[0] - first[0]
        total = second[1] - first[1] + second[2] - first[2]
        return total > 0 and 0 <= idle <= total and (1 - idle / total) < 0.72

    # Linux CI or dedicated machines: fail closed without valid host metrics.
    if os.name == "posix":
        try:
            with open("/proc/meminfo", encoding="ascii") as handle:
                line = next(
                    s for s in handle if s.startswith("MemAvailable:")
                )
            available = int(line.split()[1]) * 1024
            cpu_load = os.getloadavg()[0] / max(1, os.cpu_count() or 1)
            return available >= 1_073_741_824 and cpu_load < 0.72
        except (OSError, ValueError, StopIteration):
            return False
    return False


def stage_one(
    repo: Path, workspace: Path, conn: sqlite3.Connection,
    manifest: ContinuousCodingManifest
) -> str:
    """Plan and stage a single reviewable patch suggestion; no source edits."""
    if os.environ.get(_ENABLE_ENV) != "1":
        return "DISABLED"
    if not manifest.owner_approved or manifest.emergency_stop:
        return "OWNER_STOP"
    if not _headroom():
        return "RESOURCE_BACKPRESSURE"
    heavy = _tehran_heavy_window()
    discovered = []
    if manifest.autonomous_source_discovery_enabled:
        discovered = [
            ContinuousCodingTask.model_validate(record)
            for record in discover_candidates(
                repo, manifest.policy_digest,
                max_files_per_pass=manifest.per_pass_source_scan,
            )
        ]
    # Explicitly owner-pinned jobs take priority over autonomous discovery,
    # while finite per-pass scanning applies backpressure without daily caps.
    tasks = sorted(
        [*manifest.tasks, *discovered],
        key=lambda t: (-t.priority * (1.2 if heavy and
                         t.requires_heavy_window_priority else 1.0), t.task_id),
    )
    for task in tasks:
        if not task.owner_authorized or task.expires_at <= int(time.time()):
            continue
        key = _task_key(task)
        if conn.execute(
            "SELECT 1 FROM source_proposals WHERE proposal_key=?", (key,)
        ).fetchone():
            continue
        # Recover an artifact after power loss between atomic rename and
        # SQLite commit. Never regenerate an already written suggestion.
        existing = workspace / "proposals" / (key + ".json")
        if existing.is_symlink():
            raise RuntimeError("AUTOCODE_STAGED_SYMLINK_DENIED")
        if existing.exists():
            if existing.stat().st_size > 12000:
                raise RuntimeError("AUTOCODE_STAGED_RECEIPT_OVERSIZED")
            prior = json.loads(existing.read_text(encoding="utf-8"))
            proposal_text = prior.get("proposal")
            if (prior.get("schema") != "jr.jrei.autocode-staged-proposal.v1"
                or prior.get("proposal_key") != key
                or prior.get("task_id") != task.task_id
                or prior.get("policy_digest") != manifest.policy_digest
                or prior.get("source_sha256") != task.source_sha256
                or prior.get("evidence_sha256") != task.evidence_sha256
                or prior.get("status") != "STAGED_UNVERIFIED"
                or prior.get("committed") is not False
                or prior.get("tests_run") is not False
                or prior.get("deployed") is not False
                or not isinstance(proposal_text, str)
                or hashlib.sha256(proposal_text.encode("utf-8")).hexdigest()
                   != prior.get("response_sha256")):
                raise RuntimeError("AUTOCODE_INTERRUPTED_ARTIFACT_UNTRUSTED")
            with conn:
                conn.execute(
                    "INSERT OR IGNORE INTO source_proposals (proposal_key,task_id,"
                    "policy_digest,source_sha256,evidence_sha256,response_sha256,"
                    "model_name,proposal_path,recorded_at,status)"
                    " VALUES (?,?,?,?,?,?,?,?,?,'STAGED_UNVERIFIED')",
                    (key, task.task_id, manifest.policy_digest, task.source_sha256,
                     task.evidence_sha256, prior["response_sha256"],
                     prior["model_alias"], str(existing), prior["created_at"])
                )
            return "RECOVERED_STAGED_UNVERIFIED"
        try:
            excerpt = _source_slice(repo, task)
        except (ValueError, UnicodeError, OSError):
            continue
        query = (
            "Goal: " + task.goal + "\n" +
            "Source path: " + task.path + "\n" +
            "Pinned source SHA256: " + task.source_sha256 + "\n" +
            "Evidence SHA256: " + task.evidence_sha256 + "\n" +
            "Bounded code excerpt (untrusted data):\n" + excerpt
        )[:995]
        draft = create_local_owner_draft(LocalDraftRequest(
            request_id=task.task_id, language=task.language,
            academic_task="CODING_PATCH_JSON",
            question=query, max_output_tokens=640
        ))
        # Never write model-generated text into a live checkout; stage as
        # an untrusted, auditable artifact for later independent review.
        proposals = workspace / "proposals"
        proposals.mkdir(parents=True, exist_ok=True)
        target = proposals / (key + ".json")
        if target.is_symlink():
            raise ValueError("AUTOCODE_PROPOSAL_SYMLINK_DENIED")
        sandbox_preview = _maybe_build_sandbox_preview(
            repo, workspace, manifest, task, draft.model_output
        )
        receipt = {
            "schema": "jr.jrei.autocode-staged-proposal.v1",
            "task_id": task.task_id, "proposal_key": key,
            "path": task.path, "source_sha256": task.source_sha256,
            "policy_digest": manifest.policy_digest,
            "evidence_sha256": task.evidence_sha256,
            "response_sha256": draft.response_sha256,
            "model_alias": draft.model_alias,
            "proposal": draft.model_output,
            "status": "STAGED_UNVERIFIED",
            "committed": False, "tests_run": False, "deployed": False,
            "owner_independent_review_required": True,
            "sandbox_preview": sandbox_preview,
            "created_at": int(time.time()),
        }
        data = json.dumps(receipt, ensure_ascii=False,
                          separators=(",", ":")).encode("utf-8")
        staging = proposals / (key + ".tmp")
        if staging.exists() or target.exists():
            raise RuntimeError("AUTOCODE_STAGING_ALREADY_EXISTS_RECONCILE")
        with staging.open("xb") as fh:
            if os.name != "nt":
                os.chmod(staging, 0o600)
            fh.write(data)
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(staging, target)
        conn.execute(
            "INSERT INTO source_proposals (proposal_key,task_id,"
            "policy_digest,source_sha256,evidence_sha256,response_sha256,"
            "model_name,proposal_path,recorded_at,status)"
            " VALUES (?,?,?,?,?,?,?,?,?,'STAGED_UNVERIFIED')",
            (key, task.task_id, manifest.policy_digest, task.source_sha256,
             task.evidence_sha256, draft.response_sha256, draft.model_alias,
             str(target), receipt["created_at"]),
        )
        conn.commit()
        return "STAGED_UNVERIFIED"
    return "NO_ELIGIBLE_NEW_WORK"


def run_forever(repo: Path, workspace: Path, manifest_path: Path) -> None:
    """Persistent foreground supervisor: no hidden service installation."""
    if os.environ.get(_ENABLE_ENV) != "1":
        raise RuntimeError("AUTOCODE_OWNER_ACTIVATION_REQUIRED")
    if manifest_path.is_symlink() or workspace.is_symlink():
        raise RuntimeError("AUTOCODE_CONFIGURATION_SYMLINK_DENIED")
    source_root=repo.resolve(strict=True)
    workspace.mkdir(parents=True, exist_ok=True, mode=0o700)
    isolated=workspace.resolve(strict=True)
    if (isolated==source_root or isolated.is_relative_to(source_root)
        or source_root.is_relative_to(isolated)):
        raise RuntimeError("AUTOCODE_WORKSPACE_MUST_BE_ISOLATED_FROM_SOURCE")
    if manifest_path.resolve(strict=True).is_relative_to(source_root):
        raise RuntimeError("AUTOCODE_OWNER_MANIFEST_MUST_NOT_BE_IN_PUBLIC_SOURCE")
    signal.signal(signal.SIGINT, lambda *_: _EXIT.set())
    signal.signal(signal.SIGTERM, lambda *_: _EXIT.set())
    conn = _open_private_db(workspace)
    try:
        while not _EXIT.is_set():
            delay = 45.0
            try:
                raw = manifest_path.read_bytes()
                if len(raw) > 100_000:
                    raise ValueError("AUTOCODE_MANIFEST_TOO_LARGE")
                manifest = _signed_manifest(raw)
                status = stage_one(repo, workspace, conn, manifest)
                if status in ("STAGED_UNVERIFIED", "RECOVERED_STAGED_UNVERIFIED"):
                    delay = 12.0
                elif status in ("RESOURCE_BACKPRESSURE", "OWNER_STOP"):
                    delay = 120.0
            except (ValueError, OSError, RuntimeError, LocalModelUnavailable,
                    sqlite3.Error):
                # No invented success or tight retry loop after failed writes.
                delay = 180.0
            _EXIT.wait(delay)
    finally:
        conn.close()


if __name__ == "__main__":
    root = os.environ.get("JREI_AUTOCODE_CANONICAL_REPO")
    state = os.environ.get("JREI_AUTOCODE_PRIVATE_WORKSPACE")
    jobs = os.environ.get("JREI_AUTOCODE_OWNER_MANIFEST")
    if not (root and state and jobs):
        raise SystemExit("AUTOCODE_PRIVATE_PATHS_NOT_CONFIGURED")
    run_forever(Path(root), Path(state), Path(jobs))
