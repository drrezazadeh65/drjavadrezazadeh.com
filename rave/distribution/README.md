# RAVE autonomous distribution — initial foundation

This is a platform-neutral **draft and queue generator**, not a live publisher.

## Required future integrations
- X, Facebook Pages, LinkedIn, YouTube and Aparat: independently approved and authenticated official APIs; do not scrape or bypass service controls.
- YouTube/Aparat publication requires genuine approved video media, metadata and upload authorization. A text article alone cannot be posted as a video.
- Queue scheduler: idempotent job IDs, rate limits, per-channel windows, retry with exponential backoff, dead-letter tracking, and publication receipts.
- Content: verified article metadata, explicit publication approval, bilingual locale-specific canonical links and campaign tracking.
- Backlinks: legitimate earned mentions, editorial pitches and opted-in partnerships; never buy or manufacture spam links.
- Reporting: track posted URLs, referral visits and conversion aggregates; respect consent and privacy.

## Automation authority
Approved evergreen content may be scheduled under a predefined channel policy once accounts are connected. New scholarly claims, direct unsolicited outreach, paid promotions, platform-specific terms-sensitive actions and spending require explicit review.

## Hosting portability
GitHub Actions may prepare schedules and store non-sensitive artifacts. Private API credentials and customer data require secure storage; adapters should be deployable on a future independent server. Cloudflare Workers is not required.
