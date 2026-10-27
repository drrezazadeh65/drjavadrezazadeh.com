# Bertina P0 — Operations Cron Activation (owner-gated runbook)

> **BINDING PROVIDER RESPONSE — ticket t975913, received 23 October 2026:** Bertina technical support explicitly confirmed that the **minimum supported host Cron interval is FIVE MINUTES**. The previous one-minute example and the historical seven-or-four isolated Cron templates below are NOT installation instructions. Current preferred source design: a single master Cron entry scheduled `*/5 * * * *`, provided Bertina independently confirms the PHP 8.3 CLI binary and whether `proc_open` is permitted on the specific shared plan. The provider supplied an EXAMPLE of the PHP command beginning `/usr/local/bin/php /home/drjavad1/public_html/path/to/cron/script`; the PHP version and exact working file path remain unconfirmed. The owner requested a grateful follow-up by Gmail, but sending failed; do not represent that reply as delivered. No host task has been installed or executed as part of this source change.

## 27 October 2026 — provider-mailbox reconciliation and original News activation

The owner's Bertina support ticket **t975913** was re-read from the actual
Gmail conversation (last provider reply 23 October). Bertina explicitly
confirmed the CLI PHP 8.3.35 binary
`/opt/alt/php83/usr/bin/php`, allowed `proc_open` for this account in
PHP CLI, and a **five-minute minimum** Cron interval. They also stated
that shared-hosting customers cannot configure Cron directly in cPanel;
Bertina support must do so. The support-message example
`/home/drjavad1/public_html/path/to/cron/script` does **not**
independently attest the deployed absolute project root. The accessible
mailbox contains no provider-issued installed-crontab receipt, last-run
exit status, or positive notice that the single master Cron was installed.
**Do not create a second host Cron just because no Gmail receipt was found**:
verify the existing task with support before installation.

The **only** canonical central entrypoint is
`api/internal/operations-master-dispatcher.php`, managed by the original
MFA-protected `/api/admin/operations/cron-master`. Original JREI News
has exactly eight required producer/QA/CMS/indexer jobs in
`operationsCronNewsPipelineIds()`; never schedule eight host tasks.
The `activate_news_pipeline` owner action is already present in
`assets/js/jrei-news-owner-panel-v1.mjs`, and applies the existing
standing-policy and private-environment gates before enabling these
source-fixed rows. The trigger does not authorize rights, simulate a CMS
receipt or install host Cron.

**New source diagnostics (27 October)**: the cron-master read now reports
`latestDbWorkerStartedAt`, `latestDbWorkerCompletedAt`,
`latestDbNewsWorkerStartedAt`, and the **names only** of missing
`newsPipelineMissingPrivateFlags`, in the existing SUPER_ADMIN/MFA UI.
The original Newsroom and cron panels expose these facts without private
values. A DB worker start is evidence of a recorded claim, **not proof
of host cron installation or genuine bilingual news publication**.
Current authoritative server flags, actual deployment SHA, tables and
CMS publication receipts still require private Bertina observation.

**Provider-confirmed binary + host-path template (not installation proof):**

```text
*/5 * * * * /opt/alt/php83/usr/bin/php /home/drjavad1/public_html/api/internal/operations-master-dispatcher.php
```

The file/root of this **example** must be checked against the actual
Bertina deploy directory before using it; logs belong in a private
rotated directory outside `public_html`. First ask Bertina whether
this exact master already exists. Never install competing Cron entries
or claim that source CI confirms the host scheduler.

## 23 October 2026 — Five-minute master schedule correction and JREI daily slot

- `api/operations-cron-dispatcher.php` now enforces an exact **300-second minimum**, with every ordinary job cadence an integer multiple of 300 seconds; the original 600-second collector remains unchanged. The existing `api/internal/operations-master-dispatcher.php` enforces this floor again in CLI even if DB values were modified outside the owner dashboard.
- A seventh allowlisted job `jrei_daily_learning` has been staged with 86,400-second cadence. Its source at `api/internal/jrei-daily-learning-worker.php` is **not** a trainer: it can register an idempotent daily review cycle in the single mother DB only after its independent private OFF switch and the existing owner scheduler controls are authorized. A schedule's child-process exit code 0 never means a model improved or that a scientific source became valid.
- The fully additive source-only `docs/migrations/20261023_operations_cron_master_mysql.sql` now includes seven disabled jobs with supported intervals. An existing six-row installation, if independently discovered later, would require owner-authorized additive reconciliation before enabling the seventh; **do not execute the DDL or secretly edit production tables now**.
- The JREI adaptive-learning evaluator and owner metadata are staged separately in `platform/jrei-v5/jrei-learning-loop.mjs`, `platform/jrei-v5/jrei-reviewed-retrieval-evaluator.mjs`, `api/jrei-learning-operations.php`, `api/internal/jrei-daily-learning-worker.php`, and `docs/migrations/20261023_jrei_daily_learning_mother_mysql.sql`. The JREI learning private config `JR_JREI_LEARNING_DAILY_ENABLED` defaults OFF, and the mother-DB owner row also defaults OFF.
- Mobile bilingual SUPER_ADMIN / fresh-TOTP dashboards show registered policies, genuinely recorded cycles, absent schema, unknown Windows/CLI readiness, explicit proposed changes, and scientific review status. No user-facing /api/assistant chat traffic or shop/customer flow is rerouted.
- **No guarantee** that the user's Windows computer stays online on a mobile hotspot. A future Windows worker must use outbound HTTPS polling and cannot rely on Bertina's five-minute schedule for interactive latency. Shared host `proc_open` may be disallowed; neither inbound access nor reverse tunneling is authorized.

**Proposed command template ONLY, contingent on host-confirmed PHP and paths, and the single final owner-approved release:**

```text
*/5 * * * * <BERTINA_VERIFIED_PHP83_CLI_PATH> <BERTINA_VERIFIED_DEPLOY_ROOT>/api/internal/operations-master-dispatcher.php >> <OWNER_VERIFIED_PRIVATE_ROTATED_LOG> 2>&1
```

Even where scheduling appears supported, the maximum per-run 43-second work budget and seven independent due windows are source contracts, not host proof. Avoid enabling more work than Bertina's confirmed process budget and service policy allow. Protect existing payment, SMTP, privacy and evidence gates. No live host Cron, migration, inference, evaluation tests or deployment were performed by this documentation update.

---

> **2026-10-23 FORWARD-ONLY UPDATE — CENTRAL DISPATCHER IS THE PREFERRED PLAN (SOURCE ONLY).** The older four-entry schedule templates preserved below are historical fallbacks, **not** instructions to install four competing jobs after the new master is approved. The owner has sent Bertina support ticket `t975913` asking about a single private PHP CLI Cron entry every minute. **Bertina has confirmed only that the prior four CLI Cron entries could be configured**, not that the new central dispatcher, `proc_open`, one-minute budget or command paths are authorized. Do not install the four legacy entries or the new master without a final owner/host sign-off, and do not allow them to run simultaneously.

## One-Cron proposal: staged source architecture, not host activation

- **One fixed CLI entrypoint (not yet deployed or installed):** `api/internal/operations-master-dispatcher.php`. Its directory is already HTTP-denied by `api/internal/.htaccess`.
- **One shared policy/registry:** `api/operations-cron-dispatcher.php`; six allowlisted static worker paths, source-defined minimum cadence and no database-defined executables. Future source-registered jobs are added to the existing registry and **owner-registered disabled in the existing table**; they do not require a new cPanel Cron or a separate database.
- **One additive mother-DB schema, staged and NOT EXECUTED:** `docs/migrations/20261023_operations_cron_master_mysql.sql`, with `operations_cron_jobs`, all initially disabled, no implicit worker execution. This is a sixth-job-capable control policy, not a new payment, mail or customer queue.
- **One private global enable flag:** `JR_OPERATIONS_CRON_MASTER_ENABLED=true` in confirmed PHP CLI environment, or `operations_cron_master_enabled => true` in private `api/config.local.php`, **only with explicit owner approval after final acceptance**. The default in source is false, and every individual DB job also defaults OFF.
- **One existing MFA owner workspace:** `/fa/app/admin/` and `/en/account/admin/`, section `#ops-cron-master`. GET/POST `/api/admin/operations/cron-master` reuse original SUPER_ADMIN role, recent TOTP, rate limits, origin+CSRF, and `operations_audit`. Per-job toggles, cadence and last execution state are informational until host execution evidence exists.
- **Bounded processing:** exactly one database advisory-lock holder; at most four due jobs per 43-second tick, each executed via PHP command-array `proc_open` (no shell, no user-provided path) for up to 12 seconds. A crash, timeout, uncertain result, nonzero exit or stale RUNNING record stops further dispatch for that worker and requires an explicit owner review; no automatic repetition of uncertain SMTP side effects. Worker output is discarded and only low-sensitivity job IDs/states can appear in private, rotated logs.
- **Existing six worker IDs:** `github_collector` (600 seconds), `response_monitor` (60), `private_http_log` (60; optional and privacy-gated), `operations_alert_mail` (60; opt-in recipient/SMTP gates), `newsletter_outbox` (300; separate verified opt-in and editorial env gates), `publishing_outbox` (300; existing author/customer publishing queue). Even though the last two workers already exist in source, this dispatcher does **not** approve new marketing, grant financial entitlements, alter payment callbacks or send emails by default.

### Proposed single Cron **template only** — paths MUST be verified by Bertina

```text
* * * * * <VERIFIED_PHP83_CLI_ABSOLUTE_PATH> <VERIFIED_DEPLOY_ROOT>/api/internal/operations-master-dispatcher.php >> <VERIFIED_NONPUBLIC_ROTATED_LOG> 2>&1
```

This is not a copy/paste-ready command. Ask Bertina to confirm exact PHP 8.3 CLI binary, absolute application root, allowed 1-minute cadence, `proc_open`/`proc_get_status`/`proc_terminate` permissions, subprocess CPU/memory quotas, MySQL advisory lock support, worker exit behavior, private file permissions and nonpublic log rotation. A shared-host restriction against child processes is a genuine blocker to this design; do not replace it with public HTTP pings or claim it works. If unsupported, request Bertina's approved alternative or in-place upgrade and preserve the entire existing site/data.

### 2026-10-23 source-hardening: unknown outcomes and emergency isolation

The sole master now updates `row_revision` after each claim, result, blocked-source finding and orphan reconciliation, so a concurrently open owner editor cannot silently overwrite a newer observed dispatch state. Even if a worker has been manually disabled or its `next_due_at` is in the future, the next owner-enabled master tick marks a `running` record older than 120 seconds as `unknown`, disables future attempts, and requires owner review. The global `GET_LOCK` is still the execution boundary: **a crashed parent may have left a child carrying out an external side effect**, so an orphan is never automatically retried.

Editing cadence or switching a worker OFF does **not** erase `needs_owner_review`. The owner must separately use the `reconcile` action with a current `row_revision` and an explicit attestation that the prior real-world result was independently checked or manually reconciled. This step records only an allowlisted outcome in the existing `operations_audit`, leaves the job OFF, and never constitutes independent financial/SMTP or scientific verification. Only a later, separately confirmed `configure` action can re-enable it when the private master flag is already authorized. A SOURCE-only **`quarantine`** owner action immediately disables future dispatch and marks the row for review even if the original worker file has been deleted or the global master flag was turned off. Quarantine cannot interrupt an in-flight subprocess or reverse an email accepted by a provider; the interface explains this limitation. No general operator or public user can invoke these controls; the original SUPER_ADMIN/TOTP/CSRF restrictions remain binding.

The dispatcher queries only source-allowlisted `job_id` values in the private DB; unknown or damaged rows cannot gain execution or starve legitimate due jobs. PHP version/process capability observed from a browser API is **not** presented as independently verified CLI support. Source-policy success, even a PHP child exit code 0, remains distinct from authenticated SMTP inbox delivery or a successful external operation.

**Final acceptance addendum (NOT RUN):** Exercise multiple PHP web/CLI versions, disabled `proc_open`, stale `running` records including disabled rows and future due dates, simultaneous owner edit/worker completion and revision conflict, nonzero child exit, SMTP transport ambiguity, emergency quarantine during a running child, missing-worker emergency stop, explicit per-job separate reconciliation and later re-enable, and CLI-source-only min-cadence enforcement. Confirm direct `php` job commands and the old four-entry cron templates are not installed alongside the single master. Do not send test marketing messages or mutate live financial/customer data as a substitute for an authorized staging fixture.

**Activation order after FULL source completion and single final E2E acceptance:** (1) exact owner-approved additive SQL + secure backup and restore proof; (2) PHP and child-process capability plus exact host-path confirmation; (3) deploy approved immutable release without replacing any working public URL or checkout; (4) obtain Bertina's approval for this **one** host entry and confirm no legacy four entries are simultaneously enabled; (5) explicitly set global flag and individually enable only audited and genuinely configured source jobs from the MFA owner panel; (6) observe real date-stamped DB attempt and dispatch states, current operational dashboards and real permitted SMTP receipts before marking any runtime PASS. No test, migration, host schedule, email, publication or payment action is authorized by writing this section.

---

Status: **SOURCE-READY / HOST CRON UNVERIFIED / NOT ACTIVATED**  
Source branch: `migration/bertina-linux6`  
Production: Bertina Linux, cPanel, LiteSpeed, PHP 8.3  
Principle: one existing mother database; no new database, public worker route or visitor-triggered collection.

## Facts already observed by the owner (22 Oct 2026)

The owner installed the missing `operations_*` tables in `drjavad1_store` using canonical non-destructive SQL and reported 24 operations tables, InnoDB/utf8mb4_unicode_ci, primary keys, six declared foreign keys, and 157 columns. These are owner-provided phpMyAdmin observations, **not independent schema or restore certification**. An earlier DB read showed zero `operations_collection_attempts`, seven expired source caches and 22 stored collection policies (21 pre-existing registered policies plus a manually added disabled `http_access_log` policy).

`http_access_log` is **not** an entry in `operationsCollectorCatalogue()`; the dedicated access-log worker reads `operations_access_log_path` from private configuration. Adding a SQL policy under this name does **not** activate log monitoring. Preserve that record for later owner review; no deletion or mutation is part of this runbook.

The owner's cPanel Advanced screen did not show Cron Jobs. Bertina support has been asked about enabling it or recommending an in-place hosting upgrade. There is **no evidence** of an installed crontab, a working PHP CLI path, an accessible LiteSpeed log path, SMTP mailbox delivery, or production Cron execution.

## Four actual CLI-only source entrypoints

| Worker | Repository-relative source | Intended cadence, only after readiness |
|---|---|---|
| Public GitHub audit/source snapshots | `api/internal/operations-collector-cron.php` | Every 10 minutes |
| HTTP response headers and redirect samples | `api/internal/operations-response-monitor-worker.php` | Every minute; database cadence still governs actual probes |
| Private LiteSpeed HTTP access-log observer | `api/internal/operations-http-log-worker.php` | Every minute; **optional**, requires explicit readable log path and privacy review |
| Outbox notification delivery | `api/internal/operations-alert-mail-worker.php` | Every minute **only after** SMTP, recipient, owner settings and suppression/retry policies are verified |

All four entrypoints require `PHP_SAPI === 'cli'`. They are not web endpoints. Entry-point existence is not evidence of functioning runtime dependencies.

## Host discovery — read-only, do not paste secrets into chat

1. Ask Bertina to confirm Cron capability, minimum cadence, quota, cPanel permissions and the **exact PHP 8.3 CLI binary**. Do not guess `/usr/bin/php`, `/usr/local/bin/php` or any private home directory.
2. Using an authorised cPanel Terminal, inspect `command -v php`, `php -v`, `php -m` (PDO MySQL/cURL/openssl), and the real filesystem path of this deployment. Never output `api/config.local.php` content or environment secrets.
3. Verify the four deployed worker files are readable under the **actual** deployed `api/internal/` directory; run `php -l` on each first. Check that `api/config.local.php` exists and is restricted, without displaying it.
4. Verify the existing mother DB and source policy inventory through the already MFA-gated operations activation report. Do not rerun production schema installation or reset `next_due`.
5. Confirm a private, non-web-readable logging directory with bounded retention. Do not send worker STDERR or SMTP configuration to publicly readable `public_html` logs.
6. Confirm a compatible single-instance lock strategy (e.g. `flock` where available) before installing multiple per-minute jobs. The GitHub collector itself also uses a MySQL advisory lock.

## Cron commands — templates only (NOT executable until paths are replaced and checked)

The actual cPanel schedule fields belong in Cron Jobs; each **command field** below uses symbolic placeholders and must **not** be pasted literally.

- `*/10 * * * *` — `<PHP83_CLI_ABSOLUTE_PATH> <DEPLOY_ROOT>/api/internal/operations-collector-cron.php >> <PRIVATE_LOG_DIR>/operations-collector.log 2>&1`
- `* * * * *` — `<PHP83_CLI_ABSOLUTE_PATH> <DEPLOY_ROOT>/api/internal/operations-response-monitor-worker.php >> <PRIVATE_LOG_DIR>/operations-response.log 2>&1`
- `* * * * *` — `<PHP83_CLI_ABSOLUTE_PATH> <DEPLOY_ROOT>/api/internal/operations-http-log-worker.php >> <PRIVATE_LOG_DIR>/operations-http.log 2>&1` (optional; private access-log path first)
- `* * * * *` — `<PHP83_CLI_ABSOLUTE_PATH> <DEPLOY_ROOT>/api/internal/operations-alert-mail-worker.php >> <PRIVATE_LOG_DIR>/operations-mail.log 2>&1` (SMTP and explicit owner notification approval first)

Add an owner-approved, verified lock and log-rotation strategy; avoid overlap and unlimited logs. The above are schedules, **not assertions** that the server accepts one-minute jobs.

## Staged activation and acceptance

1. Confirm official Cron entitlement and maintenance window. Prefer an in-place Bertina plan upgrade over moving the site, only if the provider states it is necessary.
2. First install **only** the GitHub collector after a controlled CLI smoke in the exact deploy root. Do not expose worker files through HTTP.
3. Observe MySQL evidence without fabricating it: `operations_collection_attempts` gains a new dated row and `operations_collection_cache` gains a genuinely fresh record **only after the worker actually fetches usable data**. If no source is due, `nothing_due` and no new attempt rows can be valid; check the due policies rather than creating test attempts.
4. Install response monitoring separately, once `operations_response_probe_settings` is intentionally enabled. Verify dated samples; do not treat policy `enabled` alone as a valid probe.
5. Install HTTP log observation only when Bertina confirms its actual privacy-safe access-log path and file permissions. This worker starts at EOF; old logs must not be bulk-imported or visitor identities stored.
6. Enable alert mail last. Require validated private recipient, SMTP transport acceptance and a real test inbox receipt. Owner must explicitly enable `operations_alert_settings`, individual rules and scope switches; defaults remain off after the manual SQL work.
7. Inspect the existing MFA admin dashboard after each phase. API-derived `scheduleEvidence` and `executionEvidence` distinguish recorded attempts from mere due timestamps. Neither status is cPanel Cron installation proof.
8. Stop on failures and collect redacted diagnostics. Do not change payment callbacks, customer sessions, live databases or the release channel as a fallback.
9. Record independent evidence: exact host PHP binary, private worker path, installed cPanel schedule, worker exit code, dated attempt/cache/probe rows, email receipt and verified log retention. Mark unavailable items **UNKNOWN**, never PASS.

## Owner release boundary

Any code changes require the existing guarded GitHub Actions and owner-controlled Bertina deployment process. Installing real cPanel cron entries, using private SMTP recipient settings and handling private access logs require explicit approved host access. This document grants no operational permission by itself.
