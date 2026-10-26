# JREI APEX V2 — Search Console robots indexing exception (2026-10-26)

**Requirement:** SEO-GSC-ROBOTS-20261026  
**Owner evidence:** Gmail Android notification, 26 October 2026, titled “New reasons prevent pages from being indexed on site” for \`https://drjavadrezazadeh.com/\`. Reported new reason: **“Blocked by robots.txt”**. The notification provides **no affected URLs**, counts or Google inspection results. It therefore does not prove that any intended-to-be-indexed public page was blocked.

**Authority:** Additive owner requirement to the 2026-10-26 JREI APEX · ACME · ULTIMATE V2 programme, subject to the site's frozen bilingual SEO baseline and non-regression policy. This is a site-search compatibility/repair gate, not permission to redesign unrelated pages or loosen private-route access.

## Baseline, observed in canonical branch source

- The repository \`robots.txt\` has a wildcard \`User-agent: *\` group, \`Allow: /\`, and multiple disallows for registration/login, authenticated account/admin dashboards, assessments, checkout/payment flows, \`/api/\`, \`/platform/\`, scripts/tests and similar nonpublic infrastructure. The file declares canonical and journal sitemaps.
- A disallow of an intentionally private/account/transaction/API URL can be correct, but **robots.txt is not an access-control mechanism**, nor does it guarantee deindexing. Authentication and private noindex/no-store headers remain obligatory.
- The repository's \`scripts/seo-regression.mjs\` audits canonicals, noindex and sitemap/search-index parity. That does not, on its own, identify **which URLs** Google's latest Search Console report listed as blocked.
- An email notification and the repository \`robots.txt\` are **not evidence** of the exact current production robots response, Googlebot-specific path evaluation, indexing status or successful validation.

## Non-destructive remediation requirement

1. Obtain the actual URL examples and issue counts from the owner's verified **Search Console → Page indexing → Blocked by robots.txt** report (or an authenticated permitted export/API). Do not invent affected URLs or ask the owner for repetitive screenshots.
2. Compare the **live served** \`/robots.txt\`, response headers, canonical/hreflang, public sitemap children, and the exact blocked URL set, using user-agent rules applicable to Googlebot. Keep owner/private/security routing intact.
3. Classify each URL:
   - **INTENDED_PRIVATE_BLOCKED:** no robots change; if Google has indexed a private URL, review proper auth/redirect/noindex strategy without making secrets crawlable.
   - **PUBLIC_SITEMAP_BLOCKED:** high-priority defect; propose minimal narrowly scoped change only after independent URL/route proof.
   - **PUBLIC_NOT_IN_SITEMAP / ALIAS / 404 / REDIRECT:** evaluate whether URL should be canonicalized, redirected, removed from links or sitemap, or allowed.
   - **UNKNOWN:** no unblocking until the data is sufficient.
4. Validate \`Googlebot\` / wildcard precedence, case/percent encoding, trailing-slash variants and differences between *deployed* and *committed* robots. Inspect the web server's route redirects and actual status codes.
5. Integrate a **read-only static robots-versus-sitemap conflict detector** into the final SEO/GEO acceptance. It must catch canonical public sitemap URLs disallowed by applicable robots groups while not treating deliberate private blocks as errors.
6. Once code and a separately authorized deployment are complete, request **Validate Fix** for only the genuinely affected GSC issue and review later indexing outcomes. GitHub commits do not themselves validate a Google Search Console issue.

## Safety / scientific status

**Evidence state:** \`SOURCE_ROBOTS_INSPECTED\`, \`GSC_ISSUE_OBSERVED_BY_OWNER\`, \`AFFECTED_URLS_UNKNOWN\`, \`LIVE_RULES_UNVERIFIED\`, \`FIX_NOT_CLAIMED\`.  
**Priority:** P1 diagnostic and search regression guard. Not an automatic unblocking request.
**Release criteria:** exact affected URL class, justified minimal change, zero new exposure of account/payment/admin/API routes, passing future SEO/canonical/hreflang regression and Search Console follow-up.
**Current source action:** track defect additively; no production configuration, DNS, robots or sitemap changed.
