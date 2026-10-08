# Knowledge Hub photography migration — controlled hand-off

Status (2026-10-08): **PREPARED, NOT DEPLOYED**.

## Verified original source
- Library archive: `featured_images_FINAL_45_CLEAN_web_ready.zip` (5.9 MB; original owner-approved set)
- Mapping: `assets/data/knowledge-image-seo-manifest.csv` — exactly 45 rows matched to 45 sitemap slugs
- Expected media: 45 `featured-1600x900/{slug}-featured.webp` plus 45 `og-1200x630/{slug}-og.webp`
- Existing public images: 45 fallback `assets/images/knowledge/{slug}-featured.svg`; keep them until a verified release
- Importer: `scripts/install-knowledge-webp.py`

## Access boundary
The archive exists in ChatGPT's Website Project Library, but direct raw-byte materialization failed with: "This Project file does not have an authorized raw-byte materialization path." Google Drive search did not locate a second accessible copy. **Do not describe the WebP images as published** until the archive is available in a writable checkout.

## Migration (only after archive bytes are accessible)
1. Download the **unaltered original** ZIP into a local/Work cloud-computer checkout of `drrezazadeh65/drjavadrezazadeh.com`. Do not replace with the contact sheet, cropped screenshots, temporary SVGs or newly generated alternatives.
2. `python3 scripts/install-knowledge-webp.py /path/to/featured_images_FINAL_45_CLEAN_web_ready.zip --check-only`
3. If all 90 WebP files, their dimensions, archive names and the 45 manifests validate: `python3 scripts/install-knowledge-webp.py /path/to/featured_images_FINAL_45_CLEAN_web_ready.zip`
4. Run `node tests/knowledge-hub-seo.mjs` and the desktop/390px/320px browser tests. Verify all article, OG, sitemap and card references point to **existing** WebP files. Stage all images and modified HTML/XML/JSON **together** in a single commit.
5. After deployment: externally crawl the 45 articles, the 45 image URLs, the 45 OG URLs and the hub. Require HTTP 200, valid content types, correct dimensions and no canonical/redirect/404 regressions. Inspect the images visually on desktop and mobile.
6. Only after live verification: re-submit the Persian sitemap to Search Console and IndexNow. Indexing is asynchronous and must never be claimed as guaranteed.

## Non-negotiable safety rules
- Do not change the 45 article URLs, their canonical destinations or their substantive text.
- Do not mark the migration complete or remove the SVG rollback files prematurely.
- Preserve the approved photo compositions and the original topic-specific Persian alt metadata in the CSV.
- Do not expose experimental or unpublished research projects via site navigation, sitemap or media metadata.
- Preserve the bilingual site architecture and the existing public hosting/DNS arrangement.
