# JREI Whole-Site Autonomous Operator — 24/7, model-independent rollout

**Owner directive 2026-10-27:** Delegate responsibility for the entire site to
JREI, retain ChatGPT as optional reviewer, and operate without waiting for
ChatGPT. The owner explicitly accepts operational risk and keeps backups.
Production is the original Bertina PHP/MySQL site; canonical development is
`migration/bertina-linux6` in `drrezazadeh65/drjavadrezazadeh.com`.

## Tier 1 — verified running, without operator intervention
- New workflow `.github/workflows/jrei-autonomous-site-governor.yml`
  schedules GitHub Actions every 30 minutes and runs on source updates.
- First real run **SUCCESS**:
  https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/40548506644
- Actual stdout: `OBSERVED_PUBLIC_ROUTES=6`, `SOURCE_DOMAINS=8`,
  `REPEATED_PUBLIC_FAILURES=0`, and deliberately
  `PRIVATE_DATABASE_AND_WORKER_HEALTH=UNKNOWN`.
- SHA-anchored report artifact, 14-day retention. On recurring checked public
  outages (two probes), scheduled runs can create/reopen an issue in the
  original repository, deduplicated by exact issue identifier.
- Eight domains: SEO/GEO, News, Code, Database, Self-Learning, Design,
  Operations and Examinations. This run checks public paths and checked-out
  source evidence only. **It does not claim live internal engine health.**
- No code deployment, article publishing, private user data, SQL, paid API,
  Windows service installation or private model weight modification occurred.

## Tiers to implement next, without repeatedly asking the owner to assist
**Tier 2:** Isolated branch auto-patches for allowlisted low-risk tasks,
separate exact-SHA source CI and bilingual sandbox preview with rollback.
Test success is not proof that private production data are safe.

**Tier 3:** The original signed Windows outbound worker, local Python
skills, model-neutral FA/EN retrieval, permitted memory, independently
reviewed chat, existing owner mission ledger, real mother-DB completion
receipts, and persistent 24/7 adaptive Node A/B resource use. Owner-observed
37/37 Radeon Vulkan layer offload is inference evidence; it does not
independently prove that the persistent GPU task is installed.

**Tier 4:** Original 21-section JREI News CMS, approved primary-source
acquisition, authentic rights, claim correction, editorial QA, deduplication,
and autonomous CMS handoff *only* for already-approved verified material
with authentic receipt. Do not publish unverified model drafts.

**Tier 5:** Original Bertina database diagnostics and reversible schema
changes with real clone/backup/transaction evidence; existing SEO/GEO,
media/UX, accessibility, journal and commerce compatibility remain mandatory.
Code, authentication, payments and private student/customer records cannot
be modified by untrusted raw model text.

## 24/7 policy
No daily activity quota or fixed 02:00–05:00-only operating hours. Heavy
jobs receive a Tehran time-of-day priority adjustment, while local CPU,
VRAM, RAM, network, disk and thermal headroom protect continuity. Operation
continues when ChatGPT is unavailable; the public Bertina site should remain
usable when both owner PCs are offline.

## Honest capability boundary
Tier 1 is already alive on GitHub. Tiers 2–5 are not operational solely
because they are described or because CI passes. Full-scale ownerless
website administration requires independently accepted original system
integration, authenticated scoped execution, durable receipts and rollback.
Model-generated changes cannot declare themselves verified improvements.
