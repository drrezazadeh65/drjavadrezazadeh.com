-- Email-only account verification/recovery with required mobile contact.
BEGIN;
ALTER TABLE app_user ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE profile
  ADD COLUMN IF NOT EXISTS mobile_e164 text,
  ADD COLUMN IF NOT EXISTS mobile_collected_at timestamptz;
ALTER TABLE profile DROP CONSTRAINT IF EXISTS profile_mobile_e164_check;
ALTER TABLE profile
  ADD CONSTRAINT profile_mobile_e164_check
  CHECK (mobile_e164 IS NULL OR mobile_e164 ~ '^\\+[1-9][0-9]{7,14}$');
COMMENT ON COLUMN profile.mobile_e164 IS
  'Registration/service contact number in E.164 format; never an authentication, verification, role or password-recovery authority.';
COMMIT;
