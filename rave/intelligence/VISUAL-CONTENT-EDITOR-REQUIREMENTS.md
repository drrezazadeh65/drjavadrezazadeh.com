# Visual site text editor — binding product requirements (2026-10-09)

Status: specified, not implemented or deployed.

## Editorial coverage
All public-facing text must be editable in an authenticated admin UI: homepage hero, headings, paragraphs, CTA labels, navigation, footer, articles, bilingual service descriptions and deliverables, books, checkout copy, email templates where permitted, and alt text. Inventory every text-bearing component and migrate hardcoded strings into a versioned content registry with stable IDs, locale and fallback policy. No unexplained hardcoded exceptions.

## Interaction
WordPress-familiar content list, search, filters, visual inline editing, rich-text editing, drag-and-drop sections within approved templates, autosave drafts, side-by-side desktop/mobile previews, review, schedule, publish and rollback. Clearly distinguish draft from live; validate broken links and image references before publishing. Provide RTL Persian and LTR English editing with paired translations and translation-status indicators.

## Integrity and security
Email-based authenticated administrator accounts, least-privilege roles, audit logs, sanitization/XSS protection, CSRF protection, concurrency/version conflict detection, immutable revision history, backups, safe media uploads. No customer data or admin secrets in public static JSON. Public GitHub Pages output is built from approved published content through an authenticated deployment pipeline; private admin APIs require a separate secure backend.

## SEO ownership
Master SEO remains sole authority for canonical URL, hreflang, redirects, robots, sitemap and structured data. Editable SEO titles and descriptions pass through its validation, never through a competing SEO engine. Preserve /fa/ and /en/ routes and existing URLs.

## Acceptance tests
1. Edit homepage text and publish without source-code edits.
2. Edit Persian and English versions independently with translation status.
3. Preview unpublished changes; verify public site remains unchanged until publish.
4. Roll back a published edit and verify cache refresh.
5. Reject unsafe markup and unauthorized publishing.
6. Validate links, accessible headings, alt text and SEO metadata before publishing.
7. Confirm existing purchase and email flows remain functional.

## Delivery order
P0: content inventory, stable IDs, secure draft/publish workflow and basic rich-text editor.
P1: full visual inline editor, media library, translation pairing and scheduled publishing.
P2: reusable layout blocks, bulk editing, collaborative review and advanced editorial analytics.
