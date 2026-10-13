-- Unified Bertina | 005c consent-aware analytics, conversion evidence and honest attribution.
-- Track only approved, minimised events; a lead/click does not prove payment or delivery.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_analytics_event_definitions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  event_code VARCHAR(100) NOT NULL UNIQUE,
  purpose_code VARCHAR(80) NOT NULL,
  classification VARCHAR(32) NOT NULL,
  schema_revision INT UNSIGNED NOT NULL DEFAULT 1,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_analytics_consents (
  id CHAR(36) NOT NULL PRIMARY KEY,
  account_id CHAR(36) NULL,
  anonymous_subject_hash CHAR(64) NULL,
  consent_record_id CHAR(36) NULL,
  purpose_code VARCHAR(80) NOT NULL,
  state VARCHAR(24) NOT NULL DEFAULT 'DENIED',
  valid_until DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (account_id) REFERENCES customer_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (consent_record_id) REFERENCES eco_consent_records(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_analytics_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  event_definition_id CHAR(36) NOT NULL,
  anonymous_subject_hash CHAR(64) NULL,
  consent_id CHAR(36) NULL,
  route_key VARCHAR(191) NULL,
  occurred_at DATETIME(3) NOT NULL,
  source_release_sha CHAR(40) NULL,
  value_minor BIGINT UNSIGNED NULL,
  currency_code CHAR(3) NULL,
  verification_state VARCHAR(24) NOT NULL DEFAULT 'OBSERVED',
  KEY idx_eco_event_time (event_definition_id,occurred_at),
  KEY idx_eco_route_event (route_key,occurred_at),
  FOREIGN KEY (event_definition_id) REFERENCES eco_analytics_event_definitions(id) ON DELETE RESTRICT,
  FOREIGN KEY (consent_id) REFERENCES eco_analytics_consents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_analytics_daily_rollups (
  id CHAR(36) NOT NULL PRIMARY KEY,
  event_definition_id CHAR(36) NOT NULL,
  aggregate_date DATE NOT NULL,
  dimension_key VARCHAR(100) NOT NULL,
  event_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  consented_subject_count BIGINT UNSIGNED NULL,
  source_kind VARCHAR(60) NOT NULL,
  validated_at DATETIME(3) NULL,
  UNIQUE KEY uq_eco_rollup_day (event_definition_id,aggregate_date,dimension_key,source_kind),
  FOREIGN KEY (event_definition_id) REFERENCES eco_analytics_event_definitions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_conversion_definitions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  conversion_code VARCHAR(90) NOT NULL UNIQUE,
  qualifying_event_id CHAR(36) NOT NULL,
  evidence_requirement VARCHAR(80) NOT NULL,
  approved_revision INT UNSIGNED NOT NULL DEFAULT 1,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  FOREIGN KEY (qualifying_event_id) REFERENCES eco_analytics_event_definitions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_conversion_evidence (
  id CHAR(36) NOT NULL PRIMARY KEY,
  conversion_definition_id CHAR(36) NOT NULL,
  commerce_order_id CHAR(36) NULL,
  event_id CHAR(36) NULL,
  evidence_object_id CHAR(36) NULL,
  verification_state VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (conversion_definition_id) REFERENCES eco_conversion_definitions(id) ON DELETE RESTRICT,
  FOREIGN KEY (commerce_order_id) REFERENCES commerce_orders(id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES eco_analytics_events(id) ON DELETE SET NULL,
  FOREIGN KEY (evidence_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_attribution_models (
  id CHAR(36) NOT NULL PRIMARY KEY,
  model_code VARCHAR(80) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  method_code VARCHAR(70) NOT NULL,
  limitations_object_id CHAR(36) NULL,
  validation_state VARCHAR(24) NOT NULL DEFAULT 'UNVALIDATED',
  UNIQUE KEY uq_eco_attribution_model (model_code,revision_no),
  FOREIGN KEY (limitations_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_attribution_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  attribution_model_id CHAR(36) NOT NULL,
  conversion_evidence_id CHAR(36) NULL,
  touchpoint_event_id CHAR(36) NOT NULL,
  weight_decimal DECIMAL(12,9) NULL,
  estimated TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (attribution_model_id) REFERENCES eco_attribution_models(id) ON DELETE RESTRICT,
  FOREIGN KEY (conversion_evidence_id) REFERENCES eco_conversion_evidence(id) ON DELETE SET NULL,
  FOREIGN KEY (touchpoint_event_id) REFERENCES eco_analytics_events(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_provider_analytics_syncs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  integration_id CHAR(36) NOT NULL,
  reporting_period DATE NOT NULL,
  metric_source VARCHAR(70) NOT NULL,
  run_status VARCHAR(24) NOT NULL DEFAULT 'NOT_VERIFIED',
  provider_reference VARCHAR(150) NULL,
  source_hash CHAR(64) NULL,
  completed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_eco_provider_report (integration_id,reporting_period),
  FOREIGN KEY (integration_id) REFERENCES eco_integrations(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_analytics_anomaly_flags (
  id CHAR(36) NOT NULL PRIMARY KEY,
  metric_definition_id CHAR(36) NOT NULL,
  detected_at DATETIME(3) NOT NULL,
  severity VARCHAR(24) NOT NULL,
  observation_code VARCHAR(80) NOT NULL,
  evidence_sha256 CHAR(64) NULL,
  resolution_code VARCHAR(60) NULL,
  FOREIGN KEY (metric_definition_id) REFERENCES eco_analytics_event_definitions(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
