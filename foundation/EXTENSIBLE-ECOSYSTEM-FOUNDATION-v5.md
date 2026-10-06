# Extensible Ecosystem Foundation — v5.0

**Status:** FROZEN EXTENSIBLE BASELINE  
**Machine source of truth:** `platform/ecosystem-registry.json`

The ecosystem must be able to grow without turning each new page, product, assessment, role, research workflow or publishing surface into a special case. Expansion therefore occurs through explicit contracts rather than ad-hoc code.

## Architectural invariants

1. Public discovery, private application state, API authority, data persistence, scholarly publishing and research exports remain separate bounded contexts.
2. A new feature is OFF by default and cannot become indexable merely because a page exists.
3. Private or authenticated features are NOINDEX, excluded from sitemaps and NO_STORE.
4. Browser state is never authoritative for identity, roles, entitlements, assessment release, payment success or professional decisions.
5. Database migrations are append-only and numbered. Destructive evolution requires an explicit migration and rollback plan.
6. APIs use explicit major-version boundaries and should remain backward-compatible by default.
7. Persian and English are first-class locales. The root remains a neutral user-controlled language gateway.
8. Stable URLs and identifiers are treated as durable assets.
9. Mobile application architecture is a progressive enhancement of semantic web content, not a separate fragile mobile site.
10. Confidential unpublished projects do not place their names or metadata in the public repository's route/navigation/schema/sitemap registries.

## How to add a future module

Before implementation, register its feature ID, owner surface, lifecycle state, data class, authentication policy, index policy, cache policy, locale strategy, API contract, observability class and rollback plan. Then build behind that contract.

A public feature reaches INDEX only after factual verification, substantive content, canonical/index decisions, schema, accessibility, performance, privacy and release review.

A private feature reaches production only after real authentication, server-side authorisation, consent where applicable, auditability, NO_STORE/NOINDEX enforcement, failure states and recovery planning.

## Scale direction

The architecture deliberately supports later movement from the present static public deployment to a split public-web + private-app + versioned-API platform, while retaining the same route, content, evidence, role and privacy contracts. This allows future provider changes without rewriting the conceptual system.
