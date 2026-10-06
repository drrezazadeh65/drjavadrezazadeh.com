-- Identity/session security foundation. Authentication provider remains external/provider-neutral.
BEGIN;
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS auth_session (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 secret_hash text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 revoke_reason text,
 CHECK(expires_at>created_at)
);
CREATE INDEX IF NOT EXISTS auth_session_user_active_idx ON auth_session(user_id,expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS account_token (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 purpose text NOT NULL CHECK(purpose IN ('EMAIL_VERIFICATION','PASSWORD_RECOVERY')),
 token_hash text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 CHECK(expires_at>created_at)
);

CREATE TABLE IF NOT EXISTS role_change_event (
 id uuid PRIMARY KEY,
 target_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('STUDENT','PARENT','TEACHER','CONSULTANT','RESEARCHER','EDITOR','ADMIN','SUPER_ADMIN')),
 action text NOT NULL CHECK(action IN ('GRANT','REVOKE')),
 actor_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
 reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
