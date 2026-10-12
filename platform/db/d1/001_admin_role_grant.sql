-- Cloudflare D1 schema for private admin authorization grants.
-- Only trusted server-side deployment/migration principals may mutate this table.
CREATE TABLE IF NOT EXISTS admin_role_grant (
 identity_subject TEXT PRIMARY KEY NOT NULL,
 admin_id TEXT NOT NULL UNIQUE,
 role TEXT NOT NULL CHECK(role IN ('ADMIN','SUPER_ADMIN')),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 granted_at TEXT NOT NULL,
 reviewed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS admin_role_grant_enabled_idx ON admin_role_grant(enabled,role);
