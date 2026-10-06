# Golden Talent v1.1 — Frozen Product, Search & Revenue Strategy

**Status:** FROZEN BASELINE  
**Date:** 2026-10-07  
**Scope:** Web, PWA, Android/Bazaar, iOS, shared backend/data platform

## 1. Product position

Golden Talent is not a wrapped website and not a single-test application. It is a multi-platform educational decision-support ecosystem that helps users:

**Search → Understand → Assess → Decide → Act → Track**

The public website remains the authority, SEO, content and discovery layer. Golden Talent becomes the personalised product layer for assessment, evidence integration, guidance, planning, counselling and longitudinal progress.

## 2. Architectural contract

All clients share one product core:

- one identity system;
- one backend/API;
- one source of truth for core user data;
- one Golden Talent domain model;
- shared content/configuration where appropriate;
- shared design tokens and product rules;
- platform-specific shells for Web/PWA, Android/Bazaar and iOS.

Clients must not connect directly to operational databases. Access is mediated by authenticated APIs, authorization, consent and role policy.

Data is logically separated into domains such as identity, profiles, assessments, evidence, guidance, counselling, payments, consent/privacy, content and analytics.

## 3. Differentiation principle

Golden Talent must not compete as “another psychometric test”.

Its defensible differentiation is the integration of multiple evidence sources into an explainable, longitudinal decision model. Where scientifically justified, the system may combine:

- student self-report;
- validated assessments;
- academic history;
- interests, values and preferences;
- teacher observations;
- parent/guardian observations;
- counsellor interpretation;
- goals and constraints;
- verified education/career information;
- longitudinal outcomes and user feedback.

No unsupported norm, cutoff, diagnosis or predictive claim may be presented as established science.

## 4. Golden Search

Golden Talent will develop a first-party search and discovery layer, provisionally called **Golden Search**.

Golden Search is not a general web search engine. It is a structured education, talent and career decision engine covering entities such as:

- school subjects and study streams;
- university majors and programmes;
- occupations and career families;
- skills and competencies;
- scholarships and opportunities;
- educational pathways;
- institutions where verified data is available;
- assessments and guidance resources;
- learning resources;
- counselling pathways.

Public, non-personal knowledge should have stable, indexable web URLs where appropriate. Personalised rankings, private profiles, assessment results and counselling records remain authenticated and non-indexable.

Golden Search results should progressively support:
- lexical search;
- semantic search;
- filters;
- entity relationships;
- compare mode;
- evidence/explanation panels;
- personalised ranking;
- saved lists;
- next-step actions;
- deep links into assessments, counselling and Golden Path.

## 5. Trust and ranking policy

Organic search/discovery relevance must not be secretly altered by commercial payment.

Sponsored placements, institutional partnerships or paid opportunities must be clearly labelled and technically separable from organic ranking.

The system should explain important recommendations in user-readable language and, where feasible, expose the main factors that influenced a recommendation.

For minors, privacy, consent, age-appropriate UX and data minimisation take priority over monetisation.

## 6. Revenue architecture

Golden Talent should use multiple complementary revenue streams rather than depend on one purchase event.

### B2C
- freemium discovery/search;
- premium assessment/report packages after validation;
- Golden Path subscription;
- counselling sessions and packages;
- premium planning and tracking features;
- family/parent insight products where appropriate.

### B2B / B2B2C
- school subscriptions;
- counsellor/professional workspace licences;
- cohort dashboards and reporting;
- implementation/training packages;
- white-label or institution-branded deployments only if they preserve product integrity;
- API/data services only where legally, ethically and contractually appropriate.

### Ecosystem revenue
- clearly labelled sponsored opportunities;
- verified institutional partnerships;
- referral/lead arrangements only with transparent disclosure and privacy safeguards;
- premium marketplace services where evidence of quality can be maintained.

Revenue must never require selling sensitive student profiles or compromising organic recommendation integrity.

## 7. Growth loop

The preferred growth loop is:

Public knowledge page → search discovery → free Golden Search / useful tool → account → assessment/evidence profile → personalised Golden Path → counselling or premium action → outcome tracking → better first-party insight → stronger content and product → more discovery.

The website and apps therefore reinforce each other instead of competing for the same user journey.

## 8. Multi-platform release contract

Every feature is classified as one of:
- **Shared Core**
- **Web/PWA only**
- **Native-specific**
- **Experimental**

Shared Core features require compatibility review across Web/PWA, Android/Bazaar and iOS.

API changes must be backwards-compatible for supported mobile versions whenever practical. Native binaries may require store releases; content, configuration and eligible feature flags should be server-driven when this improves consistency without violating platform policies.

## 9. App presence on the website

The website will include a **Golden Talent Apps** surface.

Current/real availability must be represented truthfully:
- Web/PWA: active when installability is verified;
- Android/Bazaar: “Coming Soon” until a real listing exists;
- iOS/App Store: “Coming Soon” until a real listing exists;
- Desktop PWA: active when installability is verified.

No fake store URLs, ratings, download counts or application structured data are permitted.

After publication, verified store URLs, official badges, deep links and SoftwareApplication structured data may be added.

## 10. Search/SEO contract

The website remains the canonical public discovery layer.

Golden Search should create high-quality public knowledge surfaces only when they are genuinely useful and sufficiently substantive. Thin programmatic pages, doorway pages and mass-generated low-value content are prohibited.

Public knowledge should be:
- crawlable where appropriate;
- internally linked;
- citation-ready;
- entity-based;
- bilingual when quality can be maintained;
- connected to relevant author/source evidence.

Private application surfaces remain noindex and excluded from public search feeds.

## 11. Product moat

The target moat is not “having more tests”. It is the combination of:

1. evidence integration;
2. longitudinal user history;
3. local educational context;
4. trusted knowledge graph;
5. explainable recommendations;
6. human counselling integration;
7. parent/teacher/counsellor role views;
8. cross-platform continuity;
9. high-quality bilingual public knowledge;
10. proprietary outcome data accumulated ethically over time.

## 12. Competitive benchmark

Golden Talent should continuously benchmark against leading categories including aptitude-driven guidance, school/career readiness platforms, destination-planning systems, counselling platforms and career knowledge/search products.

The strategic goal is not to copy any single competitor. It is to combine the strongest proven category capabilities with a context-sensitive Iranian-first product and a path to internationalisation.

## 13. Release gates for v1.1

A public native v1.1 release must not be declared production-ready until the relevant gates are satisfied:

- production authentication/backend;
- role-based authorization;
- privacy and consent flows;
- account deletion/data rights;
- secure storage and transport;
- validated assessment claims for any scored instrument;
- clear distinction between experimental and validated modules;
- payment/store compliance;
- crash/error monitoring;
- analytics with privacy safeguards;
- accessibility QA;
- Android/Bazaar packaging and review readiness;
- iOS/App Store review readiness;
- verified deep-link/app-link behaviour;
- tested data compatibility across Web/PWA/native clients.

## 14. Strategic north star

Golden Talent should become the place where a learner, parent, teacher or counsellor can ask:

> “Given who this learner is, the evidence we have, the available pathways, and the current context, what should we explore or do next — and why?”

The product wins when it becomes a trusted recurring decision environment, not merely a one-time assessment purchase.
