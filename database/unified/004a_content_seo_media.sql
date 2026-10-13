-- Unified Bertina | 004a bilingual CMS, SEO, structured data, media provenance.
-- Source-controlled pages remain authoritative until explicit CMS integration acceptance.
SET NAMES utf8mb4;
SET time_zone = '+00:00';
CREATE TABLE IF NOT EXISTS eco_content_items (
  id CHAR(36) NOT NULL PRIMARY KEY,
  canonical_key VARCHAR(191) NOT NULL UNIQUE,
  content_kind VARCHAR(50) NOT NULL,
  owner_account_id CHAR(36) NULL,
  workflow_state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  first_published_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  FOREIGN KEY (owner_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_content_revisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  item_id CHAR(36) NOT NULL,
  locale CHAR(2) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  title VARCHAR(350) NOT NULL,
  body_object_id CHAR(36) NULL,
  content_sha256 CHAR(64) NOT NULL,
  review_state VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  approved_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_content_revision (item_id,locale,revision_no),
  FOREIGN KEY (item_id) REFERENCES eco_content_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (body_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_content_locales (
  id CHAR(36) NOT NULL PRIMARY KEY,
  item_id CHAR(36) NOT NULL,
  locale CHAR(2) NOT NULL,
  current_revision_id CHAR(36) NULL,
  slug VARCHAR(191) NOT NULL,
  canonical_path VARCHAR(191) NOT NULL,
  index_policy VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_content_locale (item_id,locale),
  UNIQUE KEY uq_eco_content_path (canonical_path),
  FOREIGN KEY (item_id) REFERENCES eco_content_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (current_revision_id) REFERENCES eco_content_revisions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_translation_links (
  id CHAR(36) NOT NULL PRIMARY KEY,
  source_revision_id CHAR(36) NOT NULL,
  target_revision_id CHAR(36) NOT NULL,
  translation_state VARCHAR(24) NOT NULL DEFAULT 'REVIEW',
  verified_by_account_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_trans_pair (source_revision_id,target_revision_id),
  FOREIGN KEY (source_revision_id) REFERENCES eco_content_revisions(id) ON DELETE RESTRICT,
  FOREIGN KEY (target_revision_id) REFERENCES eco_content_revisions(id) ON DELETE RESTRICT,
  FOREIGN KEY (verified_by_account_id) REFERENCES customer_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_seo_records (
  id CHAR(36) NOT NULL PRIMARY KEY,
  content_locale_id CHAR(36) NOT NULL,
  revision_no INT UNSIGNED NOT NULL,
  meta_title VARCHAR(350) NULL,
  meta_description VARCHAR(600) NULL,
  canonical_url VARCHAR(500) NOT NULL,
  robots_directive VARCHAR(100) NOT NULL DEFAULT 'index,follow',
  og_object_id CHAR(36) NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_seo_revision (content_locale_id,revision_no),
  FOREIGN KEY (content_locale_id) REFERENCES eco_content_locales(id) ON DELETE RESTRICT,
  FOREIGN KEY (og_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_structured_data_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  content_locale_id CHAR(36) NOT NULL,
  schema_type VARCHAR(70) NOT NULL,
  version_no INT UNSIGNED NOT NULL,
  json_object_id CHAR(36) NOT NULL,
  validated_at DATETIME(3) NULL,
  validator_code VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_eco_struct_version (content_locale_id,schema_type,version_no),
  FOREIGN KEY (content_locale_id) REFERENCES eco_content_locales(id) ON DELETE RESTRICT,
  FOREIGN KEY (json_object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_redirect_rules (
  id CHAR(36) NOT NULL PRIMARY KEY,
  source_path VARCHAR(191) NOT NULL UNIQUE,
  target_path VARCHAR(500) NOT NULL,
  http_code SMALLINT UNSIGNED NOT NULL DEFAULT 301,
  status VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  verified_at DATETIME(3) NULL,
  reason_code VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT ck_eco_redirect_code CHECK (http_code IN (301,302,307,308))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_media_assets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  object_id CHAR(36) NOT NULL,
  media_kind VARCHAR(40) NOT NULL,
  source_license_code VARCHAR(80) NULL,
  rights_status VARCHAR(24) NOT NULL DEFAULT 'UNVERIFIED',
  alt_text_fa VARCHAR(500) NULL,
  alt_text_en VARCHAR(500) NULL,
  attribution_reference VARCHAR(160) NULL,
  approved_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_media_variants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  variant_code VARCHAR(60) NOT NULL,
  object_id CHAR(36) NOT NULL,
  width_px INT UNSIGNED NULL,
  height_px INT UNSIGNED NULL,
  format_code VARCHAR(30) NOT NULL,
  quality_version VARCHAR(40) NULL,
  UNIQUE KEY uq_eco_media_variant (asset_id,variant_code),
  FOREIGN KEY (asset_id) REFERENCES eco_media_assets(id) ON DELETE RESTRICT,
  FOREIGN KEY (object_id) REFERENCES eco_object_refs(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_content_media_links (
  id CHAR(36) NOT NULL PRIMARY KEY,
  revision_id CHAR(36) NOT NULL,
  asset_id CHAR(36) NOT NULL,
  placement_code VARCHAR(60) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_eco_content_media (revision_id,asset_id,placement_code),
  FOREIGN KEY (revision_id) REFERENCES eco_content_revisions(id) ON DELETE RESTRICT,
  FOREIGN KEY (asset_id) REFERENCES eco_media_assets(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_content_relations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  from_item_id CHAR(36) NOT NULL,
  to_item_id CHAR(36) NOT NULL,
  relation_code VARCHAR(60) NOT NULL,
  weight SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uq_eco_content_rel (from_item_id,to_item_id,relation_code),
  FOREIGN KEY (from_item_id) REFERENCES eco_content_items(id) ON DELETE RESTRICT,
  FOREIGN KEY (to_item_id) REFERENCES eco_content_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eco_content_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  revision_id CHAR(36) NOT NULL,
  reviewer_account_id CHAR(36) NOT NULL,
  review_kind VARCHAR(60) NOT NULL,
  decision_code VARCHAR(32) NOT NULL,
  comments_object_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY (revision_id) REFERENCES eco_content_revisions(id) ON DELETE RESTRICT,
  FOREIGN KEY (reviewer_account_id) REFERENCES customer_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (comments_object_id) REFERENCES eco_object_refs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
