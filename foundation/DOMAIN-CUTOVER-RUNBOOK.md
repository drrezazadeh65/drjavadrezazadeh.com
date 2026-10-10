# Production Domain Cutover Runbook — Bertina

## Current target
- Public origin: `https://drjavadrezazadeh.com`
- DNS: Bertina authoritative nameservers
- Web origin: Bertina Linux hosting
- Runtime: Apache/PHP
- Data: Bertina MySQL
- Email: Bertina domain mail

## Cutover checks
1. Confirm authoritative DNS resolves to the Bertina origin.
2. Install and validate the purchased trusted TLS certificate for the apex and `www`.
3. Verify normal HTTPS without certificate bypass.
4. Enable permanent HTTP→HTTPS redirect only after trusted TLS is valid.
5. Verify `/fa/`, `/en/`, private/noindex routes, `robots.txt`, `sitemap.xml`, custom 404 and security headers.
6. Verify legacy one-hop 301 redirects from `.htaccess`.
7. Verify `/api/health` and keep auth/commerce disabled until MySQL/mail/payment configuration passes.
8. Preserve rollback evidence and the immutable migration freeze branch.
