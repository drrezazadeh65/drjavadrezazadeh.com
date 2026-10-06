-- Baseline RLS for identity-owned session data.
BEGIN;
ALTER TABLE auth_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_session FORCE ROW LEVEL SECURITY;
ALTER TABLE account_token ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_token FORCE ROW LEVEL SECURITY;
ALTER TABLE role_change_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_change_event FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_session_own_read ON auth_session;
CREATE POLICY auth_session_own_read ON auth_session FOR SELECT
 USING(user_id = nullif(current_setting('app.user_id',true),'')::uuid);

-- Tokens and role-change history intentionally have no direct end-user policies.
-- API/service identities must use narrowly scoped server paths; browser clients never query these tables.
COMMIT;
