-- JREI-KA discovery candidates from previously licensed, verified HTML seed
-- pages. Additive-only, NOT EXECUTED. Mother database drjavad1_store.
-- A discovered URL is ONLY a PROPOSAL. No automatic licensing, fetching,
-- publication, expert-review, AI validation or storage of visitor details.
CREATE TABLE IF NOT EXISTS jrei_ka_discovery_candidates (
  candidate_id CHAR(36) NOT NULL PRIMARY KEY,
  seed_source_id CHAR(36) NOT NULL,
  originating_observation_id CHAR(36) NOT NULL,
  candidate_url VARCHAR(650) NOT NULL,
  candidate_url_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  candidate_label VARCHAR(220) NOT NULL,
  discovery_kind VARCHAR(28) NOT NULL DEFAULT 'POTENTIAL_EXAM_DOCUMENT',
  state VARCHAR(32) NOT NULL DEFAULT 'DISCOVERED_REQUIRES_RIGHTS_REVIEW',
  first_discovered_at BIGINT UNSIGNED NOT NULL,
  last_discovered_at BIGINT UNSIGNED NOT NULL,
  independent_review_account_id CHAR(36) NULL,
  reviewed_at BIGINT UNSIGNED NULL,
  UNIQUE KEY uq_jrei_ka_discovery_seed_url(seed_source_id,candidate_url_sha256),
  KEY idx_jrei_ka_candidates_state(state,last_discovered_at),
  CONSTRAINT fk_jrei_ka_candidate_seed FOREIGN KEY(seed_source_id)
    REFERENCES jrei_exam_sources(source_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_candidate_observation FOREIGN KEY(originating_observation_id)
    REFERENCES jrei_ka_private_observations(observation_id) ON DELETE RESTRICT,
  CONSTRAINT fk_jrei_ka_candidate_reviewer FOREIGN KEY(independent_review_account_id)
    REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- No release gate can mistake a candidate as an approved exam question.
