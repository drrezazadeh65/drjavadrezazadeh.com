# RAVE measurement contract v1 — privacy-first, portable

## Measurement objective
Report which **content, services and acquisition channels** lead to qualified interest, checkout and verified revenue. Do not claim to identify anonymous visitors. Counts are estimates affected by consent, blockers, attribution windows and incomplete provider data.

## Event schema
Fields: schema, event_id, event_name, occurred_at, page_path, locale, service_id, content_id, channel, campaign, consent, source_system, order_reference, value_minor, currency. All identifiers are optional except event_id, event_name, occurred_at, source_system and consent. Do not place emails, phone numbers, names, IP addresses, full URLs with query parameters, or user-agent fingerprints in events. Never emit order_reference in client analytics; backend only.

Allowed event names: page_view, article_view, service_view, service_cta_click, registration_started, registration_completed, checkout_started, payment_verified, refund_verified, newsletter_opt_in. Only trusted server-side payment reconciliation can produce payment_verified/refund_verified.

## Trust and privacy
- Consent required for non-essential browser analytics; consent state must be enforced before event collection, not merely stored as a label.
- For minors, apply heightened privacy protections and applicable local requirements.
- Client-reported sales events never count as revenue. Never trust client-submitted prices.
- Do not place raw customer data or identifiable event logs in the public GitHub repository or GitHub Actions artifacts.
- Use aggregation with minimum group size and suppression of small cohorts before exporting public reports.
- Store pseudonymous session identifiers, if later needed, only with legal review and explicit retention rules; no fingerprinting.
- Separate internal service IDs from stable public URLs; map IDs using a versioned service catalogue.
- A future private storage adapter will enforce RBAC, encryption, retention, access logging and deletion requests.

## Attribution
Prefer aggregate source/medium/campaign plus landing page and service ID. Record 'direct/unknown' rather than fabricating a source. Report observed conversions and attribution limitations separately; no assertion that all conversions were caused by a campaign.

## Dashboards
- Acquisition: channel, campaign, landing page, content category, language.
- Demand: service views, CTA clicks, checkout starts, verified purchases, refunds.
- SEO: Search Console impressions, clicks, CTR and query/page cohorts.
- AI visibility: reproducible sampled prompts, citation URL, date and model; not universal AI rankings.
- Revenue: verified net amounts from payment backend, aggregated by service; no personally identifying customer information.
