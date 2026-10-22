# Central Admin — Site Health, Page Quality and Email Alert Rollout

**Canonical branch:** `migration/bertina-linux6`  
**Deployment:** owner-controlled; **not** executed by these source commits.  
**Testing:** deferred until all development is complete, as directed.  
**Architecture:** existing /fa/app/admin/ and /en/account/admin/, ENG-01…ENG-13, ENG-13 master and one unified MySQL database. No parallel dashboard, DB or background polling in ordinary page requests.

## Integrated source work

- Authenticated, MFA-gated master dashboard: existing engines and action executors; existing 54-reference directory (30 candidate tools, 16 social channel definitions, 8 GitHub collector feed definitions). An entry is not a live provider API connection.
- Master source controls: enable/disable, manual, daily or weekly cadence, Tehran time, independent collection policy and 7/30/90/180/365-day diagnostic retention. Existing eight GitHub adapters honor per-source overrides; the other source references do **not** gain an adapter by enabling a switch. Bertina CLI cron remains required for unattended execution.
- Independent source-quality dimensions for every committed HTML route: content, image, SEO, UI structure, UX/accessibility structure, AI crawl readiness, GEO/entity readiness, performance, HTTP security. Genuine lab speed scores can be shown **only** for the two explicit /fa/ and /en/ routes with fresh, validated PageSpeed mobile lab evidence. Real-user speed and security-header grades are unknown unless independently measured. Scores do not represent Google ranking or AI visibility.
- Page quality: 50-row paginated URL matrix, lowest-score sorting and filters, individual evidence/finding breakdown, source snapshot date and mini-gauges.
- Existing/dispersed capabilities: private, read-only inventory attaches historical redirects, incoming 404 triage, security headers, caching, PWA, schema, robots/sitemaps, scientific publishing, editorial workflows, MFA and incident messaging to the existing ENG IDs. Source presence is not proof of runtime health.
- Incident pipeline: allowlisted critical/warning events, MySQL fingerprint deduplication, cooldown and per-rule thresholds, private outbox, server-side audited rule settings, private SMTP worker, SMTP acceptance/uncertain states and owner-facing history.
- Opt-in 404/5xx log observer: CLI-only cursor reads bounded private access-log chunks, sanitizes public paths, strips query strings and excludes IP, user-agent, credentials and private account routes, groups likely scanner probes apart from SEO recovery candidates, stores dated aggregates and chart history, and queues severity-aware email incidents.

## Bertina activation prerequisites

1. Use the existing approved database schema installation/migration mechanism to provision additive `operations_*` tables. No fresh database and no destructive SQL reset. This has **not** been carried out on the production host.
2. In Bertina's **private**, uncommitted `api/config.local.php` or private environment, set `operations_alert_recipient` to the administrator-confirmed mailbox; retain the existing authenticated, TLS-verified SMTP transport and `mail_enabled`/`smtp_enabled` settings. Never put SMTP passwords, recipient lists or private log paths in Git.
3. Configure Bertina **CLI-only Cron Jobs**, after controlled end-to-end mail verification, using the actual deployment's absolute PHP paths (these are examples of entrypoint names, not runnable assumed host paths):
   - `.../api/internal/operations-alert-mail-worker.php` — every **one minute**, to process queued incidents.
   - `.../api/internal/operations-http-log-worker.php` — every **one minute**, only after a readable authorized LiteSpeed/Apache access-log path is configured in private config.
   - Existing `.../api/internal/operations-collector-cron.php` — existing scheduled feed collection, recommended at no more than its documented normal interval (e.g., 10 minutes); the per-source weekly/daily/manual policy gates actual collection.
4. Configure `operations_access_log_path` in the private config only after the host supplies the exact owner-authorized **local absolute path**. `operations_http_retention_days` accepts 7, 30, 90, 180 or 365. The collector's first pass starts at EOF to avoid emailing for old log events.
5. Validate 404/5xx parsing, failure-mode fallbacks, email acceptance, idempotency and direct production response/header security **only after the owner-authorized development freeze**. Do not claim that cron, email notifications, 404 sensing or the user inbox currently work from source commits alone.

## Required safety distinctions

- A server event may be recorded promptly; outgoing SMTP is processed at the next cron execution **if the host is reachable**, its private configuration is valid, and the transport accepts mail. **Instant delivery and actual inbox receipt cannot be guaranteed.** An external, independent uptime monitor is needed to detect total hosting outages.
- `security_headers_regressed`, `redirects_regressed` and `payment_runtime_unavailable` are rule definitions, **not currently connected independent sensors**. They cannot be presented as monitored/live until separately integrated and proven.
- A raw 404 hit does **not** authorize an automatic 301 to the homepage. Approve recovery/410/301 only with historical semantic evidence; protect canonical, hreflang and revenue-critical routes.
- Never display missing external search, SEO ranking, social-media impressions, AI citations, checkout success, conversion or Core Web Vitals data as zero or a made-up score.
- Retention cleanup affects eligible diagnostic records only; do not erase financial transactions, legal/security audit trails, customer agreements, editorial records, source snapshots required for provenance or recent unresolved incidents.
- Last observed timestamps and collector coverage are distinct from deployed runtime verification.

## Remaining engineering gates (not yet completed)

- Real provider API credentials/grants and adapters for unconnected sources, backed by permissions, consent, retries, quotas and documented metrics.
- Independent coverage for payment errors, validated response security headers, redirects, all-page mobile lab speed, and hosting-unreachable incidents.
- Administrator-approved controlled migration and host-side cron/SMTP/log configuration.
- Complete PHP/JS/build/DB integration checks, threat model, accessibility/browser coverage, release audit, human approval and then owner deployment.

**No tests and no production deployment have been run in this source-development phase.**
