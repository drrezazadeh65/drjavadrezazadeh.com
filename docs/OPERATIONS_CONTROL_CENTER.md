# Evidence-driven operations control center

The existing Persian `/fa/app/admin/` and English `/en/account/admin/` routes now share a same-origin Bertina PHP/MySQL reporting engine. The original 36 narrative sections map explicitly to 36 operational records; the master administrator dashboard has its own ADM-01 record. Historical audit percentages and claims remain labeled estimates. Unknown live progress is null.

Each record uses four equally weighted gates: published code, successful section-specific tests, production confirmation and persisted trustworthy evidence. Only current-release, unexpired observations contribute. New failures reopen a section; an older late-arriving pass cannot erase them. Dependencies prevent closure even when a record's own gates pass. The browser has no endpoint for changing progress, closing work or submitting approvals.

## Administrator access

A verified, active email-authenticated account requires both an enabled MySQL administrator membership and an explicit UUID/role/TOTP configuration in private Bertina `api/config.local.php`. No email address automatically receives a role. Secrets must never be committed or pasted in chat. Provisioning is performed by an authorized host operator; deployment preserves revoked memberships.

The API enforces TOTP, global per-account and per-IP limits, monotonic replay prevention, exact-origin CSRF and a ten-minute MFA window. Successful elevation rotates the Secure/HttpOnly/SameSite customer cookie, revokes the old session and binds CSRF/MFA to the new session. Removing or rotating the private TOTP credential invalidates existing elevation. Reports, registry files and helper scripts are protected from public reads; private data is never persisted in localStorage or service-worker caches.

## Trusted collectors and their limits

The authenticated one-time deployment helper verifies package checksums, installs additive InnoDB tables and imports two explicitly scoped ADM-01 code/test observations from that exact GitHub run. A database roundtrip emits the dashboard's evidence gate. Generic CI success cannot certify real email delivery, payment, search-engine indexing or any other section.

Independent Ubuntu-runner TLS checks connect directly to the pinned Bertina origin with SNI, trusted CA validation and hostname/expiry verification for apex and www. Strict HTTPS requests also validate origin and public-DNS responses and the www canonical redirect. The checked report is packaged under a denied internal path; its release and run must match the current dashboard evidence. This certifies the contacted addresses, not every possible DNS address or future certificate renewal.

Only a genuine MFA-protected report request on native canonical HTTPS can emit ADM-01 production evidence. The collector requires the independent TLS proof and all three prerequisite gates for the same release/run. Its expiry cannot outlive their evidence or certificate validity. Local HTTP, forwarded-header assertions, fixtures and browser-supplied percentages cannot close this gate. Without privately provisioned administrator credentials and actual production access, the dashboard remains open.

The remaining 36 section collectors are explicitly pending unless supported by their own scoped evidence; registry definitions are not completion evidence. In particular, Auth readiness does not prove mailbox delivery; MySQL order capture does not prove money movement; processed sitemaps do not prove indexing; merchant verification, delivery, Bing, assessment services, backups and business approvals require their real providers and tests.

## Validation and release

Local verification passed 77 security assertions, 39 real PHP HTTP/MySQL-protocol assertions against isolated MariaDB11.8.8, 14 Chromium browser cases at320–1440px in both languages, and the existing11 receipt cases. The public artifact retains290 HTML routes; SEO and workflow governance passed. These are local observations, not production certification. GitHub CI additionally runs the isolated database suite on MySQL8 and uses standard Playwright Chromium.

Production deployment remains on `migration/bertina-linux6` only. It rejects stale HEAD immediately before extraction, queues concurrent GitHub runs and holds a persistent host-side deployment lock through extraction, checksums and evidence import. Extraction is in-place rather than atomic; the lock serializes cooperating deployment writers and does not freeze ordinary readers or a non-cooperating old helper. Payment activation switches and credentials are not changed by this feature.
