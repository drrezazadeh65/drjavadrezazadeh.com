# JREI Global Education News & Intelligence — source-development workstream

Repository: drrezazadeh65/drjavadrezazadeh.com
Branch: migration/bertina-linux6
Module: platform/news-intelligence/
Database authority: existing Bertina mother DB drjavad1_store
Release status: NOT TESTED / NOT INTEGRATED / NOT DEPLOYED

## Critical operating rules

This is a source-only, additive newsroom module for the owner's unified JREI.
It is **not** a second website, AI model, crawler, account database, newsletter
provider, owner dashboard or payment system. The existing public news URLs,
especially /fa/akhbar/, are frozen. There is **no authorization to publish
articles, alter existing page canonicals, send outbound emails, initiate
social posts, run live acquisition, apply migrations, enable Cron, or deploy.**

Source staging is allowed until the owner requests a single comprehensive
integrated acceptance campaign. No interim unit, CI, browser, security, SEO
or live acceptance tests were intentionally executed by this workstream.
No status or document in this folder is evidence of a successful test.

The owner approves **every final public editorial version** through the
EXISTING owner-MFA operations session. News is discovered and prepared
automatically (once enabled), but never published merely because the model
generates it. Corrections also need fresh explicit approval.

## Canonical integrations — do not duplicate these

| Concern | Reuse existing authority |
|---|---|
| Acquiring public sources | JREI approved-source registry, source policy, private HTTPS transport and original acquisition scheduler |
| Evidence & AI | platform/jrei-v5 and existing source-review and model-routing controls; original assistant |
| Accounts | customer_accounts, identity sessions, RBAC, owner MFA |
| User consent | eco_consent_records and eco_notification_preferences |
| Transactional/marketing mail | eco_notification_* outbox + original verified SMTP worker |
| Social | platform/social-distribution (AWOSE) with exact approved recipient and official provider APIs |
| Publishing | existing authorized CMS / editorial tools and immutable public URL policy |
| Payment | existing commerce_orders / entitlements; do not invent paid plans or prices |
| Analytics | existing operations/GSC/GA4 instrumentation; never fabricate performance |
| Database | exactly one mother DB, additive owner-approved migrations after schema reconciliation |

Source code may provide capabilities to these services but does not
establish current working connection to a live model, server Cron, SMTP,
social provider, MariaDB schema or JREI Windows worker.

## Source inventory

- contracts.mjs — approved sources, immutable candidate facts, owner preview and decision
- taxonomy.mjs — bilingual controlled educational category hierarchy
- source-intelligence.mjs — source polling, hash-based change detection and dedup
- acquisition-worker.mjs — bounded queue proposals to original JREI acquisition worker
- evidence.mjs — reviewed extractive claims, amendments, rumor review
- breaking-radar.mjs — P0/P1/P2 triage; no auto-publication
- corrections.mjs — correction proposals and changed-deadline notification policy
- editorial-style.mjs — Persian philosophy/Masir-e Roshd and English MA/PhD authorial style references
- jrei-model-bridge.mjs — original JREI model routing; no forced OpenAI dependency
- content-quality.mjs — pre-owner review and source integrity checks
- newsroom.mjs — evidence-to-bilingual preview coordinator
- workflow.mjs — editorial lifecycle with immutable revision transitions
- approval.mjs — owner preview mail and publication queue gates
- approval-email.mjs — escaped bilingual email preview template
- bulk-approval.mjs — exact selected digests, same MFA owner
- private-runtime.mjs — private backend port interfaces, activation controlled by server
- publisher-plan.mjs — canonical URL collision avoidance, owner permission recheck
- render-public.mjs — escaped approved bilingual NewsArticle HTML
- newsroom-home.mjs — mobile-first bilingual newsroom portal HTML
- ui/news-intelligence.css — premium charcoal/gold/ivory responsive visual system
- ui/news-reader.js — only filters cards shown in browser; not an archive-wide search
- calendar.mjs — official evidence-bound milestone versions and reminder reservations
- calendar-ics.mjs — RFC5545 descriptor and calendar renderer
- deadline-radar.mjs — reviewed official upcoming dates
- notifications.mjs — existing eco-outbox reminder and owner email proposals
- newsletter.mjs — consent-bound daily/weekly/urgent/exam-only digests
- reader-consent.mjs — user-first optional single-popup and purpose-scoped preferences
- channels.mjs — official-provider social delivery proposals, not actual dispatch
- links.mjs — cross-content semantic link proposals and reciprocal review
- search.mjs — bounded in-memory search over already published content only
- assistant-context.mjs — citations-first context for existing JREI conversational assistant
- reader-actions.mjs — official links, reminders, genuine related services
- seo.mjs — bilingual NewsArticle, hreflang and sitemap descriptors
- premium-access.mjs — paid extras only after existing commerce entitlement
- analytics.mjs — observed-only newsroom metrics
- admin-projection.mjs — owner-MFA dashboard read model
- status-policy.mjs — non-operational truthful feature readiness markers
- php/public-read-model.php — staged bounded search of owner-approved PUBLISHED rows
- php/owner-editorial.php — staged MFA owner queue + atomic decision persistence
- php/exam-reminders.php — staged consented milestone subscription/outbox queue
- php/topic-newsletter.php — staged news-category newsletter preferences
- php/digest-worker.php — bounded official/owner-approved categorized digest batches
- php/owner-preview.php — exact MFA-reviewed full bilingual draft
- php/news-api-adapter.php — disabled-until-acceptance original Bertina API dispatch interface
- style-profile.mjs — measured original corpus voice features, no invented author examples
- news-prompt-builder.mjs — reviewable grounded author-style prompt for existing JREI
- visual-cover-generator.mjs — original branded Persian/English vector news artwork
- news-feed.mjs — verified approved-article RSS and 48-hour news sitemap proposals
- deadline-radar.mjs — revised verified exam deadlines and opportunities
- premium-access.mjs — original commerce entitlement gate; no invented pricing
- reader-consent.mjs — consent-based topics and single optional popup
- ui/admin-newsroom.js — protected owner review UI with full bilingual preview


Staged migrations (DO NOT EXECUTE NOW):
- docs/migrations/20261024_jrei_news_intelligence_mother_mysql.sql
- docs/migrations/20261024_jrei_news_topic_preferences_mother_mysql.sql

## Feature acceptance matrix — source ≠ live

| Feature | Source code | Integrated / tested / released |
|---|---|---|
| Global category taxonomy, P0 monitoring and official change detection | Staged | NO |
| Automatic crawling from source-approved origins | Private orchestration staged | NO |
| Independent official announcement fact verification | Review contracts staged | NO |
| Model-driven Persian and English production in owner's own style | JREI routing/style contracts staged | NO |
| Premium licensed featured visual generation | Templates and media rules staged | NO |
| High-quality bilingual public news article rendering | Renderer staged | NO |
| Premium CNN-class newsroom homepage | Source HTML/CSS staged | NO |
| Owner email and one-click authenticated review dashboard | Read/decision and mail contracts staged | NO |
| Group approval, corrections, audit and revision history | Source logic staged | NO |
| Public publishing and Google News XML sitemap | Descriptor/publisher plan staged | NO |
| Telegram, Eitaa, Bale, other authorized channels | Existing AWOSE adapter handoff staged | NO |
| News topic newsletter and user opt-outs | Consent/outbox and SQL staged | NO |
| Exam event calendar + 5/10 day alerts | Logic/SQL staged | NO |
| Advanced full-archive search with database index | Bounded search models staged | NO |
| JREI answer context under each article | Source context contract staged | NO |
| Semantic internal links, services, books, assessments | Source matching rules staged | NO |
| Free official news, optional premium subscriptions | Entitlement planning staged | NO |
| GSC/GA4 and AI visibility observation | Metric descriptors staged | NO |
| Full end-to-end acceptance, security, live performance | NOT RUN | NO |

## Required FINAL-ONLY integration

1. Re-read fresh canonical HEAD, the 117-item atomic ledger, source policies,
   immutable URL registry, owner-MFA and mother-DB governance. Avoid touching
   concurrently edited shared files without first coordinating.
2. Reconcile existing JREI source permissions, allowlisted domains, legally
   permitted retrieval method and the desired urgent polling interval.
   Stage explicit integration in existing Cron and source worker only after
   final authority and testing; no new unconstrained crawler.
3. Obtain the actual author-approved first chapter of Masir-e Roshd and
   approved Persian educational-philosophy text, and actual English MA/PhD
   prose. Do not claim corpus analysis without this evidence.
4. Wire server-authenticated reviewer previews and one authenticated
   publish decision to the central operations dashboard, without bypassing MFA.
5. Add the approved news migration in one documented mother-DB campaign,
   with real inventory, schema consistency, backup, rollback and proof.
6. Connect the original eco_notification_* system (both owner previews and
   consented newsletter/deadline reminders), verify SMTP only in final tests.
7. Wire the existing AWOSE social delivery system, one exact recipient and
   immutable media/approval digest per platform; never bypass APIs.
8. Serve reviewed public templates through the existing editorial publisher,
   install approved CSS/JS assets, implement the full archive search endpoint
   and its index, update multilingual public routes, canonical/hreflang and
   SEO data on owner-authorized release only.
9. Hook the original JREI assistant into each released news story using only
   approved evidence, optional user consent, and clear uncertainty.
10. Run the ONE owner-approved end-to-end acceptance campaign before a
    separately approved production release, including rollback and real
    monitoring. No source-only progress is a final acceptance PASS.

## Design commitments preserved from the 66-section owner master

Two independent editorial languages; formal evidence-grounded original
authorial voice; Iran and international education/exams/scholarships/research;
news-first but with educational next steps; urgent official results and
deadline coverage; 2 AM–5 AM Iran acquisition capability under original
JREI private controls; official exam calendar and configurable 5/10-day
alerts; news-specific email subscriptions and unsubscribes; approved
multi-channel distribution; original semantic links and SEO standard;
AI assistant context below each story; reader-first free essentials,
optional verified commerce entitlements; image provenance and premium design;
owner-exclusive authenticated publication approval; original database,
existing products and zero regression.

The requested nightly 300 GB is an **allowance** rather than a transfer
target. No continuous traffic or private PC crawler activation is implied.

**Status is a source checkpoint, not a completion certificate.**


## Continued isolated source work — 24 October 2026 (NOT TESTED)

The current development continues in **this original branch and module**, not a
separate repository. No production route, Cron, mailer, account, model or social
provider has been activated; no public files or existing SEO URLs were replaced.

Newly staged source integration components:

- php/official-feed-extractor.php — bounded DTD/XXE-resistant RSS/Atom
  extraction of already approved, privately fetched public bytes.
- php/candidate-intake.php — source-monitored, review-pending deduplicated
  official news metadata in the original mother DB.
- php/evidence-review.php — independently reviewed current JREI source
  attestation; LLMs cannot self-certify publisher rights or official claims.
- php/editorial-draft-store.php — versioned bilingual, image-rights-bound,
  private source-reviewed editorial draft persistence.
- mother-db-projection.mjs — SHA256 of exact PHP persisted JSON bridges owner
  approval safely into JREI Node contracts.
- php/public-search-indexer.php — original-publisher-receipt-gated
  public-only fulltext indexing, preserving URL permanence.
- php/public-read-model.php — public-only search by language/topic/country/date,
  MariaDB FULLTEXT + bounded literal fallback, no draft search leakage.
- ui/news-search.js — opt-in bilingual archive search with controlled filters.
- ui/news-assistant.js — user-click bridge into original JREI assistant;
  no hidden question submission, second chatbot or bypass of consent.
- calendar-page.mjs + ui/news-calendar.js — official date-only calendar,
  embedded safe event data and optional choice of reminder timing.
- ui/news-preferences.js + php/preferences-replace.php — atomic topic digest
  preferences, central consent, and suppression of previous queued mail.
- php/digest-worker.php — existing outbox digest planning with stable,
  complete per-account pagination (source only).
- php/owner-overview.php — genuine mother-DB owner dashboard metrics;
  unavailable tables or missing observations are UNKNOWN, not invented zero.
- awose-bridge.mjs — explicit compatibility with existing AWOSE social
  publisher and honest distinction between supported and unimplemented APIs.
- ui/admin-newsroom.css, ui/admin-newsroom.js and php/owner-preview.php —
  owner-only bilingual full-text/source/image/semantic-link review before MFA
  decisions, without prematurely publishing.
- php/news-api-adapter.php — original API integration dispatcher with
  hard-closed environmental and owner release gates; currently NOT mounted.
- integration-manifest.json — exact shared ownership boundary and deferred
  final integrated acceptance checklist.
- docs/migrations/20261024_jrei_news_public_search_mother_mysql.sql —
  staged multilingual published-article-only public search index.

All previously created module files remain additive and preserved.
The staged migrations are NOT applied; per-source/news permissions and
publisher receipts still need authenticated final integration.

### Release truthfulness

**Do not declare this module complete, verified, production-ready, operating,
fully AI-integrated, continuously crawling, connected to the original JREI
provider, or 100% implemented solely because these files exist.** End-to-end
runtime wiring, real source rights, actual style corpus, original owner SMTP,
approved provider channels, original JREI assistant context, complete
bilingual public route integration, authorized migrations, monitoring and
owner-controlled release are separate remaining acceptance gates. All tests
remain deferred under the owner's explicit instruction.

No test, build, CI dispatch, database migration, crawling session, SMTP
transmission, social post, AI inference or production deployment was
intentionally triggered in this source-development continuation.


## Owner request continuation — source-only release preparation (24 October)

Additional isolated implementation staged in the **same canonical branch**:

- First draft requests now use the original JREI provider-neutral model route
  directly after independent source evidence review, without pretending a
  bilingual draft, live model or approved owner preview already exists.
- Exact owner-approved, hash-bound bilingual URL proposals are embedded in
  the PRIVATE persisted editorial JSON; owner can review both proposed paths.
- An authenticated MFA APPROVE decision attempts to stage the exact stored
  routes for the existing CMS. If the original CMS policy port is unavailable
  or refuses, the result explicitly records waiting/reconciliation. A
  queued version is **not** counted as published.
- Original CMS publication persistence is a separate transaction with
  current source, media rights, owner decision and immutable route checking.
  Only an authentic two-language CMS receipt can mark a row PUBLISHED.
- The pre-publication renderer now accepts owner-approved content ONLY with
  a trusted original CMS authorization, and generates bytes without touching
  the public filesystem.
- PHP reading of approved official exam milestones, owner-authorized date
  revisions, reminder version rollover, and opt-in delivery are source-staged.
- Original JREI-KA source and policy adapter explicitly reflects the actual
  **at least one-hour** approved source refresh policy. Urgent five-minute
  monitoring is NOT active, and must use an approved original JREI scheduler
  policy extension rather than a covert parallel crawler.
- Owner review email drafts are routed into the original eco outbox as a
  private notice with a link to existing MFA dashboard. Sending, receiving
  and the downstream CMS publisher still require original infrastructure.
- Public retract/withdraw handling preserves the evidence history, removes
  active search documents and suppresses queued distribution AFTER verified
  original CMS action.
- Source-only verified fulltext search, premium mobile UI, RSS/Google News
  feed proposals, original AWOSE provider-specific plans, JREI assistant
  context and existing-account newsletter preferences remain staged.
- The original nightly owner allowance is **300,000,000,000 bytes** total
  (300 GB decimal), 02:00–05:00 Asia/Tehran, under strict host and source
  policies; it is not a consumption target.
- Module-only asset manifest identifies source CSS/JS and future
  destinations inside the original assets pipeline without overwriting
  any existing production files.

Important final blockers before claiming whole-project completion: align the
original JREI Cron/source policy if truly faster official P0 checks are wanted;
securely mount the module in the existing PHP entry point and original
operations owner dashboard; reconcile and apply staged mother migrations;
connect original SMTP/eco outbox, actual CMS publisher, permitted AWOSE APIs,
and actual signed JREI model executor; package the news UI assets into the
original published asset bundle; review genuine bilingual authorial corpora;
then perform ONE comprehensive final integrated test/acceptance campaign and
only afterwards a separate owner-authorized production deployment.

All live connections and tests in that paragraph are **NOT YET DONE**.
No claim of complete end-to-end implementation is authorized.
