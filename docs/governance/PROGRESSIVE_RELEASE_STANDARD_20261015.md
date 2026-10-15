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
