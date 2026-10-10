# Bertina migration runbook

Baseline: `freeze/host-migration-2026-10-10`  
Working migration branch: `migration/bertina-linux6`

## Safety invariants
- The frozen baseline is never edited.
- DNS/nameservers remain unchanged until the Bertina copy is verified.
- Only the sanitized `.public-site` artifact is published.
- Engineering/private directories are excluded from hosting.
- Existing public URLs, `/fa/` and `/en/` architecture, sitemaps, canonicals and noindex contracts remain unchanged.
- Cloudflare/Resend removal is a later backend migration step, not part of the first static-host cutover.

## GitHub environment/secrets required for deployment
Create an environment named `bertina-production`, then add:
- `BERTINA_FTP_HOST`
- `BERTINA_FTP_USERNAME`
- `BERTINA_FTP_PASSWORD`
- `BERTINA_FTP_REMOTE_DIR`

Do not commit credentials to the repository.

The expected remote directory for a normal cPanel primary-domain account is typically `/public_html/`; confirm it in cPanel before the first deploy.

## Cutover order
1. Run Bertina Migration Preflight.
2. Configure the four GitHub secrets.
3. Run Deploy to Bertina with confirmation `DEPLOY`.
4. Validate the Bertina copy before DNS cutover.
5. Enable/verify SSL for the domain on Bertina.
6. Change nameservers only after validation.
7. Verify 200/301/404 behavior, FA/EN, canonical, robots, sitemap, mobile, dashboard noindex and service worker.
8. Only then retire the previous hosting path.
