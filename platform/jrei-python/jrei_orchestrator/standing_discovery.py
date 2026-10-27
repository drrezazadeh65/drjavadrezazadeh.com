"""Rotating, evidence-pinned self-development discovery under a standing owner grant.

No fixed daily learning/coding quota and no restricted operating hours.
Each pass is bounded for host responsiveness; rotation avoids permanently
starving paths beyond one scan. Source evidence is a local observation only:
not an independent quality review. No tools, network access or production IO.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import time
from typing import Iterable

_SCOPES = (
    ("platform/jrei-python/jrei_learning", ".py"),
    ("platform/jrei-python/jrei_orchestrator", ".py"),
    ("assets/css", ".css"),
)
_SIGNAL = re.compile(
    r"(?im)^.{0,150}(?:TODO|FIXME|NotImplementedError|"
    r"\b(?:not implemented|needs review|regression|deprecated)\b).{0,150}$"
)
_DENY = re.compile(
    r"(?i)(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|"
    r"\b(?:api[_-]?key|secret|password|private[_-]?key)\b\s*[:=]\s*"
    r"['\\"]?[^,\s'\\"]{8,}|authorization\s*:\s*bearer\s+\S+|"
    r"bearer\s+[a-z0-9._-]{16,})"
)
_MAX_FILE_BYTES = 24_576


def discover_candidates(
    repository: Path, policy_digest: str, *,
    max_files_per_pass: int = 80,
    discovered_at: int | None = None,
) -> list[dict]:
    """Find repo-local, source-hash-anchored, unprivileged learning questions.

    Returned dictionaries are suitable for owner-scoped proposal creation,
    not proof of correctness or permission to change any source file.
    """
    if not 1 <= max_files_per_pass <= 400:
        raise ValueError("AUTOCODE_PER_PASS_RESOURCE_BOUNDS_INVALID")
    real = repository.resolve(strict=True)
    now = int(time.time()) if discovered_at is None else discovered_at
    paths: list[tuple[str, Path]] = []
    for prefix, suffix in _SCOPES:
        directory = real.joinpath(*PurePosixPath(prefix).parts)
        if not directory.is_dir() or directory.is_symlink():
            continue
        for candidate in directory.rglob("*" + suffix):
            if candidate.is_symlink() or not candidate.is_file():
                continue
            relative = candidate.relative_to(real).as_posix()
            if not relative.startswith(prefix + "/"):
                continue
            # Skip archived dependencies, generated code, virtualenvs.
            if any(k in candidate.parts for k in (
                "__pycache__", ".venv", "vendor", "node_modules",
            )):
                continue
            paths.append((relative, candidate))
    paths.sort(key=lambda value: value[0])
    if not paths:
        return []
    # A different window each minute: work runs all day and every file can
    # eventually be reconsidered, even on a large future cluster.
    offset = (now // 60 * max_files_per_pass) % len(paths)
    window = (paths[offset:] + paths[:offset])[:max_files_per_pass]
    opportunities = []
    for relative, candidate in window:
        if candidate.stat().st_size > _MAX_FILE_BYTES:
            continue
        raw = candidate.read_bytes()
        if len(raw) > _MAX_FILE_BYTES:
            continue
        try:
            text = raw.decode("utf-8")
        except UnicodeError:
            continue
        signals = [m.group(0).strip() for m in _SIGNAL.finditer(text)]
        if not signals:
            continue
        if _DENY.search(text) or _DENY.search(relative):
            continue
        source_sha = hashlib.sha256(raw).hexdigest()
        signal_digest = hashlib.sha256(json.dumps(
            ["jr.jrei.source-observation.v1", relative, source_sha, signals[:8]],
            separators=(",", ":"), ensure_ascii=False,
        ).encode("utf-8")).hexdigest()
        opportunities.append({
            "task_id": "self.observe." + signal_digest[:24],
            "path": relative,
            "source_sha256": source_sha,
            "owner_scope_digest": policy_digest,
            "evidence_sha256": signal_digest,
            "goal": (
                "Analyze the observable local source review markers. "
                "Propose an isolated, reversible improvement for "
                "independent review; preserve compatibility and SEO."
            ),
            "language": "en",
            "priority": 0.50,
            "owner_authorized": True,
            "expires_at": now + 1800,
        })
    return opportunities
