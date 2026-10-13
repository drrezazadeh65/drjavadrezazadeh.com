# Unified Bertina Database — Architectural Master v1.0 (2026)

**Status:** design and isolated certification only. **Not applied to production.**  
**Canonical branch:** `migration/bertina-linux6`  
**Runtime:** existing Bertina PHP/MySQL/MariaDB, **one first-party transactional database** with `customer_*`, `commerce_*`, `operations_*` and future `eco_*` modules.

## 1. Architectural decision

Use the EXISTING database connection and preserve all working account, checkout, inventory, administrator, and mail APIs. Adopt one extensible normalized **MariaDB 10.11 / MySQL 8.0** schema for the first-party site. The sixteen modules in this folder add **198 versionable tables**, all prefixed `eco_`, using InnoDB, `utf8mb4_unicode_ci`, primary keys, foreign keys, referential integrity, and explicit indexing. Do not create another transactional identity or order system.

**The word “unified” means one canonical source of truth, not one giant table or one permissive SQL user.** It does not eliminate the need for backups, object storage, search indexes, caching, specialist software, security boundaries, or potentially a separate SQL schema for an independently installed package such as native OJS. Existing first-party integrations can share one operational database; OJS may require its own logical schema and privileges even on the **same MariaDB server**, subject to installer compatibility. Never expose the site's financial or identity tables to the OJS database user.

**Existing 30 PostgreSQL design migrations at `platform/db/migrations/` MUST NOT execute against Bertina.** They serve as domain models that these MariaDB modules reflect and extend, not an operational implementation or a migration history.

## 2. Source-of-truth mapping

| Domain | Operational source | New extensible architecture | Activation note |
|---|---|---|---|
| Identity, email, sessions | `customer_accounts`, `customer_auth_tokens`, `customer_auth_sessions`, `customer_auth_rate_limits` | `eco_account_profiles`, `eco_subjects`, `eco_role_*`, `eco_consent_*` | Existing account IDs are the ONLY first-party identity keys |
| Commerce and checkout | `commerce_orders` and the already installed Stage09 tables | `eco_products`, `eco_product_prices`, `eco_order_lines`, `eco_settlement_*`, `eco_invoices` | Checkout and payment settlement must still use verified provider/bank proof |
| Book inventory | `commerce_book_stock`, reservations, stock movements when installed | `eco_shipment_*`, shipping/address object refs | Never reset the live physical stock from catalogue defaults |
| Services and consultation | `growth_lead_requests` and consent events (Stage14, currently not ready); `commerce_service_cases` when installed | `eco_service_*`, `eco_booking_*`, `eco_appointments`, `eco_entitlements` | A lead does not automatically create a booking, payment, or entitlement |
| Administrator and MFA | `operations_*`, existing owner MFA | `eco_audit_events`, `eco_role_grants`, workflow versions, approvals | New roles do not grant admin privilege without secure API authorization |
| Learning and counselling | First-party learner account + guardian consent | `eco_education_*`, plans, coaching, progress, pathways | Pseudonymous student subjects; parental/guardian permissions mandatory |
| Golden Talent, RCAS, BAHAR | Existing application contracts, not scientifically field-validated | Versioned `eco_assessment_*`, `eco_talent_*`, `eco_rcas_*`, `eco_golden_path_*`, `eco_bahar_*` | No automatic diagnostic validity, prediction, entitlement, or award claims |
| Journal JHELA | Existing founding pages; OJS installation remains separate | `eco_journal_*`, reviewer/round/decision evidence, `eco_ojs_external_links` | External OJS has its own native tables; bridge with stable IDs |
| Research | Approved human research governance | `eco_research_*`, case pseudonyms, consent snapshots, codebooks, frozen exports | Ethical review, identity separation and approved exports |
| Content/SEO | Published GitHub files, existing stable public routes | `eco_content_*`, `eco_seo_*`, media, redirects, search receipts | Do NOT rewrite live addresses or change frozen SEO standard |
| Social distribution | Existing `social_*` tables when installed | `eco_campaign_*`, external delivery receipts, marketing consent | Never put social access tokens in content/analytics tables |
| Messaging and support | Existing PHP/mail integration | `eco_notification_*`, private message refs, support tickets | Private bodies encrypted and access-controlled, not raw public data |
| Analytics | Search Console / Bing provider data; GA4 may not be connected | `eco_analytics_*`, conversion evidence, rollups, attribution | Unknown != zero; keep consent and bank proof separate |
| AI and automation | Separate permissioned models, browser/API integration | `eco_ai_*`, `eco_automation_*` | Human-approved actions and explicit retention; no raw prompts in log tables |
| Future modules | Stable `eco_organizations`, feature definitions, codebooks and workflow versions | Add `006_*.sql`, `007_*.sql` etc. | No schema-wide redesign or duplicate user database required |

**The tables are prepared future capacities, not evidence that their business functionality is enabled.**

## 3. Why this architecture can grow

1. **Normalized transactional core.** One user identity, canonical order reference, stable UUID identifiers, and foreign-key relationships instead of duplicate cross-system customer registries. Cross-provider references stay in separate binding tables.
2. **Versioned science and content.** Distinct instrument/version/item/response/model/score/report records. Versions of questionnaires and algorithms remain reproducible. Versioned CMS, SEO, media and journal metadata.
3. **Separation of powers.** Organization membership is NOT administrator authorization. Scope-specific roles require approval. Journal reviewer, researcher and assessor access must be enforced in PHP against verified identity and grants.
4. **Explicit consent and privacy.** Capture purpose, notice version, consent decision and withdrawal, guardian authority, deletion requests, legal holds and retention policies. Protected documents and address details are encrypted at the application/object layer; never store unencrypted payment credentials, OTPs, SMTP passwords, manuscripts or identifiable minors' histories in audit logs.
5. **Financial correctness.** Money uses integer minor units with an explicit currency code; `IRT` is the site's present toman accounting convention, not a universal ISO guarantee. Reserve/confirm/release inventory within locking transactions. Gateway callbacks, payment claims, bank settlement, refunds and fulfilment are distinct. A provider callback is **not** bank reconciliation.
6. **Reliable execution.** Outbox and idempotency keys, task claims, retries, webhook deduplication, workflow versions and audit provenance. No background job should silently bypass privacy, consent, release or role checks.
7. **Bilingual and international readiness.** Persian/English translations, metadata, locale/timezone, region prices and future FX models. Add languages by inserting localizations, not cloning all domain tables.
8. **Performance and maintenance.** Indexes on scoped/temporal access patterns and unique business keys, `DATETIME(3)` UTC fields for new modules, cold-data retention policies, precomputation for analytics. Profile queries before adding indexes; retain a separate backup/restore test.
9. **Module lifecycle.** Build only essential operational tables first; install dormant capabilities incrementally in the same database as their real application code becomes ready. Feature definitions default off. No speculative external tokens or synthetic financial facts.
10. **Operational portability.** The same schema is validated on MariaDB 10.11 and MySQL 8.0. No PostgreSQL `UUID`, `JSONB`, `TIMESTAMPTZ`, row-level security statements, or vendor extensions are used.

## 4. Deployment order and acceptance gates

### A. Read-only inventory (no database mutation)
- Confirm current engine/version, database name, charset, total tables, current table structure, foreign keys and **EXACT** record counts for customer, orders, payment claims, stock, student support, growth leads and administrator records. Existing older documents suggest legacy test commerce rows; do not trust a “completely empty” assumption without counts.
- Check the private config and which features are already enabled; preserve existing IDs. Determine whether Stage09 and Stage14 modules are installed.
- Confirm that a current backup has been restored to an independent disposable database. Merely having an archive is insufficient for full recovery certification.

### B. Disposable certification
- Create a temporary MariaDB 10.11 + MySQL 8 fixture. Import only `docs/BERTINA_MYSQL_SCHEMA.sql` as a canonical existing baseline and execute the 16 modules **in listed order**.
- Execute the modules **twice** to confirm repeatable additive DDL, FK creation, engine/collation and exact 198-table count.
- Run `node --test tests/unified-db-schema.test.mjs`, check 200+ referential constraints, and verify **zero customer and order data** in fixture.
- Test migration of any existing live schema differences on a *sanitised restore*, not on the production database.

### C. Owner-reviewed production activation (separate explicit decision)
- Lock out concurrent production release and DDL; confirm backed-up source fingerprint and exact schema, check disk capacity and transaction engines.
- Install `001` first for core governance, then the `002*` modules once fulfilment integration is ready, `003*` after guardian and scientific review, and `004*/005*` when real services are enabled. **Do not automatically import all 198 empty tables onto production.**
- Create or adapt PHP repositories behind a feature flag, exercise real business acceptance, then enable module-by-module.
- Maintain a registered migration checksum and a forward-repair script. MySQL DDL often implicitly commits; database restore, not a claimed SQL rollback, is the final recovery method.

## 5. Priority blocker: Stage14 consent tables

For the current `/api/growth/health` response, the owner-verified API showed `database=true`, `auth=true` and `consentSchema=false`. This points specifically to the two missing or structurally incompatible Stage14 consent tables.

After backup restoration is verified and explicit database-migration authorization is obtained, apply **the already reviewed** `docs/BERTINA_ORGANIC_GROWTH_SCHEMA.sql` to the intended schema. Do **not** create competing `eco_` duplicates of its live lead records. A successful migration should be followed by `growth/health` returning `ready=true` and verified-account-only lead acceptance/withdrawal tests.

## 6. Risks, honest limits and future change management

- **No finite schema can guarantee zero new tables or zero external data infrastructure forever.** The practical guarantee is a resilient *single first-party transactional authority* with extension points. A dedicated native OJS installation, vector index, payment-provider ledger or private file store may require its own storage/privilege boundary without creating another independent user/accounting database.
- Primary columns and composite unique indexes prevent accidental duplicates; app-level transactions must enforce cross-table state, child/guardian boundaries, inventory/booking capacity, money and consent.
- Database-side FKs do not implement full row-level security in MySQL. Use authorization checks and least-privilege SQL accounts. Do not interpret the PostgreSQL `platform/db/rls/*.sql` as functioning on Bertina.
- A schema migration does not establish legally valid consent, instrument psychometrics, independent bank settlement, ISI indexing, editorial quality, or successful backup restoration.
- Do not manually edit the DB with phpMyAdmin and then assume GitHub's `eco_schema_migrations` registry is correct; record verified checksums only after operator evidence.

**State on 2026-10-13:** Source designs only. No table, real customer row, payment, site file, existing stock or credential has been changed by this database architecture work.
