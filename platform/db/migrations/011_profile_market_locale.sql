-- PROFILE MARKET / LOCALE EXTENSION 011
-- Provider-neutral PostgreSQL baseline
-- Adds an optional ISO 3166-1 alpha-2 country code to the private account profile.
-- It is not a precise location and must not be used as proof of residence, payment eligibility or identity.

BEGIN;

ALTER TABLE profile
  ADD COLUMN IF NOT EXISTS country_code text;

ALTER TABLE profile
  DROP CONSTRAINT IF EXISTS profile_country_code_format;

ALTER TABLE profile
  ADD CONSTRAINT profile_country_code_format
  CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$');

COMMENT ON COLUMN profile.country_code IS
  'Optional ISO 3166-1 alpha-2 account preference/context. Not proof of residence, identity, tax status or payment-provider eligibility.';

COMMIT;
