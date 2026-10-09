# Administration control plane — engine-separated, unified oversight
Date: 2026-10-09. Status: implementation specification; not a deployed interface.

## Core navigation
- Executive overview: aggregated KPIs, status, alerts and cross-engine drilldowns.
- Master SEO: indexation, canonical, hreflang, sitemap, schema, content SEO and diagnostics; Master SEO remains sole writer.
- RAVE: discovery, attribution, funnels, growth opportunities, analytics, experiments and reports; read-only against other engines unless explicitly authorized.
- Golden Talent: assessments, instrument versions, eligibility, workflows, reports, consent and controlled results.
- Commerce: catalog, orders, verified payments, refunds, invoices, discounts, stock where applicable.
- CRM: email-based contacts, customer journeys, purchased-service entitlements, support access and retention controls.
- Editorial CMS: inline page copy, articles, bilingual translation pairs, reusable sections, drafts and publishing.
- Media: upload, variants, accessibility, licensing, reference tracking and cache invalidation.
- Design studio: brand tokens, typography, colors, spacing, layout presets, component variants and responsive previews.
- Operations: roles, audit history, integrations, monitoring, backups, restores and deployment state.

## Every engine tab
Dedicated dashboard, configuration, data sources, actions, activity history, reporting, chart filters/export, access policies, health checks, safe rollback. Global search and deep links across modules.

## Design customization
Editable approved design tokens for fonts, color palettes, typography scales, RTL/LTR alignment, buttons, navigation, page blocks and chart appearance. Preview across desktop/mobile and Persian/English before publishing; contrast, accessibility, responsive and performance checks. Changes to critical security, payments, SEO or integrations require role-specific privileges and validation; 'all controllable' does not mean bypassing security or source-of-truth governance.

## Reporting
Live or explicitly freshness-labeled charts for traffic, SEO, service demand, conversion, orders, net revenue and Golden Talent outcomes. All KPIs declare provenance, currency, units, period and permissions. Customizable widgets, saved views, CSV export and scheduled email reports where lawful and configured. Missing data never masquerades as zero.

## Architecture
Modular admin UI with independent engine modules, shared authenticated shell and API contracts, role-based access, audit trails, versioned configuration and event-driven refresh. Public GitHub Pages remains static; private admin and customer data live only behind authenticated backend. No parallel SEO engine, duplicate payment truth, Vercel or Neon.

## Release phases
P0: authenticated shell, module navigation, CMS editing, media, safe publication, role-based controls.
P1: commerce, CRM, SEO and RAVE live integrations, Golden Talent module, dashboards.
P2: full design studio, advanced report builder, configurable workflows and delegated roles.

## Acceptance
Owner can independently edit any ordinary public-facing text, image and visual token, preview, publish and roll back; separately manage each engine; monitor verified transactions and source-labeled reports; without GitHub or ChatGPT. No route regression, data leakage, unauthorized mutation or broken payment/email flows.
