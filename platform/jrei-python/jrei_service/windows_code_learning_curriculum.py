"""First-party model-free coding curriculum for original JREI.

Generate source-pinned AST coding exercises from first-party JREI source only.
This is a candidate study ledger in the EXISTING missions.sqlite3.
No scraped public repository code is trained on, no patches are treated as
correct, and no weight updates, executables or production changes occur.
"""
from __future__ import annotations

import ast
from contextlib import closing
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import time

SCHEMA = "jr.jrei.first-party-code-curriculum.v1"
SOURCE_DIRS = (
    "platform/jrei-python/jrei_learning",
    "platform/jrei-python/jrei_orchestrator",
    "platform/jrei-python/jrei_service",
)
EXCLUDE_PARTS = frozenset((
    ".git", "_vendor", "vendor", "node_modules", "test", "tests",
    "__pycache__", ".venv", "dist", "build", "private", "secrets",
))
MAX_SOURCE_BYTES = 80000
MAX_EXCERPT_CHARS = 1500
MAX_AST_NODES = 18000
MAX_LESSONS_PER_FILE = 12
SECRET = re.compile(
    r"(?i)(-----BEGIN|authorization\s*:\s*bearer|"
    r"(?:api[_-]?key|password|secret|access[_-]?token|private[_-]?key)"
    r"\s*[:=]\s*\S{6,})"
)


def _db(db_path: Path):
    conn = sqlite3.connect(db_path, timeout=12)
    conn.execute("PRAGMA busy_timeout=12000")
    return conn


def _sha(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def initialize(db_path: Path) -> None:
    with closing(_db(db_path)) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_code_curriculum_inventory(
            source_path TEXT PRIMARY KEY,
            source_sha256 TEXT NOT NULL,
            observed INTEGER NOT NULL,
            state TEXT NOT NULL,
            lesson_count INTEGER NOT NULL DEFAULT 0)""")
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_code_curriculum_lessons(
            id TEXT PRIMARY KEY,
            source_path TEXT NOT NULL,
            source_sha256 TEXT NOT NULL,
            function_name TEXT NOT NULL,
            function_line INTEGER NOT NULL,
            lesson_kind TEXT NOT NULL,
            prompt TEXT NOT NULL,
            reference_answer TEXT NOT NULL,
            answer_sha256 TEXT NOT NULL,
            created INTEGER NOT NULL,
            ownership_reviewed INTEGER NOT NULL DEFAULT 0,
            human_quality_reviewed INTEGER NOT NULL DEFAULT 0,
            model_training_permitted INTEGER NOT NULL DEFAULT 0,
            model_training_performed INTEGER NOT NULL DEFAULT 0)""")
        db.execute("""CREATE INDEX IF NOT EXISTS jrei_code_curriculum_path
            ON jrei_code_curriculum_lessons(source_path,source_sha256)""")
        db.commit()


def _candidates(repo: Path):
    """Find first-party Python modules without scanning vendored content."""
    root = repo.resolve(strict=True)
    for directory_name in SOURCE_DIRS:
        directory = root.joinpath(*directory_name.split("/"))
        if directory.is_symlink() or not directory.is_dir():
            continue
        for path in sorted(directory.rglob("*.py")):
            if (path.is_symlink() or not path.is_file() or
                    not path.resolve(strict=True).is_relative_to(root) or
                    any(part in EXCLUDE_PARTS
                        for part in path.relative_to(root).parts) or
                    path.stat().st_size > MAX_SOURCE_BYTES):
                continue
            yield path.relative_to(root).as_posix(), path


def _render_lesson(path: str, digest: str, node: ast.AST,
                   source: str) -> dict | None:
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return None
    if node.name.startswith("_"):
        return None
    segment = ast.get_source_segment(source, node)
    if not segment:
        return None
    code = "\n".join(segment.splitlines()[:32])[:MAX_EXCERPT_CHARS]
    if len(code) < 50 or SECRET.search(code):
        return None
    positional = [arg.arg for arg in
                  (node.args.posonlyargs + node.args.args)]
    keyword_only = [arg.arg for arg in node.args.kwonlyargs]
    flags = []
    if node.args.vararg:
        flags.append("variadic positional arguments")
    if node.args.kwarg:
        flags.append("variadic keyword arguments")
    task = (
        "Read this first-party JREI Python excerpt. Identify the function "
        "name, whether it is async, and its positional and keyword-only "
        "parameters. Answer from source declarations only; do not invent "
        "runtime behavior or claim tests ran.\n"
        "UNTRUSTED SOURCE DATA:\n" + code
    )
    answer = (
        "AST-observed function: " + node.name +
        "; async=" + str(isinstance(node, ast.AsyncFunctionDef)).lower() +
        "; positional=" + json.dumps(positional[:30],ensure_ascii=False) +
        "; keyword-only=" + json.dumps(keyword_only[:30],ensure_ascii=False) +
        "; variadic=" + json.dumps(flags,ensure_ascii=False) +
        ". Correctness and runtime behavior are NOT established."
    )
    fingerprint = _sha((
        path + "\0" + digest + "\0" +
        node.name + "\0" + str(node.lineno) + "\0" + "AST_API_READING_V1"
    ).encode("utf-8"))
    return {
        "id": fingerprint, "path": path, "source_sha256": digest,
        "name": node.name, "line": node.lineno, "kind": "AST_API_READING_V1",
        "prompt": task, "answer": answer,
        "answer_sha256": _sha(answer.encode("utf-8")),
    }


def _extract(path: str, raw: bytes) -> tuple[str, list[dict]]:
    digest = _sha(raw)
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeError:
        return "NON_UTF8_SOURCE", []
    if SECRET.search(text):
        return "SENSITIVE_SOURCE_EXCLUDED", []
    try:
        module = ast.parse(text, filename=path)
        if sum(1 for _ in ast.walk(module)) > MAX_AST_NODES:
            return "AST_TOO_LARGE", []
    except (SyntaxError, ValueError, TypeError, MemoryError,
            RecursionError):
        return "AST_UNAVAILABLE", []
    lessons = []
    for node in module.body:
        item = _render_lesson(path,digest,node,text)
        if item is not None:
            lessons.append(item)
        if len(lessons) >= MAX_LESSONS_PER_FILE:
            break
    return ("FIRST_PARTY_AST_LESSONS_STAGED" if lessons
            else "NO_ELIGIBLE_SOURCE_FUNCTION"), lessons


def tick(*, db_path: Path, repo: Path,
         resources_available: bool) -> dict:
    """Study one changed first-party source per resource-admitted wake."""
    if type(resources_available) is not bool:
        raise ValueError("JREI_CODE_CURRICULUM_RESOURCE_FLAG_INVALID")
    if not resources_available:
        return {"schema":SCHEMA,"state":"HELD_RESOURCES"}
    with closing(_db(db_path)) as db:
        known = dict(db.execute("""SELECT source_path,source_sha256
            FROM jrei_code_curriculum_inventory""").fetchall())
    for name, file in _candidates(repo):
        try:
            raw = file.read_bytes()
        except (OSError,ValueError):
            continue
        digest = _sha(raw)
        if known.get(name) == digest:
            continue
        state, lessons = _extract(name,raw)
        now = int(time.time())
        with closing(_db(db_path)) as db:
            db.execute("BEGIN IMMEDIATE")
            db.executemany("""INSERT OR IGNORE INTO jrei_code_curriculum_lessons(
              id,source_path,source_sha256,function_name,function_line,
              lesson_kind,prompt,reference_answer,answer_sha256,created)
              VALUES(?,?,?,?,?,?,?,?,?,?)""", [
                (item["id"],item["path"],item["source_sha256"],
                 item["name"],item["line"],item["kind"],item["prompt"],
                 item["answer"],item["answer_sha256"],now)
                for item in lessons
            ])
            db.execute("""INSERT INTO jrei_code_curriculum_inventory(
              source_path,source_sha256,observed,state,lesson_count)
              VALUES(?,?,?,?,?)
              ON CONFLICT(source_path) DO UPDATE SET
                source_sha256=excluded.source_sha256,
                observed=excluded.observed,state=excluded.state,
                lesson_count=excluded.lesson_count""",
                (name,digest,now,state,len(lessons)))
            db.commit()
        return {
            "schema":SCHEMA,"state":state,"source_path":name,
            "lesson_candidates_recorded":len(lessons),
            "owner_source_ownership_reviewed":False,
            "training_examples_approved":False,
            "training_started":False,
        }
    return {"schema":SCHEMA,"state":"FIRST_PARTY_SOURCES_UP_TO_DATE",
            "training_started":False}


def snapshot(db_path: Path) -> dict:
    with closing(_db(db_path)) as db:
        files = db.execute("""SELECT COUNT(*) FROM
            jrei_code_curriculum_inventory""").fetchone()[0]
        lessons, current = db.execute("""SELECT COUNT(*),
            COALESCE(SUM(CASE WHEN inventory.source_sha256=
                lessons.source_sha256 THEN 1 ELSE 0 END),0)
            FROM jrei_code_curriculum_lessons AS lessons
            LEFT JOIN jrei_code_curriculum_inventory AS inventory
              ON inventory.source_path=lessons.source_path""").fetchone()
        approved = db.execute("""SELECT COUNT(*)
            FROM jrei_code_curriculum_lessons WHERE
            ownership_reviewed=1 AND human_quality_reviewed=1
            AND model_training_permitted=1""").fetchone()[0]
    return {
        "schema":SCHEMA,"first_party_source_files_observed":files,
        "total_structural_lesson_versions":lessons,
        "current_source_lesson_candidates":current,
        "approved_training_examples":approved,
        "source_ownership_assumed":False,
        "public_forge_code_used_as_training_text":False,
        "model_training_started_by_curriculum":False,
        "independent_code_skill_gain_verified":False,
    }
