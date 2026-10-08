# Dedicated Vercel payment API — safe scaffold

This directory is intentionally separate from the GitHub Pages website. In Vercel import settings, choose **Root Directory: payment-backend** and **Framework Preset: Other**. Do not attach the website's production domain to this project.

Implemented: no-store health endpoint at /api/health; POST-only fail-closed /api/payments/create and /api/payments/verify. **No live BitPay transactions are possible yet.** No secrets are included.

Before enabling payment: verify BitPay's official API contract and network reachability from Vercel; add a durable order store with unique transaction IDs and atomic settlement; derive prices server-side; protect against replay, forged callbacks, CSRF/abuse and double fulfillment; configure production secrets in Vercel Environment Variables; restrict CORS to the website; run end-to-end test transactions and reconcile with BitPay dashboard. Never accept a redirect alone as confirmation.

Keep GitHub Pages, canonical URLs, /fa/, /en/, sitemaps and public DNS unchanged. Do not deploy this branch as the public GitHub Pages source.
