"""Continuous public OPEN-SOURCE CODE reading in the ORIGINAL JREI runtime.

The existing GitHub discovery ledger nominates repositories. This worker
actually reads a pinned upstream revision, small README/licence excerpts and
source signatures, and records reproducible local receipts in missions.sqlite3.
No external dependency, second service, copied executable, model weights,
test execution, GitHub write, installation or production mutation.

Popularity/issuer reputation do not gate research. Permission to *study*
public material is not permission to redistribute or integrate the code.
Remote repositories and retrieved text are always untrusted DATA.
"""
from __future__ import annotations

import ast
import base64
import binascii
from contextlib import closing
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request

SCHEMA = "jr.jrei.public-oss-code-study.v1"
API = "https://api.github.com"
REPOSITORY = re.compile(r"^[A-Za-z0-9_.-]{1,80}/[A-Za-z0-9_.-]{1,100}$")
REVISION = re.compile(r"^[a-f0-9]{40}$")
CODE_SUFFIXES = (".py", ".js", ".mjs", ".ts", ".go", ".rs", ".java", ".c", ".cpp")
SOURCE_NAME = re.compile(r"^[A-Za-z0-9._/+@-]{1,190}$")
SIGNATURE = re.compile(
    r"^\s*(?:(?:async\s+)?def\s+[A-Za-z_]\w*|class\s+[A-Za-z_]\w*|"
    r"(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*|"
    r"(?:pub\s+)?(?:async\s+)?fn\s+[A-Za-z_]\w*|"
    r"(?:export\s+)?(?:const|class)\s+[A-Za-z_$][\w$]*|"
    r"func\s+[A-Za-z_]\w*)"
)
_RELEVANCE_TERMS = frozenset({
    "agent", "training", "train", "inference", "model", "token",
    "code", "repair", "evaluate", "benchmark", "memory", "graph",
    "worker", "queue", "gpu", "checkpoint", "retrieval", "parser",
    "static", "source", "llm", "language",
})
# Match the actual vocabulary used in JREI's standing self-research
# topics. This mapping is a research HYPOTHESIS, not licence clearance or
# proof that an upstream algorithm is compatible with the selected file.
COMPONENTS = (
    ("tokenizer", "platform/jrei-python/jrei_service/windows_native_corpus.py"),
    ("token", "platform/jrei-python/jrei_service/windows_native_corpus.py"),
    ("training", "platform/jrei-python/jrei_service/windows_native_neural.py"),
    ("train", "platform/jrei-python/jrei_service/windows_native_neural.py"),
    ("transformer", "platform/jrei-python/jrei_service/windows_native_neural.py"),
    ("inference", "platform/jrei-python/jrei_service/windows_native_inference.py"),
    ("gpu", "platform/jrei-python/jrei_service/windows_resource_envelope.py"),
    ("cpu", "platform/jrei-python/jrei_service/windows_resource_envelope.py"),
    ("directml", "platform/jrei-python/jrei_service/windows_resource_envelope.py"),
    ("worker", "platform/jrei-v5/windows-worker/jrei-worker.mjs"),
    ("distributed", "platform/jrei-v5/windows-worker/jrei-worker.mjs"),
    ("queue", "platform/jrei-v5/windows-worker/jrei-worker.mjs"),
    ("memory", "platform/jrei-python/jrei_service/windows_evidence_memory.py"),
    ("retrieval", "platform/jrei-python/jrei_service/windows_evidence_memory.py"),
    ("evaluation", "platform/jrei-python/jrei_learning/method_feedback.py"),
    ("benchmark", "platform/jrei-python/jrei_learning/method_feedback.py"),
    ("repair", "platform/jrei-python/jrei_service/windows_workspace.py"),
    ("code", "platform/jrei-python/jrei_service/windows_workspace.py"),
    ("agent", "platform/jrei-python/jrei_service/windows_workspace.py"),
    ("learning", "platform/jrei-python/jrei_learning/strategy_optimizer.py"),
    ("metacognitive", "platform/jrei-python/jrei_learning/metacognitive_cycle.py"),
    ("static", "platform/jrei-python/jrei_service/windows_self_development.py"),
    ("source", "platform/jrei-python/jrei_service/windows_open_source_mission.py"),
    ("research", "platform/jrei-python/jrei_learning/value_of_information.py"),
)
MAX_JSON = 210000
MAX_SOURCE_BYTES = 50000
REFRESH = 12 * 3600
RETRY = 30 * 60
LEASE = 120


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, url):
        raise ValueError("JREI_OSS_REDIRECT_REFUSED")


def _open(db_path: Path):
    db = sqlite3.connect(db_path, timeout=12)
    db.execute("PRAGMA busy_timeout=12000")
    return db


def initialize(db_path: Path) -> None:
    """Add fields only to the existing owner-private database."""
    with closing(_open(db_path)) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS jrei_oss_code_studies(
          domain TEXT NOT NULL,
          repository TEXT NOT NULL,
          last_attempt INTEGER,
          next_due INTEGER NOT NULL DEFAULT 0,
          lease_until INTEGER NOT NULL DEFAULT 0,
          revision TEXT,
          last_state TEXT NOT NULL DEFAULT 'NEVER_STUDIED',
          last_success INTEGER,
          attempts INTEGER NOT NULL DEFAULT 0,
          studies INTEGER NOT NULL DEFAULT 0,
          license_sha256 TEXT,
          readme_sha256 TEXT,
          source_sha256 TEXT,
          source_path TEXT,
          source_signatures_json TEXT NOT NULL DEFAULT '[]',
          research_notes_json TEXT NOT NULL DEFAULT '{}',
          adaptation_target TEXT,
          local_source_sha256 TEXT,
          candidate_api_differences_json TEXT NOT NULL DEFAULT '[]',
          receipt_sha256 TEXT,
          PRIMARY KEY(domain,repository))""")
        db.execute("""CREATE INDEX IF NOT EXISTS jrei_oss_code_studies_due
          ON jrei_oss_code_studies(next_due,lease_until)""")
        # Existing owner-private ledgers can predate the excerpt/comparison
        # columns. Add missing columns without replacing the table or data.
        present = {row[1] for row in db.execute(
            "PRAGMA table_info(jrei_oss_code_studies)").fetchall()}
        additions = (
            ("research_notes_json", "TEXT NOT NULL DEFAULT '{}'"),
            ("local_source_sha256", "TEXT"),
            ("candidate_api_differences_json", "TEXT NOT NULL DEFAULT '[]'"),
        )
        for column, sql_type in additions:
            if column not in present:
                db.execute("ALTER TABLE jrei_oss_code_studies ADD COLUMN " +
                           column + " " + sql_type)
        db.commit()


def _request(path: str) -> dict | list:
    """A fixed GitHub REST route: no arbitrary URL, redirects or proxies."""
    if (not path.startswith("/repos/") or len(path) > 460
            or "//" in path or ".." in path):
        raise ValueError("JREI_OSS_CODE_ROUTE_INVALID")
    request = urllib.request.Request(
        API + path, method="GET",
        headers={"Accept": "application/vnd.github+json",
                 "User-Agent": "JREI-OSS-Public-Source-Study/1",
                 "X-GitHub-Api-Version": "2022-11-28"})
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}), _NoRedirect())
    try:
        with opener.open(request, timeout=12) as response:
            if response.status != 200 or not response.headers.get(
                    "Content-Type", "").lower().startswith("application/json"):
                raise ValueError("JREI_OSS_CODE_RESPONSE_NOT_JSON")
            data = response.read(MAX_JSON + 1)
    except urllib.error.HTTPError as exc:
        if exc.code in (403, 429):
            raise ValueError("JREI_OSS_UPSTREAM_RATE_DEFERRED") from exc
        if exc.code in (404, 451):
            raise ValueError("JREI_OSS_UPSTREAM_SOURCE_UNAVAILABLE") from exc
        raise ValueError("JREI_OSS_UPSTREAM_HTTP_UNAVAILABLE") from exc
    if len(data) > MAX_JSON:
        raise ValueError("JREI_OSS_CODE_RESPONSE_OVERSIZE")
    value = json.loads(data.decode("utf-8"))
    if not isinstance(value, (list, dict)):
        raise ValueError("JREI_OSS_CODE_INVALID_JSON")
    return value


def _contents(repository: str, revision: str, location: str) -> list[dict]:
    if (not REPOSITORY.fullmatch(repository) or
            not REVISION.fullmatch(revision) or
            (location and not SOURCE_NAME.fullmatch(location))):
        raise ValueError("JREI_OSS_CODE_SELECTION_INVALID")
    suffix = "contents/" + urllib.parse.quote(location, safe="/") if location \
        else "contents"
    obj = _request("/repos/" + repository + "/" + suffix +
                   "?" + urllib.parse.urlencode({"ref": revision}))
    if not isinstance(obj, list):
        raise ValueError("JREI_OSS_CODE_TREE_NOT_LIST")
    return [v for v in obj[:200] if isinstance(v, dict)]


def _file(repository: str, revision: str, location: str) -> tuple[bytes, str]:
    if not SOURCE_NAME.fullmatch(location):
        raise ValueError("JREI_OSS_CODE_FILE_NAME_INVALID")
    obj = _request("/repos/" + repository + "/contents/" +
                   urllib.parse.quote(location, safe="/") +
                   "?" + urllib.parse.urlencode({"ref": revision}))
    if (not isinstance(obj, dict) or obj.get("type") != "file"
            or obj.get("encoding") != "base64"
            or not isinstance(obj.get("content"), str)):
        raise ValueError("JREI_OSS_CODE_FILE_FORMAT_UNAVAILABLE")
    try:
        content = base64.b64decode(obj["content"], validate=False)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("JREI_OSS_CODE_BASE64_INVALID") from exc
    if len(content) > MAX_SOURCE_BYTES:
        raise ValueError("JREI_OSS_CODE_FILE_TOO_LARGE")
    blob = obj.get("sha")
    if not isinstance(blob, str) or not REVISION.fullmatch(blob):
        raise ValueError("JREI_OSS_CODE_BLOB_UNKNOWN")
    # Verify returned Git blob is actually derived from the retrieved bytes.
    git_blob = hashlib.sha1(b"blob " + str(len(content)).encode("ascii") +
                            b"\x00" + content).hexdigest()
    if git_blob != blob:
        raise ValueError("JREI_OSS_CODE_BLOB_MISMATCH")
    return content, hashlib.sha256(content).hexdigest()


def _choose(entries: list[dict], *, query: str,
            suffixes: tuple[str, ...]) -> str | None:
    terms = set(re.findall(r"[a-z]{3,}", query.lower()))
    def rating(item):
        name = str(item.get("name", "")).lower()
        words = set(re.findall(r"[a-z]{3,}", name))
        return (len(terms & words) * 6 +
                len(_RELEVANCE_TERMS & words) * 2 +
                (1 if "main" in name or "model" in name else 0))
    options = [item for item in entries
               if item.get("type") == "file"
               and isinstance(item.get("path"), str)
               and SOURCE_NAME.fullmatch(item["path"])
               and item["path"].lower().endswith(suffixes)
               and isinstance(item.get("size"), int)
               and 0 < item["size"] <= MAX_SOURCE_BYTES]
    return str(max(options, key=lambda v: (rating(v), -len(v["path"]),
                                          v["path"]))["path"]) if options else None


def _source_signatures(content: bytes, file_path: str) -> list[dict]:
    try:
        text = content.decode("utf-8", errors="strict")
    except UnicodeError:
        return []
    signatures: list[dict] = []
    if file_path.endswith(".py"):
        try:
            tree = ast.parse(text, filename=file_path)
        except (SyntaxError, ValueError, MemoryError):
            return []
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef,
                                 ast.ClassDef)):
                signatures.append({"line": node.lineno, "name": node.name[:90],
                                   "kind": type(node).__name__})
                if len(signatures) >= 28:
                    break
    else:
        for idx, line in enumerate(text.splitlines(), 1):
            if SIGNATURE.match(line):
                signatures.append({"line": idx,
                                   "signature": line.strip()[:160]})
                if len(signatures) >= 28:
                    break
    return signatures


def _notes(data: bytes, query: str, *, label: str) -> list[dict]:
    """Retain small, line-anchored evidence, never an upstream codebase.

    Text is untrusted DATA; quoted public-source lines are not agent
    instructions. Credential-looking lines are not persisted in the ledger.
    """
    try:
        text = data.decode("utf-8", errors="strict")
    except UnicodeError:
        return []
    terms = {t for t in re.findall(r"[a-z]{3,}", query.casefold())
             if t not in {"python", "javascript", "code", "from", "with"}}
    blocked = re.compile(
        r"(?i)(-----BEGIN|password\s*[:=]|private[_-]?key|"
        r"api[_-]?key\s*[:=]|bearer\s+[A-Za-z0-9_-]{15,}|"
        r"secret\s*[:=]|access[_-]?token\s*[:=])")
    ranked = []
    for number, raw in enumerate(text.splitlines()[:3000], 1):
        line = raw.strip()
        if len(line) < 10 or len(line) > 240 or blocked.search(line):
            continue
        words = set(re.findall(r"[a-z]{3,}", line.casefold()))
        overlap = len(terms & words)
        if label == "code":
            is_api = bool(SIGNATURE.match(raw))
            if not overlap and not is_api:
                continue
            score = overlap * 3 + int(is_api)
        else:
            if not overlap:
                continue
            score = overlap * 3
        ranked.append((score,number,line[:175]))
    ranked.sort(key=lambda row: (-row[0],row[1]))
    return [{"source_kind":label,"line":number,"excerpt":line}
            for _score,number,line in ranked[:6]]


def _target_for(query: str) -> str | None:
    lower = query.casefold()
    for word, component in COMPONENTS:
        if re.search(r"\b" + re.escape(word) + r"\b", lower):
            return component
    return None


def _read_one(repository: str, query: str) -> dict:
    if not REPOSITORY.fullmatch(repository):
        raise ValueError("JREI_OSS_REPOSITORY_INVALID")
    info = _request("/repos/" + repository)
    if (not isinstance(info, dict) or
            not isinstance(info.get("full_name"), str) or
            info["full_name"].casefold() != repository.casefold()):
        raise ValueError("JREI_OSS_REPOSITORY_IDENTITY_MISMATCH")
    branch = info.get("default_branch")
    if not isinstance(branch, str) or not 1 <= len(branch) <= 150:
        raise ValueError("JREI_OSS_BRANCH_INVALID")
    commit = _request("/repos/" + repository + "/commits/" +
                      urllib.parse.quote(branch, safe=""))
    if not isinstance(commit, dict) or not REVISION.fullmatch(str(commit.get("sha", ""))):
        raise ValueError("JREI_OSS_COMMIT_INVALID")
    revision = str(commit["sha"])
    root = _contents(repository, revision, "")
    root_file = _choose(root, query=query, suffixes=CODE_SUFFIXES)
    readme = next((str(x["path"]) for x in root if x.get("type") == "file"
                   and str(x.get("name", "")).lower() in
                   ("readme.md", "readme.rst", "readme.txt", "readme")), None)
    licence = next((str(x["path"]) for x in root if x.get("type") == "file"
                    and str(x.get("name", "")).lower() in
                    ("license", "license.md", "license.txt", "licence",
                     "licence.md", "copying")), None)
    if root_file is None or Path(root_file).name.lower() in (
            "setup.py", "__init__.py", "conftest.py", "manage.py"):
        folders = [x for x in root if x.get("type") == "dir" and
                   str(x.get("name", "")).lower() in
                   ("src", "lib", "source", "python", "pkg", "app", "core", "model")]
        if folders:
            folders.sort(key=lambda x: (str(x.get("name", "")) not in
                                        ("src", "lib", "source"), x.get("path", "")))
            nested = _choose(_contents(repository, revision,
                                      str(folders[0]["path"])),
                             query=query, suffixes=CODE_SUFFIXES)
            if nested is not None:
                root_file = nested
    source_sha = None
    signatures: list[dict] = []
    code_notes: list[dict] = []
    readme_notes: list[dict] = []
    if root_file:
        data, source_sha = _file(repository, revision, root_file)
        signatures = _source_signatures(data, root_file)
        code_notes = _notes(data, query, label="code")
    readme_sha = None
    licence_sha = None
    if readme:
        try:
            _data, readme_sha = _file(repository, revision, readme)
            readme_notes = _notes(_data, query, label="readme")
        except (ValueError, OSError, urllib.error.URLError):
            readme_sha = None
    if licence:
        try:
            _data, licence_sha = _file(repository, revision, licence)
        except (ValueError, OSError, urllib.error.URLError):
            licence_sha = None
    if not source_sha and not readme_sha:
        raise ValueError("JREI_OSS_NO_STUDY_MATERIAL_RETRIEVED")
    receipt = {
        "schema": SCHEMA, "repository": repository, "revision": revision,
        "source_path": root_file, "source_sha256": source_sha,
        "readme_sha256": readme_sha, "license_sha256": licence_sha,
        "source_signatures": signatures,
        "research_notes": {"code":code_notes,"readme":readme_notes},
        "target": _target_for(query),
        "language_model_used": False,
        "source_read_authenticated_to_git_revision": True,
        "permission_to_reuse_code_verified": False,
        "code_copied_or_executed": False,
        "github_or_production_changed": False,
    }
    receipt["receipt_sha256"] = hashlib.sha256(json.dumps(
        receipt, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return receipt


def _local_comparison(repo: Path, receipt: dict) -> dict:
    """Cross-reference upstream public API identifiers with JREI's own code.

    Missing/extra names are research *leads*, not missing features or
    established compatibility. Nothing is installed, executed or copied.
    """
    target = receipt.get("target")
    if not isinstance(target, str):
        return {"local_sha256":None,"candidate_api_differences":[]}
    try:
        root = repo.resolve(strict=True)
        file = root.joinpath(*target.split("/"))
        if (not file.is_file() or file.is_symlink()
                or not file.resolve(strict=True).is_relative_to(root)
                or file.stat().st_size > 320000):
            return {"local_sha256":None,"candidate_api_differences":[]}
        data = file.read_bytes()
    except (OSError,ValueError):
        return {"local_sha256":None,"candidate_api_differences":[]}
    existing = _source_signatures(data,target)
    own_names = {str(item.get("name") or item.get("signature","")).lower()
                 for item in existing}
    upstream = receipt.get("source_signatures") or []
    hypotheses = []
    for item in upstream:
        name = str(item.get("name") or item.get("signature","")).lower()
        if not name or name in own_names:
            continue
        hypotheses.append({
            "upstream_symbol":str(item.get("name") or
                                  item.get("signature",""))[:130],
            "upstream_line":item.get("line"),
            "status":"POTENTIAL_PATTERN_TO_RESEARCH_NOT_A_CODE_GAP",
        })
        if len(hypotheses) >= 12:
            break
    return {"local_sha256":hashlib.sha256(data).hexdigest(),
            "candidate_api_differences":hypotheses}


def tick(db_path: Path, *, repo: Path,
         resources_available: bool, owner_active: bool = False) -> dict:
    """Advance one permitted, source-pinned OSS reading task."""
    if type(resources_available) is not bool:
        raise ValueError("JREI_OSS_CODE_RESOURCE_FLAG_INVALID")
    if not resources_available or owner_active:
        return {"schema": SCHEMA, "state": "HELD_RESOURCE_OR_FOREGROUND"}
    now = int(time.time())
    with closing(_open(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        authorized = db.execute("""SELECT enabled FROM jrei_oss_controls
            WHERE name='public_github_research'""").fetchone()
        if not authorized or authorized[0] != 1:
            db.rollback()
            return {"schema": SCHEMA, "state": "RESEARCH_DISABLED"}
        candidate = db.execute("""SELECT c.domain,c.repository,t.query
            FROM jrei_oss_candidates AS c
            JOIN jrei_oss_topics AS t ON t.domain=c.domain
            LEFT JOIN jrei_oss_code_studies AS s ON s.domain=c.domain
                AND s.repository=c.repository
            WHERE (c.domain LIKE 'self_%' OR c.domain LIKE 'problem_%')
              AND c.owner_review IN ('DISCOVERED_UNVERIFIED','REVIEW_SOURCE')
              AND (s.next_due IS NULL OR s.next_due<=?)
              AND (s.lease_until IS NULL OR s.lease_until<=?)
            ORDER BY COALESCE(s.last_attempt,0), c.last_seen DESC,
                c.domain,c.repository LIMIT 1""", (now,now)).fetchone()
        if candidate is None:
            db.rollback()
            return {"schema": SCHEMA, "state": "NO_CODE_CANDIDATE_DUE"}
        domain, repository, query = candidate
        db.execute("""INSERT INTO jrei_oss_code_studies(
            domain,repository,last_attempt,next_due,lease_until,attempts)
            VALUES(?,?,?,?,?,1)
            ON CONFLICT(domain,repository) DO UPDATE SET
            last_attempt=excluded.last_attempt,
            lease_until=excluded.lease_until, attempts=attempts+1""",
            (domain, repository, now, now+RETRY, now+LEASE))
        db.commit()
    receipt = None
    state = "UPSTREAM_UNAVAILABLE"
    try:
        receipt = _read_one(repository, query)
        comparison = _local_comparison(repo,receipt)
        receipt.update(comparison)
        receipt["receipt_sha256"] = hashlib.sha256(json.dumps(
            {k:v for k,v in receipt.items() if k != "receipt_sha256"},
            sort_keys=True,separators=(",",":")).encode("utf-8")
        ).hexdigest()
        state = "SOURCE_REVISION_STUDIED_UNREVIEWED"
    except (OSError, ValueError, RuntimeError, TypeError, UnicodeError,
            json.JSONDecodeError, urllib.error.URLError) as exc:
        state = ("UPSTREAM_RATE_DEFERRED" if
                 str(exc) == "JREI_OSS_UPSTREAM_RATE_DEFERRED"
                 else "UPSTREAM_UNAVAILABLE")
    next_due = now + (REFRESH if receipt else RETRY)
    with closing(_open(db_path)) as db:
        db.execute("""UPDATE jrei_oss_code_studies
          SET next_due=?,lease_until=0,
              revision=CASE WHEN ? THEN ? ELSE revision END,
              last_state=?,last_success=CASE WHEN ? THEN ?
                  ELSE last_success END,
              studies=studies+?,
              license_sha256=CASE WHEN ? THEN ? ELSE license_sha256 END,
              readme_sha256=CASE WHEN ? THEN ? ELSE readme_sha256 END,
              source_sha256=CASE WHEN ? THEN ? ELSE source_sha256 END,
              source_path=CASE WHEN ? THEN ? ELSE source_path END,
              source_signatures_json=CASE WHEN ? THEN ?
                  ELSE source_signatures_json END,
              research_notes_json=CASE WHEN ? THEN ?
                  ELSE research_notes_json END,
              adaptation_target=CASE WHEN ? THEN ?
                  ELSE adaptation_target END,
              local_source_sha256=CASE WHEN ? THEN ?
                  ELSE local_source_sha256 END,
              candidate_api_differences_json=CASE WHEN ? THEN ?
                  ELSE candidate_api_differences_json END,
              receipt_sha256=CASE WHEN ? THEN ? ELSE receipt_sha256 END
          WHERE domain=? AND repository=?""",
          (next_due,
           int(receipt is not None), receipt["revision"] if receipt else None,
           state,int(receipt is not None),now,int(receipt is not None),
           int(receipt is not None),receipt["license_sha256"] if receipt else None,
           int(receipt is not None),receipt["readme_sha256"] if receipt else None,
           int(receipt is not None),receipt["source_sha256"] if receipt else None,
           int(receipt is not None),receipt["source_path"] if receipt else None,
           int(receipt is not None),
           json.dumps(receipt["source_signatures"],ensure_ascii=False)
               if receipt else None,
           int(receipt is not None),
           json.dumps(receipt["research_notes"],ensure_ascii=False)
               if receipt else None,
           int(receipt is not None),receipt["target"] if receipt else None,
           int(receipt is not None),receipt["local_sha256"] if receipt else None,
           int(receipt is not None),
           json.dumps(receipt["candidate_api_differences"],
                      ensure_ascii=False) if receipt else None,
           int(receipt is not None),receipt["receipt_sha256"] if receipt else None,
           domain,repository))
        db.commit()
    return {
        "schema": SCHEMA, "state": state, "repository": repository,
        "revision": receipt["revision"] if receipt else None,
        "source_read": bool(receipt and receipt["source_sha256"]),
        "readme_read": bool(receipt and receipt["readme_sha256"]),
        "license_text_observed": bool(receipt and receipt["license_sha256"]),
        "candidate_change_applied": False,
        "local_api_compared": bool(receipt and receipt["local_sha256"]),
        "adaptation_hypotheses": len(
            receipt["candidate_api_differences"]) if receipt else 0,
        "source_excerpt_count": sum(len(v) for v in
             receipt["research_notes"].values()) if receipt else 0,
        "language_model_used": False,
    }


def snapshot(db_path: Path) -> dict:
    """Counts of genuinely observed source material, never inferred learning."""
    with closing(_open(db_path)) as db:
        summary = db.execute("""SELECT COUNT(*),
            COALESCE(SUM(attempts),0),COALESCE(SUM(studies),0),
            COALESCE(SUM(CASE WHEN source_sha256 IS NOT NULL
                THEN 1 ELSE 0 END),0),
            COALESCE(SUM(CASE WHEN source_sha256 IS NOT NULL
                AND source_signatures_json NOT IN ('[]','')
                THEN 1 ELSE 0 END),0)
            FROM jrei_oss_code_studies""").fetchone()
        latest = db.execute("""SELECT repository,revision,last_state,
            source_path,source_sha256,readme_sha256,license_sha256,
            adaptation_target,last_attempt,last_success
            FROM jrei_oss_code_studies
            ORDER BY COALESCE(last_attempt,0) DESC LIMIT 1""").fetchone()
    return {
        "schema": SCHEMA,
        "repositories_attempted": int(summary[0] or 0),
        "reading_attempts": int(summary[1] or 0),
        "recorded_successes": int(summary[2] or 0),
        "source_files_read": int(summary[3] or 0),
        "repositories_with_source_signatures": int(summary[4] or 0),
        "most_recent": dict(zip(
            ("repository","revision","state","source_path","source_sha256",
             "readme_sha256","license_sha256","adaptation_target",
             "last_attempt_at","last_success_at"),
            latest)) if latest else None,
        "source_revision_pinned": True,
        "attempt_count_is_not_model_learning": True,
        "local_code_comparison_is_only_hypothesis": True,
        "third_party_code_executed": False,
        "automatic_source_promotion": False,
        "independent_quality_gain_verified": False,
    }
