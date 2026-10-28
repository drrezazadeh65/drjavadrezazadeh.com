"""Always-on JREI owner-private learning observation; never a learning clock.

The original Windows service's existing scheduler runs learning whenever
eligible work and adaptive resources allow it, from process startup until
shutdown. A one-per-UTC-hour receipt summarizes *observed aggregate changes*
for the owner's convenience. This module neither initiates learning nor
assigns a time window, daily quota, network permission or model authority.
"""

from __future__ import annotations

from contextlib import closing
import hashlib
import json
from pathlib import Path
import sqlite3
import time

SCHEMA = "jr.jrei.continuous-learning-observation.v1"
COUNTERS = {
    "source_versions_seen": ("learning_versions",
                             "SELECT COUNT(*) FROM learning_versions"),
    "approved_sources": (
        "learning_sources",
        """SELECT COUNT(*) FROM learning_sources
           WHERE active=1 AND reviewed=1 AND rights='PUBLIC_REUSE_APPROVED'"""),
    "evidence_passages": ("learning_passages",
                          "SELECT COUNT(*) FROM learning_passages"),
    "study_cycles": ("learning_agenda_cycles",
                     "SELECT COUNT(*) FROM learning_agenda_cycles"),
    "owner_study_reviews": ("learning_agenda_reviews",
                            "SELECT COUNT(*) FROM learning_agenda_reviews"),
    "owner_code_reviews": (
        "jrei_code_experience",
        """SELECT COUNT(*) FROM jrei_code_experience
           WHERE state='OWNER_FEEDBACK_RECORDED'"""),
    "image_drafts_reviewed": (
        "jrei_site_image_jobs",
        """SELECT COUNT(*) FROM jrei_site_image_jobs
           WHERE state='APPROVED_FOR_MANUAL_HANDOFF'"""),
}
AREAS = {
    "evidence_brain": ("source_versions_seen", "approved_sources",
                       "evidence_passages"),
    "learning_review": ("study_cycles", "owner_study_reviews"),
    "coding_skill_reviews": ("owner_code_reviews",),
    "image_studio_review": ("image_drafts_reviewed",),
}


def _db(db_path: Path):
    db = sqlite3.connect(db_path, timeout=12, isolation_level=None)
    db.execute("PRAGMA busy_timeout=12000")
    return db


def initialize(db_path: Path) -> None:
    with closing(_db(db_path)) as db:
        db.executescript("""CREATE TABLE IF NOT EXISTS
            jrei_hourly_continuum_observations(
              observed_hour INTEGER PRIMARY KEY,
              observed_at INTEGER NOT NULL,
              counters_json TEXT NOT NULL,
              counters_sha256 TEXT NOT NULL,
              previous_hour INTEGER,
              deltas_json TEXT NOT NULL,
              state TEXT NOT NULL
            );""")


def _counters(db) -> dict:
    available = {row[0] for row in db.execute(
        "SELECT name FROM sqlite_master WHERE type='table'")}
    result = {}
    for key, (table, query) in COUNTERS.items():
        if table not in available:
            result[key] = None
            continue
        try:
            result[key] = int(db.execute(query).fetchone()[0])
        except (TypeError, ValueError, sqlite3.Error):
            result[key] = None
    return result


def observe(db_path: Path, *, observed_at: int | None = None) -> dict:
    """Idempotent status receipt; does not perform or schedule study."""
    now = int(time.time()) if observed_at is None else observed_at
    if type(now) is not int or now < 0:
        raise ValueError("JREI_CONTINUUM_CLOCK_INVALID")
    hour = now // 3600
    with closing(_db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        recorded = db.execute("""SELECT observed_hour FROM
             jrei_hourly_continuum_observations WHERE observed_hour=?""",
                              (hour,)).fetchone()
        if recorded:
            db.commit()
            return snapshot(db_path)
        prior = db.execute("""SELECT observed_hour,counters_json
            FROM jrei_hourly_continuum_observations WHERE observed_hour<?
            ORDER BY observed_hour DESC LIMIT 1""", (hour,)).fetchone()
        counters = _counters(db)
        previous = json.loads(prior[1]) if prior else {}
        deltas = {
            name: (value - previous[name]
                   if type(value) is int and
                   type(previous.get(name)) is int else None)
            for name, value in counters.items()
        }
        state = ("FIRST_OBSERVATION_NO_COMPARISON" if not prior
                 else "COUNTS_CHANGED_NOT_VERIFIED_ABILITY" if any(
                     value is not None and value != 0 for value in deltas.values())
                 else "NO_OBSERVED_COUNT_CHANGE")
        if any(value is None for value in counters.values()):
            state = "PARTIAL_COUNTERS_UNAVAILABLE"
        payload = json.dumps(counters, sort_keys=True, separators=(",", ":"))
        delta_json = json.dumps(deltas, sort_keys=True, separators=(",", ":"))
        db.execute("""INSERT INTO jrei_hourly_continuum_observations
            (observed_hour,observed_at,counters_json,counters_sha256,
             previous_hour,deltas_json,state) VALUES(?,?,?,?,?,?,?)""",
            (hour, now, payload,
             hashlib.sha256(payload.encode("utf-8")).hexdigest(),
             prior[0] if prior else None, delta_json, state))
        db.commit()
    return snapshot(db_path)


def snapshot(db_path: Path) -> dict:
    """Truthful current-hour summary (not evidence of self-improvement)."""
    with closing(_db(db_path)) as db:
        row = db.execute("""SELECT observed_hour,observed_at,counters_json,
            counters_sha256,previous_hour,deltas_json,state FROM
            jrei_hourly_continuum_observations ORDER BY observed_hour DESC
            LIMIT 1""").fetchone()
    base = {
        "schema": SCHEMA,
        "mode": "CONTINUOUS_FROM_SERVICE_START_UNTIL_SHUTDOWN",
        "no_learning_time_windows": True,
        "no_daily_learning_quota": True,
        "learning_depends_on_authorized_work_and_resources": True,
        "hourly_receipts_are_observation_only": True,
        "neural_weights_updated_by_observer": False,
        "source_code_activated_by_observer": False,
        "website_published_by_observer": False,
    }
    if not row:
        return {**base, "state": "NO_HOURLY_OBSERVATION_RECORDED"}
    hour, seen, raw, recorded_sha, previous, delta_raw, state = row
    if hashlib.sha256(raw.encode("utf-8")).hexdigest() != recorded_sha:
        return {**base, "state": "OBSERVATION_HASH_MISMATCH"}
    counts = json.loads(raw)
    deltas = json.loads(delta_raw)
    return {
        **base, "state": state, "observed_hour_utc": hour,
        "last_observed_unix": seen,
        "observation_current_hour": hour == int(time.time()) // 3600,
        "previous_hour_utc": previous,
        "missed_hours_between_observations": (
            max(0, hour - previous - 1) if previous is not None else None),
        "areas": {
            area: {"counts": {k: counts.get(k) for k in keys},
                   "changes_since_previous_receipt": {
                       k: deltas.get(k) for k in keys},
                   "scientific_improvement_proven": False}
            for area, keys in AREAS.items()
        },
        "hardware_ability_verified": False,
        "human_review_authenticity_verified": False,
        "model_ability_improvement_proven": False,
        "source_code_safety_independently_validated": False,
    }
