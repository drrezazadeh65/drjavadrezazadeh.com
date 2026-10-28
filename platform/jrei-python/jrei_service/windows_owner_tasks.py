"""Durable bounded task queue for the owner-private JREI Windows command center.

An existing conversation owns each task. SQLite remains the SAME existing
missions.sqlite3; this is not a separate database, Windows service, cloud
queue, or untrusted model-controlled tool registry.

Queue-only cancellation guarantees no execution. A running task accepts a
CANCEL_REQUESTED marker, but may finish its current model/tool operation;
its final result is preserved and explicitly marked AFTER_CANCEL_REQUEST.
A task interrupted by process termination is never automatically replayed.
"""
from __future__ import annotations

from contextlib import closing
import json
import re
import secrets
import sqlite3
import time


IDENT = re.compile(r"^[a-f0-9]{32}$")
ACTIVE = ("QUEUED", "RUNNING", "CANCEL_REQUESTED")
FINAL = ("SUCCEEDED", "FAILED", "CANCELLED", "INTERRUPTED",
         "SUCCEEDED_AFTER_CANCEL_REQUEST", "FAILED_AFTER_CANCEL_REQUEST")
MAX_PENDING = 6
MAX_PER_CONVERSATION = 3
MAX_MESSAGE = 9000
MAX_FINISHED_AGE = 30 * 24 * 3600
PROGRESS_PHASES = frozenset((
    "STARTING", "READING_DOCUMENT", "RETRIEVING_EVIDENCE", "SYNTHESIZING",
    "RESEARCHING_REPOSITORY", "ROUTING_TOOL", "GENERATING_RESPONSE",
    "PERSISTING_RESULT",
))
MAX_PROGRESS_STEPS = 16


def _open(path):
    connection = sqlite3.connect(path, timeout=12, isolation_level=None)
    connection.execute("PRAGMA foreign_keys=ON")
    connection.execute("PRAGMA busy_timeout=12000")
    return connection


def initialize(db_path):
    with closing(_open(db_path)) as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS owner_tasks(
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                id TEXT NOT NULL UNIQUE,
                conversation_id TEXT NOT NULL
                    REFERENCES owner_conversations(id) ON DELETE CASCADE,
                created INTEGER NOT NULL, updated INTEGER NOT NULL,
                status TEXT NOT NULL,
                prompt TEXT NOT NULL, attachment_ids TEXT NOT NULL,
                cancel_requested INTEGER NOT NULL DEFAULT 0,
                started INTEGER, finished INTEGER,
                result_json TEXT, error_code TEXT);
            CREATE INDEX IF NOT EXISTS owner_tasks_status_sequence
                ON owner_tasks(status,sequence);
            CREATE INDEX IF NOT EXISTS owner_tasks_conversation
                ON owner_tasks(conversation_id,sequence DESC);
            CREATE TABLE IF NOT EXISTS owner_task_steps(
                sequence INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL REFERENCES owner_tasks(id) ON DELETE CASCADE,
                created INTEGER NOT NULL,
                phase TEXT NOT NULL,
                detail TEXT NOT NULL DEFAULT '');
            CREATE INDEX IF NOT EXISTS owner_task_steps_lookup
                ON owner_task_steps(task_id,sequence DESC);
        """)
        # Source/user-visible state is preserved after unexpected process exit,
        # but auto-replaying a once-started tool would risk duplicating effects.
        now = int(time.time())
        db.execute("""
            UPDATE owner_tasks SET status='INTERRUPTED', updated=?, finished=?,
                   error_code='OWNER_PROCESS_EXITED_RESULT_UNKNOWN'
            WHERE status IN ('RUNNING','CANCEL_REQUESTED')
        """, (now, now))
        db.execute("""
            DELETE FROM owner_tasks
            WHERE status NOT IN ('QUEUED','RUNNING','CANCEL_REQUESTED')
              AND finished IS NOT NULL AND finished < ?
        """, (now - MAX_FINISHED_AGE,))


def _check_id(value):
    if not isinstance(value, str) or not IDENT.fullmatch(value):
        raise ValueError("JREI_OWNER_TASK_ID_INVALID")


def submit(db_path, *, conversation_id, prompt, attachments=None):
    _check_id(conversation_id)
    if not isinstance(prompt, str) or not 1 <= len(prompt.strip()) <= MAX_MESSAGE:
        raise ValueError("JREI_OWNER_TASK_MESSAGE_INVALID")
    if attachments is None:
        attachments = []
    if (not isinstance(attachments, list) or len(attachments) > 2 or
            len(set(str(a) for a in attachments)) != len(attachments) or
            any(not isinstance(a, str) or not IDENT.fullmatch(a)
                for a in attachments)):
        raise ValueError("JREI_OWNER_TASK_ATTACHMENTS_INVALID")
    now = int(time.time())
    job_id = secrets.token_hex(16)
    with closing(_open(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        if not db.execute(
            "SELECT 1 FROM owner_conversations WHERE id=?", (conversation_id,)
        ).fetchone():
            raise ValueError("JREI_OWNER_TASK_CONVERSATION_NOT_FOUND")
        total = db.execute(
            "SELECT COUNT(*) FROM owner_tasks WHERE status IN (?,?,?)", ACTIVE
        ).fetchone()[0]
        count = db.execute(
            "SELECT COUNT(*) FROM owner_tasks WHERE conversation_id=? "
            "AND status IN (?,?,?)", (conversation_id, *ACTIVE)
        ).fetchone()[0]
        if total >= MAX_PENDING or count >= MAX_PER_CONVERSATION:
            raise ValueError("JREI_OWNER_TASK_QUEUE_FULL")
        db.execute(
            """INSERT INTO owner_tasks(id,conversation_id,created,updated,status,
               prompt,attachment_ids,cancel_requested)
               VALUES(?,?,?,?,'QUEUED',?,?,0)""",
            (job_id, conversation_id, now, now, prompt.strip(),
             json.dumps(attachments)),
        )
        db.commit()
    return {"id": job_id, "conversation_id": conversation_id,
            "status": "QUEUED", "created": now}



def update_progress(db_path, task_id, phase):
    """Record real worker checkpoints in the same private SQLite database.

    This API only accepts a fixed phase vocabulary, never model-provided
    text or instructions. History is bounded and never marks work complete.
    """
    _check_id(task_id)
    if phase not in PROGRESS_PHASES:
        raise ValueError("JREI_OWNER_TASK_PROGRESS_PHASE_INVALID")
    with closing(_open(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute(
            "SELECT status FROM owner_tasks WHERE id=?", (task_id,)
        ).fetchone()
        if not row or row[0] not in ("RUNNING", "CANCEL_REQUESTED"):
            db.commit()
            return False
        count, current = db.execute(
            """SELECT COUNT(*), MAX(sequence) FROM owner_task_steps
               WHERE task_id=?""", (task_id,)
        ).fetchone()
        if count >= MAX_PROGRESS_STEPS:
            db.commit()
            return False
        if current is not None:
            last = db.execute(
                "SELECT phase FROM owner_task_steps WHERE sequence=?", (current,)
            ).fetchone()
            if last and last[0] == phase:
                db.commit()
                return True
        now = int(time.time())
        db.execute(
            "INSERT INTO owner_task_steps(task_id,created,phase) VALUES(?,?,?)",
            (task_id, now, phase))
        db.execute("UPDATE owner_tasks SET updated=? WHERE id=?", (now, task_id))
        db.commit()
    return True


def _add_progress(db, items):
    if not items:
        return items
    ids = [item["id"] for item in items]
    marks = ",".join("?" for _ in ids)
    rows = db.execute(
        """SELECT steps.task_id,steps.phase,steps.created
           FROM owner_task_steps steps
           INNER JOIN (
             SELECT task_id,MAX(sequence) AS last_sequence
             FROM owner_task_steps
             WHERE task_id IN (""" + marks + """)
             GROUP BY task_id
           ) latest ON latest.last_sequence=steps.sequence""", ids
    ).fetchall()
    mapped = {task_id: {"phase": phase, "updated": when}
              for task_id, phase, when in rows}
    for item in items:
        item["progress"] = mapped.get(item["id"])
    return items

def _public(row, *, include_result=False):
    out = {"id": row[0], "conversation_id": row[1], "created": row[2],
           "updated": row[3], "status": row[4],
           "cancel_requested": bool(row[5]),
           "started": row[6], "finished": row[7],
           "error_code": row[8], "preview": row[10][:100]}
    if include_result and row[9]:
        try:
            out["result"] = json.loads(row[9])
        except (ValueError, TypeError):
            out["error_code"] = "JREI_OWNER_TASK_STORED_RESULT_UNREADABLE"
    return out


_SELECT = ("SELECT id,conversation_id,created,updated,status,cancel_requested,"
           "started,finished,error_code,result_json,prompt FROM owner_tasks")


def get(db_path, task_id):
    _check_id(task_id)
    with closing(_open(db_path)) as db:
        row = db.execute(_SELECT + " WHERE id=?", (task_id,)).fetchone()
        if not row:
            raise ValueError("JREI_OWNER_TASK_NOT_FOUND")
        return _add_progress(db, [_public(row, include_result=True)])[0]


def list_recent(db_path, *, conversation_id=None, limit=30):
    if conversation_id is not None:
        _check_id(conversation_id)
    with closing(_open(db_path)) as db:
        if conversation_id:
            rows = db.execute(
                _SELECT + " WHERE conversation_id=? ORDER BY sequence DESC LIMIT ?",
                (conversation_id, min(50, max(1, int(limit)))),
            ).fetchall()
        else:
            rows = db.execute(
                _SELECT + " ORDER BY sequence DESC LIMIT ?",
                (min(50, max(1, int(limit))),),
            ).fetchall()
        return _add_progress(db, [_public(row) for row in rows])


def cancel(db_path, task_id):
    _check_id(task_id)
    now = int(time.time())
    with closing(_open(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT status FROM owner_tasks WHERE id=?", (task_id,)).fetchone()
        if not row:
            raise ValueError("JREI_OWNER_TASK_NOT_FOUND")
        state = row[0]
        if state == "QUEUED":
            db.execute("""UPDATE owner_tasks SET status='CANCELLED',
                       cancel_requested=1,updated=?,finished=? WHERE id=?""",
                       (now, now, task_id))
            state = "CANCELLED"
        elif state == "RUNNING":
            db.execute("""UPDATE owner_tasks SET status='CANCEL_REQUESTED',
                       cancel_requested=1,updated=? WHERE id=?""", (now, task_id))
            state = "CANCEL_REQUESTED"
        db.commit()
    return {"id": task_id, "status": state,
            "detail": ("Queued task will not execute" if state == "CANCELLED" else
                       "Running work is NOT forcibly terminated; result retained")}


def claim(db_path):
    now = int(time.time())
    with closing(_open(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("""SELECT id,conversation_id,prompt,attachment_ids
             FROM owner_tasks WHERE status='QUEUED' ORDER BY sequence LIMIT 1"""
                         ).fetchone()
        if not row:
            db.commit()
            return None
        db.execute("""UPDATE owner_tasks SET status='RUNNING',updated=?,started=?
                      WHERE id=? AND status='QUEUED'""", (now, now, row[0]))
        db.commit()
    try:
        attachments = json.loads(row[3])
    except (ValueError, TypeError):
        attachments = []
    return {"id": row[0], "conversation_id": row[1], "prompt": row[2],
            "attachments": attachments}


def finish(db_path, task_id, *, result=None, error_code=None):
    _check_id(task_id)
    if (result is None) == (error_code is None):
        raise ValueError("JREI_OWNER_TASK_OUTCOME_INVALID")
    now = int(time.time())
    state = "SUCCEEDED" if result is not None else "FAILED"
    output = None
    if result is not None:
        if not isinstance(result, dict):
            raise ValueError("JREI_OWNER_TASK_RESULT_INVALID")
        output = json.dumps(result, ensure_ascii=False)
        if len(output) > 16000:
            # Important: do not serialize 9k+ evidence receipts without bounds.
            clipped = {k: v for k, v in result.items() if k != "tool"}
            clipped["receipt_truncated"] = True
            candidate = json.dumps(clipped, ensure_ascii=False)
            if len(candidate) <= 16000:
                output = candidate
            else:
                output = json.dumps({"answer": str(result.get("answer", ""))[:6000],
                                     "state": str(result.get("state", "UNKNOWN")),
                                     "receipt_truncated": True}, ensure_ascii=False)
    if error_code is not None and not re.fullmatch(r"[A-Z0-9_]{3,100}", error_code):
        raise ValueError("JREI_OWNER_TASK_ERROR_CODE_INVALID")
    with closing(_open(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT status,cancel_requested FROM owner_tasks WHERE id=?",
                         (task_id,)).fetchone()
        if not row:
            db.commit()
            return "DELETED_CONVERSATION"
        if row[0] not in ("RUNNING", "CANCEL_REQUESTED"):
            db.commit()
            return "ALREADY_FINAL"
        if row[1]:
            state += "_AFTER_CANCEL_REQUEST"
        db.execute("""UPDATE owner_tasks
            SET status=?,updated=?,finished=?,result_json=?,error_code=?
            WHERE id=?""",
            (state, now, now, output, error_code, task_id))
        db.commit()
    return state
