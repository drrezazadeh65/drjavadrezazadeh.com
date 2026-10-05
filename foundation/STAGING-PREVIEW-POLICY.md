# Staging / Preview Environment Policy

Status: pre-production policy frozen; live Cloudflare staging verification pending.

## Search boundary

Every Cloudflare Pages preview hostname must return:

`X-Robots-Tag: noindex, noarchive`

The repository `_headers` file already defines this for both project-level and version/branch preview host patterns. Preview URLs must never become canonical URLs, sitemap URLs or hreflang targets.

## Data boundary

Staging and preview environments may use only:

- synthetic accounts;
- synthetic assessment responses;
- synthetic consultation cases;
- sandbox payment/order identifiers;
- non-sensitive public content.

They must not contain real student records, real identity documents, real counselling notes, real credentials copied from production or unreleased private research material.

## Secret boundary

- Production database credentials, payment merchant secrets, email credentials and signing keys must not be exposed to preview builds.
- Preview/staging secrets, when later required, must be separately scoped and revocable.
- Public frontend code must never contain secrets.

## Transaction boundary

Preview environments must not create real paid orders, grant paid entitlements from an unverified browser state or send real transactional email to users without an explicit test-safe configuration.

## Cache and privacy

- Private/transactional preview routes remain `no-store`.
- Service Worker private-route bypass remains active.
- Preview hosts remain `noindex` even when the page itself accidentally lacks a robots meta tag; page-level NOINDEX is still required for private shells.

## Release promotion

A release may move from preview/staging to production only when:

1. `SEO GEO Regression` passes on the exact commit.
2. public canonical/indexation rules are unchanged or intentionally reviewed.
3. private/cache/security firewalls pass.
4. any schema or migration change has an explicit production migration/rollback path.
5. payment/auth/data changes have appropriate sandbox or synthetic-data validation.
6. production-domain cutover checks, when applicable, are performed separately.

## Production difference

The permanent production domain is the only host that may become the final canonical/indexable origin after cutover. Cloudflare `*.pages.dev` hosts remain preview infrastructure and should be redirected to the permanent domain after production is stable, while branch/version previews remain non-indexable for QA.
