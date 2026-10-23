-- JREI V5.1 existing operations alert center: ADDITIVE, STAGED ONLY.
-- Do not execute before the single final owner-authorized acceptance.
-- Apply to existing drjavad1_store, after confirming operations_* tables.
-- Do NOT create another DB, replace global alert preferences or send email.

-- Keep newly introduced JREI incident email rules OFF by default.
-- The original SUPER_ADMIN notification matrix may later enable them.
INSERT IGNORE INTO operations_alert_rules
  (event_code,enabled,threshold_count,cooldown_minutes,updated_at)
VALUES
  ('jrei_worker_heartbeat_lost',0,1,45,UNIX_TIMESTAMP()),
  ('jrei_worker_outcome_unknown',0,1,60,UNIX_TIMESTAMP()),
  ('jrei_evaluation_review_overdue',0,1,180,UNIX_TIMESTAMP());

-- A separate per-feature mail permission must also be explicitly enabled.
-- Even a globally enabled mail outbox must not send educational Worker alerts
-- unless private config, governed CLI sensor and this feature are all enabled.
INSERT IGNORE INTO operations_alert_scope_policies
  (scope_id,enabled,updated_at)
VALUES
  ('feature:jrei-hybrid-worker-alerts',0,UNIX_TIMESTAMP());

-- Scheduler job registration is intentionally NOT performed by SQL:
-- only the original MFA SUPER_ADMIN Cron dashboard can register/enable the
-- code-allowlisted jrei_hybrid_incident_sensor job. Turning OFF this sensor
-- prevents further observations and suppresses previously queued notices.
-- Existing alert worker's unknown-outcome SMTP protection stays unchanged.
