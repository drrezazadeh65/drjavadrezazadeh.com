# SEO Release Audit — Bertina production baseline

The earlier host-specific audit is superseded. Current SEO release assurance uses the owned domain and Bertina Apache policy.

Required release checks:
- canonical and hreflang integrity for `/fa/` and `/en/`;
- indexability/noindex governance;
- sitemap and robots consistency;
- one-hop permanent legacy redirects in `.htaccess`;
- response security headers and private-route no-store/noindex policy;
- no mixed-content references;
- mobile/responsive and accessibility regressions;
- real public HTTPS validation after the trusted Bertina certificate is installed.

Historical audit detail remains available on the immutable freeze branch.
