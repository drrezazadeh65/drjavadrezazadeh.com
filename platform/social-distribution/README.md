# AWOSE Social Distribution Engine — v0.1

**Status (12 October 2026): PR #50 recovery into canonical `migration/bertina-linux6` source. Source-only; not connected to the authenticated live admin dashboard; no provider publication confirmed. Live publishing remains disabled pending private configuration, explicit per-post approval and integration validation.**

## Objective

An owner-controlled, mobile-first publication engine embedded in the existing protected site management dashboard. No WordPress dependence. Every verified website article can become one campaign with distinct delivery copy, media, schedule and receipt per platform. Social promotion never changes the canonical URL or guarantees SEO rankings.

## Blog2Social benchmark

Target features: RSS/new-published-content discovery, per-channel posts and templates, scheduling, calendar, network collections, image/media selection, Stories/Reels/Shorts, evergreen re-share, optional editorial approval, UTM attribution, analytics, audit and multi-account permissions.

## Platform integration matrix

| Network | Planned native formats | Implementation state and prerequisite |
|---|---|---|
| Telegram | Channel text, image, video, album | **Text publishing adapter implemented**; official Bot API token + channel admin permission required |
| Eitaa | Channel text, image where supported | **Text publishing adapter implemented**; EitaaYar API token and channel access required |
| Instagram | Feed/carousel, reels, eligible stories | Design only; verified Meta professional account/app scope, check Stories API eligibility |
| Facebook | Page posts, images, video, eligible stories | Design only; verified Meta Page publishing permissions |
| X | 280-char basic posts, approved paid extensions | Design only; official user OAuth + developer billing and cost limits |
| WhatsApp Business | Opted-in, policy-compliant approved message templates | Design only; not a general social public feed or unverified Status publisher |
| Aparat | Video, cover, description and tags | Design only; verify supported current upload API / authorization |
| LinkedIn | Academic/professional posts | Design only; approved scopes |
| Threads | Network-native short posts | Design only; official app permissions |
| YouTube | Videos and Shorts | Design only; upload quota, processing and official API |

Never use browser automation to evade API restrictions, publish to private recipients without permission, collect social passwords, or infer that every Stories or WhatsApp Status feature supports direct API publication.

## Protected dashboard contract

Navigation module: رسانه‌ها و انتشار اجتماعی.

Display only one tab at a time on mobile and desktop: overview; campaign composer; publication calendar; images/stories; account connections; delivery queue; performance; safety/audit. A real backend must enforce existing session, RBAC, CSRF and server-only token vault. Do not place secrets in public HTML, JavaScript, the Git repository or browser localStorage. The actual management page must not be exposed as a public GitHub Pages route.

Lifecycle: discovered → editorial review → approved → scheduled → dispatching → confirmed. Additional states: rejected, disabled, provider error, manual-review-required, revoked. Each delivery has a persistent idempotency key and actual provider confirmation, not fabricated metrics.

Persistent database contract:
- social_account(id, provider, external_id, scopes, token_secret_reference, expires_at, status)
- social_campaign(id, source_canonical, language, taxonomy, editorial_state, approved_by, approved_at)
- social_asset(id, campaign_id, media_type, usage_rights, hash, width, height, bytes, alt)
- social_delivery(id, campaign_id, account_id, format, body, asset_id, schedule_utc, time_zone, status, dedupe_key, provider_id)
- social_attempt(id, delivery_id, occurred_at, http_status, result, error_code)
- social_metrics(delivery_id, captured_at, views, engagement, clicks, source), with missing figures represented as NULL.

## Working code (v0.1)

Node.js >=20; module engine.mjs, unit tests engine.test.mjs. It:
- reads the site's existing /feed.xml and approved news in /sitemap-news.xml, enriches only publicly accessible self-canonical /fa/akhbar/ and /en/news/ pages, prioritises news ahead of evergreen feed items;
- adapts copy size and adds UTM tracking links without altering canonical;
- provides dry-run preview; protects publication with two independent environment flags;
- checks source page 200, indexability and canonical before publishing;
- respects 21:00 Asia/Tehran, applies a per-day cap;
- publishes text to official Telegram Bot API or EitaaYar when server credentials are set;
- records a persistent receipt and avoids blind retries of ambiguous provider outcomes.

The feed is currently a manually maintained snapshot and needs automatic editorial-feed refresh. The engine has **not yet implemented photo, Story, Reel or video publishing**, external analytics or direct production-dashboard binding.

Server-only environment:
SOCIAL_CHANNELS=telegram,eitaa
SOCIAL_ENGINE_ACTIVE=0
SOCIAL_PUBLISH_APPROVED=0
SOCIAL_STATE_PATH=/private/absolute/path/social-state.json
SOCIAL_TELEGRAM_BOT_TOKEN=(set privately)
SOCIAL_TELEGRAM_CHAT_ID=(set privately)
SOCIAL_EITAA_TOKEN=(set privately)
SOCIAL_EITAA_CHAT_ID=(set privately)
SOCIAL_POSTS_PER_DAY=1
SOCIAL_PUBLISH_HOUR=21

Command: node platform/social-distribution/engine.mjs --preview
Command: node platform/social-distribution/engine.mjs --publish

Only the explicitly approved --publish command with both activation flags, an absolute persistent private state path, a matching scheduled hour and connected official APIs can transmit. A cron trigger should run at 21:00 on a host using the Asia/Tehran timezone or at 17:30 on a UTC host. Verify the cron timezone and Node availability on Bertina first. GitHub Actions scheduled workflows can be delayed and must not be represented as exact-time infrastructure.

## Media and copy policy

Profiles will define live platform-specific verified character/media constraints, file sizes and account eligibility. A later media worker must prepare 1:1, 4:5, 16:9 and 9:16 derivatives, rights, captions, alt text, video codecs, subtitles, and provider-specific upload lifecycle. Do not render text into photographic previews when a proper native caption is supported. Sensitive academic/research claims require human review before social amplification.

## Minimum production release gates

1. Verify authenticated owner admin shell and private persistent backend storage.
2. Verify incoming feed includes only approved released public site pages.
3. Connect selected accounts via approved authorization, with the user in control.
4. Pass per-adapter integration tests with one owner-approved public article and check genuine provider post IDs.
5. Confirm no duplicates, limits, retry safety and analytics tracking.
6. Enable account-by-account after consent, never activate everything globally.
7. Keep academic identity first, public SEO URLs intact, no private student/sponsor info, no purchaser-only Eitaa support link.

Official/background:
- https://wordpress.org/plugins/blog2social/
- https://www.blog2social.com/en/faq/content/3/72/en/how-do-i-auto_post-and-auto_schedule-blog-posts-on-social-media-with-the-auto_poster.html
- https://core.telegram.org/bots/api
- https://www.postman.com/meta/whatsapp-business-platform/overview
- https://developer.twitter.com/
