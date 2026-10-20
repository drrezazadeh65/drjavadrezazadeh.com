# JR Konkur — Bertina owner-provided phpMyAdmin preflight observation (2026-10-21)

**Source:** Owner-provided screenshot from phpMyAdmin with selected database `drjavad1_store`. **Evidence class:** owner screenshot (visible query result), **not independent authenticated database access**. No personal rows, passwords, payment details or private candidate records were extracted.

## What the screenshot actually establishes

The displayed query selects `TABLE_NAME, ENGINE, TABLE_COLLATION` from `information_schema.TABLES` for `drjavad1_store` and filters proposed admission names plus the five explicitly named existing dependencies. It returned **five rows**, all `InnoDB` and `utf8mb4_unicode_ci`:

- `customer_accounts`
- `eco_consent_records`
- `eco_institutions`
- `eco_schema_migrations`
- `eco_subjects`

**No `eco_admission_%` table appeared in that filtered result at the time of the screenshot.** This is consistent with proposed 003e not yet being applied, but it does not substitute for a complete name/column/FK review. **The query did not include `eco_object_refs`** and did not check the nine proposed private-scorecard `003f` table names. Those facts **cannot** be inferred from its five returned rows. The phpMyAdmin "no unique column" warning is expected for an `information_schema` listing and is not evidence of corruption of a real application table.

## What is independently verified in source CI

GitHub Actions [JR Konkur Mother DB — Isolated MariaDB 10.11](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39491200009), source head `490d5198`, completed successfully. Its disposable, isolated MariaDB fixture installed canonical parent schema and tested the proposed eight-table public admissions module `003e`, nine-table private exam/scorecard module `003f`, repeat DDL, source-only seed idempotence and zero approved programme records.

**This fixture is not Bertina.** The workflow's successful completion does not establish a current live backup, restore test, production schema equivalence, authorizations, or completed data imports. The real admission engine cannot be declared ready from this alone.

## Next owner action — READ-ONLY, no schema modification

Open the `drjavad1_store` database in phpMyAdmin, choose **SQL**, and run [`docs/migrations/20261020_konkur_catalog_readonly_preflight.sql`](../migrations/20261020_konkur_catalog_readonly_preflight.sql) exactly as source-controlled. It returns the presence, engine, columns, key definitions and existing table count for required parent objects and proposed 003e names. For separately proposed *private learner data* module `003f`, run [`docs/migrations/20261020_konkur_scorecards_readonly_preflight.sql`](../migrations/20261020_konkur_scorecards_readonly_preflight.sql) as a second, independent metadata check.

Provide results showing only `information_schema` metadata; **never share user records or credentials**. Confirm `eco_object_refs` particularly. If expected columns, FKs, engine, collation or proposed names differ, stop and reconcile before execution.

## Hard release/migration boundary

- The new `003e` SQL is **proposed** and not authorized for live installation by this screenshot.
- The private scorecard/draft `003f` schema is higher risk and needs separate guardian, consent, retention, CSRF and record-level authorization acceptance before installing or persisting personal data.
- Obtain a demonstrably restorable live backup before any DDL; run the full proposed schema **only after** source drift acceptance and the owner's explicit authorization.
- Do not populate synthetic five-digit tokens as official programme codes, activate public eligibility or infer a score from mock-exam metrics.
