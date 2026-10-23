-- JREI genuine provider-quality benchmark foundation, additive to drjavad1_store.
-- STAGED only. Must not be migrated or used for billable inference before
-- owner-authorised consolidated acceptance. No learners or real user chats.
-- Benchmarks are independent, rights-approved synthetic/public questions.
CREATE TABLE IF NOT EXISTS jrei_ai_governed_benchmark_cases (
 case_id CHAR(36) NOT NULL PRIMARY KEY,
 locale VARCHAR(2) NOT NULL,
 domain_code VARCHAR(36) NOT NULL,
 task_type VARCHAR(40) NOT NULL,
 question_text VARCHAR(1600) NOT NULL,
 source_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 benchmark_spec_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 expected_source_ids_json VARCHAR(256) NOT NULL,
 forbidden_claims_json TEXT NULL,
 reference_notes TEXT NULL,
 case_state VARCHAR(34) NOT NULL DEFAULT 'DRAFT',
 author_account_id CHAR(36) NULL,
 generation_kind VARCHAR(34) NOT NULL DEFAULT 'OWNER_AUTHORED',
 origin_fingerprint_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 independent_reviewer_account_id CHAR(36) NULL,
 reviewed_at BIGINT UNSIGNED NULL,
 created_at BIGINT UNSIGNED NOT NULL,
 updated_at BIGINT UNSIGNED NOT NULL,
 KEY idx_jrei_bench_case_ready(case_state,domain_code,locale),
 UNIQUE KEY uq_jrei_bench_origin_fingerprint(origin_fingerprint_sha256),
 CONSTRAINT fk_jrei_bench_case_author FOREIGN KEY(author_account_id)
   REFERENCES customer_accounts(id) ON DELETE SET NULL,
 CONSTRAINT fk_jrei_bench_case_reviewer FOREIGN KEY(independent_reviewer_account_id)
   REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One witnessed billable model invocation per case AND owner-approved run
-- batch. The answer is kept only as a cryptographic digest and a separate
-- private 0600 file for human review. Nothing is served publicly.
CREATE TABLE IF NOT EXISTS jrei_ai_governed_benchmark_runs (
 run_id CHAR(36) NOT NULL PRIMARY KEY,
 batch_id CHAR(36) NOT NULL,
 case_id CHAR(36) NOT NULL,
 provider_code VARCHAR(24) NOT NULL,
 model_code VARCHAR(96) NOT NULL,
 run_state VARCHAR(40) NOT NULL DEFAULT 'RESERVED_UNKNOWN',
 requested_at BIGINT UNSIGNED NOT NULL,
 completed_at BIGINT UNSIGNED NULL,
 source_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 answer_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 answer_private_object_key VARCHAR(90) NULL,
 actual_input_tokens INT UNSIGNED NULL,
 actual_output_tokens INT UNSIGNED NULL,
 observed_latency_ms INT UNSIGNED NULL,
 structural_citations_passed TINYINT(1) NULL,
 independently_graded TINYINT(1) NOT NULL DEFAULT 0,
 expert_quality_score TINYINT UNSIGNED NULL,
 factual_alignment_grade TINYINT UNSIGNED NULL,
 citation_fidelity_grade TINYINT UNSIGNED NULL,
 pedagogical_utility_grade TINYINT UNSIGNED NULL,
 safety_grade TINYINT UNSIGNED NULL,
 expert_review_evidence_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
 expert_reviewer_account_id CHAR(36) NULL,
 expert_reviewed_at BIGINT UNSIGNED NULL,
 KEY idx_jrei_benchmark_run_review(run_state,completed_at),
 KEY idx_jrei_benchmark_batch(batch_id,case_id),
 UNIQUE KEY uq_jrei_benchmark_batch_case(batch_id,case_id),
 CONSTRAINT fk_jrei_benchmark_run_case FOREIGN KEY(case_id)
   REFERENCES jrei_ai_governed_benchmark_cases(case_id) ON DELETE RESTRICT,
 CONSTRAINT fk_jrei_benchmark_run_reviewer FOREIGN KEY(expert_reviewer_account_id)
   REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- No speculative model quality scores, spend amounts, ranking or successful
-- call counts are seeded. Real human review must be independent of provider.
