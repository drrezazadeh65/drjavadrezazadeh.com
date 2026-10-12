# DrJavad Ecosystem 5.0 — Unified Academic, Education & Commerce Platform

**Persian official name:** اکوسیستم یکپارچهٔ علمی، آموزشی و تجاری دکتر جواد رضازاده  
**International product name:** DrJavad Ecosystem 5.0  
**Target semantic release tag:** `v5.0.0`  
**Current lifecycle:** DEVELOPMENT / RELEASE ACCEPTANCE OPEN — **NOT** a published or certified version 5.0 release.

## Scope and continuity

The new major-version identity reflects broad integration across bilingual academic content, scholarship and journal publishing, Golden Talent, commerce and service delivery, owner/admin dashboard, customer experience, SEO/AI discovery, social distribution, security and operations. It is **one coordinated evolution of the existing website**; it does not authorize a rewrite, a parallel platform, a new deployment host or resetting any books, prices, accounts, approved media or scientific work.

- Canonical source repository: `drrezazadeh65/drjavadrezazadeh.com`
- Single authorized development branch: `migration/bertina-linux6`
- Production: Bertina Linux PHP/MySQL at `https://drjavadrezazadeh.com`
- Continue serving and accurately observing the **existing production version** until the independently certified promotion of `v5.0.0`.
- Version 4.x documents are historical evidence and compatibility inputs, **not** permission to roll back verified current features.
- Do not change existing public URLs, canonical/hreflang, site and journal sitemaps, protected noindex routes, approved book covers and server-authoritative SKU pricing merely to change the version label.

## Version language

Use **“DrJavad Ecosystem 5.0 — in development”** in internal tracking. Use **“v5.0.0 release candidate”** only when source integration, reproducible build and independent applicable CI checks pass. Publish and annotate **`v5.0.0` as released** only when independently verifiable Production acceptance exists, including exact live/source release SHA alignment. A code commit or successful source-only CI run is not publication.

Do not surface an unverified `v5.0.0` badge, SEO `softwareVersion`, `datePublished` or user-facing completion claim while the live application is older.

## Nine release acceptance workstreams

1. **Recoverability and release governance:** genuine private encrypted backup; independent ciphertext readback; isolated DB restore and owner RSA-signed certification; one serialized deployment/migration group and auditable rollback, checked against live SHA.
2. **Income and sales:** preserve three-book real stock, 21 service SKUs and six VIP SKUs; authenticated orders and BitPay verified callback; reconciliation against bank settlement; no fictional paid or settled states.
3. **Owner administrative operations and 13 engines:** MFA-protected least-privilege execution; exact read/write executor authorization; audit events and no fake completion signals.
4. **Customer portal and case workflows:** verified email identity, authorized purchase history, intake, booking, status, refunds-as-requests and delivery proof with privacy separation.
5. **Bilingual scientific authority and SEO:** intact `/fa/`/`/en/`, link/404 and performance audits, GSC/Bing/IndexNow evidence, no indexing guarantees or private content leaks.
6. **Golden Talent and safeguarding:** age-aware consent and revocation, role isolation, test/version audit, interpretation validation and genuine growth cases.
7. **JHELA journal:** separate bilingual journal sitemap, English manuscript intake, real editor/reviewer roles, OJS and permissions, with no false ISI/Scopus/DOI accreditation.
8. **Official social publishing and organic growth:** approved provider authorization, opt-in leads, deduplicated queue and real provider receipts, privacy-respecting analytics.
9. **Final integrated acceptance:** mobile-first accessible UX, cache/privacy, exact same-origin release and all 36 scoped acceptance rows with traceable evidence.

Every workstream can progress through source-only non-destructive changes in parallel. **Production migrations, payment, email to customers, release deployment and private data processing must be serialized and independently authorized**. No workstream is “100% complete” without relevant live acceptance evidence.

## Current observation and unresolved prerequisites (2026-10-12)

Source-only release guard changes on the canonical branch now check private signed recovery and Stage09 MySQL table/index/engine compatibility *before* extraction. The separate commerce schema migration and deploy workflows share `bertina-production-deploy` concurrency group. These protections do **not** establish actual restoration, live SQL migration, reconciled three-book stock or bank settlement.

Track the remaining blockers in existing issues [#60](https://github.com/drrezazadeh65/drjavadrezazadeh.com/issues/60), [#63](https://github.com/drrezazadeh65/drjavadrezazadeh.com/issues/63), [#64](https://github.com/drrezazadeh65/drjavadrezazadeh.com/issues/64) and [#65](https://github.com/drrezazadeh65/drjavadrezazadeh.com/issues/65), plus `docs/governance/LIVE_ACCEPTANCE_LEDGER_20261012.md` and `STAGE09_PRIVATE_DEPENDENCIES.json`. Preserve UNKNOWN when live/private evidence is not actually observed.

**Release promotion rule:** only the live Bertina SHA, signed privately certified restore, explicitly authorized reviewed schema changes, actual end-to-end operational acceptance and passing release gate allow the milestone to change from **DEVELOPMENT** to **RELEASED**.
