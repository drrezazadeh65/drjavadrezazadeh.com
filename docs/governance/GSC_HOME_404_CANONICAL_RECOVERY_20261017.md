# GSC /home/ — Canonical Homepage Recovery (2026-10-17)

## Observation (owner-supplied direct Search Console screenshot)
- Property: `https://drjavadrezazadeh.com/`
- Inspected: `https://drjavadrezazadeh.com/home/`
- Tool: **Live Test**, tested **2026-10-17 23:06** (Iran local time, as displayed).
- Result: **URL is not available to Google** — **Page cannot be indexed: Not found (404)**.
- Smartphone URL Inspection agent: Crawl allowed **Yes**, fetch **Failed: Not found (404)**; indexing allowed **N/A**.
- This is an HTTP-not-found observation, **not** a robots.txt or noindex exclusion.
- The screenshot **does not establish** historical content, prior indexing, backlink counts, sitemap inclusion, or an issue with the existing canonical root.

## Source investigation
- Canonical multilingual gateway: `/` and its self-canonical `https://drjavadrezazadeh.com/`.
- Separate localized homepages: `/fa/`, `/en/`.
- No `/home/index.html` page in source and no `/home/` sitemap route or redirect at time of owner's evidence.
- Historical authority policy disallows default redirect of unknown URLs and disallows semantic mismatch. This is **one expressly identified homepage-named alias**, not a catch-all migration.

## Specific, non-destructive remediation (source branch)
- Add `/home/` -> `/` to `platform/historical-authority-registry.json` with the owner-provided GSC 404 evidence and explicit semantic judgement; historic unique content remains unverified.
- In `.htaccess`, add exact `RewriteRule ^home/?$ https://drjavadrezazadeh.com/ [R=301,L,NE]` **ahead of** HTTP/www transport consolidation.
- Match `/home` and `/home/`; HTTP/HTTPS and www/apex aliases should converge in **one 301** to the trusted canonical root, without duplicate homepage content.
- Do not add `/home/` to the sitemap, public indexable registry, or hreflang set. The redirect source should not itself index.
- Keep all other unknown URL requests reviewable as genuine 404. Do not change current /, /fa/, /en/ URLs or API/private routes.
- Enforce source policy via `scripts/historical-authority-audit.mjs`, `scripts/seo-regression.mjs`, and `tests/historical-authority-recovery.test.mjs`; post-deploy `scripts/historical-authority-live-verify.mjs` consumes the registry and probes trusted GET variants.

## Pending release and Search Console acceptance
- **SOURCE PREPARED ONLY — NOT DEPLOYED.** A successful Git commit is not a deployed Apache response.
- After an explicitly authorized immutable Bertina release, require `GET https://drjavadrezazadeh.com/home/` to return status **301**, `Location: https://drjavadrezazadeh.com/` directly; final destination must return **200** with self-canonical and be indexable. Check slashless, http and www aliases without intermediary redirect.
- Inspect `/home/` in Google Search Console again after deployment. Its status may become “Page with redirect” rather than “Indexed”; this is expected. Google recrawl and consolidation may take time and are not guaranteed on a schedule. Submit `/` for indexing if eligible, **not** the redirected alias as a separate page.
- If later evidence demonstrates that `/home/` contained materially distinct historical content rather than the homepage, re-evaluate the semantic mapping before production activation.

**Blocked claim:** no live 301, SEO ranking recovery, or Google reindexing has been independently verified as of this record.
