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
TOPICS = (
    ("python_architecture", "python static refactoring analysis"),
    ("js_typescript", "javascript typescript codemod"),
    ("css_accessibility", "css html accessibility parser"),
    ("php_site", "php static analysis security"),
    ("github_workflows", "github actions workflow automation"),
    ("image_native", "python image synthesis graphics"),
    ("image_quality", "image quality assessment python"),
    ("neural_models", "pytorch language model training"),
    ("bilingual", "multilingual evaluation benchmark"),
    ("memory_evidence", "python knowledge graph retrieval"),
    ("ethical_crawling", "web crawler robots python"),
    ("seo_geo", "seo structured data python"),
    ("windows_ui", "python windows desktop ui"),
    ("cybersecurity", "python security source scanning"),
    ("compute_resources", "gpu memory resource profiling"),
)
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
           domain,query) VALUES(?,?)""", TOPICS)
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


def tick(db_path: Path, *, resources_available: bool,
         owner_active: bool = False) -> dict:
    """One bounded GitHub search per eligible scheduler invocation.

    The 15-hour topic refresh prevents redundant rate-limited searches;
    all 15 research areas rotate indefinitely while JREI actually runs.
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
        row=db.execute("""SELECT domain,query,errors
            FROM jrei_oss_topics WHERE next_due<=? AND lease_until<=?
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
    state="NETWORK_UNAVAILABLE"
    detail="UPSTREAM_UNREACHABLE"
    try:
        response=discovery.find_repositories(query)
        live=response.get("actual_live_search_performed") is True
        state=response.get("state","INVALID_RESPONSE")
        if state=="READ_ONLY_UNVERIFIED_GITHUB_REPO_CANDIDATES" and live:
            raw=response.get("items")
            if not isinstance(raw,list):
                raise ValueError("JREI_OSS_RESULT_SHAPE_INVALID")
            for entry in raw[:8]:
                if not isinstance(entry,dict):
                    continue
                name=entry.get("repository")
                license_id=entry.get("license_reported_by_github")
                if (not isinstance(name,str) or not REPO_RE.fullmatch(name)
                    or license_id not in discovery.SUPPORTED):
                    continue
                items.append({
                    "repository":name,
                    "description":str(entry.get("description",""))[:260],
                    "license_metadata":license_id,
                    "stars_metadata":min(10000000,max(0,int(
                        entry.get("stars_reported_by_github") or 0))),
                    "pushed_at_metadata":str(entry.get("updated_at") or "")[:30],
                })
            detail="PUBLIC_METADATA_ONLY_NO_LICENSE_CLEARANCE"
        elif state=="GITHUB_PUBLIC_RATE_BUDGET_DEFERRED":
            detail="RATE_BUDGET_DEFERRED"
        else:
            detail="UPSTREAM_METADATA_NOT_ACCEPTED"
    except (OSError,ValueError,TypeError,RuntimeError,OverflowError) as exc:
        state="RESEARCH_HELD"
        detail=exc.__class__.__name__
    success=(state=="READ_ONLY_UNVERIFIED_GITHUB_REPO_CANDIDATES" and live)
    retry=min(FAIL_BACKOFF_MAX,MIN_ATTEMPT_SPACING*2**min(6,errors+1))
    next_due=now+(NORMAL_REFRESH if success else retry)
    packed=json.dumps(items,sort_keys=True,separators=(",",":"),
                      ensure_ascii=False).encode("utf-8")
    with closing(_db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        if success:
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
            (next_due,state,0 if success else min(99,errors+1),
             int(success),now,int(success),domain))
        db.execute("""INSERT INTO jrei_oss_observations(
            observed,domain,state,candidate_count,metadata_sha256,error_code)
            VALUES(?,?,?,?,?,?)""",
            (now,domain,state,len(items),hashlib.sha256(packed).hexdigest(),
             detail))
        db.commit()
    return {"schema":SCHEMA,"state":state,"domain":domain,
            "candidate_count":len(items),"live_search":live,
            "next_due_unix":next_due,**SCHEMA_FLAGS}


def snapshot(db_path: Path) -> dict:
    with closing(_db(db_path)) as db:
        enabled=_enabled(db)
        totals=db.execute("""SELECT COUNT(*),SUM(attempts),
            SUM(successes),SUM(CASE WHEN last_success IS NOT NULL
                THEN 1 ELSE 0 END) FROM jrei_oss_topics""").fetchone()
        candidates=db.execute("""SELECT COUNT(*) FROM jrei_oss_candidates
            WHERE owner_review='DISCOVERED_UNVERIFIED'""").fetchone()[0]
        topics=db.execute("""SELECT domain,last_state,last_attempt,last_success,
            next_due FROM jrei_oss_topics ORDER BY domain""").fetchall()
        latest=db.execute("""SELECT observed,domain,state,candidate_count
            FROM jrei_oss_observations ORDER BY id DESC LIMIT 1""").fetchone()
    return {
        "schema":SCHEMA, "enabled":enabled,
        "permanent_mission_in_source":True,
        "service_must_actually_run":True,
        "domain_count":int(totals[0] or 0),
        "search_attempts_recorded":int(totals[1] or 0),
        "successful_live_searches_recorded":int(totals[2] or 0),
        "domains_with_real_search":int(totals[3] or 0),
        "unreviewed_source_candidates":candidates,
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
