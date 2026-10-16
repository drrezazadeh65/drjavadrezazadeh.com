# Moderated Reader Comments — Stage Gate and Rollout (16 October 2026)

**Status:** FEATURE PROPOSAL / DISABLED. This source is not the current published website. No production migration, activation, or live rating claim has occurred.

## Scope of first pilot
- Article detail pages at `/fa/akhbar/<slug>/` with canonical route verification against an existing HTML file only.
- Reader account verified by email, fixed one original review per reader per article, optional 1–5 star rating, readable 12–2,000 character text, explicit publication consent.
- Every submission remains `pending`. Only approved text/rating is returned publicly; no email, phone, account ID, comment author's real identity, pending content or administrative evidence may be returned.
- Private moderation in existing Persian and English admin dashboards; verified admin membership + fresh TOTP MFA required. Approve, reject, and remove previously published comments; all actions recorded.
- No Google `aggregateRating`/review rich result schema until real compliance and feature testing. Do not imply star ratings automatically improve Google rankings.
- Does NOT cover the shop, Golden Talent customer accounts, journal peer review, program pages or public anonymous posts; these require separate future modules with their own policies.

## Release locks
1. Independent operator enables both `JR_COMMUNITY_ENABLED=true` and `JR_COMMUNITY_MIGRATION_APPROVED=true` **only after** every following gate passes. Default is OFF.
2. Perform verified, restorable, encrypted MariaDB backup of existing production database. Confirm primary table collation and foreign-key compatibility of existing `customer_accounts(id)`.
3. Manually review and apply `database/bertina/021_community_moderation.sql` in a staging database; do not auto-run an unreviewed migration on production.
4. Validate `php -l api/community.php`, `node --test tests/community-moderation.test.mjs`, current-head master SEO/security workflows and actual isolated MariaDB integration tests. A passing source regex test is NOT sufficient proof of authentication.
5. Verify same-origin and CSRF, admin membership, MFA freshness/expiry, no-cookie requests, broken/expired sessions, request volume, Unicode and XSS text rendering, duplicate submissions, withdrawn consent, audit persistence and no cache leakage.
6. Obtain signed-off privacy notice and retention/deletion mechanism; require parental/guardian safeguards as applicable before use by minors.
7. Test both languages' admin approval and withdrawal views on mobile and desktop; ensure JHELA, shop, customer reports and PWA still work unchanged.
8. Test live public endpoint failure when flags OFF: HTTP 503; public module must remove itself. Admin queue must show disabled state, never expose pending content.
9. After owner-approved release, activate staged flags only during a controlled deploy with rollback plan. Verify newly posted comments stay hidden until approval; verify published removal disappears from public API. Record release SHA and runtime evidence.

## Technical notes
- `api/community.php` loaded only via the existing PHP bootstrap when a `/community/` route is requested.
- `api/internal/.htaccess` and the existing Operations MFA authorization must remain intact.
- `assets/js/community-comments.js` renders all visitor text via `textContent`, not `innerHTML`, and hides completely if the server feature is unavailable.
- Public rating is an editorial signal, not scientifically validated measurement of article quality and not a guaranteed SEO ranking signal.
- To support a second response/revision by the same reader, a separately audited edit/re-review workflow must be added. Current unique key intentionally prevents duplicate review gaming.

**No production merge or deployment should be performed from this draft until a green immutable SHA, full verified backup and staging acceptance exist.**
