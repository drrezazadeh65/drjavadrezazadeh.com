# JR Bertina — Mother Database Migration Handoff (Source Only)

**Revision:** 2026-10-22
**Git source:** `migration/bertina-linux6`
**Execution:** NOT RUN; no database migration, host access, CI/test or live deployment authorized during this development phase.
**Preservation:** Never change or remove any published sitemap URL, established product, active payment or existing mother-database table.

## Why this owner handoff exists

The Golden Talent/RCAS/BAHAR account services and the master owner dashboard share the existing **Bertina InnoDB mother database**. A source commit cannot create a table on Bertina. Source-only preparations expose genuine dependency states; no anonymous student records, merchant secrets, payments or adult verifications are fabricated.

The following migrations are **additive only** and can remain permanently unapplied if final legal/scientific/provider prerequisites are absent. They are not a replacement for the existing verified customer, consent, services, operations or payment schemas.

### Planned additive files and prerequisites

| Order after owner-authorized final integrated source review | File | Needs | What it adds | What it does NOT activate |
|---|---|---|---|---|
| 1 | `docs/migrations/20261022_education_offer_drafts_mysql.sql` | `customer_accounts`, `operations_audit`, existing operations MFA/roles | `operations_educational_offer_drafts` with approved owner revision/audit contract | No public prices, checkout, entitlements or service activation |
| 2 | `docs/migrations/20261022_bahar_verified_adult_encrypted_workbooks.sql` | `customer_accounts`, `eco_consent_notices`, `eco_consent_records`, `eco_audit_events`, `eco_legal_holds`, `eco_subjects`, `eco_privacy_requests`, `eco_privacy_actions`, `operations_admin_memberships` | Disabled singleton owner policy, independent adult review queue, AES-GCM ciphertext table | No automatic age verification, automatic storage, user consent, scientific validation or child records |
| 3 | `docs/migrations/20261022_bahar_private_alert_rules.sql` | Existing `operations_alert_rules`, `operations_alert_scope_policies` and owner email preferences | Three owner-controlled incident rules, all default **OFF** | No unsolicited alerts, emails or collectors |

Always inspect the exact schema and foreign-key types present on Bertina. The SQL scripts assume the established UUID account keys use `CHAR(36)` and the existing mother database uses InnoDB/utf8mb4. Do not run them on another parallel database, and do not disable foreign key checks to force an import.

## Owner-controlled procedure — ONLY when the final integrated phase is authorized

1. In Bertina cPanel, open **Backup/Backup Wizard**. Take and securely retain a complete **database and web-files** backup, including the existing database version, tables, indexes and customer/payment records. Record the corresponding source commit SHA and server application version.
2. Open **MySQL Databases** / **phpMyAdmin** for the **currently configured production mother DB**. Confirm DB name with existing host config in a safe, private channel; never put passwords, connection strings or secrets into this repository or AI messages.
3. View existing structures (table list and `SHOW CREATE TABLE` where needed) for `customer_accounts`, `eco_consent_notices`, `eco_consent_records`, `eco_legal_holds`, `eco_subjects`, `eco_privacy_requests`, `eco_privacy_actions`, `eco_audit_events`, `operations_admin_memberships`, `operations_audit`, `operations_alert_rules`. If a prerequisite is missing or a foreign-key type differs, **stop and reconcile source**. Do not silently create a second database.
4. Review each above SQL file line by line and reconcile with the actual Bertina MySQL/MariaDB version, cPanel limitations and owner privacy/science approval documents. The default owner storage switch must remain `enabled=0`.
5. Import each **owner-approved** additive migration once in the listed dependency order, capturing any SQL error and the exact version. Do not interpret `IF NOT EXISTS` as proof that a pre-existing table has the right columns or indexes; reconcile existing definitions.
6. Separately provision `JR_BAHAR_WORKBOOK_KEY_B64` as a cryptographically random 32-byte secret, plus a nonsecret `JR_BAHAR_WORKBOOK_KEY_ID`, **only** in a secure environment facility accessible to backend PHP, never in Git, HTML, source JS, screenshots or the database. Keep documented backup/key recovery and rotation processes.
7. In the existing owner MFA dashboard, inspect the actual **schema readiness**. After reviewing external scientific and legal/privacy documents, the super-admin may record **distinct review digests** and approve the exact currently published Persian and English privacy notice versions. These hashes record review evidence only and **cannot independently prove substantive compliance**.
8. Adult identity verification must be completed independently by an authorized human or age assurance provider; the self-assertion checkbox yields **PENDING** only. No customer-uploaded ID documents are stored by these source routes. A user may still continue free BAHAR and export their personal JSON locally.
9. Keep the private owner switch **OFF** until the one integrated staging acceptance includes fresh MFA, role separation, encryption/decryption, account-specific access, valid consent/withdrawal, legal-hold-safe erasure, database backup/restore, key rotation failure paths and no-leak network/browser-cache behavior. Turn on only after documented owner release approval.
10. In the same final release phase, execute documented integrated checks of existing checkout, consultations, educational modules, schema governance and sitemap URL permanence before the owner deploys to Bertina. A GitHub commit or empty queue must never be counted as a passed test.

## Audit and acceptance boundaries

Record **PASS / FAIL / NOT RUN / BLOCKED** for each step. Before final tests, every runtime gate remains **NOT RUN**, not PASS.

Scientific outcome calibration, original 1405 admission guides and amendments, historical outcome datasets, provider settlements and complete educational product delivery are **not supplied or certified** by these SQL files. No public predictive claim or new priced offering may be enabled on that basis.

## BAHAR private account source-integrity clarification (2026-10-22)

The three new BAHAR tables in migration 2 are not independently sufficient for operational saving. The **pre-existing** `eco_subjects`, `eco_legal_holds`, `eco_privacy_requests` and `eco_privacy_actions` tables must also exist with compatible columns and foreign keys before the owner switch may be considered ready. These are mother-database dependencies, **not** authorization to create substitutes or run the migration during Stage 6. The service fails closed if required privacy structures are missing.

All approval/revocation/cancellation and account workbook/consent/erasure mutations use a single `customer_accounts` account-row locking order; independent age-review decisions also acquire this lock before touching the verified-adult row. On re-application, stale independent-review identifiers/digests must not be represented as evidence for the new pending request.

A private workbook deletion or erasure request also invalidates the preceding private-workbook consent in the same transaction. A later save must require a new explicit, versioned grant; the historical direct DELETE route and owner completion of older pending erasures follow the same rule. Legal holds still prohibit deletion until reviewed, and the audit, financial and unrelated customer records remain intact. Backup erasure remains a separate governed process.

The final combined acceptance matrix must exercise race scenarios: owner review versus cancellation; verified-adult revocation versus encrypted PUT/GET; simultaneous consent grant versus erasure; historical pending-hold completion and subsequent attempted re-save; repeat deletion idempotence; withdrawal/grant events at the same millisecond; bilingual one-popup flows and locally retained workbook download. None of these have been run in the current source-only development period.

**Exact permanent URL law:** published sitemap URLs cannot be renamed, corrected, deleted or redirected to unrelated content; add new pages and internal links instead.
