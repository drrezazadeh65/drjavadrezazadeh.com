# Knowledge Hub photography rollout — code and live verification states

**Updated: 2026-10-08.**

## 1. Repository and page wiring — VERIFIED
- All **45 distinct article slugs** in `sitemap-fa.xml` have corresponding public HTML pages.
- The canonical media directory `assets/images/knowledge/` currently contains **90 WebP files**: 45 `{slug}-featured.webp` images and 45 `{slug}-og.webp` Open Graph images, plus **45 fallback SVGs** retained for rollback.
- Every one of the 45 article pages was checked on GitHub `main` against its own canonical featured-image and `og:image` WebP filename; **45/45 matched**.
- All 90 required filename entries were found in the repository tree; **0 missing**. The image hub, article and metadata wiring is therefore deployed **in source**, not merely staged in an inaccessible ZIP.
- The migration used the owner-approved archive described in the project's prior migration record; do **not** regenerate, crop, or overwrite its supplied compositions in ordinary upgrades.

## 2. Production delivery — SEPARATE RELEASE GATE
Source presence, GitHub Pages deployment and SEO test success do **not** independently verify that the CDN serves all images.

The live production health monitor now checks the production-origin `sitemap-fa.xml` and requests **all 90 expected WebP URLs**, requiring HTTP 200, `image/webp`, and a valid `RIFF ... WEBP` body. This is a strict live gate and must pass before the phrase **“all 90 WebP images verified live”** is used. The original site audit also checks live pages, canonical links, private `noindex` protections, robots and sitemap health.

To inspect ongoing independent evidence, see the GitHub Actions workflow **Production SEO Health** (`.github/workflows/production-health-monitor.yml`). Its strict workflow runs on changes to the health-audit script and daily.

A separate visual editorial acceptance step remains necessary to compare representative original compositions and their rendering on desktop, tablet and mobile. Valid files alone do not prove visual quality or composition.

## 3. Integrity and rollback rules
1. Preserve all 45 article and canonical URLs, schema, topical Persian alt text and the bilingual architecture.
2. Keep the original **45 SVG fallback files** until production checks, search image discovery and visual approval are all satisfactory.
3. The committed image-seo manifest `assets/data/knowledge-image-seo-manifest.csv` and `scripts/install-knowledge-webp.py` remain reproducibility and disaster-recovery tools; do not rerun installation merely because historical notes described the import as pending.
4. Never expose unreleased Humanability, TESTLY or Teacher Humanization content in public assets or metadata.
5. Indexing of any image is at the search engine's discretion and is **never guaranteed** by submission, sitemap validity or HTTP 200.
