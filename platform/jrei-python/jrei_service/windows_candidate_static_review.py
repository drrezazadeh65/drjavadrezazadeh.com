"""Independent, NON-EXECUTING review of JREI's isolated draft candidates.

Reads the existing owner-private "isolated-candidates" folders created by
owner_candidate_pipeline. A successful parser/static review is not a test,
not semantic correctness, not neural learning and NEVER a deploy decision.

Uses the original missions.sqlite3; no duplicate agent, job queue, runtime,
training system or production writes. No subprocess and no imports from a
draft candidate. Failures are recorded as evidence, not concealed.
"""
from __future__ import annotations

from contextlib import closing
from hashlib import sha256
import json
from pathlib import Path
import re
import sqlite3
import time

from jrei_service.owner_candidate_pipeline import safe_path
from jrei_service.windows_python_code_review import inspect_change
from jrei_service.windows_self_development import _inspect

SCHEMA = "jr.jrei.candidate-static-review.v1"
CANDIDATE = re.compile(r"^[0-9]{10}-[a-f0-9]{12}$")
RULE_ID = re.compile(r"^[a-f0-9]{64}$")
SHA = re.compile(r"^[a-f0-9]{64}$")
MAX_RECEIPT_BYTES = 16000
MAX_CODE_BYTES = 34000
SCAN_PER_INTERVAL = 180


def _open(db_path: Path):
    db = sqlite3.connect(db_path, timeout=12)
    db.execute("PRAGMA busy_timeout=12000")
    return db


def initialize(db_path: Path) -> None:
    with closing(_open(db_path)) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_candidate_static_reviews(
            candidate_id TEXT PRIMARY KEY,
            source_path TEXT NOT NULL,
            source_sha256 TEXT NOT NULL,
            candidate_sha256 TEXT NOT NULL,
            reviewed_at INTEGER NOT NULL,
            state TEXT NOT NULL,
            static_risk_flags_json TEXT NOT NULL,
            before_findings INTEGER,
            after_findings INTEGER,
            finding_delta INTEGER,
            source_impact_sha256 TEXT,
            provenance_linked INTEGER NOT NULL DEFAULT 0,
            functional_tests_run INTEGER NOT NULL DEFAULT 0,
            production_modified INTEGER NOT NULL DEFAULT 0)""")
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_rule_static_reviews(
            draft_id TEXT PRIMARY KEY,
            source_path TEXT NOT NULL,
            source_sha256 TEXT NOT NULL,
            candidate_sha256 TEXT NOT NULL,
            change_kind TEXT NOT NULL,
            reviewed_at INTEGER NOT NULL,
            state TEXT NOT NULL,
            static_risk_flags_json TEXT NOT NULL,
            before_findings INTEGER,
            after_findings INTEGER,
            finding_delta INTEGER,
            functional_tests_run INTEGER NOT NULL DEFAULT 0,
            production_modified INTEGER NOT NULL DEFAULT 0)""")
        db.commit()


def _digest(data: bytes) -> str:
    return sha256(data).hexdigest()


def _read_bounded(path: Path, limit: int) -> bytes:
    if not path.is_file() or path.is_symlink():
        raise ValueError("JREI_STATIC_REVIEW_FILE_NOT_REGULAR")
    if path.stat().st_size > limit:
        raise ValueError("JREI_STATIC_REVIEW_FILE_TOO_LARGE")
    with path.open("rb") as stream:
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ValueError("JREI_STATIC_REVIEW_FILE_TOO_LARGE")
    return data


def _candidate_info(folder: Path, root: Path) -> dict:
    """Parse a bounded receipt without following file or directory links."""
    if folder.is_symlink() or not folder.is_dir():
        raise ValueError("JREI_STATIC_REVIEW_FOLDER_INVALID")
    if not folder.resolve(strict=True).is_relative_to(root):
        raise ValueError("JREI_STATIC_REVIEW_FOLDER_OUTSIDE_ROOT")
    identifier = folder.name
    if not CANDIDATE.fullmatch(identifier):
        raise ValueError("JREI_STATIC_REVIEW_ID_INVALID")
    receipt = json.loads(_read_bounded(
        folder / "receipt.json", MAX_RECEIPT_BYTES).decode("utf-8"))
    if (not isinstance(receipt, dict)
            or receipt.get("schema") != "jr.jrei.owner-isolated-candidate.v1"
            or receipt.get("candidate_id") != identifier
            or receipt.get("canonical_checkout_modified") is not False
            or receipt.get("published_to_bertina") is not False
            or receipt.get("functional_tests_run") is not False):
        raise ValueError("JREI_STATIC_REVIEW_RECEIPT_UNTRUSTED")
    name = safe_path(receipt.get("source_path"))
    source_sha = receipt.get("source_sha256")
    candidate_sha = receipt.get("candidate_sha256")
    if not isinstance(source_sha, str) or not SHA.fullmatch(source_sha):
        raise ValueError("JREI_STATIC_REVIEW_ORIGINAL_SHA_MISSING")
    if not isinstance(candidate_sha, str) or not SHA.fullmatch(candidate_sha):
        raise ValueError("JREI_STATIC_REVIEW_CANDIDATE_SHA_MISSING")
    candidate_file = folder / ("candidate" + name.suffix)
    raw = _read_bounded(candidate_file, MAX_CODE_BYTES)
    if _digest(raw) != candidate_sha:
        raise ValueError("JREI_STATIC_REVIEW_CANDIDATE_TAMPERED")
    return {"id": identifier, "path": name.as_posix(),
            "source_sha": source_sha, "candidate_sha": candidate_sha,
            "code": raw, "candidate_syntax": receipt.get("syntax")}


def _analyze(repo: Path, item: dict) -> dict:
    """Compare the exact first-party file whose SHA the draft pinned."""
    root = repo.resolve(strict=True)
    file = root.joinpath(*item["path"].split("/"))
    if (not file.is_file() or file.is_symlink() or
            not file.resolve(strict=True).is_relative_to(root)):
        return {"state": "CANONICAL_SOURCE_UNAVAILABLE",
                "flags": ["SOURCE_NOT_CONFIRMED"]}
    raw = _read_bounded(file, MAX_CODE_BYTES)
    if _digest(raw) != item["source_sha"]:
        return {"state": "CANONICAL_SOURCE_CHANGED",
                "flags": ["ORIGINAL_SHA_MISMATCH"]}
    if item["path"].endswith(".py"):
        source = raw.decode("utf-8", errors="strict")
        candidate = item["code"].decode("utf-8", errors="strict")
        try:
            impact = inspect_change(target=item["path"],
                                    before=source, after=candidate)
        except (ValueError, MemoryError, RecursionError):
            return {"state": "PYTHON_STATIC_ANALYSIS_UNAVAILABLE",
                    "flags": ["STATIC_ANALYSIS_INCOMPLETE"]}
        before_findings, _ = _inspect(item["path"], source)
        after_findings, _ = _inspect(item["path"], candidate)
        risk = list(impact.get("risk_flags") or [])
        if impact.get("reported_lists_truncated"):
            risk.append("INCOMPLETE_PUBLIC_API_REVIEW")
        if impact.get("source_sha256_before") != item["source_sha"]:
            risk.append("ANALYZED_SOURCE_MISMATCH")
        if impact.get("source_sha256_after") != item["candidate_sha"]:
            risk.append("ANALYZED_DRAFT_MISMATCH")
        return {
            "state": ("STATIC_RISK_REVIEW_REQUIRED" if risk else
                      "PYTHON_STATIC_REVIEW_RECORDED_UNTESTED"),
            "flags": risk,
            "before": len(before_findings),
            "after": len(after_findings),
            "delta": len(after_findings) - len(before_findings),
            "impact_digest": _digest(json.dumps(
                impact, sort_keys=True, separators=(",", ":")
            ).encode("utf-8")),
        }
    if item["path"].endswith((".js", ".mjs", ".ts")):
        before = raw.decode("utf-8", errors="strict")
        after = item["code"].decode("utf-8", errors="strict")
        before_findings, _ = _inspect(item["path"], before)
        after_findings, _ = _inspect(item["path"], after)
        return {
            "state": "JAVASCRIPT_HEURISTIC_REVIEW_RECORDED_UNTESTED",
            "flags": ["JAVASCRIPT_AST_NOT_INDEPENDENTLY_PARSED"],
            "before": len(before_findings),
            "after": len(after_findings),
            "delta": len(after_findings) - len(before_findings),
        }
    return {"state": "LANGUAGE_STATIC_REVIEW_NOT_SUPPORTED",
            "flags": ["LANGUAGE_NOT_REVIEWED"]}


def review_once(*, db_path: Path, repo: Path, private: Path,
                resources_available: bool) -> dict:
    if type(resources_available) is not bool:
        raise ValueError("JREI_STATIC_REVIEW_RESOURCE_FLAG_INVALID")
    if not resources_available:
        return {"schema": SCHEMA, "state": "HELD_RESOURCES"}
    canonical = repo.resolve(strict=True)
    owner_root = private.resolve(strict=True)
    if (canonical == owner_root or
            owner_root.is_relative_to(canonical) or
            canonical.is_relative_to(owner_root)):
        raise ValueError("JREI_STATIC_REVIEW_SOURCE_NOT_ISOLATED")
    folder_root = owner_root / "isolated-candidates"
    if folder_root.is_symlink():
        raise ValueError("JREI_STATIC_REVIEW_ROOT_LINK")
    if not folder_root.is_dir():
        return {"schema": SCHEMA, "state": "NO_ISOLATED_CANDIDATES"}
    folder_root = folder_root.resolve(strict=True)
    if not folder_root.is_relative_to(owner_root):
        raise ValueError("JREI_STATIC_REVIEW_ROOT_OUTSIDE_PRIVATE")
    with closing(_open(db_path)) as db:
        seen = {row[0] for row in db.execute(
            "SELECT candidate_id FROM jrei_candidate_static_reviews"
        ).fetchall()}
    # Each wake does bounded work. New candidates are prioritized and older
    # candidates remain eligible on subsequent wakes if not yet registered.
    folders = sorted(
        (entry for entry in folder_root.iterdir() if
         CANDIDATE.fullmatch(entry.name)),
        key=lambda entry: entry.name, reverse=True)
    for folder in folders:
        if folder.name in seen:
            continue
        try:
            item = _candidate_info(folder, folder_root)
            analysis = _analyze(canonical, item)
            state = analysis["state"]
            flags = analysis["flags"]
            source_sha = item["source_sha"]
            candidate_sha = item["candidate_sha"]
            source_path = item["path"]
        except (ValueError, OSError, UnicodeError, TypeError,
                json.JSONDecodeError) as exc:
            # Do not claim a valid signed source or static improvement when
            # an unknown directory/receipt failed verification.
            state = "CANDIDATE_REVIEW_INPUT_REJECTED"
            flags = [exc.__class__.__name__]
            source_path = "UNKNOWN"
            source_sha = "0" * 64
            candidate_sha = "0" * 64
            analysis = {}
        with closing(_open(db_path)) as db:
            linked = db.execute("""SELECT 1 FROM sqlite_master
                WHERE type='table' AND name='jrei_oss_draft_provenance'
            """).fetchone() is not None and db.execute("""
                SELECT 1 FROM jrei_oss_draft_provenance
                WHERE candidate_id=?""", (folder.name,)).fetchone() is not None
            db.execute("""INSERT OR IGNORE INTO jrei_candidate_static_reviews(
                candidate_id,source_path,source_sha256,candidate_sha256,
                reviewed_at,state,static_risk_flags_json,before_findings,
                after_findings,finding_delta,source_impact_sha256,
                provenance_linked)
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)""",
                (folder.name,source_path,source_sha,candidate_sha,
                 int(time.time()),state,json.dumps(flags),
                 analysis.get("before"),analysis.get("after"),
                 analysis.get("delta"),analysis.get("impact_digest"),
                 int(linked)))
            db.commit()
        return {"schema": SCHEMA, "state": state,
                "candidate_id": folder.name,
                "static_findings_delta": analysis.get("delta"),
                "risk_flags": flags,
                "pinned_oss_evidence_linked": bool(linked),
                "functional_tests_run": False,
                "model_training_performed": False,
                "candidate_activated": False}
    return {"schema": SCHEMA, "state": "NO_NEW_CANDIDATE_DUE",
            "functional_tests_run": False}


def review_rule_once(*, db_path: Path, repo: Path, private: Path,
                     resources_available: bool) -> dict:
    """Review model-free AST-derived isolated self-code proposals.

    The existing self-development worker writes these drafts to .self-drafts.
    No external model, process execution, test runner or second store is
    created. A bare-except rewrite is SEMANTICALLY CHANGING even if Python
    parses it; its impact must not be silently classified as an improvement.
    """
    if type(resources_available) is not bool:
        raise ValueError("JREI_RULE_REVIEW_RESOURCE_FLAG_INVALID")
    if not resources_available:
        return {"schema": SCHEMA, "state": "HELD_RESOURCES"}
    canonical = repo.resolve(strict=True)
    owner_root = private.resolve(strict=True)
    if (canonical == owner_root or
            owner_root.is_relative_to(canonical) or
            canonical.is_relative_to(owner_root)):
        raise ValueError("JREI_RULE_REVIEW_SOURCE_NOT_ISOLATED")
    base = owner_root / "development-workspace"
    drafts = base / ".self-drafts"
    if base.is_symlink() or drafts.is_symlink():
        raise ValueError("JREI_RULE_REVIEW_WORKSPACE_LINK")
    if not drafts.is_dir():
        return {"schema": SCHEMA, "state": "NO_MECHANICAL_DRAFTS"}
    drafts = drafts.resolve(strict=True)
    if not drafts.is_relative_to(owner_root):
        raise ValueError("JREI_RULE_REVIEW_NOT_IN_PRIVATE")
    with closing(_open(db_path)) as db:
        reviewed = {row[0] for row in db.execute(
            "SELECT draft_id FROM jrei_rule_static_reviews")}
    for receipt_path in sorted(drafts.glob("*.json")):
        identity = receipt_path.stem
        if not RULE_ID.fullmatch(identity) or identity in reviewed:
            continue
        state, flags, analysis = (
            "REVIEW_INPUT_INVALID", ["INVALID_RULE_DRAFT"], {})
        origin = candidate = "0" * 64
        target = "UNKNOWN"
        kind = "UNKNOWN"
        try:
            receipt = json.loads(_read_bounded(
                receipt_path, MAX_RECEIPT_BYTES).decode("utf-8"))
            if (not isinstance(receipt,dict) or
                    receipt.get("schema") !=
                        "jr.jrei.self-code-study.v1" or
                    receipt.get("state") !=
                        "MECHANICAL_SOURCE_DRAFT_UNREVIEWED" or
                    receipt.get("canonical_checkout_modified") is not False or
                    receipt.get("semantic_equivalence_confirmed") is not False or
                    receipt.get("tests_run") is not False):
                raise ValueError("JREI_RULE_RECEIPT_INVALID")
            target = receipt.get("source_path")
            if (not isinstance(target,str) or
                    not target.startswith("platform/jrei-python/") or
                    not target.endswith(".py") or
                    ".." in target.split("/") or
                    "\\" in target or len(target) > 230):
                raise ValueError("JREI_RULE_TARGET_INVALID")
            origin = receipt.get("source_sha256")
            candidate = receipt.get("candidate_sha256")
            if (not isinstance(origin,str) or not SHA.fullmatch(origin) or
                    not isinstance(candidate,str) or
                    not SHA.fullmatch(candidate)):
                raise ValueError("JREI_RULE_SOURCE_HASH_INVALID")
            kind = str(receipt.get("change_kind","UNKNOWN"))[:80]
            generated = _read_bounded(drafts / (identity + ".py"),
                                      MAX_CODE_BYTES)
            if _digest(generated) != candidate:
                raise ValueError("JREI_RULE_CANDIDATE_HASH_MISMATCH")
            analysis = _analyze(canonical, {
                "path":target,"source_sha":origin,
                "candidate_sha":candidate,"code":generated,
            })
            state = analysis["state"]
            flags = list(analysis.get("flags") or [])
            # Non-equivalent refactors are just hypotheses even when
            # signatures/imports are unchanged.
            if kind == "BARE_EXCEPT_TO_EXCEPTION":
                flags.append("EXCEPTION_CATCH_BEHAVIOR_CHANGED")
                if state == "PYTHON_STATIC_REVIEW_RECORDED_UNTESTED":
                    state = "SEMANTIC_CHANGE_OWNER_REVIEW_REQUIRED"
        except (ValueError,OSError,UnicodeError,TypeError,
                json.JSONDecodeError) as exc:
            state = "RULE_REVIEW_INPUT_REJECTED"
            flags = [exc.__class__.__name__]
            analysis = {}
            target = target if isinstance(target,str) else "UNKNOWN"
            origin = origin if isinstance(origin,str) else "0"*64
            candidate = candidate if isinstance(candidate,str) else "0"*64
        with closing(_open(db_path)) as db:
            db.execute("""INSERT OR IGNORE INTO jrei_rule_static_reviews(
                draft_id,source_path,source_sha256,candidate_sha256,
                change_kind,reviewed_at,state,static_risk_flags_json,
                before_findings,after_findings,finding_delta)
                VALUES(?,?,?,?,?,?,?,?,?,?,?)""",
                (identity,target,origin,candidate,kind,int(time.time()),
                 state,json.dumps(flags),analysis.get("before"),
                 analysis.get("after"),analysis.get("delta")))
            db.commit()
        return {"schema":SCHEMA,"state":state,"draft_id":identity,
                "change_kind":kind,"static_findings_delta":analysis.get("delta"),
                "risk_flags":flags,"functional_tests_run":False,
                "native_model_required":False,"candidate_activated":False}
    return {"schema":SCHEMA,"state":"NO_NEW_MECHANICAL_DRAFT_DUE"}


def snapshot(db_path: Path) -> dict:
    with closing(_open(db_path)) as db:
        counts = db.execute("""SELECT state,COUNT(*) FROM
            jrei_candidate_static_reviews GROUP BY state
            ORDER BY state""").fetchall()
        total,provenance = db.execute("""SELECT COUNT(*),
            COALESCE(SUM(provenance_linked),0)
            FROM jrei_candidate_static_reviews""").fetchone()
        rule_states = db.execute("""SELECT state,COUNT(*) FROM
            jrei_rule_static_reviews GROUP BY state ORDER BY state""").fetchall()
    return {"schema": SCHEMA, "reviewed_candidates": total,
            "research_linked_candidates": provenance,
            "states": {key: count for key,count in counts},
            "rule_only_reviews": sum(value for _,value in rule_states),
            "rule_review_states": {key:value for key,value in rule_states},
            "source_read_only": True, "candidate_code_executed": False,
            "functional_tests_run": False, "deployed": False,
            "verified_skill_improvement": False}
