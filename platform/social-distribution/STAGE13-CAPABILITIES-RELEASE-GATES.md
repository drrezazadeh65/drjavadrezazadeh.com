# Stage 13 — official channel capability and launch gates
Reviewed: 2026-10-12. Source: recovered PR #50; canonical working branch `migration/bertina-linux6`.
**Publication is disabled by default. All connection flags are UNVERIFIED until a private account-specific test returns a trustworthy receipt.**
## Eight required channels
| Provider | Official mechanism | Eligibility and policy boundary | Current product status |
|---|---|---|---|
| Instagram | Meta Instagram content publishing API, supported professional accounts | Two official setups: Instagram API with Facebook Login requires a linked Page; Instagram API with Instagram Login uses professional account scopes without a required linked Page. Verify each eligible media format; caption links generally not clickable | Composition and OAuth-start helpers only; **not connected** |
| Facebook | Meta Pages API and page access tokens | Pages with appropriate tasks and approved `pages_manage_posts`; never assume personal-profile posting | OAuth-start helper only; **not connected** |
| X | POST `https://api.x.com/2/tweets` | User-context OAuth2 write permission, paid API budget/rate controls and returned post ID; media separate | Composition and OAuth-start helpers only; **not connected** |
| Telegram | Bot API `sendMessage` | Bot administrator of destination channel, securely configured token and channel ID; returned `message_id` | Text adapter in source; **not live verified** |
| Eitaa | EitaaYar `/api/app/sendMessage` | Private token and destination authorization; published EitaaYar example documents user-granted messaging, not independently verified channel broadcast. `ok:true,result:success` is NOT an individual post ID | Text adapter in source; **not live verified** |
| Aparat | Manual upload by account owner pending independent official API access confirmation | Video copyright, captions and destination channel; do not scrape/password-automate uploads | **Manual pack only** |
| WhatsApp Business | Meta Cloud API messages | Opt-in + approved business template and recipient-specific policy; **not public-feed/Status publishing** | Consent-gated design; **disabled** |
| YouTube | Data API `videos.insert` with `youtube.upload` OAuth scope | Actual video, user-authorized `youtube.upload` scope and processing checks; official YouTube documentation flags private-only uploads for some unverified API projects, so verify project audit and resulting video privacy status | OAuth-start helper only; **not connected** |
Sources: https://developers.facebook.com/docs/instagram-platform/ ; https://developers.facebook.com/docs/pages-api/ ; https://docs.x.com/x-api/posts/create-post ; https://core.telegram.org/bots/api ; https://github.com/eitaa/Documentation/blob/main/docs/Develop/SendMassage.md ; https://www.aparat.com/ ; https://developers.facebook.com/docs/whatsapp/cloud-api/ ; https://developers.google.com/youtube/v3/docs/videos/insert .

## Publish state machine / evidence
- `discovered -> draft -> human_approved -> scheduled -> leased -> publishing -> confirmed`; exceptions: `rejected`, `needs_manual_upload`, `provider_error`, `uncertain_requires_reconciliation`, `revoked`. Do not transform uncertain into retry without an owner-confirmed provider-side absence.
- Approval must bind `canonical URL + provider + account ID + exact body digest + approved assets + schedule` and include actor/time. PR #50 Node proof currently covers one configured destination per text adapter; production multi-account orchestration still requires durable MySQL state.
- Store tokens and PKCE verifier only in a private server vault, encrypted and access-restricted. OAuth callback must be same-origin, protect state against CSRF, bind to a recent MFA-admin session, consume once and exchange code server-side. Never request social-network passwords.
- Source content: only public self-canonical, indexable /fa/ or /en/ pages. Approval is invalidated by any text/media change. Source content must not contain student, donor or order private fields.
- Scheduler: timezone-aware UTC timestamps, host cron, account-specific quotas, lock/lease/unique dedupe, retry only proven-not-sent; no GitHub Actions scheduling used as a guarantee.
- Receipt: provider ID/URL when returned; for Eitaa `confirmedBy=eitaayar_success` without inventing `providerId`; manual uploads remain unconfirmed until verifiable proof.
- Analytics: UTM on social links, but never add UTM to canonical tags; show observed clicks/provider metrics with provenance and observed time. Missing metrics are `NULL`, never invented zeros.
- Manual fallback: download/copy approved per-provider title, caption, hashtags, canonical tracking URL and rights-cleared media; open the official website, let owner post, then record the real URL and verify it before marking confirmed.
- WhatsApp Business is recipient consent messaging, not mass social publishing; no sending to unconsented phone numbers. Facebook personal profiles, Instagram personal accounts, and unverified Aparat API remain manual only.

## Safe transition from PR #50
Recovered into the canonical repository: Node engine, content/discovery, per-provider editorial rules, initial OAuth request generation and validation, media-planning policy, Persian account guide, CI and tests. The unprotected `dashboard-preview.html` was deliberately NOT made part of public production. The customer dashboard file from the historical PR was deliberately not overwritten. The default-branch history is NOT the deployment source.

## Preserving approved posts when provider APIs are unavailable

The guarded MySQL claim function `socialQueueClaim()` is intentionally limited to Telegram and Eitaa **text-adapter paths**, and no public dispatch worker is enabled. A scheduled Instagram, Facebook, X, WhatsApp Business, YouTube or Aparat item is **not** a failed or revoked publication merely because there is no approved automatic adapter. It remains in its existing approved, scheduled source state until an authorized operator selects the appropriate manual pack or a separately audited official API implementation.

When an enabled text-adapter candidate's approved content, connected account authorization or media rights change, the existing hash-bound state machine can still revoke that candidate before publication. Unsupported earlier scheduled items must not starve eligible Telegram/Eitaa items or produce fabricated dispatch attempts. The regression is an isolated MySQL workflow test, **not a live publish receipt**. WhatsApp remains opt-in business messaging, not public broadcast.

## Release acceptance checklist
1. Confirm production SSL/TLS trusted; current release checksum, protected MFA admin and real Bertina MySQL migrations.
2. Implement account inventory and encrypted provider token persistence behind /api/admin/social/, with server-side scopes/expiry/revocation, and admin-only tabs in existing console.
3. Verify one public article's feed and metadata, proper platform-specific draft, media rights and explicit approval.
4. Approve one destination at a time; record durable unique idempotency key, atomic claim and private audit before outbound traffic.
5. Pilot send on Telegram/Eitaa with owner permission and real confirmation; verify no duplicates during concurrent cron/replay or uncertain provider responses.
6. Add approved OAuth exchange/provider publishing for Meta, X, YouTube only after official developer authorization; manual fallback for unsupported providers.
7. Monitor provider errors, UTM events, actual audience metrics and consent retention. No fake performance statistics.
8. Test mobile RTL/LTR, screen readers, 320px/390px and desktop in the real protected console; verify no new public routes, broken canonical or private-page indexing.
Until gates 1–8 pass, mark stage 13 **SOURCE-ONLY / NOT PRODUCTION COMPLETE**.

## API documentation review, 2026-10-12
- Meta officially offers **Instagram API with Instagram Login** (professional businesses/creators, scopes such as `instagram_business_content_publish`) as well as **Instagram API with Facebook Login** (professional account linked to Facebook Page). The historical PR #50 code implements only an initial OAuth request for the Facebook Login route. Do not require every Instagram account to link a Facebook Page when selecting the direct Instagram Login route, and do not claim direct login is implemented yet. https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
- Eitaa official developer text documents an EitaaYar *message to authorized user*, with `ok:true, result:success`; approval for channel posting must be tested separately rather than inferred from its message example. https://github.com/eitaa/Documentation/blob/main/docs/Develop/SendMassage.md
- Telegram **Bot API** `sendMessage` returns a Message on success; store its actual `message_id`. Telegram MTProto `messages.sendMessage` is a different authorization/protocol path and must never be conflated with the Bot API adapter. https://core.telegram.org/bots/api
- YouTube `videos.insert` requires user authorization and media, and can be subject to the API-project audit/private-upload restriction described in its official resources documentation. https://developers.google.com/youtube/v3/docs/videos
