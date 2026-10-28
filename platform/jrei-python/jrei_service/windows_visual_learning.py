"""Owner-grounded improvement loop for JREI's own conceptual image renderer.

This is preference-based selection of JREI-authored composition styles, NOT
neural model training or evidence of monotonically improving image quality.
The original missions.sqlite3 remains the only store. Every label comes
from an explicit authenticated owner request; the model cannot grade itself.
No background job generates unrequested images or changes public site assets.
"""
from __future__ import annotations

from contextlib import closing
from hashlib import sha256
import json
import math
from pathlib import Path
import re
import sqlite3
import time

from jrei_service.windows_native_visual import STYLE_IDS, ENGINE

SCHEMA = "jr.jrei.native-visual-learning.v1"
ID = re.compile(r"^[0-9a-f]{32}$")
REVIEWER = re.compile(r"^[\w\-\u0600-\u06ff ]{3,80}$")
RUBRIC = ("composition", "legibility", "subject_fit", "brand_fit", "originality")
MIN_RATINGS_PER_STYLE = 3


def _db(path: Path):
    db = sqlite3.connect(path, timeout=12)
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=12000")
    return db


def initialize(path: Path) -> None:
    """Additive tables in existing private SQLite; no separate model store."""
    with closing(_db(path)) as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS jrei_native_visual_feedback(
          job_id TEXT PRIMARY KEY REFERENCES jrei_site_image_jobs(id),
          created INTEGER NOT NULL,
          reviewer TEXT NOT NULL,
          style_id TEXT NOT NULL,
          scores_json TEXT NOT NULL,
          score_sum INTEGER NOT NULL,
          artifact_manifest_sha256 TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS jrei_native_visual_feedback_day
          ON jrei_native_visual_feedback(created);
        CREATE TABLE IF NOT EXISTS jrei_native_visual_daily_receipts(
          utc_day INTEGER PRIMARY KEY,
          observed INTEGER NOT NULL,
          data_json TEXT NOT NULL,
          digest TEXT NOT NULL,
          state TEXT NOT NULL);
        """)
        db.commit()


def _style_stats(db, *, purpose: str | None = None) -> dict:
    # Only explicit owner-assigned RUBRIC feedback, never self-assessed output.
    params = () if purpose is None else (purpose,)
    condition = "" if purpose is None else "AND j.purpose=?"
    rows = db.execute(f"""SELECT f.style_id,COUNT(*),SUM(f.score_sum)
        FROM jrei_native_visual_feedback f
        JOIN jrei_site_image_jobs j ON j.id=f.job_id
        WHERE j.state IN ('APPROVED_FOR_MANUAL_HANDOFF','REJECTED')
          AND j.renderer='JREI_NATIVE_VISUAL_V1' {condition}
        GROUP BY f.style_id""", params).fetchall()
    return {
        key: {"rated": int(n), "mean_five_rubrics": round(
            total/(n*len(RUBRIC)), 4)}
        for key,n,total in rows if key in STYLE_IDS and n>0
    }


def select_style(path: Path, *, purpose: str, seed: int) -> dict:
    """Choose a style from HUMAN-RATED preferences, never modify weights.

    Cold start spreads owner jobs among four hand-written native algorithms.
    A cautious lower-confidence preference is used only after >=3 ratings
    for every style; otherwise exploration continues. Neither implies
    day-over-day artistic improvement.
    """
    if purpose not in ("BLOG","SERVICE","HOMEPAGE","NEWS_CONCEPT","SOCIAL"):
        raise ValueError("JREI_VISUAL_PURPOSE_INVALID")
    if type(seed) is not int or not 0 <= seed < 2**31:
        raise ValueError("JREI_VISUAL_SEED_INVALID")
    with closing(_db(path)) as db:
        stats = _style_stats(db, purpose=purpose)
    cold = [v for v in STYLE_IDS
            if stats.get(v, {}).get("rated", 0) < MIN_RATINGS_PER_STYLE]
    if cold:
        # Deterministic, contextual cold start; not simulated model learning.
        order = sorted(cold, key=lambda key: (
            stats.get(key, {}).get("rated", 0), key))
        style = order[seed % min(len(order), 2)]
        decision = "HUMAN_FEEDBACK_COVERAGE_EXPLORATION"
    else:
        # Shrink raw owner scores toward neutral 3/5, minimizing overfit.
        def lower_confidence(style):
            n = stats[style]["rated"]
            mean = stats[style]["mean_five_rubrics"]
            shrunk = (mean*n + 3*4)/(n+4)
            return shrunk - 1.0/math.sqrt(n+4)
        style = sorted(STYLE_IDS, key=lambda st: (
            -lower_confidence(st), st))[0]
        decision = "OWNER_REVIEWED_STYLE_PREFERENCE_NOT_QUALITY_PROOF"
    return {
        "engine": ENGINE, "style_id": style, "selection_policy": decision,
        "owner_feedback_samples": {
            key: stats.get(key, {}).get("rated", 0) for key in STYLE_IDS
        },
        "model_weights_retrained": False,
        "output_quality_guaranteed": False,
    }


def record_owner_feedback(db_path: Path, *, private: Path,
                          request: dict) -> dict:
    """Accept one explicit human rubric receipt for a finished native job."""
    if not isinstance(request, dict) or request.get("confirm") is not True:
        raise ValueError("JREI_VISUAL_FEEDBACK_OWNER_CONFIRMATION_REQUIRED")
    ident, reviewer = request.get("id"), request.get("reviewer")
    if not isinstance(ident,str) or not ID.fullmatch(ident):
        raise ValueError("JREI_VISUAL_FEEDBACK_JOB_INVALID")
    if not isinstance(reviewer,str) or not REVIEWER.fullmatch(reviewer.strip()):
        raise ValueError("JREI_VISUAL_FEEDBACK_REVIEWER_INVALID")
    scores = request.get("scores")
    if (not isinstance(scores,dict) or set(scores)!=set(RUBRIC)
            or any(type(scores[k]) is not int or not 1 <= scores[k] <= 5
                   for k in RUBRIC)):
        raise ValueError("JREI_VISUAL_FEEDBACK_SCORES_INVALID")
    manifest = private / "site-image-studio" / ident / "asset-manifest.json"
    if manifest.is_symlink() or not manifest.is_file() or manifest.stat().st_size > 16000:
        raise ValueError("JREI_VISUAL_FEEDBACK_MANIFEST_MISSING")
    actual = sha256(manifest.read_bytes()).hexdigest()
    data = json.loads(manifest.read_text(encoding="utf-8"))
    if (not isinstance(data,dict) or data.get("id")!=ident
            or data.get("native_renderer") != ENGINE
            or data.get("published") is not False
            or data.get("editorialApproved") is not False):
        raise ValueError("JREI_VISUAL_FEEDBACK_MANIFEST_INVALID")
    style = data.get("native_style_id")
    if style not in STYLE_IDS:
        raise ValueError("JREI_VISUAL_FEEDBACK_STYLE_INVALID")
    now = int(time.time())
    with closing(_db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("""SELECT state,renderer,native_style,manifest_sha256
            FROM jrei_site_image_jobs WHERE id=?""",(ident,)).fetchone()
        if (row is None or row[0] not in
                ("APPROVED_FOR_MANUAL_HANDOFF","REJECTED")
                or row[1]!=ENGINE or row[2]!=style or row[3]!=actual):
            raise ValueError("JREI_VISUAL_FEEDBACK_REVIEW_OR_DIGEST_MISMATCH")
        db.execute("""INSERT INTO jrei_native_visual_feedback
            (job_id,created,reviewer,style_id,scores_json,score_sum,
             artifact_manifest_sha256) VALUES(?,?,?,?,?,?,?)""",
            (ident,now,reviewer.strip(),style,
             json.dumps(scores,sort_keys=True,separators=(",",":")),
             sum(scores.values()),actual))
        db.commit()
    return {
        "schema":SCHEMA, "state":"OWNER_RUBRIC_RECORDED_NOT_MODEL_TRAINED",
        "job_id":ident, "style_id":style,
        "rubric_score_mean":sum(scores.values())/len(RUBRIC),
        "site_published":False, "model_weights_trained":False,
        "proficiency_independently_proven":False,
    }


def _day_report(db, day: int) -> dict:
    lo,hi=day*86400,(day+1)*86400
    approved,rejected=db.execute("""SELECT
        SUM(CASE WHEN state='APPROVED_FOR_MANUAL_HANDOFF' THEN 1 ELSE 0 END),
        SUM(CASE WHEN state='REJECTED' THEN 1 ELSE 0 END)
        FROM jrei_site_image_jobs
        WHERE renderer=? AND reviewed_at>=? AND reviewed_at<?""",
        (ENGINE,lo,hi)).fetchone()
    rows=db.execute("""SELECT score_sum FROM jrei_native_visual_feedback
        WHERE created>=? AND created<?""",(lo,hi)).fetchall()
    scores=[x[0]/len(RUBRIC) for x in rows]
    return {
        "utc_day":day,"native_approved_assets":int(approved or 0),
        "native_rejected_assets":int(rejected or 0),
        "owner_rated_assets":len(scores),
        "owner_rated_mean":(
            round(sum(scores)/len(scores),4) if scores else None),
        "human_assessments_not_automated_model_grade":True,
    }


def daily_checkpoint(db_path: Path, *, observed_at: int | None = None) -> dict:
    """One write-once factual UTC-day receipt; no auto-generation/training."""
    now = int(time.time()) if observed_at is None else observed_at
    if type(now) is not int or now < 0:
        raise ValueError("JREI_VISUAL_DAY_CLOCK_INVALID")
    completed_day = now // 86400 - 1
    if completed_day < 0:
        raise ValueError("JREI_VISUAL_NO_COMPLETED_DAY")
    with closing(_db(db_path)) as db:
        db.execute("BEGIN IMMEDIATE")
        present = _day_report(db,completed_day)
        yesterday = _day_report(db,completed_day-1)
        # Only completed UTC days are compared. Distinct prompts and
        # reviewers still prevent a causal inference of improving quality.
        enough = present["owner_rated_assets"] >= 4 and yesterday["owner_rated_assets"] >= 4
        delta = (round(present["owner_rated_mean"] - yesterday["owner_rated_mean"],4)
                 if enough else None)
        payload = {
            "present":present,"prior":yesterday,
            "mean_difference_between_completed_days":delta,
            "same_image_prompt_and_seed_controlled_comparison":False,
            "daily_image_quality_improvement_proven":False,
            "new_native_visual_weights_trained":False,
            "no_unrequested_generation":True,
        }
        raw=json.dumps(payload,sort_keys=True,separators=(",",":"))
        digest=sha256(raw.encode("utf-8")).hexdigest()
        state=("INSUFFICIENT_HUMAN_ASSESSMENTS" if delta is None else
               "OWNER_SCORES_HIGHER_NOT_CAUSAL_QUALITY_PROOF" if delta>0 else
               "OWNER_SCORES_NOT_HIGHER")
        db.execute("""INSERT OR IGNORE INTO jrei_native_visual_daily_receipts
            (utc_day,observed,data_json,digest,state) VALUES(?,?,?,?,?)""",
            (completed_day,now,raw,digest,state))
        db.commit()
    return snapshot(db_path)


def snapshot(db_path: Path) -> dict:
    with closing(_db(db_path)) as db:
        row=db.execute("""SELECT utc_day,observed,data_json,digest,state
            FROM jrei_native_visual_daily_receipts ORDER BY utc_day DESC
            LIMIT 1""").fetchone()
        stats=_style_stats(db)
    result={
        "schema":SCHEMA,"native_renderer":ENGINE,
        "native_styles":list(STYLE_IDS),
        "owner_feedback_by_style":stats,
        "new_model_weights_trained":False,
        "automatic_image_publication":False,
        "human_ratings_are_subjective":True,
        "monotonic_quality_improvement_verified":False,
    }
    if row is None:
        result["state"]="NO_DAILY_REVIEW_RECEIPT"
        return result
    day,observed,raw,digest,state=row
    if sha256(raw.encode("utf-8")).hexdigest()!=digest:
        result["state"]="RECEIPT_HASH_MISMATCH"
        return result
    result.update(state=state,last_utc_day=day,last_observed_at=observed,
                  report=json.loads(raw))
    return result
