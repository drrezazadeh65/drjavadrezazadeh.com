"""Continuous owner-authorized public open-source research for ORIGINAL JREI.

Uses ONLY the existing stdlib GitHub metadata adapter, existing command-center
scheduler and existing missions.sqlite3. Does not install apps, download or
execute third-party code, change model weights, push commits or publish a site.
Owner has delegated discovery, comparison and proposal preparation, NOT
authorization to bypass technical validation of executable replacements.
Missed cycles are never fabricated when a PC/service is offline.
"""
from __future__ import annotations

from contextlib import closing
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import time

from jrei_service import windows_open_source_discovery as discovery

SCHEMA = "jr.jrei.continuous-code-research.v1"
REPO_RE = re.compile(r"^[A-Za-z0-9_.-]{1,80}/[A-Za-z0-9_.-]{1,100}$")
ID_RE = re.compile(r"^[a-z][a-z0-9_]{3,48}$")
SELF_DEVELOPMENT_TOPICS = (
    ("self_native_model", "tiny transformer training from scratch python"),
    ("self_code_generation", "python code synthesis local agent"),
    ("self_code_repair", "python automatic program repair"),
    ("self_source_analysis", "python ast static analysis refactoring"),
    ("self_eval", "python code generation benchmark evaluation"),
    ("self_learning", "continual learning catastrophic forgetting python"),
    ("self_memory", "sqlite local knowledge graph retrieval"),
    ("self_tokenizer", "persian english byte pair tokenizer"),
    ("self_gpu", "windows amd gpu pytorch directml"),
    ("self_cpu", "cpu efficient transformer inference python"),
    ("self_fleet", "distributed worker queue fault tolerant python"),
    ("self_security", "python sandbox source code security review"),
    ("self_checkpoint", "pytorch checkpoint recovery training"),
    ("self_research", "autonomous software engineering research agent"),
    ("self_metacognition", "metacognitive agent self evaluation learning"),
    ("self_code_provenance", "open source evidence provenance software code"),
    ("self_corpus_review", "multilingual dataset provenance duplicate detection"),
    ("self_selftest_design", "python code review evaluation methodology"),
)
# Old rows remain stored for audit history; only self_* and problem_*
# research topics are selected while the owner's AI-only mission applies.

NORMAL_REFRESH = 15 * 3600
FAIL_BACKOFF_MAX = 6 * 3600
MIN_ATTEMPT_SPACING = 150
REVIEW_STATES = ("DISCOVERED_UNVERIFIED", "REVIEW_SOURCE", "DISMISSED")
SCHEMA_FLAGS = {
    "external_app_installed": False,
    "source_copied_automatically": False,
    "unreviewed_executable_code_activated": False,
    "model_weights_changed": False,
    "github_write_performed": False,
    "production_site_changed": False,
}


def _db(path: Path):
    db = sqlite3.connect(path, timeout=12)
    db.execute("PRAGMA busy_timeout=12000")
    return db


def initialize(db_path: Path) -> None:
    """Additive metadata-only state inside original private missions.sqlite3."""
    with closing(_db(db_path)) as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS jrei_oss_controls(
          name TEXT PRIMARY KEY, enabled INTEGER NOT NULL, changed INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS jrei_oss_topics(
          domain TEXT PRIMARY KEY, query TEXT NOT NULL,
          next_due INTEGER NOT NULL DEFAULT 0,
          lease_until INTEGER NOT NULL DEFAULT 0,
          last_attempt INTEGER, last_success INTEGER,
          errors INTEGER NOT NULL DEFAULT 0,
          attempts INTEGER NOT NULL DEFAULT 0,
          successes INTEGER NOT NULL DEFAULT 0,
          last_state TEXT NOT NULL DEFAULT 'NEVER_SEARCHED');
        CREATE INDEX IF NOT EXISTS jrei_oss_topics_due
          ON jrei_oss_topics(next_due,lease_until);
        CREATE TABLE IF NOT EXISTS jrei_oss_candidates(
          domain TEXT NOT NULL, repository TEXT NOT NULL,
          description TEXT NOT NULL, license_metadata TEXT NOT NULL,
          stars_metadata INTEGER NOT NULL,
          pushed_at_metadata TEXT NOT NULL,
          first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL,
          owner_review TEXT NOT NULL DEFAULT 'DISCOVERED_UNVERIFIED',
          PRIMARY KEY(domain,repository));
        CREATE TABLE IF NOT EXISTS jrei_oss_observations(
          id INTEGER PRIMARY KEY AUTOINCREMENT, observed INTEGER NOT NULL,
          domain TEXT NOT NULL, state TEXT NOT NULL,
          candidate_count INTEGER NOT NULL, metadata_sha256 TEXT NOT NULL,
          error_code TEXT NOT NULL);
        """)
        # Owner's explicit standing authorization covers public metadata
        # searches. Source URL crawling and training rights are separate.
        db.execute("""INSERT OR IGNORE INTO jrei_oss_controls(
           name,enabled,changed) VALUES('public_github_research',1,?)""",
           (int(time.time()),))
        db.executemany("""INSERT OR IGNORE INTO jrei_oss_topics(
           domain,query) VALUES(?,?)""", SELF_DEVELOPMENT_TOPICS)
        db.commit()


def set_enabled(db_path: Path, *, enabled: bool,
                owner_authenticated: bool) -> dict:
    if type(enabled) is not bool or owner_authenticated is not True:
        raise ValueError("JREI_OSS_CONTROL_AUTH_REQUIRED")
    with closing(_db(db_path)) as db:
        db.execute("""UPDATE jrei_oss_controls SET enabled=?,changed=?
            WHERE name='public_github_research'""",
            (int(enabled),int(time.time())))
        db.commit()
    return {"schema":SCHEMA,"state":"ENABLED" if enabled else "DISABLED",
            **SCHEMA_FLAGS}


def _enabled(db) -> bool:
    rec=db.execute("""SELECT enabled FROM jrei_oss_controls
        WHERE name='public_github_research'""").fetchone()
    return bool(rec and rec[0] == 1)


def _seed_problem_topics(db) -> int:
    """Turn real runtime failure signatures into research problems.

    Topics are generated from LOCAL diagnostic codes, never from retrieved
    source instructions or arbitrary network text. They accumulate over time
    instead of being limited to the initial list of technical domains.
    Adding a topic does not grant network, source-copy or execution rights.
    """
    failures = ("ERROR", "FAILED", "UNAVAILABLE", "BLOCKED",
                "MISSING", "REJECTED", "INVALID", "DEFERRED")
    rows = db.execute("""SELECT kind,state FROM events
        ORDER BY id DESC LIMIT 240""").fetchall()
    inserted = 0
    seen = set()
    for kind, state in rows:
        if not isinstance(kind, str) or not isinstance(state, str):
            continue
        signature = (kind + "_" + state).upper()
        if not any(flag in signature for flag in failures):
            continue
        if not re.fullmatch(r"[A-Za-z0-9_ -]{4,150}", signature):
            continue
        domain = "problem_" + hashlib.sha256(
            signature.encode("ascii")).hexdigest()[:18]
        if domain in seen:
            continue
        seen.add(domain)
        # Diagnosed failures, not source reputation, define the question.
        # No external/source-provided strings are executed or trusted here.
        intent = (
            "python small language model training from scratch"
            if "MODEL_UNAVAILABLE" in signature else
            "python gpu compute directml compatibility"
            if "GPU" in signature or "CUDA" in signature else
            "python distributed job queue worker recovery"
            if "WORKER" in signature or "LEASE" in signature else
            "python sqlite transaction concurrency recovery"
            if "SQLITE" in signature or "DATABASE" in signature else
            "python native model checkpoint validation"
            if "CHECKPOINT" in signature or "TRAIN" in signature else
            "python automatic program repair code agent"
            if "CODE" in signature or "PATCH" in signature else
            "python evidence retrieval source provenance"
            if "SOURCE" in signature or "EVIDENCE" in signature else
            "python fault diagnosis runtime recovery"
        )
        query = intent
        if not discovery.QUERY.fullmatch(query) or len(query.split()) > 7:
            continue
        before = db.total_changes
        db.execute("""INSERT OR IGNORE INTO jrei_oss_topics
            (domain,query) VALUES(?,?)""", (domain,query))
        if db.total_changes > before:
            inserted += 1
        # Per-iteration work budget, not a permanent limit on topics.
        if inserted >= 24:
            break
    # Static source review produces problem statements without a language
    # model. Inspect types, not source text; no private code goes to GitHub.
    table = db.execute("""SELECT 1 FROM sqlite_master
        WHERE type='table' AND name='jrei_self_code_findings'""").fetchone()
    if table:
        learning_queries = {
            "BARE_EXCEPT": "python exception handling static analysis refactoring",
            "DYNAMIC_CODE_CALL": "python dynamic code execution risk analysis",
            "PYTHON_SYNTAX_ISSUE": "python ast syntax automated repair",
            "DYNAMIC_CODE_CALL_PATTERN":
                "javascript static analysis dynamic code calls",
            "CHILD_PROCESS_REFERENCE_PATTERN":
                "nodejs child process static analysis safety",
            "MUTABLE_DEFAULT_ARGUMENT":
                "python mutable default arguments code analysis",
            "SILENT_EXCEPTION_PASS":
                "python exception silent failure recovery",
            "NETWORK_CALL_NO_TIMEOUT":
                "python network timeout retry practices",
            "PROCESS_CALL_NO_TIMEOUT":
                "python subprocess timeout process isolation",
        }
        problems = db.execute("""SELECT finding_kind,COUNT(*)
            FROM jrei_self_code_findings
            GROUP BY finding_kind ORDER BY COUNT(*) DESC""").fetchall()
        for issue, count in problems:
            if count <= 0 or issue not in learning_queries:
                continue
            domain = "problem_" + hashlib.sha256(
                ("SELF_CODE_" + issue).encode("ascii")).hexdigest()[:18]
            before = db.total_changes
            db.execute("""INSERT OR IGNORE INTO jrei_oss_topics(
                domain,query) VALUES(?,?)""",
                (domain, learning_queries[issue]))
            if db.total_changes > before:
                inserted += 1
    # Close the loop: independent no-execution reviews of isolated code
    # candidates generate new research questions. Only internal diagnostic
    # labels enter this lookup; upstream excerpts and model replies cannot
    # supply arbitrary GitHub queries or override the agenda.
    review_queries = {
        "PUBLIC_ENTRY_POINT_REMOVED_REVIEW_REQUIRED":
            "python backward compatible api refactoring",
        "PUBLIC_CALL_SIGNATURE_CHANGED_REVIEW_REQUIRED":
            "python callable signature compatibility refactoring",
        "NEW_DEPENDENCY_REVIEW_REQUIRED":
            "python dependency isolation reproducible builds",
        "MODULE_IMPORT_TIME_CALL_REVIEW_REQUIRED":
            "python module import side effects analysis",
        "EXCEPTION_CATCH_BEHAVIOR_CHANGED":
            "python bare except exception compatibility",
        "SILENT_EXCEPTION_BEHAVIOR_CHANGED":
            "python exception propagation behavior compatibility",
        "ORIGINAL_SHA_MISMATCH":
            "python content addressed patch conflict detection",
        "CANONICAL_SOURCE_CHANGED":
            "python source pinning patch rebase strategy",
        "PYTHON_STATIC_ANALYSIS_UNAVAILABLE":
            "python ast static review complexity",
        "STATIC_ANALYSIS_INCOMPLETE":
            "python static analyzer bounded analysis",
        "JAVASCRIPT_AST_NOT_INDEPENDENTLY_PARSED":
            "javascript ast syntax review parser",
    }
    for table in ("jrei_candidate_static_reviews",
                  "jrei_rule_static_reviews"):
        exists = db.execute("""SELECT 1 FROM sqlite_master
            WHERE type='table' AND name=?""", (table,)).fetchone()
        if not exists:
            continue
        # The table identifier is a fixed string from the internal tuple;
        # no SQL identifier originates from the user or external source.
        samples = db.execute(
            "SELECT static_risk_flags_json FROM " + table +
            " ORDER BY reviewed_at DESC LIMIT 150").fetchall()
        for (encoded,) in samples:
            try:
                flags = json.loads(encoded)
            except (ValueError, TypeError):
                continue
            if not isinstance(flags, list):
                continue
            for issue in flags[:12]:
                if not isinstance(issue, str) or issue not in review_queries:
                    continue
                domain = "problem_" + hashlib.sha256(
                    ("STATIC_REVIEW_" + issue).encode("ascii")
                ).hexdigest()[:18]
                before = db.total_changes
                db.execute("""INSERT OR IGNORE INTO jrei_oss_topics(
                    domain,query) VALUES(?,?)""",
                    (domain,review_queries[issue]))
                if db.total_changes > before:
                    inserted += 1
    return inserted


def tick(db_path: Path, *, resources_available: bool,
         owner_active: bool = False) -> dict:
    """One bounded GitHub search per eligible scheduler invocation.

    Rate-aware refresh is per topic, never a global daily activity cap.
    Only AI self-development and observed runtime problems are scheduled;
    unrelated website or content topics remain in the ledger but stay idle.
    """
    if type(resources_available) is not bool:
        raise ValueError("JREI_OSS_RESOURCE_GUARD_INVALID")
    if not resources_available or owner_active:
        return {"schema":SCHEMA, "state":"HELD_FOREGROUND_OR_RESOURCE",
                "live_search":False, "continues_when_service_running":True}
    now=int(time.time())
    with closing(_db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        if not _enabled(db):
            db.rollback()
            return {"schema":SCHEMA,"state":"DISABLED","live_search":False}
        _seed_problem_topics(db)
        row=db.execute("""SELECT domain,query,errors
            FROM jrei_oss_topics WHERE next_due<=? AND lease_until<=?
              AND (domain LIKE 'self_%' OR domain LIKE 'problem_%')
            ORDER BY next_due,COALESCE(last_attempt,0),domain LIMIT 1""",
            (now,now)).fetchone()
        if row is None:
            db.rollback()
            return {"schema":SCHEMA,"state":"NO_TOPIC_DUE","live_search":False}
        domain,query,errors=row
        db.execute("""UPDATE jrei_oss_topics
            SET lease_until=?,last_attempt=?,attempts=attempts+1
            WHERE domain=?""",(now+90,now,domain))
        db.commit()
    items=[]
    live=False
    cached=False
    processed=False
    state="NETWORK_UNAVAILABLE"
    detail="UPSTREAM_UNREACHABLE"
    try:
        response=discovery.find_repositories(query)
        live=response.get("actual_live_search_performed") is True
        cached=response.get("served_from_cache") is True
        state=response.get("state","INVALID_RESPONSE")
        processed=(state=="READ_ONLY_UNVERIFIED_GITHUB_REPO_CANDIDATES"
                   and (live or cached))
        if processed:
            raw=response.get("items")
            if not isinstance(raw,list):
                raise ValueError("JREI_OSS_RESULT_SHAPE_INVALID")
            for entry in raw[:8]:
                if not isinstance(entry,dict):
                    continue
                name=entry.get("repository")
                license_id=entry.get("license_reported_by_github")
                if (not isinstance(name,str) or not REPO_RE.fullmatch(name)
                    or not isinstance(license_id,str) or not license_id.strip()):
                    continue
                items.append({
                    "repository":name,
                    "description":str(entry.get("description",""))[:260],
                    "license_metadata":license_id,
                    "stars_metadata":min(10000000,max(0,int(
                        entry.get("stars_reported_by_github") or 0))),
                    "pushed_at_metadata":str(entry.get("updated_at") or "")[:30],
                })
            detail=("PUBLIC_CACHED_METADATA_NO_NEW_NETWORK_REQUEST"
                    if cached else "PUBLIC_METADATA_ONLY_NO_LICENSE_CLEARANCE")
        elif state=="GITHUB_PUBLIC_RATE_BUDGET_DEFERRED":
            detail="RATE_BUDGET_DEFERRED"
        else:
            detail="UPSTREAM_METADATA_NOT_ACCEPTED"
    except (OSError,ValueError,TypeError,RuntimeError,OverflowError) as exc:
        state="RESEARCH_HELD"
        detail=exc.__class__.__name__
    success=(processed and live)
    retry=min(FAIL_BACKOFF_MAX,MIN_ATTEMPT_SPACING*2**min(6,errors+1))
    next_due=now+(NORMAL_REFRESH if processed else retry)
    packed=json.dumps(items,sort_keys=True,separators=(",",":"),
                      ensure_ascii=False).encode("utf-8")
    with closing(_db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        if processed:
            for entry in items:
                db.execute("""INSERT INTO jrei_oss_candidates(
                    domain,repository,description,license_metadata,
                    stars_metadata,pushed_at_metadata,first_seen,last_seen)
                    VALUES(?,?,?,?,?,?,?,?)
                    ON CONFLICT(domain,repository) DO UPDATE SET
                    description=excluded.description,
                    license_metadata=excluded.license_metadata,
                    stars_metadata=excluded.stars_metadata,
                    pushed_at_metadata=excluded.pushed_at_metadata,
                    last_seen=excluded.last_seen""",
                    (domain,entry["repository"],entry["description"],
                     entry["license_metadata"],entry["stars_metadata"],
                     entry["pushed_at_metadata"],now,now))
        db.execute("""UPDATE jrei_oss_topics SET lease_until=0,
            next_due=?,last_state=?,errors=?,last_success=
            CASE WHEN ? THEN ? ELSE last_success END,
            successes=successes+? WHERE domain=?""",
            (next_due,state,0 if processed else min(99,errors+1),
             int(success),now,int(success),domain))
        db.execute("""INSERT INTO jrei_oss_observations(
            observed,domain,state,candidate_count,metadata_sha256,error_code)
            VALUES(?,?,?,?,?,?)""",
            (now,domain,state,len(items),hashlib.sha256(packed).hexdigest(),
             detail))
        db.commit()
    return {"schema":SCHEMA,"state":state,"domain":domain,
            "candidate_count":len(items),"live_search":live,
            "served_from_cache":cached,"metadata_processed":processed,
            "next_due_unix":next_due,**SCHEMA_FLAGS}


def snapshot(db_path: Path) -> dict:
    with closing(_db(db_path)) as db:
        enabled=_enabled(db)
        totals=db.execute("""SELECT COUNT(*),SUM(attempts),
            SUM(successes),SUM(CASE WHEN last_success IS NOT NULL
                THEN 1 ELSE 0 END) FROM jrei_oss_topics
            WHERE domain LIKE 'self_%' OR domain LIKE 'problem_%'""").fetchone()
        candidates=db.execute("""SELECT COUNT(*) FROM jrei_oss_candidates
            WHERE owner_review='DISCOVERED_UNVERIFIED'
              AND (domain LIKE 'self_%' OR domain LIKE 'problem_%')""").fetchone()[0]
        topics=db.execute("""SELECT domain,last_state,last_attempt,last_success,
            next_due FROM jrei_oss_topics
            WHERE domain LIKE 'self_%' OR domain LIKE 'problem_%'
            ORDER BY domain""").fetchall()
        latest=db.execute("""SELECT observed,domain,state,candidate_count
            FROM jrei_oss_observations
            WHERE domain LIKE 'self_%' OR domain LIKE 'problem_%'
            ORDER BY id DESC LIMIT 1""").fetchone()
    return {
        "schema":SCHEMA, "enabled":enabled,
        "permanent_mission_in_source":True,
        "problem_driven_runtime_topics":True,
        "exclusive_ai_self_development_research":True,
        "legacy_site_topics_retained_but_not_scheduled":True,
        "reputation_not_required_for_discovery":True,
        "service_must_actually_run":True,
        "domain_count":int(totals[0] or 0),
        "search_attempts_recorded":int(totals[1] or 0),
        "successful_live_searches_recorded":int(totals[2] or 0),
        "domains_with_real_search":int(totals[3] or 0),
        "unreviewed_source_candidates":candidates,
        "discovery_counts_exclude_legacy_site_topics":True,
        "latest_search":({"at":latest[0],"domain":latest[1],
                          "state":latest[2],"candidates":latest[3]}
                         if latest else None),
        "domains":[{"domain":a,"state":z,"last_attempt":t,
                    "last_success":s,"next_due":n}
                   for a,z,t,s,n in topics],
        "license_metadata_not_exact_file_clearance":True,
        "autonomous_upgrade_proposals_authorized":True,
        "production_code_activation_not_yet_authorized_by_validation":True,
        **SCHEMA_FLAGS,
    }
