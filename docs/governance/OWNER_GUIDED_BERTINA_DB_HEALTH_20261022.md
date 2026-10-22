# Owner-guided Bertina health schema installation — 22 October 2026

**State:** SOURCE PREPARED, **HOST NOT ALTERED**. No tests, Cron installation, e-mail or deployment have been executed in this independent branch.

## Scope

Existing mother database: `drjavad1_store` (Bertina Linux, MySQL/MariaDB).
Historical owner report: 24 `operations_*` tables installed. The current canonical
`api/operations-schema.php` contains 27 table definitions, including three additional
health tables. Their actual current presence is **UNKNOWN** pending owner's private
phpMyAdmin inventory. Do not repeat the 24 existing table creations.

Only possible additive targets:

1. `operations_database_health_settings` — disabled per-owner settings
2. `operations_database_health_runs` — historical, bounded metadata scan summaries
3. `operations_database_error_events` — redacted, aggregated database error classes

Authoritative manual SQL file:
`platform/db/operations-database-health-additive.mysql.sql`.
It is not wired to deploy, CI or web requests.

## Guided manual steps

1. In Bertina cPanel, open phpMyAdmin and select the **already existing** mother
   database `drjavad1_store`. Do not select the retired vendor OJS database.
2. Select the mother database, click **Export**, choose SQL and download a complete
   backup. Store it privately, never paste table content, credentials or SQL dumps
   into a chat. If the database is large, use the host's approved backup tool
   instead; do not consider a failed or incomplete export a backup.
3. In the table list, search for the three exact table names. Record only which
   names are present or absent; do not share user records or secrets. Where a
   name exists, inspect its Structure (columns/indexes/collation) and reconcile
   with `api/operations-schema.php`. Do **not** overwrite an existing but
   incompatible table with `CREATE IF NOT EXISTS`, which masks drift.
4. After confirming a backup and any absent table names, open the SQL tab
   **within `drjavad1_store`** and run only the relevant CREATE TABLE statements
   copied verbatim from the versioned manual SQL file. Do not import the
   PostgreSQL conceptual migrations under `platform/db/migrations/`.
   If all three are absent, the whole prepared SQL script is additive and
   creates them with monitoring OFF; if some already exist, apply only the
   missing CREATE statements after checking the existing structures.
5. The optional `INSERT IGNORE` disabled singleton initializes health monitoring
   to OFF without overwriting a previously configured setting. Do not enable
   periodic checks, error collection or cleanup during source development.
6. Preserve phpMyAdmin's reported outcome privately. Record table names,
   column/index structural compatibility and date. This is an **inventory/DDL
   record, not a completed integration or QA certification**.
7. If phpMyAdmin reports any error, stop and preserve a redacted error code,
   not SQL passwords/DB hostnames. Do not retry with DROP, TRUNCATE,
   unbounded ALTER, database recreations or a force install.
8. Defer authenticated endpoint, MFA, PHP syntax, database behavior, restore
   and browser testing until the owner ends the comprehensive no-testing freeze.

## Cross-module contract

- `api/operations-activation.php` must inventory all 27 `operations_*` tables
  and expose any absent ones in the existing private admin readiness report.
- `api/operations-database-health.php` and its scheduling module distinguish
  a missing health table from an empty run history.
- Worker scripts under `api/internal/` remain CLI-only and inert unless
  separately configured and permitted by the owner. Cron presence is never
  inferred from a due timestamp, nor SMTP delivery from an outbox row.
- Changes stay on `feature/owner-command-center-20261022` and are not merged
  to the developer branch or deployed by this guide.
