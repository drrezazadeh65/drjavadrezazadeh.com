# Stage 13 — official channel capability and launch gates
Reviewed: 2026-10-12. Source: recovered PR #50; canonical working branch `migration/bertina-linux6`.
**Publication is disabled by default. All connection flags are UNVERIFIED until a private account-specific test returns a trustworthy receipt.**
## Eight required channels
| Provider | Official mechanism | Eligibility and policy boundary | Current product status |
|---|---|---|---|
| Instagram | Meta Instagram content publishing API, supported professional accounts | App review, required scopes, media creation/publishing cycle, account/format eligibility; links in captions generally not clickable | Composition and OAuth-start helpers only; **not connected** |
| Facebook | Meta Pages API and page access tokens | Pages with appropriate tasks and approved `pages_manage_posts`; never assume personal-profile posting | OAuth-start helper only; **not connected** |
| X | POST `https://api.x.com/2/tweets` | User-context OAuth2 write permission, paid API budget/rate controls and returned post ID; media separate | Composition and OAuth-start helpers only; **not connected** |
| Telegram | Bot API `sendMessage` | Bot administrator of destination channel, securely configured token and channel ID; returned `message_id` | Text adapter in source; **not live verified** |
| Eitaa | EitaaYar `/api/app/sendMessage` | Destination permission, private token; `ok:true,result:success` is NOT an individual post ID | Text adapter in source; **not live verified** |
| Aparat | Manual upload by account owner pending independent official API access confirmation | Video copyright, captions and destination channel; do not scrape/password-automate uploads | **Manual pack only** |
| WhatsApp Business | Meta Cloud API messages | Opt-in + approved business template and recipient-specific policy; **not public-feed/Status publishing** | Consent-gated design; **disabled** |
| YouTube | Data API `videos.insert` with `youtube.upload` OAuth scope | Actual video, owner/channel permission, processing and privacy checks, granular quota; uploads from unverified apps can be restricted | OAuth-start helper only; **not connected** |
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
