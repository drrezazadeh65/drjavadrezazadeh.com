# Bertina reconciliation evidence — 2026-10-10

Scope: source changes from `migration/bertina-linux6` at
`655bea2fae9349b22a9356ab86ccbc6a2c99608e`, proposed through PR only.
The supplied report is an audit specification; completed Bertina source is retained.

## Verified gaps

- Align all 33 private route families across the registry, Apache, service worker
  and install policy. Add the missing Persian customer dashboard, service checkout
  and Golden Talent checkout coverage, including bare paths and private 404s.
- Reject private/no-store responses and private or foreign final redirect URLs
  before cache writes and offline reads; retire the preceding service-worker cache.
- Preserve stylesheet order and source bytes in eight checked bundles; remove two
  duplicate stylesheet loads. Twelve stylesheet and three responsive source
  warnings are resolved. Dashboard initialization, reconnect identity reset and
  narrow-screen carousel overflow are corrected.
- Replace stale payment-api workflow inputs with existing Bertina source
  contracts; retire automatic source writers and require Bertina branch guards
  for production mutation. Readiness and roadmap descriptions reflect existing
  PHP/MySQL/SMTP source without promoting operational readiness.

## Validation

The implementation commit `3f24c7ad045cf338e33174cf190dbd1b531de9c6` passed
all 18 triggered GitHub Actions runs (17 PR runs and one push run):

| Check | Evidence |
| --- | --- |
| Browser QA | [91 passed](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38075684282); includes six dashboard scenarios |
| Full responsive | [291 passed](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38075684326); 290 HTML routes × seven viewports |
| Full visual crawl | [291 passed, 1,160 screenshots](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38075684314); 290 routes × four viewports |
| Master SEO | [Passed](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38075684290), including link integrity, URL stability, crawler privacy, bundle and workflow governance |
| Bertina provider guard | [Passed](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38075684305) |

Additional local checks passed: 52 privacy/discovery regressions, 137 HTTP route
variants against Apache 2.4.68 executing the actual `.htaccess`, PHP 8.4.26
contracts/lint, 21 platform contract suites, 45 premium-article checks, and a
sanitized build of 552 files. Design and responsive source audits report zero
warnings. The public/private policy leaves unrelated public 404 behavior intact.

```sh
node --test tests/private-cache-behavior.test.mjs tests/ai-discovery-privacy.test.mjs
node scripts/pwa-private-cache-audit.mjs
PRIVATE_AUDIT_ORIGIN=http://127.0.0.1:8090 node scripts/private-route-http-audit.mjs
node scripts/stylesheet-bundles.mjs --check
node scripts/workflow-governance-audit.mjs
```

The HTTP audit requires Apache to serve the repository and execute `.htaccess`;
a plain static server does not validate these headers. Remote audit origins must
use trusted HTTPS. Browser CI uses pinned Playwright 1.56.0 and its Chromium.

The local fallback Chromium run encountered proxy-blocked official Enamad images
on three home routes and screenshot timeouts under resource contention. A separate
loopback-only structural probe passed those three routes with a clearly labeled
120 × 120 placeholder. No repository image or test assertion was changed for that
probe. The complete, unmocked GitHub browser/responsive/visual runs above passed;
the duplicate local runs were stopped after that evidence became available.
Neither a placeholder nor a local-origin CI run certifies the live trust seal.

The bundle formatting follow-up removes only the generator's redundant trailing
newline and updates content-hash stylesheet URLs. All original CSS bytes remain
present. A later visual crawl exposed the offline shell's intentional online
recovery reload destroying the document during font preparation. The capture
helper now retries only specific document-navigation errors, at most four times;
unrelated and final errors still fail the test. Ten local repetitions of the
actual offline route passed. No product behavior or QA assertion changed.
Final-head CI is visible on the PR and must be reviewed before merge.

## Preserved production gates

PHP runtime/configuration, prices, service/VIP/book catalogs, approved images,
canonical/hreflang metadata, sitemap files, `llms.txt`, redirect/404 policy and the
deployment trigger are unchanged. Robots changes only add the missing private
Golden Talent checkout exclusion to the five existing bot groups.

`public_tls_confirmed=false`, `commerce_enabled=false`, payment fail-closed and
the current HTTPS policy remain unchanged. No merge, deployment, SSL activation,
real payment, callback/reconciliation or public-domain auth test is performed.

Historical deployment [38067247805](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38067247805)
verified 544 server-side checksums and smoke checks for
`dfdd624aa28c2bd77f50044bc0150d8321899672`. It predates this PR. Its direct-origin
probes used `curl -k --resolve`, so it is not evidence of CA-trusted public TLS.

GitHub scheduled/default-branch automation still reads the definitions on `main`.
This PR cannot retire those older definitions while preserving the instruction
to leave `main` untouched; an operator must handle that separately. Public TLS,
controlled account-email delivery, and live payment certification remain pending.
