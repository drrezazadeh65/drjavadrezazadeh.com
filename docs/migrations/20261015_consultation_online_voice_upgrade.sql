-- OPTIONAL MANUAL production upgrade, never run on commit or CI against Bertina.
-- Requires explicit owner approval, verified recoverable backup and a reviewed
-- table definition. Existing PHONE/VIDEO/IN_PERSON values and paid orders remain.
-- Do NOT run merely to make a source-only smoke test green.
--
-- PRECHECK (read-only, no customer rows):
-- SHOW CREATE TABLE commerce_consultation_preferences;
-- SELECT COLUMN_TYPE FROM information_schema.COLUMNS
--  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commerce_consultation_preferences'
--    AND COLUMN_NAME='delivery_mode';
-- SELECT CONSTRAINT_NAME,CONSTRAINT_TYPE FROM information_schema.TABLE_CONSTRAINTS
--  WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='commerce_consultation_preferences';
--
-- MySQL 8.0.19+ and MariaDB 10.11 both support DROP CONSTRAINT. One
-- ALTER statement maintains the city invariant while widening the ENUM.
-- DO NOT execute on an unexpected schema; verify the constraint name first.
ALTER TABLE commerce_consultation_preferences
  DROP CONSTRAINT ck_commerce_consultation_city,
  MODIFY COLUMN delivery_mode ENUM('PHONE','VOICE','VIDEO','IN_PERSON') NOT NULL,
  ADD CONSTRAINT ck_commerce_consultation_city CHECK (
    (delivery_mode='IN_PERSON' AND meeting_city IS NOT NULL)
    OR (delivery_mode IN ('PHONE','VOICE','VIDEO') AND meeting_city IS NULL)
  );
-- POSTCHECK: confirm VOICE is in COLUMN_TYPE, the CHECK is enforced,
-- and existing PHONE/VIDEO/IN_PERSON records retain exact values.
-- Rollback requires reviewing all VOICE records and arranging contact:
-- never silently coerce online voice to telephone or video.
