# JREI News — operational acceptance and single-requirement closure

Date: 2026-10-25
Canonical branch: `migration/bertina-linux6`
Project: `drrezazadeh65/drjavadrezazadeh.com`
Source of owner authority: explicit most-recent editorial decision, superseding
the historical **per-article approval always required** policy.

**Acceptance state: IN PROGRESS — DO NOT MARK CLOSED OR PUBLISHED.**

## Binding editorial policy

1. Official primary notices (e.g. from Sanjesh, Azad University, Payam Noor,
   individually verified universities) are candidates for automatic publishing
   only after independent current-issuer verification and existing licensed
   source permissions. A domain label alone is not validation.
2. JREI drafts both Persian and English in the owner's evidence-grounded style,
   produces educational next steps, applies rights-checked imagery, checked
   semantic internal linking, NewsArticle/SEO/hreflang and the existing
   user-invoked JREI assistant context.
3. Only source/claim uncertainties and contradictory evidence enter the owner
   MFA exception queue. Incomplete editorial work, an offline CMS or missing
   credentials are system holds, not editorial review requests.
4. Urgent P0 is priority, not additional owner approval. No artificial daily
   story limit exists. Workers still use bounded memory/retries/approved
   source intervals, deduplication, publication rights and host limits.
5. Existing canonical archives `/fa/akhbar/` and `/en/news-insights/`
   must remain stable. All public writes require a real CMS receipt. Never
   synthesize one or falsely insert per-article owner decisions.
6. Owner retains suspension, source withdrawal, correction and rollback rights.

## Actual owner-produced Bertina mother-DB observations (2026-10-25)

These are screen-observed results, not assertions of live operational success:

- Database: `drjavad1_store`.
- 12 News tables, 124 columns, 12 primary keys, 18 foreign keys,
  27 unique indexes (INCLUDING primary indexes), 1 FULLTEXT index.
- All 12 News tables present with InnoDB and utf8mb4_unicode_ci.
- 5 tested original shared tables present.
- All tested News operational row counts were zero: monitors, candidates,
  evidence reviews, editorial versions, decisions, publications, published
  articles, search documents, discoveries and delivery receipts.
- Only 1 non-revoked source was present in `jrei_exam_sources`:
  `DISCOVERED`, `PERMISSION_UNVERIFIED`, with NULL locator URI.
- Thus **zero authority-approved official news sources** were demonstrated.
  No synthetic INSERT/UPDATE, auto-approval or SQL schema replacement was
  authorized by these observations.
- Metadata aggregate totals do not prove individual FK targets, on-delete
  rules, exact column defaults or operational source permissions. The
  source-side readiness fixture has more extensive checks.

## Implementation additions staged after baseline 7264922

- `official-publication-policy.mjs`: source/evidence-provenance and
  rights/quality/CMS decision categories; no daily quota; no write.
- `newsroom.mjs`: original-private coordinator for bounded official
  batch planning; no new worker or API endpoint.
- `editorial-coverage-planner.mjs` and `breaking-radar.mjs`: verified
  urgent official news is prioritized, never automatically assigned owner
  review solely for urgency.
- `php/official-auto-handoff.php`: corresponding PHP decision policy,
  read-only source rights and issuer snapshot from the original mother DB,
  hash-bound bilingual revision readiness, verified original feed-policy
  join, revoked-source and private-use exclusion **before external callback**.
- PHP, JavaScript and MariaDB fixtures cover valid official intake,
  contradictory evidence, forged authority, missing CMS, missing/expired
  rights, revoked articles, revoked upstream feeds and outdated policies.
- Existing manual CMS and approval contracts remain intact; no SQL changes
  or live production deployment were performed by these additions.

## Remaining release gates — all required before CLOSED

- [ ] **Source intake:** actual approved registries, working signed original
      acquisition/independent article bytes and current licensing/robots rules.
- [ ] **Standing authorization:** add an auditable, owner-authorized policy
      binding for automatic publisher releases. Current
      `jrei_news_publications.approved_decision_id` still requires a row in
      `jrei_news_owner_decisions` and existing `publication-dispatch.php`
      requires an OWNER_APPROVED editorial revision. Do not spoof such a row,
      weaken existing FK integrity or mark an auto suggestion as permission.
- [ ] **Authenticated original CMS:** transactional re-verification of signed
      source/claims/QA and durable policy, actual bilingual render and immutable
      URLs; authentic publication receipts, then Search/RSS/sitemap indexing.
- [ ] **Service integrations:** actual JREI model and author corpus, assistant,
      source-aware media, related pages, newsletters/reminders through native
      consent/outbox, authorized AWOSE API providers, monitored Cron.
- [ ] **Live QA:** complete official source -> no-owner-approval -> genuine
      FA+EN publish -> receipt -> indexed pages; separate suspicious-item owner
      review case and revoked-source shutdown; mobile/RTL, SEO, security,
      privacy, performance, accessibility, rollback and no-regression checks.
- [ ] **Owner-controlled deployment:** production HEAD parity, backups and
      recovery rehearsal, approved host deployment, verified monitoring and
      confirmed acceptance recorded with evidence.

**Rule:** CI PASS proves the checked source/fixture, not that Bertina has an
operating automatic newsroom. Neither zero-row tables nor source-only contract
files qualify as a completed JREI News requirement.
