# Controlled release handoff — v5.1 complementary deployment
Date: 2026-10-16 · canonical branch: `migration/bertina-linux6`

## Nature of this handoff
This is a reproducible **release preparation**, NOT a deployment, backup certification, production payment activation or proof of live version. Preserve all newer changes and resolve the final HEAD at dispatch time. No parallel project, database, dashboard, or duplicate build is authorised.

## Verified source snapshot before recording this handoff
- Source SHA: `c68e602fac0f78458909bf4225d1e08dbbceb16b`.
- The four workflows on this exact SHA all completed SUCCESS:
  - SEO GEO Regression [38922382028](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38922382028)
  - Bertina Master SEO Audit [38922382103](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38922382103)
  - Safe public scientific experience release QA [38922381957](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38922381957)
  - Progressive Release Policy Tests, including full-preflight [38922382153](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38922382153)
- Latest successful **manual** Bertina deploy returned by dispatch-only run inventory: [38891383445](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38891383445) for `f8914d64502eb567d640145e4f6ef98dfd93835d`. The current live Service Worker fingerprint **could not be freshly retrieved** from the chat host, so this is last independently proven deployed SHA, not a fresh trusted live readback.
- Production main-site release still **HOST_UNVERIFIED** for later SHA; no deploy was initiated by this preparation.

## Source changes staged for the next controlled deployment
- Preserved both languages, existing canonical URLs and the approved hero/cover media.
- Persistent **Install app** in the six-position mobile bottom dock (five primary routes preserved), existing PWA state/fallback logic; source and Chromium QA from earlier checkpoints.
- Public footer shows user-approved `v5.1.0` without exposing raw cache fingerprint; Git SHA remains in privileged release data and Service Worker for technical verification.
- Third-person institutional biography/professional navigation rather than authorial `I / من`, with genuine literary and survey voices untouched.
- Persian/English premium bookshop has responsive hero layout, authentic book covers, and catalogued books; real book details now recorded from the owner's original colophon photographs in **both** `platform/book-catalog.json` and `assets/data/book-catalog.json`.
  - `roshanaei`, title `سپیدی`: publisher نشر دارما; ISBN 9786229465141; 1404 SH publishing/first printing.
  - `tariki`, title `تاریکی`: publisher نشر دارما; ISBN 9786229636275; FIPA publication 1401 SH / actual first printing 1404 SH, shown separately.
  - `bonbast`, title `بن‌بست`: publisher نشر دارما; ISBN 9786229636237; 1399 SH publishing/first printing.
  - First printing 200 copies/title is **not live inventory stock**. Do not change purchase pricing, inventory ledger, payment provider, ISBN or cover source speculatively.
- Figma editable design file: https://www.figma.com/design/MM2wC6wDAG9YGJSwgjAFMw ; Canva editable imported baseline: https://www.canva.com/d/dwOiA4aTJTiL-8I. Figma layout does not yet include every approved photographic image fill. Website CSS, not editor prototypes, governs deployment.
- Consultation management already defaults to 17:00–18:00 `Asia/Tehran` as a 60-minute **owner draft**. No date-specific OPEN window was published; public availability requires an exact date, verified production mother capacity schema, owner MFA, CSRF, overlap lock and a successful write. Do not fabricate green slots or confirmed reservations.
- Existing opt-out paths revoke newsletter consent and suppress pending marketing queue messages transactionally in the mother database; independent SMTP inbox-delivery and worker/cron proof remain separate.

## Release method — execute only after preflight, at the exact then-current HEAD
Workflow: `.github/workflows/deploy-bertina.yml`
Public entry: https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/workflows/deploy-bertina.yml
- **Manual `workflow_dispatch` only** (production deployment must not be triggered from ordinary source pushes).
- `recovery_mode=hosting_managed` is available but **does not inspect, create, verify or restore backups**. Its use is an explicit operational risk; do NOT mislabel it as an independently restorable recovery plan. Owner-approved `signed_restore` is the proper route where verifiable recovery evidence is required; check its distinct prerequisites before selection.
- For `hosting_managed`, enter `approved_commit_sha` = exact *current 40-char branch HEAD*, and `expected_live_sha` = exact 40-char SHA extracted from fresh public and, preferably, origin-confirmed live `/sw.js` readback immediately before the run. Never blindly enter the historical `f8914d6` just because that was the last certified successful deploy. `owner_cpanel_custody` has additional explicit risk acknowledgement and is not an implicit safe fallback.
- Workflow requires dispatcher `drrezazadeh65`, original owner access, FTP TLS secrets, host-side MySQL compatibility, CI MySQL fixtures, browser QA, checksum matching, and readbacks. Never disclose private config/keys, reset production DB, or bypass MFA.
- Prior to publish verify restorable host backup/rollback readiness, current live SHA, exact HEAD, all required latest CI, catalogue JSON projection, service-worker invalidation, existing customer routes, and that no server-side migration or import can unexpectedly alter production data. The workflow currently imports operational evidence on the host; audit expected DB side effects before running.
- After deployment: require a **new** successful Deploy to Bertina run ID on exact SHA and separate read-only post-release acceptance showing the *new* live Service Worker fingerprint, bilingual HTML and private headers. Exercise authorized real user/owner login and services separately. Do not claim payment settlement, SMTP delivery or OJS editorial operation from GitHub Actions success.

## Outstanding acceptance gates (do not advertise as DONE)
- `HOST_UNVERIFIED`: trusted current live SHA and new exact-SHA production deployment, real Android PWA native install, authenticated private role end-to-end flow, backup restore.
- `BLOCKED_BY_CONFIGURATION`: USDT owned-wallet receipt settlement/quote and payment approval, live SMTP opt-in+unsubscribe delivery/worker, independent secure OJS/JHELA manuscript review operations.
- `REQUIRES_OWNER_INPUT`: exact Tehran date(s) for the 17:00–18:00 OPEN consultation window or authenticated manual publication of actual schedule; confirmation of backups/recovery mode and trusted origin-live SHA before manual deployment.
- `SOURCE_TESTED`: protected main-site enhancements and the bibliographic source projection, not proof of actual sales/settlement or server-side DB migrations.

## Continuity instruction for next chat
Start with read-only `GET ref/heads/migration/bertina-linux6`, GitHub Actions on exact new HEAD, live `/sw.js` SHA and existing master plan/ledger. Preserve all newer changes, use the one canonical DB and this one canonical deploy workflow. Finish remaining gates; only then dispatch a controlled deployment with an explicit user-authorised risk and exact source/live SHA. Record post-deploy acceptance. **Never rerun historical `f8914d6` as a new update.**
