-- JREI examination coverage source-link correction audit.
-- ADDITIVE SOURCE ONLY / NOT EXECUTED. Existing drjavad1_store only.
-- Requires 20261023_jrei_exams_testly_research_mother_mysql.sql.
CREATE TABLE IF NOT EXISTS jrei_ka_coverage_link_history (
  correction_id CHAR(36) NOT NULL PRIMARY KEY,
  requirement_id CHAR(36) NOT NULL,
  previous_source_id CHAR(36) NULL,
  next_source_id CHAR(36) NULL,
  reason_code VARCHAR(48) NOT NULL,
  corrected_by_account_id CHAR(36) NULL,
  corrected_at BIGINT UNSIGNED NOT NULL,
  KEY idx_jrei_ka_link_history_requirement(requirement_id,corrected_at),
  CONSTRAINT fk_jrei_ka_link_requirement
    FOREIGN KEY(requirement_id)
    REFERENCES jrei_exam_coverage_requirements(requirement_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_link_old_source
    FOREIGN KEY(previous_source_id) REFERENCES jrei_exam_sources(source_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_link_new_source
    FOREIGN KEY(next_source_id) REFERENCES jrei_exam_sources(source_id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_link_actor
    FOREIGN KEY(corrected_by_account_id) REFERENCES customer_accounts(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No original source, acquired document, assessment response, permission
-- decision or unrelated coverage requirement is deleted by link correction.
