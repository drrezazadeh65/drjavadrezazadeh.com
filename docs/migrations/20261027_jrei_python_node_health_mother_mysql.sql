-- JREI Python Node B outbound proof-of-process, ADDITIVE/UNAPPLIED.
-- Create ONLY after inspected mother drjavad1_store, backup+restore and a clone check.
-- No new database, no credentials and no control over JREI job execution.
-- Signed identity, not independent audit of model, source rights, or learning.
CREATE TABLE IF NOT EXISTS jrei_python_node_health (
  node_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  python_process VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  health_schema VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  node_observed_at BIGINT UNSIGNED NOT NULL,
  server_received_at BIGINT UNSIGNED NOT NULL,
  KEY idx_python_node_health_received (server_received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Intentionally no FK until existing jrei_hybrid_nodes field collation verified
-- on a disposable clone; auth always checks the original enabled node row.
