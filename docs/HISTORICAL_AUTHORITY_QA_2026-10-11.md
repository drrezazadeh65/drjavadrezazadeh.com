# Historical authority reconciliation — evidence and release boundary

Audited Bertina base: `c3a2fbb96fe549fe767cbb55bf2b1b9ca459d3ee`.
Work branch: `codex/bertina-live-reconciliation-20261011`.
This source reconciliation prepares a PR; it performs no production merge, deployment, authentication transaction or payment.

## Verified existing work

PRs #31, #32 and #33 are merged into `migration/bertina-linux6`. Deployment [38087632105](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38087632105) verified 553 managed files at `30b1dfc13fcb1079e8d01e6f04bb85b8d8bc1e2d`. Audited base `c3a2fbb9` adds only excluded workflow configuration after that release. The historical establishment date, public archive, exact legacy mappings and previous privacy/performance reconciliation already exist and are retained.

Bertina's SSL support email, received 2026-10-11 00:42:18 Asia/Tehran, reports Certum DV issued and installed. Certum's issuance email reports expiry on 2027-04-27 at 23:10 UTC+2. Private-key attachments were not read or downloaded. This is provider evidence; managed-proxy HTTPS checks do not independently identify the origin certificate.

## Verified gaps and corrections

| Gap | Source correction |
| --- | --- |
| HTTP/www historical requests first consolidate transport, then map the old path | Evaluate all 15 exact public historical mappings before the generic transport rule; preserve their destinations and the existing private auth rules |
| Live verification hardcodes two products and bypasses certificate verification | Registry-driven verifier checks all 15 mappings, four origins and both slash forms, using ordinary CA/hostname verification |
| Separate push verification can race deployment; default `main` lacks the workflow-run definition | Verify inside the deploy job after release checksums/origin smoke; retain only a guarded manual standalone definition with its discovery limitation documented |
| Authenticated extraction request bypasses certificate verification | Remove the certificate bypass from the deployment-token request; retain explicitly labeled read-only origin diagnostics separately |
| 404 analysis counts internal/invalid referrers as external and excludes suffix-lookalike hosts | Count only valid external HTTP(S) referrers using exact host/subdomain ownership boundaries |
| RTL headings display numeric product-code segments in reverse order | Isolate six existing codes with `bdi dir="ltr"`; visible text and structured data stay identical |
| Current SSL/IndexNow docs contradict provider evidence or workflow source | Reconcile active prose and observations without promoting readiness states or activation flags |

## Verification completed before the PR

- Complete source Master SEO matrix: **38/38 audits passed**, including SEO/GEO, frozen URL/canonical/hreflang/sitemaps, link integrity, crawler/AI discovery, responsive source, stylesheet bundles, public secrets, private cache, commerce fail-closed and sanitized build.
- Historical recovery tests: **15/15 passed**, including actual rejection of an ephemeral untrusted localhost TLS certificate, wrong/two-hop/temporary redirects, noindex/private/incorrect-canonical targets, unresolved PDF handling, proxy header parsing and external-referrer classification.
- Actual loopback Apache `.htaccess` matrix: **137/137 passed** over HTTP and local test-CA HTTPS, simulating apex/www Host headers. This proves source rewrite behavior; it is not production TLS or deployment evidence.
- Apache private/public cache audit: **137 variants passed**; private responses remain no-store/private/noindex and public missing URLs remain 404.
- Bertina provider guard: retired runtime references absent, PHP lint passes, 11 isolated receipt cases and five account/commerce contracts pass; sanitized build contains **553 files / 290 HTML routes**.
- Live browser checks through the managed proxy: archive/storefront at 320, 375, 430, 768 and 1440px: **10/10** return 200/self-canonical/indexable, with no horizontal overflow or page errors. All three approved book covers load; eight mobile-menu interaction checks pass. No auth or write requests were made.
- Local browser verification of corrected RTL codes: **30/30 code checks** over five widths; heading text and JSON-LD match the prior live HTML exactly, with unchanged canonical/robots metadata and no overflow.
- Workflow YAML and governance checks pass; `git diff --check` passes.

The live storefront's external Enamad image is blocked by the managed proxy (`ERR_TUNNEL_CONNECTION_FAILED`). It was not mocked, removed or replaced. Browser certificate issuer is the managed proxy, so this evidence does not certify the Bertina origin CA chain.

## Production matrix before this correction

The strict managed-proxy GET matrix against the existing release completed **137 checks: 46 passed / 91 failed**. Ninety historical HTTP/www slash variants first redirected to the same legacy path on HTTPS apex; one shop tracking-query assertion also failed for that reason. All ten distinct final destinations returned indexable self-canonical 200 responses; canonical root behavior and unknown product/PDF 404 controls passed.

The new source passes the same matrix under actual local Apache. The live chain repair must be verified after a separately authorized production release. Future deployment JSON evidence records the checked source SHA, network context, origin, case count and failures. Technical indexability does not prove search-engine indexing or recovered rankings.

## Preserved constraints and remaining evidence

Approved URLs, canonicals, hreflang, sitemaps, robots, `llms.txt`, service/book prices and approved images are retained. Existing active HTTPS consolidation is retained. `public_tls_confirmed=false`, `commerce_enabled=false` and monetary fail-closed policy are not changed by this work.

The supplied Ahrefs screenshot shows 359 referring domains for the domain scope and four for the www scope; it does not list backlink target URLs. The supplied Referring Domains link cannot be opened by the available web tool and returns a proxy access denial from this environment. Additional historical book/product/PDF mappings require Backlinks/Best by links Target URL evidence, original content or a verified equivalent. No unknown URL is redirected to the homepage; the unresolved original scholarly PDF stays review-only.

CI results for this source commit are reported in the PR. No CI or local result is presented as a production deploy/checksum, public auth/email delivery or live payment certification.
