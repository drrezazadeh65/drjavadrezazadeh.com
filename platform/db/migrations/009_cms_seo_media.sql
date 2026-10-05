-- CORE PLATFORM MIGRATION 009
-- CMS, SEO records, media provenance and redirect governance
-- Provider-neutral PostgreSQL baseline; not yet applied to production.

BEGIN;

CREATE TABLE IF NOT EXISTS content_entry (
  id uuid PRIMARY KEY,
  content_type text NOT NULL
    CHECK (content_type IN ('PAGE','ARTICLE','NEWS','BOOK','SERVICE','PRODUCT_CONTENT','POLICY','JOURNAL_PUBLIC')),
  canonical_key text NOT NULL UNIQUE,
  primary_language text NOT NULL
    CHECK (primary_language IN ('fa','en')),
  workflow_status text NOT NULL DEFAULT 'DRAFT'
    CHECK (workflow_status IN ('DRAFT','REVIEW','APPROVED','PUBLISHED','ARCHIVED')),
  current_revision_id uuid,
  created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_revision (
  id uuid PRIMARY KEY,
  content_entry_id uuid NOT NULL REFERENCES content_entry(id) ON DELETE CASCADE,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  language text NOT NULL CHECK (language IN ('fa','en')),
  title text NOT NULL,
  slug text NOT NULL,
  excerpt text,
  body_source text NOT NULL,
  change_note text,
  created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_entry_id, revision_number, language)
);

ALTER TABLE content_entry
  ADD CONSTRAINT content_entry_current_revision_fk
  FOREIGN KEY (current_revision_id)
  REFERENCES content_revision(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS translation_link (
  id uuid PRIMARY KEY,
  source_content_entry_id uuid NOT NULL REFERENCES content_entry(id) ON DELETE CASCADE,
  target_content_entry_id uuid NOT NULL REFERENCES content_entry(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'TRANSLATION'
    CHECK (relationship IN ('TRANSLATION','ADAPTATION')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_content_entry_id, target_content_entry_id)
);

CREATE TABLE IF NOT EXISTS seo_record (
  id uuid PRIMARY KEY,
  content_entry_id uuid NOT NULL REFERENCES content_entry(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('fa','en')),
  url_path text NOT NULL,
  title_tag text NOT NULL,
  meta_description text NOT NULL,
  canonical_url text NOT NULL,
  robots_directive text NOT NULL DEFAULT 'index,follow',
  primary_intent text,
  primary_topic text,
  og_title text,
  og_description text,
  og_image_media_id uuid,
  schema_type text,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_entry_id, language),
  UNIQUE (url_path)
);

CREATE TABLE IF NOT EXISTS media_asset (
  id uuid PRIMARY KEY,
  storage_key text NOT NULL UNIQUE,
  public_url text,
  file_name text NOT NULL,
  media_type text NOT NULL,
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  alt_fa text,
  alt_en text,
  caption_fa text,
  caption_en text,
  provenance_type text NOT NULL
    CHECK (provenance_type IN ('USER_PROVIDED','ORIGINAL_DESIGN','LICENSED','PUBLIC_DOMAIN','GENERATED','OTHER_APPROVED')),
  provenance_note text,
  licence_note text,
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE seo_record
  ADD CONSTRAINT seo_record_og_image_fk
  FOREIGN KEY (og_image_media_id)
  REFERENCES media_asset(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS redirect_rule (
  id uuid PRIMARY KEY,
  source_path text NOT NULL UNIQUE,
  target_url text NOT NULL,
  redirect_code integer NOT NULL DEFAULT 301
    CHECK (redirect_code IN (301,302,307,308)),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','PAUSED','RETIRED')),
  created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS publication_event (
  id uuid PRIMARY KEY,
  content_entry_id uuid NOT NULL REFERENCES content_entry(id) ON DELETE CASCADE,
  revision_id uuid NOT NULL REFERENCES content_revision(id) ON DELETE RESTRICT,
  event_type text NOT NULL
    CHECK (event_type IN ('PUBLISHED','UPDATED','UNPUBLISHED','ARCHIVED')),
  actor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  event_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS publication_event_content_idx
  ON publication_event(content_entry_id, created_at DESC);

CREATE TABLE IF NOT EXISTS seo_release_check (
  id uuid PRIMARY KEY,
  content_entry_id uuid NOT NULL REFERENCES content_entry(id) ON DELETE CASCADE,
  revision_id uuid NOT NULL REFERENCES content_revision(id) ON DELETE RESTRICT,
  check_key text NOT NULL,
  status text NOT NULL
    CHECK (status IN ('PASS','FAIL','NOT_APPLICABLE','WAIVED')),
  note text,
  checked_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  checked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_entry_id, revision_id, check_key)
);

COMMIT;
