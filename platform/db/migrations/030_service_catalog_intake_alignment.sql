-- MASTER V4.3 MIGRATION 030
-- Canonical service-catalog intake alignment.
-- Provider-neutral PostgreSQL baseline; not yet applied to production.
BEGIN;

-- New intakes resolve the public service-catalog code to service_definition.
-- The older service_type vocabulary remains nullable for backwards compatibility
-- with records created before the v4.3 catalogue became canonical.
ALTER TABLE consultation_request
  ADD COLUMN IF NOT EXISTS service_definition_id uuid
  REFERENCES service_definition(id) ON DELETE SET NULL;

ALTER TABLE consultation_request
  ALTER COLUMN service_type DROP NOT NULL;

ALTER TABLE consultation_request
  DROP CONSTRAINT IF EXISTS consultation_request_service_reference_required;

ALTER TABLE consultation_request
  ADD CONSTRAINT consultation_request_service_reference_required
  CHECK (service_definition_id IS NOT NULL OR service_type IS NOT NULL);

CREATE INDEX IF NOT EXISTS consultation_request_service_definition_idx
  ON consultation_request(service_definition_id,status,created_at DESC);

COMMENT ON COLUMN consultation_request.service_definition_id IS
  'Canonical v4.3 service reference. Resolve a stable public service code through service_definition before persisting intake.';

COMMENT ON COLUMN consultation_request.service_type IS
  'Legacy broad routing category retained for backwards compatibility; new v4.3 intakes should use service_definition_id.';

-- Stable service codes are operational identifiers, not display labels.
-- Price, duration and availability are resolved from authoritative service/product
-- records at request/checkout time rather than trusted from browser-submitted values.
ALTER TABLE service_definition
  ADD COLUMN IF NOT EXISTS public_catalog_code text;

UPDATE service_definition
SET public_catalog_code=service_code
WHERE public_catalog_code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS service_definition_public_catalog_code_uidx
  ON service_definition(public_catalog_code)
  WHERE public_catalog_code IS NOT NULL;

COMMIT;
