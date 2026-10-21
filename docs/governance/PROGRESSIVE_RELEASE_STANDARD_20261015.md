# Progressive Release Policy — Owner directive, 2026-10-15

Applies to all current and future releases and modules of drjavadrezazadeh.com, including Golden Talent, RCAS, BAHAR, account, consultations, shop, bilingual pages and PWA.

## Decision rule
**HOLD** a routine release unless it demonstrably delivers at least one of: (a) a usable new feature/service; (b) a material improvement to an existing user journey, accessibility, performance or quality; (c) a verified bug fix. A version bump, source-only change, unfinished prototype or arbitrary scheduled deployment is insufficient.

**NO REGRESSION:** preserve all previously accepted working journeys, page routes, design quality, mobile behavior, security, privacy, data, accounts and orders. Compare candidate to the last verified healthy release. Any material regression blocks deployment. Never overwrite production customer data as a means of rollback.

**RELEASE EVIDENCE:** record previous live SHA, candidate SHA, changed capabilities, measurable before/after acceptance tests, full relevant CI/browser results, security/schema checks, hosting backup/restore responsibility, owner-run deployment steps, post-release smoke tests and code-only rollback strategy compatible with new records. If evidence is missing, HOLD.

**EXCEPTION:** urgent security/privacy/reliability fixes may ship without a new user-facing feature, with targeted tests and documented justification.

**GOLDEN TALENT:** prevalidation is not psychometric validation. No unverified scores, child/private data exposure, fabricated consent, payments or entitlement. Test server-enforced role isolation, consent revocation and human review before live enablement.

## Enforcement status
This file is the standing owner-approved governance rule, not evidence of automated CI enforcement or production release. Existing GitHub deployment workflows must be separately updated and tested to make the rule executable. The owner performs the final deployment.

## ONE-BRANCH, BATCH-FIRST, SINGLE FINAL ACCEPTANCE — standing owner rule (2026-10-21)

**Mandatory sequence for each owner prompt:** inspect/reuse existing work; **implement the complete prompt on the existing `migration/bertina-linux6` branch**; freeze the final source SHA; run **one consolidated integrated test and audit at the end of the prompt**; review actual failures and remediate them together; obtain existing owner authorization; then conduct **one controlled Bertina release** and post-deployment smoke checks.

- **No extra development, accumulation, staging or replacement Git branches.** Do all actual source edits in the currently designated release branch. Prepare all planned file updates in one coherent commit wherever possible, to avoid retriggering full GitHub CI for each small change.
- **Do not run the complete release QA after every partial modification.** Where essential during implementation, narrow syntax, security, privacy or affected-component checks are permitted, but broad regression, crawler, SEO/GEO, UI/responsive, database and release audits are consolidated **once after the entire requested change set has been assembled**.
- **Automated CI may run automatically on a branch push** as a protective repository setting; do not disable existing security or release workflows solely to make this policy appear satisfied. Avoid intermediate pushes and take the final same-SHA integrated result as the release acceptance record.
- If the **single final audit fails**, collect all defects, repair them in one focused pass and repeat only affected checks until a single final exact-SHA acceptance is achievable. Never accept a known failure by weakening a test or bypassing an authorization, scientific or payment control.
- **Strict no-regression:** preserve the previously verified source and published features, existing stable bilingual URLs, SEO/hreflang, unified database, private accounts, mobile UX, live orders, payments and delivery. Owner-closed BitPay and Mirkarimi two-PDF delivery remain **out of scope** unless the owner expressly reopens them.
- The existing `.github/workflows/deploy-bertina.yml` remains the **only authorized production release mechanism**. No deploy merely from successful source CI; owner release gate, verified prior live SHA, backup responsibilities, exact candidate SHA and post-release evidence are all required.
- **Exception:** urgent production safety, privacy or security patches must be handled immediately using appropriate focused checks and must not be delayed for unrelated batch work.

This rule is a process standard, not a claim that the current candidate has passed final acceptance or has been deployed.
