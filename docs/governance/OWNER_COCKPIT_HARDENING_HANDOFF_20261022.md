# Owner dashboard hardening — isolated additive handoff

**Website:** drjavadrezazadeh.com  
**Date:** 2026-10-22  
**Hardening branch:** `feature/owner-cockpit-hardening-20261022`  
**Forked from:** `feature/owner-command-center-20261022` at `b695547593d35b649aa160ce28b4cff90930a181`  
**Current disposition:** source edits only, **NO TESTS**, **NO MERGE**, **NO DEPLOY**.

## Immutable scope

- Preserve the moving developer branch `migration/bertina-linux6` without modifications.
- Preserve Golden Talent, RCAS, BAHAR, educational/scientific engines, their scoring, curricula, and related settings.
- Never enable production Cron, background monitors, mail, external publishing, social provider connections, payment automation or data deletion by virtue of a source release.
- Keep the administrator's current MFA/session/CSRF/RBAC protections; no public data projection, no secondary database.
- Missing permission, missing data, undocumented provider, stale evidence and absent source/worker must stay **UNKNOWN** rather than PASS.

## Owner-facing changes on this branch

1. **Export repair:** Replaced a non-existent `workspaceVisibleForExport()` invocation with existing authenticated-workspace checks. Exports now use `dashboard_read_at` per module rather than incorrectly describing a shared page refresh as a source observation. CSV neutralizes spreadsheet-formula prefixes through the already existing exporter.
2. **Fail-safe overview:** Wrapped the new command-center renderer so a frontend assembly error cannot break/logout the older MFA-protected control center. On failure, show a sanitized unavailable state and a working link to existing management reports. The error fallback is not presented as a health proof.
3. **Six direct owner shortcuts:** Safely deep-link to existing incidents, database health, collection schedules, per-page SEO, audit history and payments. Opening any shortcut only navigates existing UI. It does not run an external fetch or change an enable flag.
4. **Bilingual cache versions:** Updated only FA and EN operations admin HTML asset-query versions so future owner-approved publication can refresh assets without stale browser caches. No educational HTML/scripts changed.
5. **Responsive styling:** Added safe fallback presentation and mobile-friendly quick navigation; honors existing RTL/LTR and mobile bottom dock.

## Source contracts retained

- Existing `/api/admin/operations/*` endpoints and `api/operations-collection.php`, `operations-database-health.php`, `operations-source-controls.php` remain unmodified by this hardening branch.
- Owner manual data reads are distinct from the explicit manual external collection request. The scheduled collector's master switch remains fail-closed.
- Data cleanup remains bounded, scope-checked, CSRF-protected, and requires explicit owner confirmation.
- The source feature branch's module evidence summaries, per-section read stamps and 13-dimensional page quality presentation are preserved at fork; do not overwrite more recent feature-branch improvements while integrating.

## Outstanding operational dependencies — do not fabricate readiness

- New database health tables still require an owner-approved, backed-up additive migration on the existing Bertina mother DB.
- Bertina host Cron capability, actual PHP 8.3 CLI binary, worker paths and log permissions are not verified here.
- Real provider OAuth, privately configured SMTP destination, authenticated GSC/GA4 ingestion and social publication receipts remain independent acceptance items.
- Workspaces whose backend, credentials, schema or data are unavailable must show the actual reason without fabricated operational data.

## Integration protocol once development is complete

1. Rebase/cherry-pick the **small focused hardening commits** onto the latest active owner cockpit feature version. Prefer the current owner-feature work over hardening wherever they touch the same line; preserve export guard, safe overview boundary and role protections.
2. Reconcile exact branch and file SHAs; never force-push or overwrite changes made by the parallel developer.
3. **Do not run tests until the owner authorizes lifting the freeze after coding is complete.** Only then run offline syntax, isolated MySQL, UI accessibility/RTL/mobiles, schema, security, SEO and deployment gating QA.
4. Reconfirm privacy, noindex/no-store, no automatic workers and all existing authorized dashboard controls before any manual release.
5. Never claim live deployment or fully functioning third-party providers merely because the feature code exists.

This document records development state, **not** test/production acceptance.
