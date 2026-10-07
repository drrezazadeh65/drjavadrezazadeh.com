# SITE COMPLETION DOSSIER — v4.3.0

**Status:** ACTIVE EXECUTION DOSSIER  
**Date:** 7 October 2026  
**Canonical production origin:** `https://drjavadrezazadeh.com`  
**v4.2:** rollback/reference only  
**Active baseline:** `foundation/V4.3.0-EXECUTION-BASELINE.md`

## Executive status

v4.3.0 is a completion/hardening release. The public bilingual website and technical SEO foundation are mature; the remaining gap is mainly production activation, secure runtime services, measurement and physical-device validation rather than additional speculative page building.

This dossier distinguishes repository completion, automated verification, live production verification and external-provider blockers. A UI shell is not counted as a live backend, sandbox payment is not counted as production payment, and a scientific preview is not counted as validated psychometric scoring.

## v4.3.0 work completed in repository

- v4.3.0 is the active development baseline.
- Browser QA commerce assertions now match the three owner-approved sellable/in-stock print books.
- Master readiness now reflects the verified HTTPS Search Console property and the completed BitPay sandbox roundtrip.
- The three approved book covers and root favicon assets are governed by the canonical media registry.
- Media policy v2.0 establishes source/derivative, provenance, rights, composition-lock and optimization rules.
- A release-blocking media-library audit verifies production image registration and book-cover catalogue references.
- Frontend copy hygiene now covers both visible HTML and client-rendered JavaScript strings.
- The known customer-facing “backend” wording in the shop was removed.
- Professional service pricing is read from the central service catalogue on the Persian Services journey.
- The hard-coded 21-service tariff section was removed from the bookstore.
- English Language Education is explicitly presented as an expertise/content area rather than a current paid product.
- The cache standard is upgraded to automatic change-driven invalidation: mutable content remains fresh-first and each relevant main-branch change triggers a Service Worker cache-family bump.
- The cache workflow rebases its cache-bump commit if main advances during execution, preventing non-fast-forward loss.
- A full-route responsive certification suite now covers every HTML route at 320, 390, 430 and 1440 pixels in addition to representative Browser QA.
- The public AI assistant Worker now uses the owned canonical production origin rather than the legacy GitHub Pages origin.
- IndexNow has moved from dry-run readiness to live, fail-closed change submission: HTTPS and the public key are verified before network submission.

## Search and SEO

The canonical HTTPS Search Console property `https://drjavadrezazadeh.com/` is connected and must be treated as the production property. The legacy HTTP property is not canonical.

The sitemap/canonical/noindex architecture remains governed by regression tests. Public URL identity remains frozen: existing indexable paths are not renamed for convenience.

IndexNow live automation verifies the production HTTPS origin and key file before every network submission. Changed indexable HTML URLs are submitted selectively; structural sitemap/search-index/catalogue changes submit the canonical sitemap set.

Bing/Yandex activation remains account-dependent.

## Media library

The production media system now has one canonical registry and one matching policy. Every governed image needs provenance, rights state and bilingual alt/caption metadata. Book covers are composition-locked: optimization must not redesign or crop an approved cover.

The current repository includes governed records for:

- سپید;
- تاریکی;
- بن‌بست;
- the approved portrait assets;
- PWA icons;
- public illustrations;
- the eNAMAD display asset;
- root favicon derivatives.

Where an original archival master is not stored in the repository, the approved production asset is recorded honestly as the current source rather than falsely labelled an original master.

## Cache and PWA freshness

Public HTML, mutable CSS/JS/JSON/manifests and unversioned media remain network/fresh-first while online. Private and transactional routes remain `no-store`.

Relevant main-branch site changes trigger an automatic Service Worker cache version update. Activation deletes prior `jr-site-*` cache families. This avoids requiring ordinary visitors to manually clear browser cache.

The system does not attempt destructive removal of unrelated browser storage or authentication/preferences; it invalidates controlled Cache Storage and forces revalidation of mutable resources.

## Commerce and bookstore

The canonical book catalogue contains three published print titles that are owner-approved as sellable/in-stock, each at **2,000,000 IRT**:

- سپید;
- تاریکی;
- بن‌بست.

The cart/catalogue may represent these real products. Live bank payment remains disabled until the production BitPay credential is issued and the production Worker is switched safely.

Service tariffs no longer belong to the bookstore. The Services journey displays them from the same central service catalogue.

Shipping coverage, return terms and remaining bibliographic metadata such as ISBN/publisher/edition remain bounded completion items and must not be invented.

## BitPay

The provider remains disabled for production.

Completed engineering evidence includes the full sandbox positive and negative roundtrip, server-side verification, amount matching, factor-ID matching and IRT→IRR conversion.

The remaining external merchant blocker is the BitPay postal-code mismatch with the tax-file postal code. After provider re-review, the approved production API credential must be stored only as a runtime secret. Production activation then requires Worker deployment, a controlled live transaction and reconciliation/failure/replay verification.

## eNAMAD

The project records eNAMAD as obtained and the site contains the official trust-link/code. The exact provider-supported seal rendering must remain a governance item: do not fabricate an “official snippet” from memory. If the provider supplies a canonical snippet, use it byte-faithfully subject to security review.

## Authentication and private applications

Login/register/recovery, Student, Parent, Teacher, Adviser and Admin surfaces remain advanced frontend/foundation work rather than production identity/data systems.

Production activation still requires real identity runtime, email verification/recovery delivery, secure database/private storage, role authorization/RLS, sessions and Admin MFA. Mobile remains contact data only; email remains the authentication authority.

No fake login or fake private persistence may be enabled to improve apparent completion.

## Golden Talent

Golden Talent remains a prevalidation evidence/development system. Existing RCAS, multi-source evidence, D1–D6, Golden Path, BAHAR and longitudinal foundations are preserved.

**Total Talent Score remains OFF.**  
**Automatic Career Prescription remains OFF.**

No norms, cutoffs, giftedness labels or deterministic career claims may be introduced without empirical validation.

## AI assistant

The Worker source, Workers AI binding, rate limit, consented lead bank and Durable Object SQLite design exist. The canonical production origin has been corrected.

Live completion still requires deployment on the connected Cloudflare account, runtime secret setup for protected lead export, custom-domain health verification and end-to-end bilingual tests. The public assistant is not an authentication or private-record interface.

## Analytics and observability

The Search Console connection is live. Google Analytics is **not connected to the currently authenticated GSC Wizard account**: the connector reports no Google Analytics scope and no readable GA4 properties.

Therefore no GA4 Measurement ID is invented or committed. The repository already contains privacy-safe event/observability contracts. GA4 activation requires granting Analytics scope, selecting the real property, then mapping the existing allow-listed events and verifying data collection.

## Responsive/mobile certification

Representative Browser QA already covers the main public/private product surfaces. v4.3.0 adds a full-route certification across every repository HTML route at 320/390/430/1440 widths with HTTP, overflow, broken-image and client-error checks.

Physical iOS/Android, actual PWA installation and VoiceOver/TalkBack remain manual/external certification items and must not be marked passed without real-device evidence.

## Current external/provider gates

1. Correct the BitPay merchant postal code and obtain the production API credential.
2. Connect Google Analytics scope/property to the authenticated analytics account.
3. Deploy/verify the Assistant Worker and protected runtime secret.
4. Provision production authentication/database/private storage/transactional email/RLS/Admin MFA.
5. Define verified book shipping/return/fulfilment terms and remaining bibliographic metadata.
6. Connect real booking/calendar availability and persistence.
7. Perform physical iOS/Android and assistive-technology validation.
8. Activate Bing/Yandex webmaster integrations when the relevant accounts/credentials are available.
9. Keep Golden Talent scoring/normative claims disabled until empirical validation.

## v4.3.0 completion rule

v4.3.0 is not “final” merely because its code is committed. Applicable SEO, Browser QA, media, cache, responsive, commerce and live-production gates must be green; external dependencies must be explicitly classified rather than simulated.

The next status update must be driven by verified CI/live evidence.
