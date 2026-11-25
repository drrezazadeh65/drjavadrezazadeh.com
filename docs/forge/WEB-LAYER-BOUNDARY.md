# JREI Forge commercial web layer — source preview

This branch contains the public-facing website design only. All Forge engines, Qwen, models, private knowledge, credentials, SQLite and execution remain on owner-controlled devices. No engine source or private runtime configuration is included here.

Routes proposed: /fa/forge/, /en/forge/, and matching /workspace/ previews. All are noindex until owner-approved release. No changes to existing routes, navigation, sitemaps, service worker, checkout, or deployment workflows.

The workspace is illustrative, not an operational dashboard. No form collects data, no API endpoint is exposed, no payment or registration is enabled. Plan labels are proposals, not offers. Before publication: verify mobile/accessibility/browser rendering, owner approval of permanent URLs, accessibility and privacy copy, actual capability claims, and SEO metadata. At activation use the site's existing account and billing infrastructure after appropriate acceptance, not a parallel system.

Future architecture: public browser -> authenticated website backend -> scoped job API -> owner-approved local Forge runtime. Use per-tenant authorisation and isolated job workspaces, durable job IDs, timeouts, quotas, authenticated outbound polling or equivalent secure transport, and sanitized receipts. Never expose the local owner panel, model endpoint, secrets, or private database directly. No API is implemented by this source-only branch.

Production release is separate and requires the existing owner-authorised deployment workflow. Do not deploy this branch directly. No tests or workflows were intentionally run in this source-only step.
