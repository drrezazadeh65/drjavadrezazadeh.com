# JR Academic Community — owner-provisioned five-table closeout / source-release boundary

**Date:** 2026-10-21 · **Canonical branch:** `migration/bertina-linux6` · **Release posture:** source only, owner-controlled ONE final Bertina deployment.

## 1. Verified database evidence: installed by owner, not by automation

Owner supplied phpMyAdmin read-only `information_schema` result for `drjavad1_store`, MariaDB 10.11.19. Five InnoDB community tables appeared with these observed counts:

| Table | Columns | Foreign-key references |
|---|---:|---:|
| `community_comments` | 10 | 2 |
| `community_moderation_audit` | 5 | 2 |
| `community_admin_replies` | 10 | 2 |
| `community_admin_reply_revisions` | 9 | 2 |
| `community_erasure_audit` | 7 | 1 |

Existing `customer_accounts.id` was separately observed as CHAR(36), NOT NULL, PRIMARY KEY, utf8mb4 / utf8mb4_unicode_ci. The five-table count and metadata checks succeeded. **Do not execute** the existing `021_community_moderation.sql` or recorded `022_community_academic_replies_owner_applied.sql` on this production database a second time. The new SQL file is a source-of-truth *fixture and recovery reference* for already-owner-applied changes, not authorization for an automatic migration. No production PHP/DB credentials, customer rows, manuscript data or SQL dump are recorded here.

The owner screenshots do NOT prove backups can be restored, PHP web-SAPI DB connections, feature flags, real end-to-end moderation or public release.

## 2. Reuse-first source implementation

The pre-existing `api/community.php`, `assets/js/community-comments.js`, `assets/js/operations-community-moderation.js`, public/admin CSS, PHP account sessions, Operations role registration, CSRF, MFA, and the existing `ops-workspace` are retained. No second discussion engine, authentication authority, database or journal system was created.

**Public:** eligible Persian article pages only. Existing account verified, explicit publication consent, server-backed rate limits, same-origin CSRF, a honeypot and link-volume checks. Public GET discloses only `state='approved'` comments and `state='published'` official replies under approved parents. The comments and official scholarly replies use keyboard-operable native accordions and DOM `textContent`, plus restrained original academic brand tokens, mobile layouts and reduced-motion/accessibility rules. No fabricated aggregateRating, Review, star-rich-result eligibility or indexation claims.

**Private:** the *existing* Persian and English admin dashboards load one academic moderation panel only after the protected workspace is unlocked. Pending, approved, rejected and removed lists have private keyset pagination; actions require the existing ADMIN/SUPER_ADMIN permissions, session MFA and same-origin CSRF. Replies start in `draft`, then explicitly transition to published/hidden/removed/restore, with optimistic revision locks, owner-visible revision history and publication-time preservation through edits.

**Erasure:** routine hiding is reversible/visible to the owner, while irreversible erasure is an explicit separate action requiring `SUPER_ADMIN` with fresh MFA, exact `ERASE` confirmation, approved reason, write-side rate limit and an atomic content-free erasure audit. Foreign-key cascades remove associated private reply history when the underlying comment/reply is erased. This is NOT the same as removing a comment from public display. Data-retention/legal review must precede feature activation.

**SEO and privacy:** never expose private pending content as structured data, public cache, sitemap or public article aggregate statistics. Keep admin routes noindex and private API responses no-store. Review schema rich results require legitimate separate independent eligibility evidence, not user-star harvesting.

## 3. Source test and release safeguards

- Existing `.github/workflows/community-moderation-database-gate.yml` now applies source schema 021 and 022 to a *separate MySQL 8 community_fixture database* and runs updated schema-smoke, browser and source tests. Its production database is **never** targeted.
- Existing Master SEO source-audit workflow now includes `tests/community-moderation.test.mjs`, `tests/community-design-consistency.test.mjs` and `tests/community-academic-replies.test.mjs`. Existing deployment workflow `.github/workflows/deploy-bertina.yml` was **not changed**.
- Focused static-source assertions of the three Node test files were evaluated during development: **21/21 passed**. This was a constrained source verification and does NOT prove actual CI Node execution, PHP syntax, isolated MySQL runtime, real browser E2E, real web PHP config, accessibility tooling or independently verified production readiness.
- At the **one immutable final release SHA**, the owner-controlled existing workflows must actually pass all in-scope PHP lint, MySQL fixture, browser/mobile 320/390/430px, existing Commerce/JHELA/privacy and SEO regression tests. Collect exact commit, workflow job URLs, and authentic output. Do not mark UNKNOWN as PASS.

## 4. Activation and fail-closed owner conditions

`JR_COMMUNITY_ENABLED` and `JR_COMMUNITY_MIGRATION_APPROVED` must **remain disabled** until a production release is accepted with verified recovery plan/backup, required database schema, authoritative operational account configuration, MFA, consent notice, spam controls, private caching and E2E. Confirm with a verified test account: submit a question; pending remains invisible; owner approves; reply starts draft; explicit publish displays only under approved original; editor can revise/hide; senior owner can erase with content-free audit; delegated ADMIN cannot permanently erase; old comments paginate. Verify no PII exposure, no invented rating SEO, keyboard/mobile usability and no duplicate JS loaders.

**Current status: owner DATABASE STRUCTURE VERIFIED · source code and CSS updated · source contract checks performed · full CI + host E2E PENDING · LIVE DEPLOYMENT NOT PERFORMED.**
