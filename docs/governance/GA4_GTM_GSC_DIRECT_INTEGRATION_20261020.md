# Google Search Intelligence — GA4 + GSC + GTM Integration (2026-10-20)

## Release posture

Source-only implementation on `migration/bertina-linux6`. **No production deployment, no GTM Publish, no credentials and no schema migrations.** Preserve owner-controlled `.github/workflows/deploy-bertina.yml`. This document is not evidence that Google Analytics has collected site traffic.

## What already existed and is reused

- Existing one-time lazy analytics entry point: `assets/js/site.js` → `assets/js/site-extras.js` → `assets/js/analytics-adapter.js`; no per-page snippet added.
- Existing `platform/analytics-config.json`, its public projection `assets/data/analytics-config.json`, `scripts/build-public-data.mjs` and `scripts/analytics-contract-audit.mjs`.
- Existing `JR_CONVERSION_INTENT` browser event and allow-listed `platform/observability-policy.json`.
- Owner-only MFA Operations Control Center, Search Console private snapshot projection and keyless GSC workflow.

No GTM Web Container ID (`GTM-...`) or active GTM snippet was found in the branch inspection. Google Tag `gtag.js` existed only in the dormant adapter; the new prepared transport eliminates it. Do not invent a GTM Container ID.

## Owner-supplied Google identifiers

- GA4 account: JR Website Analytics.
- GA4 property: `properties/559754204` (GA4 Data API).
- GA4 web Measurement ID: `G-C3C7NQQNWX` (browser configuration).
- GA4 Web Stream: `16165062932`.
- Website: `https://drjavadrezazadeh.com/`.
- Search Console URL-prefix property: `https://drjavadrezazadeh.com/`.
- Google Cloud project: `jr-search-intelligence`; project number `301218972490`.
- Existing keyless GitHub WIF service account: `jr-search-console-reader@jr-search-intelligence.iam.gserviceaccount.com`.
- **GTM Web Container ID: owner action required; not yet known.**

The service account currently has **GA4 Administrator** granted by the owner. No privilege was changed. For ongoing read-only Data API verification, a **Viewer** role may suffice after a successful scoped test; do not revoke owner-approved Admin access automatically.

## API verification architecture

Existing `.github/workflows/google-search-console-sync.yml` is **extended**, not replaced. GSC retains `webmasters.readonly` on its job. The GA4 job independently acquires another short-lived keyless OIDC access token, this time with `https://www.googleapis.com/auth/analytics.readonly`, then reads:

1. `GET https://analyticsdata.googleapis.com/v1beta/properties/559754204/metadata` and checks required metrics.
2. `POST https://analyticsdata.googleapis.com/v1beta/properties/559754204:runReport` (last seven completed days, `activeUsers`, `eventCount`, `limit=1`).

A valid 200 response with no rows means `authenticated_empty_report`, **not an authentication failure** or proof of zero traffic. Neither raw metric values nor property-user data are logged. **Live GA4 success requires inspecting the new Actions job**; an enabled Google Cloud API or owner-provided GA4 property ID does not prove actual access.

Prior GSC owner-observed workflow #5 established real read-only API HTTP 200 for Search Analytics, seven sitemap records and a structured URL Inspection result. API response success alone does not certify that URLs are indexed or that the traffic/analytics tag is installed.

## GTM setup — owner side (do not publish)

1. Open https://tagmanager.google.com/ and check that no Web Container exists for this domain. If absent, create **one** account/container for `drjavadrezazadeh.com`, platform **Web**. Send developer the exact `GTM-XXXXXXXX` Container ID and Container details screenshot. **Do not install Google's copied page snippet** because this repository already has a single consent-gated loader. **Do not click Submit/Publish**.
2. Create one **Google tag** in GTM with tag ID `G-C3C7NQQNWX` (do not confuse with `GTM-...`). Enable consent checks: `analytics_storage` required; advertising storage and personalization denied. Configure **`send_page_view=false`** and prohibit arbitrary pageview tags/History Change triggers. On the GA4 Web Stream, review Enhanced Measurement's pageview/history-change behavior; turn off automatic pageview/history measurement if it would duplicate manual tracking. Do not disable unrelated enhanced-measurement features until reviewed.
3. Use GTM **Custom Event** triggers mapped to this site's prefixed `dataLayer` event names, **not** to all clicks or checkout URLs:
   - `jr_page_view` → GA4 `page_view`; map only the event's sanitized `page_location`, `page_path`, `page_referrer` (empty string) and `jr_locale`.
   - `jr_intent` → GA4 `jr_intent`, custom allow-listed `intent_key`, `jr_surface` and `jr_target_kind`. Do not treat this as a purchase or a confirmed lead.
   - `jr_view_item` → optional GA4 `view_item` after a public product hook is implemented/tested; no private item or customer fields.
   - `jr_begin_checkout` → optional GA4 `begin_checkout`, **intent only**; no purchase conversion tag or order ID from checkout query strings.
4. **Do not create browser-driven `purchase`, `sign_up`, `generate_lead` or `newsletter_subscribe` completion triggers yet.** These remain blocked until first-party server confirmation and an approved consent/replay-safe event protocol exist. Payment status requires authoritative provider verification and event-ID idempotency; a return URL, cart click or thank-you page is not sufficient.
5. GTM has no automatic right to raw form submissions, assessment answers, student identity, personal profile, email/telephone, query strings, arbitrary page URLs, or session/order/payment tokens. No GTM `noscript` iframe is used: it would bypass the explicit browser consent gate. Avoid third-party templates/custom HTML tags pending independent audit.

## Existing adapter contract

`platform/analytics-config.json` remains `enabled:false` with `tag_transport:GTM_ONLY`, a real GA4 Measurement ID, and `gtm_container_id:null`. Public config is generated from canonical config; it contains no tokens or service account credentials. At this state there is **no tag installation or data transmission from this code**.

The optional analytics consent key is now `jr-analytics-consent-v2`. Earlier stored `jr-analytics-consent-v1` choices **do not** authorize the new GTM delivery path; users must opt in again. No new cookie or service-worker tracking state is created.

When the owner confirms the GTM container and test tags, change the one existing canonical config, regenerate the public projection, run audits and obtain explicit release approval. A future enabled adapter:
- Loads GTM **once** and **only after explicit analytics opt-in**, with default Google Consent Mode denied and advertising purposes denied.
- Offers bilingual allow/decline/reopen controls on safe public routes, never an assessment/private checkout/secure user area.
- Sends a single manually tagged page-view per normal page load, using a strict allowlisted public path with **no URL query, hash, freeform input or referrer**.
- Uses the existing conversion-intent bus but whitelists payload and drops unknown event keys, raw routes, PII and private pages.
- Stops future `dataLayer` analytics events after revocation; the container must also enforce tag consent requirements. Revoking tracking is not a retrospective deletion of previously processed GA4 data.

## GTM Preview and GA4 DebugView acceptance

Until the container is known and owner authorizes Preview, status is **NOT VERIFIED**. Before Publish:
- Desktop Chrome and mobile viewport: no GTM/GA4 network requests before opt-in; deny = no analytics hit.
- Opt-in shows exactly one GTM container, one GA4 Google tag and one `page_view` per public navigation in GTM Preview; all event values are redacted and have no query strings.
- Toggle consent off: no new GA4 hits. Toggle back on: no second GTM injection or duplicate pageview.
- Test Persian and English public paths and PWA navigation; explicitly verify **absence** of events on protected dashboard, assessment, login, and checkout URLs.
- In GA4 DebugView, confirm only preview/test page_view and safe `jr_intent` events; confirm no accidental purchase from an abandoned checkout.
- Validate network payloads, GTM tag sequencing, GA4 Measurement ID, consent storage and the public build/CI. Preview is not publication, and a successful preview is not evidence of production traffic.
- Only then ask owner for separate explicit approval to Publish the GTM Container **and** deploy the source through the existing one-click Bertina workflow.

## Reporting and metric boundaries

- GSC: search impressions/clicks/search CTR/average search position; delayed, aggregated, sampled search performance, and URL inspection/sitemap *observations*.
- GA4: consented on-site user/event/session measurements, not a substitute for GSC; an empty runReport is not zero website visits.
- GTM: tag delivery and consent governance, **not** a reporting database or independent measurement provider.
- Existing mother database and MFA owner-only Operations Control Center remain authoritative; no separate customer IDs, new tracking database or public analytics dashboard is allowed. GA4 and GSC dated observations must be independently validated, source-labelled, freshness-controlled, and delivered through an authenticated private transport before showing them as current metrics.

## CI run #2132

Source `cb99cbb`; internal run `39393175178`. `policy-contract` passed, `full-preflight` cancelled during browser test approximately 188/215 at 2026-10-20 08:26:54 UTC. Workflow `.github/workflows/progressive-release-tests.yml` has `cancel-in-progress:true` grouped by branch; run #2133 started at 08:26:41 UTC. This is strong evidence of a newer push superseding the earlier run but not a categorical run-level cancellation attribution. Run #2136 (internal ID `39396140041`) passed both jobs on `826442b6...`. No test suite is disabled or release gate bypassed.

## Current acceptance status

- GSC authorized read-only API: **VERIFIED from owner-supplied workflow #5 summary**.
- GA4 API: **PENDING independent nondeploying OIDC job output**.
- GA4/GTM source wiring: **PREPARED; intentionally disabled**.
- GTM Web Container: **OWNER ACTION REQUIRED**, exact ID unknown; no GTM Preview or Publish performed.
- Website GA4 collection: **UNVERIFIED/INACTIVE from this source configuration**.
- GitHub nondeploying CI for latest integration commit: **NOT YET VERIFIED**.
- Production: **NOT DEPLOYED**.
