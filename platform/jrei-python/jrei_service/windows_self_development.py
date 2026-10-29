"""Model-free, owner-local SELF-CODE inspection for the original JREI engine.

Read a bounded selection of JREI's own Python files, diagnose source-level
weaknesses, and optionally WRITE one mechanical edit to isolated owner-private
draft storage. This is actual draft file generation, not a trained coding
model, an independently validated improvement, or an automatically applied
update. No website content, external dependencies, remote commands, tests,
checkpoints, subprocesses, GitHub writes or production changes.
Existing per-PC missions.sqlite3 is the only receipt database.
"""
from __future__ import annotations

import ast
from contextlib import closing
import hashlib
import json
import re
from pathlib import Path
import sqlite3
import time

SCHEMA = "jr.jrei.self-code-study.v1"
# This is an INITIAL set of source paths, not a global cap on future
# research topics. Keep this mechanical reviewer focused on JREI itself.
TARGETS = (
    "platform/jrei-python/jrei_learning/strategy_optimizer.py",
    "platform/jrei-python/jrei_learning/method_feedback.py",
    "platform/jrei-python/jrei_learning/value_of_information.py",
    "platform/jrei-python/jrei_learning/metacognitive_cycle.py",
    "platform/jrei-python/jrei_service/windows_native_inference.py",
    "platform/jrei-python/jrei_service/windows_native_neural.py",
    "platform/jrei-python/jrei_service/windows_open_source_mission.py",
    "platform/jrei-python/jrei_service/windows_code_experience.py",
    "platform/jrei-python/jrei_service/windows_workspace.py",
    "platform/jrei-python/jrei_service/windows_learning_agenda.py",
)
# Large native JREI modules (including the 8092 controller) are studied
# without truncating their AST. Draft writing still has its own smaller
# independent file and delta ceilings.
MAX_SOURCE_BYTES = 320000
MAX_RECORDED_FINDINGS = 32
# One scan is bounded for responsiveness, but previously unseen modules can
# enter the next cycle. This is not a lifetime or daily research quota.
SOURCE_DIRS = (
    ("platform/jrei-python/jrei_core", (".py",)),
    ("platform/jrei-python/jrei_learning", (".py",)),
    ("platform/jrei-python/jrei_orchestrator", (".py",)),
    ("platform/jrei-python/jrei_service", (".py",)),
    ("platform/jrei-v5", (".js", ".mjs", ".ts", ".py")),
)
# Some vendored open-source code is already in the repository. Study native
# first-party JREI logic, not vendor files, generated releases or secrets.
SKIP_PARTS = frozenset(("node_modules", "vendor", "_vendor", "dist",
                        "build", "backups", "private", "secrets",
                        "__pycache__", ".git"))


def _targets(repo: Path):
    """Discover first-party JREI Python/JS/TS without a fixed file list."""
    known = set()
    root = repo.resolve(strict=True)
    for relative in TARGETS:
        known.add(relative)
        yield relative
    for folder, extensions in SOURCE_DIRS:
        directory = root.joinpath(*folder.split("/"))
        if not directory.is_dir() or directory.is_symlink():
            continue
        for entry in sorted(directory.rglob("*")):
            if (entry.suffix.lower() not in extensions
                    or any(p in SKIP_PARTS for p in entry.relative_to(root).parts)
                    or entry.is_symlink() or not entry.is_file()
                    or not entry.resolve(strict=True).is_relative_to(root)
                    or entry.stat().st_size > MAX_SOURCE_BYTES):
                continue
            relative = entry.relative_to(root).as_posix()
            if relative not in known:
                known.add(relative)
                yield relative


def _db(path: Path):
    db = sqlite3.connect(path, timeout=12)
    db.execute("PRAGMA busy_timeout=12000")
    return db


def initialize(db_path: Path) -> None:
    """Only additive metadata in the established owner-private SQLite store."""
    with closing(_db(db_path)) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_self_code_audit(
          source_path TEXT NOT NULL PRIMARY KEY,
          source_sha256 TEXT NOT NULL,
          observed INTEGER NOT NULL,
          state TEXT NOT NULL,
          findings_sha256 TEXT NOT NULL,
          finding_count INTEGER NOT NULL,
          candidate_sha256 TEXT,
          candidate_state TEXT NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_self_code_findings(
          source_path TEXT NOT NULL,
          source_sha256 TEXT NOT NULL,
          finding_kind TEXT NOT NULL,
          occurrences INTEGER NOT NULL,
          observed INTEGER NOT NULL,
          PRIMARY KEY(source_path,finding_kind))""")
        db.commit()


def _read_source(repo: Path, relative: str) -> bytes | None:
    root = repo.resolve(strict=True)
    source = repo.joinpath(*relative.split("/"))
    if (not source.is_file() or source.is_symlink()
            or not source.resolve(strict=True).is_relative_to(root)
            or source.stat().st_size > MAX_SOURCE_BYTES):
        return None
    return source.read_bytes()


def _inspect(target: str, source: str) -> tuple[list[dict], str | None]:
    """Model-free static diagnosis, never execute the inspected source.

    Python findings are AST-grounded. JS/TS findings are explicitly heuristic
    pattern observations, not syntax validation or proof of vulnerabilities.
    """
    if target.endswith((".js", ".mjs", ".ts")):
        findings = []
        patterns = (
            ("DYNAMIC_CODE_CALL_PATTERN",
             re.compile(r"\b(?:eval|Function)\s*\(")),
            ("CHILD_PROCESS_REFERENCE_PATTERN",
             re.compile(r"\b(?:child_process|execSync|spawnSync)\b")),
        )
        for number, line in enumerate(source.splitlines(), start=1):
            for kind, pattern in patterns:
                if pattern.search(line):
                    findings.append({"kind":kind, "line":number,
                                     "certainty":"UNVERIFIED_TEXT_PATTERN"})
                    if len(findings) >= MAX_RECORDED_FINDINGS:
                        return findings, None
        return findings, None
    try:
        tree = ast.parse(source, filename=target, mode="exec")
    except (SyntaxError, ValueError, MemoryError) as exc:
        return ([{"kind": "PYTHON_SYNTAX_ISSUE",
                  "line": max(0, int(getattr(exc, "lineno", 0) or 0))}],
                None)
    lines = source.splitlines(keepends=True)
    findings: list[dict] = []
    candidate: str | None = None
    for node in ast.walk(tree):
        if isinstance(node, ast.ExceptHandler) and node.type is None:
            findings.append({"kind": "BARE_EXCEPT", "line": node.lineno})
            # This is a REVIEW-ONLY semantic change. A bare except catches
            # BaseException, whereas Exception excludes process interrupts.
            # Never silently apply it to JREI's running source.
            if candidate is None and 0 < node.lineno <= len(lines):
                before = lines[node.lineno - 1]
                if before.strip() == "except:":
                    after = before.replace("except:", "except Exception:", 1)
                    proposed = list(lines)
                    proposed[node.lineno - 1] = after
                    changed = "".join(proposed)
                    try:
                        ast.parse(changed, filename=target, mode="exec")
                    except (SyntaxError, ValueError, MemoryError):
                        pass
                    else:
                        if changed != source and len(changed.encode("utf-8")) <= 32000:
                            candidate = changed
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
            if node.func.id in ("eval", "exec"):
                findings.append({"kind": "DYNAMIC_CODE_CALL",
                                 "line": getattr(node, "lineno", 0)})
        if len(findings) >= MAX_RECORDED_FINDINGS:
            break
    return findings, candidate


def _write_draft(*, repo: Path, private: Path, target: str,
                 source: bytes, candidate: str) -> tuple[str, str | None]:
    """Write immutable isolated code and receipt, not the canonical checkout."""
    original = repo.resolve(strict=True)
    private_root = private.resolve(strict=True)
    if (private_root == original or private_root.is_relative_to(original)
            or original.is_relative_to(private_root)):
        return "ISOLATION_NOT_CONFIRMED", None
    workspace = private_root / "development-workspace"
    drafts = workspace / ".self-drafts"
    for folder in (workspace, drafts):
        if folder.is_symlink():
            return "UNSAFE_WORKSPACE_LINK", None
    drafts.mkdir(parents=True, exist_ok=True)
    identity = hashlib.sha256(
        target.encode("utf-8") + b"\x00" + hashlib.sha256(source).digest()
    ).hexdigest()
    output = candidate.encode("utf-8")
    target_file = drafts / (identity + ".py")
    receipt_file = drafts / (identity + ".json")
    if target_file.exists() or receipt_file.exists():
        return "EXISTING_DRAFT_PRESERVED_NOT_RECHECKED", None
    try:
        with target_file.open("xb") as stream:
            stream.write(output)
        receipt = {
            "schema": SCHEMA,
            "state": "MECHANICAL_SOURCE_DRAFT_UNREVIEWED",
            "source_path": target,
            "source_sha256": hashlib.sha256(source).hexdigest(),
            "candidate_sha256": hashlib.sha256(output).hexdigest(),
            "change_kind": "BARE_EXCEPT_TO_EXCEPTION",
            "semantic_equivalence_confirmed": False,
            "parser_check_only": True,
            "tests_run": False,
            "native_model_used": False,
            "source_isolation": True,
            "canonical_checkout_modified": False,
            "remote_code_executed": False,
            "github_written": False,
            "production_changed": False,
        }
        with receipt_file.open("x", encoding="utf-8") as stream:
            json.dump(receipt, stream, ensure_ascii=False, sort_keys=True)
        return "ISOLATED_DRAFT_WRITTEN_NOT_VALIDATED", receipt["candidate_sha256"]
    except (FileExistsError, OSError, UnicodeError):
        # Preserve partial files for explicit owner review rather than
        # overwriting or deleting unknown data.
        return "DRAFT_STORAGE_UNAVAILABLE_REVIEW_REQUIRED", None


def audit_once(*, db_path: Path, repo: Path, private: Path,
               resources_available: bool) -> dict:
    """Audit one changed first-party source per admitted resource interval."""
    if type(resources_available) is not bool:
        raise ValueError("JREI_SELF_CODE_RESOURCES_INVALID")
    if not resources_available:
        return {"schema": SCHEMA, "state": "HELD_RESOURCES"}
    with closing(_db(db_path)) as db:
        previous = dict(db.execute(
            "SELECT source_path,source_sha256 FROM jrei_self_code_audit"
        ).fetchall())
    for relative in _targets(repo):
        try:
            raw = _read_source(repo, relative)
        except (OSError, ValueError):
            continue
        if raw is None:
            continue
        current_sha = hashlib.sha256(raw).hexdigest()
        if previous.get(relative) == current_sha:
            continue
        try:
            text = raw.decode("utf-8", errors="strict")
        except UnicodeError:
            continue
        findings, candidate = _inspect(relative, text)
        canonical = json.dumps(findings, sort_keys=True,
                               separators=(",", ":")).encode("utf-8")
        finding_sha = hashlib.sha256(canonical).hexdigest()
        candidate_state = "NO_MECHANICAL_DRAFT"
        candidate_sha = None
        if candidate is not None:
            candidate_state, candidate_sha = _write_draft(
                repo=repo, private=private, target=relative,
                source=raw, candidate=candidate)
        state = ("REVIEWABLE_FINDINGS" if findings else "NO_FINDINGS")
        now = int(time.time())
        with closing(_db(db_path)) as db:
            db.execute("""INSERT INTO jrei_self_code_audit(
                source_path,source_sha256,observed,state,findings_sha256,
                finding_count,candidate_sha256,candidate_state)
                VALUES(?,?,?,?,?,?,?,?)
                ON CONFLICT(source_path) DO UPDATE SET
                source_sha256=excluded.source_sha256,
                observed=excluded.observed,state=excluded.state,
                findings_sha256=excluded.findings_sha256,
                finding_count=excluded.finding_count,
                candidate_sha256=excluded.candidate_sha256,
                candidate_state=excluded.candidate_state""",
                (relative, current_sha, now, state, finding_sha,
                 len(findings), candidate_sha, candidate_state))
            counts: dict[str, int] = {}
            for finding in findings:
                kind = finding["kind"]
                counts[kind] = counts.get(kind, 0) + 1
            db.execute("DELETE FROM jrei_self_code_findings WHERE source_path=?",
                       (relative,))
            db.executemany("""INSERT INTO jrei_self_code_findings(
                source_path,source_sha256,finding_kind,occurrences,observed)
                VALUES(?,?,?,?,?)""",
                [(relative,current_sha,kind,number,now)
                 for kind,number in sorted(counts.items())])
            db.commit()
        return {
            "schema": SCHEMA, "state": state,
            "source_path": relative, "finding_count": len(findings),
            "source_sha256": current_sha,
            "isolated_candidate_state": candidate_state,
            "model_training_performed": False,
            "code_activated": False,
        }
    return {"schema": SCHEMA, "state": "ALL_TRACKED_SOURCES_AUDITED",
            "code_activated": False}


def snapshot(db_path: Path) -> dict:
    with closing(_db(db_path)) as db:
        count, finding, drafts = db.execute("""
            SELECT COUNT(*),COALESCE(SUM(finding_count),0),
                COALESCE(SUM(CASE WHEN candidate_sha256 IS NOT NULL
                          THEN 1 ELSE 0 END),0)
            FROM jrei_self_code_audit""").fetchone()
        categories = db.execute("""SELECT finding_kind,SUM(occurrences)
            FROM jrei_self_code_findings GROUP BY finding_kind
            ORDER BY finding_kind""").fetchall()
    return {
        "schema": SCHEMA, "audited_files": count,
        "finding_categories": {kind:int(count or 0)
                               for kind,count in categories},
        "static_findings": finding, "isolated_drafts": drafts,
        "first_party_only": True, "models_required": False,
        "tests_run": False, "deployed": False,
        "autonomous_semantic_code_generation": False,
    }
