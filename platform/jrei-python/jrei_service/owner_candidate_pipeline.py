"""Private JREI source-pinned self-development candidate stage.

This component accepts an untrusted MODEL-DRAFTED JSON replacement and builds
a syntax-checked, content-hashed isolated candidate. It NEVER edits the
canonical checkout, creates Git commits, trains weights, migrates MySQL,
executes the generated candidate, or treats syntax as functional validation.
"""
from __future__ import annotations

import ast
from hashlib import sha256
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import time
import uuid

from jrei_service.windows_python_code_review import inspect_change

SUPPORTED = (".py", ".mjs", ".js", ".css", ".html", ".php")
# HTML/CSS/PHP remain LOCAL DRAFT ONLY until separate language-specific
# review/acceptance; no execution, syntax-validation assertion or deployment.
ALLOWED = (
    "platform/jrei-v5/",
    "platform/news-intelligence/",
    "platform/jrei-python/jrei_learning/",
    "platform/jrei-python/jrei_orchestrator/",
    # Additional JREI-native sources are available as ISOLATED DRAFT targets.
    # This never authorizes a live service edit or an automatic GitHub push.
    "platform/jrei-python/jrei_service/windows_native_",
    "platform/jrei-python/jrei_service/windows_resource_",
    "platform/jrei-python/jrei_service/windows_open_source_",
    "platform/jrei-python/jrei_service/windows_oss_",
    "platform/jrei-python/jrei_service/windows_self_development.py",
    "platform/jrei-python/jrei_service/windows_workspace.py",
    "platform/jrei-python/jrei_service/windows_code_experience.py",
    "platform/jrei-python/jrei_service/windows_evidence_memory.py",
    "assets/css/",
)
SENSITIVE = re.compile(
    r"(?i)(-----BEGIN .*PRIVATE KEY|authorization\s*:\s*bearer|"
    r"\b(?:api[_-]?key|password|secret|private[_-]?key)\s*[:=]\s*\S{6,})"
)


def sha(data: bytes) -> str:
    return sha256(data).hexdigest()


def safe_path(path: str) -> PurePosixPath:
    if not isinstance(path, str) or len(path) > 180 or \
       not path.startswith(ALLOWED) or "\\" in path:
        raise ValueError("JREI_CANDIDATE_PATH_OUT_OF_SCOPE")
    parsed = PurePosixPath(path)
    if parsed.is_absolute() or parsed.as_posix() != path or \
       any(x in ("", ".", "..") for x in path.split("/")) or \
       parsed.suffix not in SUPPORTED:
        raise ValueError("JREI_CANDIDATE_PATH_OUT_OF_SCOPE")
    return parsed


def parse_response(reply: str) -> tuple[str, str]:
    if not isinstance(reply, str) or len(reply) > 12000:
        raise ValueError("JREI_CANDIDATE_JSON_LENGTH")
    try:
        data = json.loads(reply.strip())
    except json.JSONDecodeError as exc:
        raise ValueError("JREI_CANDIDATE_JSON_NOT_PARSEABLE") from exc
    if not isinstance(data, dict) or set(data) != {"original_fragment", "replacement_fragment"}:
        raise ValueError("JREI_CANDIDATE_JSON_SHAPE")
    old = data["original_fragment"]
    new = data["replacement_fragment"]
    if not isinstance(old, str) or not isinstance(new, str) or \
       not (12 <= len(old) <= 2800) or not (12 <= len(new) <= 3800):
        raise ValueError("JREI_CANDIDATE_FRAGMENT_LENGTH")
    if old == new or SENSITIVE.search(old) or SENSITIVE.search(new):
        raise ValueError("JREI_CANDIDATE_NOOP_OR_SECRET")
    return old, new


def stage_candidate(*, repo: Path, sandbox: Path, target: str,
                    reply: str, expected_sha256: str) -> dict:
    """Stage and syntax-check a candidate in disjoint owner-private storage.

    expected_sha256 must be computed from the same source BEFORE inference.
    All returned states are explicitly NON-PRODUCTION and NON-VERIFIED.
    """
    name = safe_path(target)
    source_root = repo.resolve(strict=True)
    absolute = repo.joinpath(*name.parts)
    if absolute.is_symlink() or not absolute.is_file() or \
       any(p.is_symlink() for p in absolute.parents if p != source_root):
        raise ValueError("JREI_CANDIDATE_SOURCE_INVALID")
    if absolute.stat().st_size > 26000:
        raise ValueError("JREI_CANDIDATE_SOURCE_TOO_LARGE")
    before = absolute.read_bytes()
    if sha(before) != expected_sha256:
        raise ValueError("JREI_CANDIDATE_SOURCE_CHANGED")
    source_text = before.decode("utf-8")
    old, new = parse_response(reply)
    if source_text.count(old) != 1 or old not in source_text[:5000]:
        raise ValueError("JREI_CANDIDATE_FRAGMENT_NOT_SOURCE_ANCHORED")
    candidate = source_text.replace(old, new, 1)
    candidate_bytes = candidate.encode("utf-8")
    if len(candidate_bytes) > 32000 or abs(len(candidate_bytes) - len(before)) > 1800:
        raise ValueError("JREI_CANDIDATE_DELTA_BUDGET")
    # Build a fresh candidate directory, wholly outside the live repo.
    private_root = sandbox.resolve()
    if private_root == source_root or private_root.is_relative_to(source_root) or \
       source_root.is_relative_to(private_root):
        raise ValueError("JREI_CANDIDATE_SANDBOX_NOT_ISOLATED")
    private_root.mkdir(parents=True, exist_ok=True, mode=0o700)
    candidate_id = str(int(time.time())) + "-" + uuid.uuid4().hex[:12]
    folder = private_root / candidate_id
    folder.mkdir(mode=0o700)
    target_file = folder / ("candidate" + name.suffix)
    target_file.write_bytes(candidate_bytes)
    syntactic = "NOT_AVAILABLE"
    impact = None
    if name.suffix == ".py":
        try:
            ast.parse(candidate, filename=target, mode="exec")
        except SyntaxError:
            syntactic = "FAILED"
        else:
            syntactic = "PASS"
            # No execution or tests: detect changed public APIs, imports,
            # and module-import-time calls before any owner review.
            try:
                impact = inspect_change(
                    target=target, before=source_text, after=candidate)
            except (ValueError, MemoryError):
                impact = {"state": "SOURCE_IMPACT_UNAVAILABLE",
                          "tests_run": False, "automatically_approved": False}
    elif name.suffix in (".js", ".mjs"):
        try:
            done = subprocess.run(
                ["node", "--check", str(target_file)], shell=False,
                cwd=folder, stdin=subprocess.DEVNULL, capture_output=True,
                timeout=15, creationflags=(0x08000000 if os.name == "nt" else 0),
            )
            syntactic = "PASS" if done.returncode == 0 else "FAILED"
        except (OSError, subprocess.TimeoutExpired):
            syntactic = "NOT_AVAILABLE"
    else:
        # CSS/HTML/PHP cannot be syntax-validated with node --check.
        # Do not invoke php, browsers, external tools or network here.
        syntactic = "NOT_AVAILABLE"
    receipt = {
        "schema": "jr.jrei.owner-isolated-candidate.v1",
        "candidate_id": candidate_id,
        "source_path": target,
        "source_sha256": sha(before),
        "candidate_sha256": sha(candidate_bytes),
        "model_reply_sha256": sha(reply.encode("utf-8")),
        "state": "SYNTAX_CHECKED_NOT_FUNCTIONALLY_VERIFIED" if syntactic == "PASS"
                 else "NOT_VALIDATED",
        "syntax": syntactic,
        "static_source_impact": impact,
        "source_impact_review_required": bool(
            impact is not None and
            impact.get("state") != "STATIC_STRUCTURE_OBSERVED_NOT_VERIFIED"),
        "functional_tests_run": False,
        "independent_scientific_review": False,
        "canonical_checkout_modified": False,
        "github_committed": False,
        "published_to_bertina": False,
        "learned_skill_accepted": False,
    }
    (folder / "receipt.json").write_text(
        json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return receipt
