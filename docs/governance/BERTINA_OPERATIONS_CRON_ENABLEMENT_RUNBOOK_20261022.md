# Bertina P0 — Operations Cron Activation (owner-gated runbook)

Status: **SOURCE-READY / HOST CRON UNVERIFIED / NOT ACTIVATED**  
Current feature source branch: `feature/owner-command-center-20261022` (not merged/deployed; primary developer retains `migration/bertina-linux6`)  
Production: Bertina Linux, cPanel, LiteSpeed, PHP 8.3  
Principle: one existing mother database; no new database, public worker route or visitor-triggered collection.

## Facts already observed by the owner (22 Oct 2026)

The owner installed the missing `operations_*` tables in `drjavad1_store` using canonical non-destructive SQL and reported 24 operations tables, InnoDB/utf8mb4_unicode_ci, primary keys, six declared foreign keys, and 157 columns. These are owner-provided phpMyAdmin observations, **not independent schema or restore certification**. An earlier DB read showed zero `operations_collection_attempts`, seven expired source caches and 22 stored collection policies (21 pre-existing registered policies plus a manually added disabled `http_access_log` policy).

`http_access_log` is **not** an entry in `operationsCollectorCatalogue()`; the dedicated access-log worker reads `operations_access_log_path` from private configuration. Adding a SQL policy under this name does **not** activate log monitoring. Preserve that record for later owner review; no deletion or mutation is part of this runbook.

The owner's cPanel Advanced screen did not show Cron Jobs. Bertina support has been asked about enabling it or recommending an in-place hosting upgrade. There is **no evidence** of an installed crontab, a working PHP CLI path, an accessible LiteSpeed log path, SMTP mailbox delivery, or production Cron execution.

## Five CLI-only source entrypoints in this feature branch

| Worker | Repository-relative source | Intended cadence, only after readiness |
|---|---|---|
| Public GitHub audit/source snapshots | `api/internal/operations-collector-cron.php` | Every 10 minutes |
| HTTP response headers and redirect samples | `api/internal/operations-response-monitor-worker.php` | Every minute; database cadence still governs actual probes |
| Private LiteSpeed HTTP access-log observer | `api/internal/operations-http-log-worker.php` | Every minute; **optional**, requires explicit readable log path and privacy review |
| Outbox notification delivery | `api/internal/operations-alert-mail-worker.php` | Every minute **only after** SMTP, recipient, owner settings and suppression/retry policies are verified |
| Mother database health observation | `api/internal/operations-database-health-worker.php` | Every minute **only as an inert gate reader**; actual scans obey the owner-configured Tehran hourly/daily slot and remain OFF by default. Requires the additive `operations_database_health_runs` table |

All five entrypoints require `PHP_SAPI === 'cli'`. They are not web endpoints. Entry-point existence is not evidence of functioning runtime dependencies.

## Host discovery — read-only, do not paste secrets into chat

1. Ask Bertina to confirm Cron capability, minimum cadence, quota, cPanel permissions and the **exact PHP 8.3 CLI binary**. Do not guess `/usr/bin/php`, `/usr/local/bin/php` or any private home directory.
2. Using an authorised cPanel Terminal, inspect `command -v php`, `php -v`, `php -m` (PDO MySQL/cURL/openssl), and the real filesystem path of this deployment. Never output `api/config.local.php` content or environment secrets.
3. Verify all approved deployed worker files are readable under the **actual** deployed `api/internal/` directory; run `php -l` on each first. Check that `api/config.local.php` exists and is restricted, without displaying it.
4. Verify the existing mother DB and source policy inventory through the already MFA-gated operations activation report. Do not rerun production schema installation or reset `next_due`.
5. Confirm a private, non-web-readable logging directory with bounded retention. Do not send worker STDERR or SMTP configuration to publicly readable `public_html` logs.
6. Confirm a compatible single-instance lock strategy (e.g. `flock` where available) before installing multiple per-minute jobs. The GitHub collector itself also uses a MySQL advisory lock.

## Cron commands — templates only (NOT executable until paths are replaced and checked)

The actual cPanel schedule fields belong in Cron Jobs; each **command field** below uses symbolic placeholders and must **not** be pasted literally.

- `*/10 * * * *` — `<PHP83_CLI_ABSOLUTE_PATH> <DEPLOY_ROOT>/api/internal/operations-collector-cron.php >> <PRIVATE_LOG_DIR>/operations-collector.log 2>&1`
- `* * * * *` — `<PHP83_CLI_ABSOLUTE_PATH> <DEPLOY_ROOT>/api/internal/operations-response-monitor-worker.php >> <PRIVATE_LOG_DIR>/operations-response.log 2>&1`
- `* * * * *` — `<PHP83_CLI_ABSOLUTE_PATH> <DEPLOY_ROOT>/api/internal/operations-http-log-worker.php >> <PRIVATE_LOG_DIR>/operations-http.log 2>&1` (optional; private access-log path first)
- `* * * * *` — `<PHP83_CLI_ABSOLUTE_PATH> <DEPLOY_ROOT>/api/internal/operations-alert-mail-worker.php >> <PRIVATE_LOG_DIR>/operations-mail.log 2>&1` (SMTP and explicit owner notification approval first)
- `* * * * *` — `<PHP83_CLI_ABSOLUTE_PATH> <DEPLOY_ROOT>/api/internal/operations-database-health-worker.php >> <PRIVATE_LOG_DIR>/operations-db-health.log 2>&1` (ONLY after additive history schema, owner consent, privacy review and separate host authorization)

Add an owner-approved, verified lock and log-rotation strategy; avoid overlap and unlimited logs. The above are schedules, **not assertions** that the server accepts one-minute jobs.

## Staged activation and acceptance

1. Confirm official Cron entitlement and maintenance window. Prefer an in-place Bertina plan upgrade over moving the site, only if the provider states it is necessary.
2. First install **only** the GitHub collector after a controlled CLI smoke in the exact deploy root. Do not expose worker files through HTTP.
3. Observe MySQL evidence without fabricating it: `operations_collection_attempts` gains a new dated row and `operations_collection_cache` gains a genuinely fresh record **only after the worker actually fetches usable data**. If no source is due, `nothing_due` and no new attempt rows can be valid; check the due policies rather than creating test attempts.
4. Install response monitoring separately, once `operations_response_probe_settings` is intentionally enabled. Verify dated samples; do not treat policy `enabled` alone as a valid probe.
5. Install HTTP log observation only when Bertina confirms its actual privacy-safe access-log path and file permissions. This worker starts at EOF; old logs must not be bulk-imported or visitor identities stored.
6. Only after the owner installs the additive database health history schema, optionally stage its inert private CLI adapter. It remains paused unless the manager explicitly enables monitoring and chooses the scan cadence/time; evidence is stored in `operations_database_health_runs` with no customer records or raw SQL.
7. Enable alert mail last. Require validated private recipient, SMTP transport acceptance and a real test inbox receipt. Owner must explicitly enable `operations_alert_settings`, individual rules and scope switches; defaults remain off after the manual SQL work.
8. Inspect the existing MFA admin dashboard after each phase. API-derived `scheduleEvidence` and `executionEvidence` distinguish recorded attempts from mere due timestamps. Neither status is cPanel Cron installation proof.
9. Stop on failures and collect redacted diagnostics. Do not change payment callbacks, customer sessions, live databases or the release channel as a fallback.
10. Record independent evidence: exact host PHP binary, private worker path, installed cPanel schedule, worker exit code, dated attempt/cache/probe rows, email receipt and verified log retention. Mark unavailable items **UNKNOWN**, never PASS.

## Owner release boundary

Any code changes require the existing guarded GitHub Actions and owner-controlled Bertina deployment process. Installing real cPanel cron entries, using private SMTP recipient settings and handling private access logs require explicit approved host access. This document grants no operational permission by itself.
