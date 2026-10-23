-- JREI preliminary raw-grade provenance, additive SOURCE ONLY / NOT RUN.
-- Existing Bertina mother DB drjavad1_store and canonical eco_score_runs.
-- Requires the existing JREI commercial examination attempt migration.
-- Contains NO question text, selected options, answer key, identity, ranking
-- or psychometric interpretation. Historical output cannot be silently
-- rewritten when a source is revoked or the scoring rule changes.
CREATE TABLE IF NOT EXISTS jrei_exam_preliminary_grade_snapshots (
  attempt_id CHAR(36) NOT NULL PRIMARY KEY,
  score_run_id CHAR(36) NOT NULL,
  assessment_session_id CHAR(36) NOT NULL,
  scoring_model_id CHAR(36) NOT NULL,
  scoring_policy_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  submission_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  output_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  question_count SMALLINT UNSIGNED NOT NULL,
  correct_count SMALLINT UNSIGNED NOT NULL,
  incorrect_count SMALLINT UNSIGNED NOT NULL,
  unanswered_count SMALLINT UNSIGNED NOT NULL,
  raw_score_millipoints BIGINT NOT NULL,
  maximum_millipoints BIGINT NOT NULL,
  status VARCHAR(48) NOT NULL DEFAULT 'PRELIMINARY_UNREVIEWED',
  recorded_at BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY uq_jrei_grade_run(score_run_id),
  UNIQUE KEY uq_jrei_grade_session(assessment_session_id),
  CONSTRAINT fk_jrei_grade_attempt FOREIGN KEY (attempt_id)
    REFERENCES jrei_exam_commercial_attempts(attempt_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_grade_canonical_run FOREIGN KEY (score_run_id)
    REFERENCES eco_score_runs(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_grade_canonical_session FOREIGN KEY (assessment_session_id)
    REFERENCES eco_assessment_sessions(id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_grade_scoring_model FOREIGN KEY (scoring_model_id)
    REFERENCES eco_scoring_models(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- A successful raw-score write is not a final/scientifically validated result,
-- certificate, rank, admission chance or financial entitlement.
