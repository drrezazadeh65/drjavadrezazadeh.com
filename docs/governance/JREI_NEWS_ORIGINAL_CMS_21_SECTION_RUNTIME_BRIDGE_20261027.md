# JREI News original engine → 21-section public newsroom

**Canonical source branch:** migration/bertina-linux6
**Scope:** additive source wiring, existing Bertina PHP 8.3 + original `drjavad1_store`.
**Delivery state:** SOURCE INTEGRATED. No new isolated QA or live DB/deploy action
was executed by this coding-only continuation; never infer a LIVE launch from it.

## 1. Existing systems reused, without a parallel engine

- Original JREI-KA source/rights/scheduler/acquisition, reviewed official
  source monitors, original signed evidence/QA, bilingual private drafting,
  owner standing policy, authenticated CMS files and mother-DB publisher
  receipts remain authoritative.
- News pages remain `/fa/akhbar/` and `/en/news-insights/`; their 21-section
  scripts consume **only** the existing `GET /api/news/v1/rss?language=fa|en`
  and same-origin read-only calendar/search APIs. No static example or live
  fake article is inserted.
- The private publication Cron worker now performs receipt-bound
  `jrNewsOriginalIndexVerifiedPublishedPages` immediately after real CMS
  bilingual confirmation, and can refresh only JREI-owned feed/sitemap
  assets when separately enabled; no old feed.xml/sitemap-news.xml rewrite.
- Previously unmounted `/api/news/v1/calendar` is now bound to the original
  reviewed `jrei_news_exam_milestones` and source registry. It requires
  exact ORIGINAL source-version digest, reviewer, current rights and
  scheduler policy and owner-approved official milestone. Unknown inputs
  produce an empty/disabled result instead of invented dates.
- The original admin newsroom used to import a **missing**
  `/assets/js/jrei-news-owner-panel-v1.mjs`. The module is now included,
  retaining existing session MFA/CSRF, administrative source suggestions,
  actual mother-DB source intake, explicit per-source discovery authorization,
  source reconciliation and owner-click registration of **disabled** News
  Cron rows. It never grants rights, implies crawl success or publishes.
- The private asset/DDL packaging is pinned to the original
  `api/internal/` HTTP-denied directory, while the public API and owner
  JS are required for the later sanitized release.

## 2. Database ownership and additive caretaker

NO second database is created. Existing JREI News core tables have been
documented in the live-owner phpMyAdmin inventory, but live existence of
every 2026-10-25 addon cannot be inferred from repository presence.

`api/jrei-news-schema-caretaker.php` and original Cron worker
`api/internal/jrei-news-schema-caretaker-worker.php` add, if genuinely absent,
FOUR fixed and reviewed tables from the canonical original migrations:

1. `jrei_news_standing_policies`
2. `jrei_news_independent_qa_receipts`
3. `jrei_news_owner_exceptions`
4. `jrei_news_admin_source_submissions`

The exact source DDL is SHA-pinned in the later sanitized package inside
`api/internal/jrei-news-reviewed-additive-ddl-v1.json`. No dynamically
provided DDL, arbitrary schema names, DROP, parallel credentials, customer,
payment, publishing or rights changes are accepted. Execution requires:
original non-HTTP Cron, owner-enabled caretaker, original mother DB,
verified foreign-key dependencies, a fresh hash-checked backup **outside**
the site root, recorded independent restore rehearsal and an exclusive
mother-DB advisory lock. The caretaker itself defaults OFF.

The two existing original ALTER migrations for standing publication
(`jrei_news_publications`) and independent reviewer identity
(`jrei_news_evidence_reviews`) remain separate reviewed gates. This
caregiver intentionally does NOT auto-modify existing columns, check
constraints or foreign keys under unknown live schema. It reports that
missing-ALTER readiness as a distinct state.

## 3. Live availability and release preconditions

The following remain independent original private-config gates and do not
become active just because code is present:

- `operations_cron_master_enabled`
- `jrei_news_integrated_release_accepted`
- `jrei_news_source_activation_accepted`
- `jrei_news_original_cms_writer_enabled`
- `jrei_news_standing_official_publishing_enabled`
- `jrei_news_verified_restore_accepted`
- `jrei_news_publisher_receipts_accepted`
- `jrei_news_search_enabled`
- `jrei_news_calendar_enabled` (new, defaults OFF)
- `jrei_news_verified_syndication_enabled` (optional static RSS)
- `jrei_news_model_drafting_enabled`, approved author corpus and actual
  original signed model draft / independent QA provenance
- Source/robots/transport rights, genuine QA reviewer signatures, original
  source HTML acquisition and owner standing publication policy.

The four-table caretaker additionally requires the independently configured
`jrei_news_schema_caretaker_enabled`,
`jrei_news_schema_restore_rehearsed`,
`jrei_news_schema_backup_file`, and
`jrei_news_schema_backup_sha256`. The owner has authorised avoiding
manual phpMyAdmin repetitions; there is no direct Bertina DB connector in
this development session, so no live SQL mutation is asserted.

## 4. Honest outcome gates

1. Source-bundle complete and any missing reviewed DDL applied to verified
   `drjavad1_store` **only through owner-authorised backup-gated Cron**.
2. At least one genuine source is independently licensed, issuer verified,
   original JREI-KA monitored and actually acquired.
3. A real multilingual editorial revision has signed evidence, authorised
   images and independent claim/style QA.
4. Standing-policy CMS writes **both** canonical FA/EN HTML documents and
   persists original publisher receipts with on-disk SHA checks.
5. Immediate original read-index reconciliation makes the new publication
   searchable and RSS-visible in the 21-section pages.
6. Source amendment/revocation still quarantines unsupported guidance; no
   speculative examination calendar, fake headline or auto-news.
7. Final integrated CI/QA and guarded owner-authorized Bertina release
   remain separate; live publishing is not claimed before real receipts.

Do not change Qwen/Windows worker identity, existing SQL data, canonical URLs,
OJS journal, separate site feed or social subscriptions for this integration.
