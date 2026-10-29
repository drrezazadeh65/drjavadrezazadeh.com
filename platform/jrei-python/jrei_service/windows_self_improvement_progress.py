"""Evidence-based progress view of JREI's ORIGINAL autonomous coding cycle.

This is a READ-ONLY aggregation over the existing missions.sqlite3; it
does not instantiate a second assistant, retrain models, execute drafts or
claim that repository discovery constitutes a functional improvement.

Stages: identified source problem -> verified public source observation ->
local code draft -> independent static inspection -> functional evidence.
Only actually recorded stage completions are counted.
"""
from __future__ import annotations

from contextlib import closing
import sqlite3
from pathlib import Path

SCHEMA = "jr.jrei.self-improvement-evidence.v1"


def _db(path: Path):
    db = sqlite3.connect(path, timeout=12)
    db.execute("PRAGMA busy_timeout=12000")
    return db


def _exists(db, table: str) -> bool:
    return db.execute("""SELECT 1 FROM sqlite_master WHERE
        type='table' AND name=?""", (table,)).fetchone() is not None


def snapshot(db_path: Path) -> dict:
    """Present actual receipts without converting activity into quality."""
    with closing(_db(db_path)) as db:
        topics = research_attempts = successful_searches = 0
        github_candidates = github_sources = 0
        forge_candidates = forge_sources = 0
        native_scanned = native_diagnostics = native_drafts = 0
        code_drafts_with_sources = candidate_reviews = rule_reviews = 0
        static_hypotheses = 0
        independent_reviewed_source_drafts = 0

        if _exists(db,"jrei_oss_topics"):
            topics,research_attempts,successful_searches = db.execute("""
                SELECT COUNT(*),COALESCE(SUM(attempts),0),
                COALESCE(SUM(successes),0) FROM jrei_oss_topics
                WHERE domain LIKE 'self_%' OR domain LIKE 'problem_%'
                """).fetchone()
        if _exists(db,"jrei_oss_candidates"):
            github_candidates = db.execute("""SELECT COUNT(DISTINCT repository)
                FROM jrei_oss_candidates WHERE
                domain LIKE 'self_%' OR domain LIKE 'problem_%'""").fetchone()[0]
        if _exists(db,"jrei_oss_code_studies"):
            github_sources = db.execute("""SELECT COUNT(*)
                FROM jrei_oss_code_studies WHERE
                source_sha256 IS NOT NULL AND last_success IS NOT NULL""").fetchone()[0]
        if _exists(db,"jrei_oss_forge_candidates"):
            forge_candidates,forge_sources = db.execute("""
                SELECT COUNT(*),COALESCE(SUM(CASE WHEN
                source_sha256 IS NOT NULL THEN 1 ELSE 0 END),0)
                FROM jrei_oss_forge_candidates""").fetchone()
        if _exists(db,"jrei_self_code_audit"):
            native_scanned,native_diagnostics,native_drafts = db.execute("""
                SELECT COUNT(*),COALESCE(SUM(finding_count),0),
                COALESCE(SUM(CASE WHEN candidate_sha256 IS NOT NULL
                THEN 1 ELSE 0 END),0)
                FROM jrei_self_code_audit""").fetchone()
        if _exists(db,"jrei_oss_draft_provenance"):
            code_drafts_with_sources = db.execute("""
                SELECT COUNT(*) FROM jrei_oss_draft_provenance""").fetchone()[0]
        if _exists(db,"jrei_candidate_static_reviews"):
            candidate_reviews = db.execute("""
                SELECT COUNT(*) FROM jrei_candidate_static_reviews""").fetchone()[0]
            static_hypotheses += db.execute("""
                SELECT COUNT(*) FROM jrei_candidate_static_reviews
                WHERE state IN ('PYTHON_STATIC_REVIEW_RECORDED_UNTESTED',
                                'JAVASCRIPT_HEURISTIC_REVIEW_RECORDED_UNTESTED',
                                'STATIC_RISK_REVIEW_REQUIRED')""").fetchone()[0]
        if _exists(db,"jrei_rule_static_reviews"):
            rule_reviews = db.execute("""
                SELECT COUNT(*) FROM jrei_rule_static_reviews""").fetchone()[0]
            static_hypotheses += db.execute("""
                SELECT COUNT(*) FROM jrei_rule_static_reviews
                WHERE state IN ('PYTHON_STATIC_REVIEW_RECORDED_UNTESTED',
                                'SEMANTIC_CHANGE_OWNER_REVIEW_REQUIRED',
                                'STATIC_RISK_REVIEW_REQUIRED')""").fetchone()[0]
        if (_exists(db,"jrei_oss_draft_provenance") and
                _exists(db,"jrei_candidate_static_reviews")):
            independent_reviewed_source_drafts = db.execute("""
                SELECT COUNT(*) FROM jrei_oss_draft_provenance p
                JOIN jrei_candidate_static_reviews r
                ON r.candidate_id=p.candidate_id
                WHERE r.source_path=p.target
                  AND r.source_sha256=p.source_sha256
                  AND r.provenance_linked=1
                  AND r.state IN (
                      'PYTHON_STATIC_REVIEW_RECORDED_UNTESTED',
                      'STATIC_RISK_REVIEW_REQUIRED',
                      'JAVASCRIPT_HEURISTIC_REVIEW_RECORDED_UNTESTED')
                """).fetchone()[0]

    stages = {
        "research_questions_registered": int(topics),
        "public_github_search_attempts": int(research_attempts),
        # Historic pre-fix cache receipts may have been counted as live.
        # Do not retroactively relabel all recorded successes as confirmed
        # network API invocations without per-request transport evidence.
        "recorded_github_search_success_receipts": int(successful_searches),
        "github_discovered_repositories": int(github_candidates),
        "github_source_file_receipts": int(github_sources),
        "gitlab_codeberg_discovered_repository_rows": int(forge_candidates),
        "gitlab_codeberg_source_file_receipts": int(forge_sources),
        "first_party_modules_static_inspected": int(native_scanned),
        "first_party_static_findings": int(native_diagnostics),
        "model_free_isolated_draft_receipts": int(native_drafts),
        "oss_grounded_draft_provenance_receipts":
            int(code_drafts_with_sources),
        "isolated_candidate_static_reviews": int(candidate_reviews),
        "model_free_draft_static_reviews": int(rule_reviews),
        "candidate_static_review_hypotheses": int(static_hypotheses),
        "oss_grounded_drafts_static_reviewed":
            int(independent_reviewed_source_drafts),
    }
    if independent_reviewed_source_drafts:
        phase = "OSS_TO_DRAFT_TO_STATIC_REVIEW_OBSERVED"
    elif candidate_reviews or rule_reviews:
        phase = "CANDIDATE_STATIC_REVIEWS_OBSERVED"
    elif native_drafts or code_drafts_with_sources:
        phase = "ISOLATED_CODE_DRAFTS_OBSERVED"
    elif github_sources or forge_sources:
        phase = "PINNED_PUBLIC_SOURCE_READS_OBSERVED"
    elif research_attempts:
        phase = "PUBLIC_RESEARCH_IN_PROGRESS"
    elif native_scanned:
        phase = "FIRST_PARTY_STATIC_SOURCE_STUDY_OBSERVED"
    else:
        phase = "NO_ACTUAL_SELF_DEVELOPMENT_EVIDENCE_YET"
    return {
        "schema": SCHEMA, "phase": phase,
        "recorded_stages": stages,
        "counts_not_claimed_to_be_distinct_across_all_sources": True,
        "historic_cache_counts_may_include_pre_fix_receipts": True,
        "candidate_static_review_is_not_functional_test": True,
        "observed_functional_tests_from_this_pipeline": 0,
        "verified_functional_gains_from_this_pipeline": 0,
        "verified_neural_training_from_this_pipeline": 0,
        "code_autonomously_promoted_by_this_pipeline": 0,
        "cross_node_training_from_this_pipeline": False,
        "progress_is_local_to_this_windows_node": True,
        "two_node_pooled_knowledge_proven": False,
    }
