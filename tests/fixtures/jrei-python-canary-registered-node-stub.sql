-- CI DISPOSABLE FIXTURE ONLY. NOT an alternative migration of the actual
-- jrei_hybrid_nodes mother table, which remains the production authority.
-- Only columns required for read-only preflight join; no real node secrets.
CREATE TABLE jrei_hybrid_nodes (
  node_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
  status VARCHAR(16) NOT NULL,
  revoked_at BIGINT UNSIGNED NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
