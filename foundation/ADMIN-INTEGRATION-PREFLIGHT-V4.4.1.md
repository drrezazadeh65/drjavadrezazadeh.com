# Admin integration preflight — non-destructive policy (v4.4.1)

Status: REQUIRED BEFORE ANY ADMIN INTEGRATION. This document is a policy and checklist, not proof of a completed audit.

## Scope
Compare the existing production website, all existing admin interfaces, GitHub main source, Cloudflare Workers/D1 bindings, and isolated feature modules before wiring anything together. The live implementation wins unless a replacement demonstrates better correctness, security, accessibility, maintainability, and compatibility.

## Inventory requirements
For each current and proposed feature, record: stable route; locale; owner; UI component; data source; API contract; authentication and authorisation boundary; D1 table/migration; cache and privacy policy; SEO/schema/OG outputs; integration dependencies; current release state; and evidence link. Classify as KEEP_EXISTING, ENHANCE_EXISTING, MERGE, ADD_NEW, DEFER, or RETIRE_WITH_APPROVAL. Unknown evidence is UNKNOWN, never DONE.

## No-conflict gates
1. Compare actual deployed routes and main-branch implementations with the feature branch before editing. Preserve /fa/, /en/, canonicals, hreflang, sitemap and public URL manifest.
2. Identify duplicate dashboard pages, endpoint names, tables, service identifiers, event names, and overlapping schema emitters. One authoritative writer per business event.
3. Protect existing accounts, orders, invoices, entitlements, payment callbacks, refunds and audit trails. No production D1 schema or data mutation without reviewed migration and backup/rollback.
4. Email-only account verification/recovery. Never authenticate by telephone. Purchaser-only Eitaa disclosure requires a server-enforced entitlement.
5. Keep academic identity prominent. Never fabricate prices, research metadata, ratings, verified gateway transactions, emails or indexing.
6. Keep Cloudflare/GitHub Pages only. Do not restore Vercel, Neon, or disconnected providers.
7. Preview and synthetic fixtures first; compare old and proposed flows with regression and negative-path evidence; require owner approval before production deployment.
8. Every integration must document feature flags, rollback procedure, data compatibility, and observed live verification after deployment.

## Initial evidence-backed candidates (not integration approvals)
- 27 service pages (21 standard + 6 VIP) already have detailed routes and images in main: KEEP_EXISTING pending feature comparison.
- Existing source-level SEO gates, canonical and breadcrumb/schema coverage: KEEP_EXISTING pending review.
- Isolated Schema/OG engine and registry: MERGE_CANDIDATE only; not wired and type-policy mismatch must be resolved.
- Offline purchase lifecycle, customer dashboard projection, fulfilment and entitlements: MERGE_CANDIDATE only; live identity/payment and ownership contracts not proven.
- Cloudflare commerce readiness, gateway reconciliation and durable email-linked orders: BLOCKED until independent operational evidence.
- New admin command centre: PLAN_ONLY until existing admin route/component inventory and UX comparison are complete.

## Acceptance
No production merge or live release unless the inventory is signed off, collision report is clear, source and runtime security gates pass, and rollback is documented.
