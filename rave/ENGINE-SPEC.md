# RAVE Growth Engine — Technical Product Specification v1.0

## Mission
Build a portable, evidence-based internal engine for academic discoverability, ethical education marketing, qualified leads, sales intelligence and continuous improvement. The engine never guarantees rankings or AI recommendations.

## Architecture
- **Core:** standard Node.js ES modules, no platform-specific SDK.
- **Inputs:** versioned public content metadata, optional consented analytics, verified research identity, opt-in campaigns and anonymized commerce aggregates.
- **Adapters:** Google Search Console, Bing Webmaster, analytics, AI answer sampling, social distribution, payment and transactional email; every adapter is optional, rate-limited and independently configured.
- **Execution:** portable CLI invoked by GitHub Actions today, standard cron/container on a future host.
- **Storage:** JSON evidence for public/aggregate metrics; sensitive lead and payment records require an authenticated backend and private database, never GitHub or Pages.
- **Outputs:** opportunity queue, audit reports, measurable experiments, proposed editorial briefs, consent-aware campaign plans, conversion insights.
- **Administration:** authenticated, role-based dashboard on a future backend. Static GitHub Pages must never expose privileged operations.

## Pipelines
1. Discover: gather verified site and search signals.
2. Diagnose: evaluate SEO, content quality, accessibility, research authority, acquisition and conversion.
3. Prioritize: score opportunities by evidence confidence, audience value, implementation effort and risk.
4. Plan: generate auditable work items with owner, acceptance tests, cost ceilings and rollback.
5. Execute: low-risk preapproved tasks only; draft high-risk tasks for review.
6. Verify: compare outcomes to baseline; flag attribution limitations.
7. Report: daily technical, weekly growth and monthly strategic summaries.

## Audience and content segmentation
- Persian students and parents: talent identification, study planning, field selection, English learning.
- University students: academic writing, research methods and language education.
- Teachers and scholars: teacher education, human-centred assessment and professional learning.
- International scholars: research outputs, verified collaborations and scholarly identity.
- Service catalogue: each of the 27 services must have explicit audience, eligibility, deliverables, limitations, transparent pricing and conversion event definitions.

## Measurement
Impressions, indexed pages, qualified organic visits, citations in sampled AI answers, email opt-ins, qualified leads, checkout completion, revenue, refunds, cost per acquisition and retention. AI visibility is a sampled estimate, not a universal ranking. Avoid misleading last-click attribution.

## Governance
- Default observe-only; no automatic publishing, purchases, paid ads, outbound bulk email or credential/DNS/payment changes.
- Require evidence and human review for academic claims, prices, legal claims, marketing to minors and public testimonials.
- Consent, unsubscribe, data minimization, retention limits and anti-spam controls are mandatory.
- All actions carry immutable IDs, provenance, timestamps, risk class, approvals and rollback instructions.
- Never claim that unverified performance or features are live.

## Initial acceptance tests
- Portable CLI can run offline from fixtures.
- Deterministic scoring and validation with Node's built-in test runner.
- No credentials required for local smoke tests.
- No provider-specific imports in core.
- Public site URLs and canonical SEO architecture remain unchanged.
