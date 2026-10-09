# RAVE Infrastructure Contract — 2026-10-09

## Binding infrastructure rules
- Public website hosting and publication: GitHub Pages.
- Cloudflare: **Workers only**, for explicitly approved backend/API workloads.
- Cloudflare DNS: **not used**. Never presume nameservers, DNS management, or domain routing are managed through Cloudflare.
- Cloudflare CDN, Pages, R2, D1, Queues, KV, and other Cloudflare products: **not approved** merely because Workers is used.
- Vercel and Neon: retired; do not reintroduce.
- Existing DNS provider must be verified from authoritative evidence before any DNS instructions or changes.
- Existing production payment and email integrations must not be altered by RAVE without separate review.
- GitHub Pages canonical URLs, redirects, sitemap, and bilingual /fa/ and /en/ SEO architecture must remain stable.

## RAVE release policy
RAVE runs in observation-only mode initially. No paid advertising, autonomous external messaging, publishing, production edits, or changes to billing, customer data, DNS, and authentication without explicitly scoped authorization. New functionality is developed and tested on a feature branch, then reviewed before production merge.
