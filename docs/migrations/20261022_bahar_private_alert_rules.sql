-- Source-only additive configuration for EXISTING Bertina mother operations DB.
-- DO NOT RUN until final integrated acceptance and authorized deployment.
-- Preserve every previously configured rule, recipient and scope preference.
-- New rules are deliberately OFF until super-admin enables them in dashboard.
INSERT IGNORE INTO operations_alert_rules
  (event_code,enabled,threshold_count,cooldown_minutes,updated_at)
VALUES
  ('bahar_private_storage_failure',0,1,60,UNIX_TIMESTAMP()),
  ('bahar_eligibility_queue_failure',0,1,120,UNIX_TIMESTAMP());

-- The dedicated per-feature email scopes are also DEFAULT OFF (no policy
-- row implies disabled for these two particular new incident codes).
-- Review privacy of admin recipient and encrypted SMTP transport before
-- activation. Never send student names, email addresses, scorecards or
-- workbook content in incident payloads.
