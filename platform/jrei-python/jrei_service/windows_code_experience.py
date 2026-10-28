"""JREI's private code-improvement experience ledger.

Adapts the evaluation/feedback-loop *design* used by SWE-agent and Aider
without copying their runtime or source. Model-generated patches stay drafts.
Only owner-reviewed outcomes may inform future coding priorities; a claimed
successful edit is never proof of successful tests, runtime fitness or neural
weight training. Reuses the existing private missions.sqlite3.
"""
from __future__ import annotations

from contextlib import closing
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import time

SHA = re.compile(r"^[0-9a-f]{64}$")
RID = re.compile(r"^\d{8}T\d{6}Z-[0-9a-f]{12}$")
REVIEWER = re.compile(r"^[A-Za-z0-9._:-]{3,90}$")
TARGET = re.compile(r"^(?:platform|scripts|docs|assets|api)/[A-Za-z0-9_./-]{5,230}$")
OUTCOMES = frozenset(("ACCEPTED_FOR_REVIEW", "NEEDS_REVISION", "REJECTED"))
STATES = frozenset(("DRAFT_UNREVIEWED", "OWNER_FEEDBACK_RECORDED"))


def _open(db_path: Path):
    conn = sqlite3.connect(db_path, timeout=12)
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA busy_timeout=12000")
    return conn


def initialize(db_path: Path) -> None:
    with closing(_open(db_path)) as db:
        db.executescript("""
          CREATE TABLE IF NOT EXISTS jrei_code_experience (
            receipt_id TEXT PRIMARY KEY,
            created INTEGER NOT NULL,
            target TEXT NOT NULL,
            original_sha TEXT NOT NULL,
            before_sha TEXT NOT NULL,
            after_sha TEXT NOT NULL,
            receipt_sha TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'DRAFT_UNREVIEWED',
            verdict TEXT NOT NULL DEFAULT '',
            reviewer TEXT NOT NULL DEFAULT '',
            review_evidence_sha TEXT NOT NULL DEFAULT '',
            reviewed_at INTEGER,
            externally_executed_verified INTEGER NOT NULL DEFAULT 0,
            model_weights_trained INTEGER NOT NULL DEFAULT 0
          );
          CREATE INDEX IF NOT EXISTS jrei_code_experience_state
          ON jrei_code_experience(state,created DESC);
        """)


def _valid_receipt(receipt: dict) -> tuple[str, str, str]:
    if (not isinstance(receipt, dict) or
            receipt.get("schema") != "jr.jrei.windows-workspace-edit.v1" or
            receipt.get("state") != "LOCAL_CODE_WRITTEN_UNTESTED" or
            receipt.get("tests_run") is not False or
            receipt.get("canonical_checkout_modified") is not False or
            receipt.get("production_changed") is not False or
            receipt.get("git_pushed") is not False):
        raise ValueError("CODE_EXPERIENCE_REQUIRES_UNTESTED_LOCAL_PATCH")
    rid, target = receipt.get("id"), receipt.get("target")
    if (not isinstance(rid, str) or not RID.fullmatch(rid) or
            not isinstance(target, str) or not TARGET.fullmatch(target) or
            ".." in Path(target).parts):
        raise ValueError("CODE_EXPERIENCE_RECEIPT_ID_OR_TARGET_INVALID")
    for key in ("source_sha256", "before_sha256", "after_sha256"):
        if not isinstance(receipt.get(key), str) or not SHA.fullmatch(receipt[key]):
            raise ValueError("CODE_EXPERIENCE_HASH_INVALID")
    # Hash only the metadata; do not write generated code or prompts to SQLite.
    normalized = {key: receipt[key] for key in (
        "id", "schema", "state", "target", "source_sha256",
        "before_sha256", "after_sha256")}
    digest = hashlib.sha256(json.dumps(
        normalized, sort_keys=True, separators=(",", ":")
    ).encode("utf-8")).hexdigest()
    return rid, target, digest


def record_draft(db_path: Path, receipt: dict) -> dict:
    rid, target, digest = _valid_receipt(receipt)
    with closing(_open(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT receipt_sha FROM jrei_code_experience WHERE receipt_id=?",
            (rid,)).fetchone()
        if row and row[0] != digest:
            db.rollback()
            raise ValueError("CODE_EXPERIENCE_RECEIPT_CONFLICT")
        if not row:
            db.execute("""INSERT INTO jrei_code_experience
              (receipt_id,created,target,original_sha,before_sha,after_sha,receipt_sha)
              VALUES(?,?,?,?,?,?,?)""",
              (rid,int(time.time()),target,receipt["source_sha256"],
               receipt["before_sha256"],receipt["after_sha256"],digest))
        db.commit()
    return {"state": "DRAFT_UNREVIEWED", "receipt_id": rid,
            "neural_training_started": False, "source_executed": False}


def record_owner_feedback(db_path: Path, *, private: Path, receipt_id: str,
                          outcome: str, reviewer: str, evidence_sha256: str,
                          owner_confirmed: bool) -> dict:
    """Record review metadata, never impersonate an independent test runner."""
    if (owner_confirmed is not True or
            not isinstance(receipt_id, str) or not RID.fullmatch(receipt_id) or
            outcome not in OUTCOMES or
            not isinstance(reviewer, str) or not REVIEWER.fullmatch(reviewer) or
            not isinstance(evidence_sha256, str) or
            not SHA.fullmatch(evidence_sha256)):
        raise ValueError("CODE_EXPERIENCE_REVIEW_ATTESTATION_REQUIRED")
    # Confirm the private receipt and checked-out patch still exist; user is
    # not allowed to send arbitrary file paths via this authenticated API.
    root = (private / "development-workspace")
    receipt_file = root / ".receipts" / (receipt_id + ".json")
    if receipt_file.is_symlink() or not receipt_file.is_file() or receipt_file.stat().st_size > 12000:
        raise ValueError("CODE_EXPERIENCE_RECEIPT_MISSING")
    receipt = json.loads(receipt_file.read_text(encoding="utf-8"))
    rid, target, expected_digest = _valid_receipt(receipt)
    patch = root.joinpath(*Path(target).parts)
    if patch.is_symlink() or not patch.is_file():
        raise ValueError("CODE_EXPERIENCE_PATCH_MISSING")
    patch_bytes = patch.read_bytes()
    if hashlib.sha256(patch_bytes).hexdigest() != receipt["after_sha256"]:
        raise ValueError("CODE_EXPERIENCE_PATCH_CHANGED")
    with closing(_open(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("""SELECT receipt_sha,state FROM jrei_code_experience
                            WHERE receipt_id=?""", (rid,)).fetchone()
        if not row or row != (expected_digest,"DRAFT_UNREVIEWED"):
            db.rollback()
            raise ValueError("CODE_EXPERIENCE_REVIEW_ALREADY_RECORDED_OR_CHANGED")
        db.execute("""UPDATE jrei_code_experience
          SET state='OWNER_FEEDBACK_RECORDED',verdict=?,reviewer=?,
              review_evidence_sha=?,reviewed_at=?
          WHERE receipt_id=?""",
          (outcome,reviewer,evidence_sha256,int(time.time()),rid))
        db.commit()
    return {"state": "OWNER_FEEDBACK_RECORDED",
            "verdict": outcome, "receipt_id": rid,
            "independent_test_verified_by_jrei": False,
            "training_label_certified": False,
            "model_weights_trained": False}



def feedback_hints(db_path: Path, target: str) -> str:
    """Review metadata only: no private prompts, generated code, or fake tests."""
    if not isinstance(target, str) or not TARGET.fullmatch(target):
        raise ValueError("CODE_EXPERIENCE_TARGET_INVALID")
    with closing(_open(db_path)) as db:
        rows = db.execute("""SELECT verdict,after_sha
            FROM jrei_code_experience WHERE target=?
            AND state='OWNER_FEEDBACK_RECORDED'
            ORDER BY reviewed_at DESC LIMIT 5""",(target,)).fetchall()
    if not rows:
        return "No human-reviewed local patch outcome exists for this file."
    notes = []
    for verdict, digest in rows:
        if verdict == "REJECTED":
            interpretation = "Earlier candidate rejected; avoid blindly repeating it."
        elif verdict == "NEEDS_REVISION":
            interpretation = "Earlier candidate requires revision; assess against owner request."
        else:
            interpretation = "Owner accepted draft for review; NO successful test is proven."
        notes.append(f"{verdict} (sha256:{digest[:16]}): {interpretation}")
    return "\n".join(notes)[:900]


def snapshot(db_path: Path) -> dict:
    with closing(_open(db_path)) as db:
        rows = db.execute("""SELECT state,verdict,COUNT(*)
             FROM jrei_code_experience GROUP BY state,verdict""").fetchall()
    return {"schema": "jr.jrei.private-code-experience.v1",
            "counts": [{"state": state,"verdict": verdict,"count": count}
                       for state,verdict,count in rows],
            "independently_validated_code_skills": 0,
            "neural_training_started": False,
            "production_changed": False}
