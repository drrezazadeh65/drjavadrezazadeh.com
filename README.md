# drjavadrezazadeh.com
Official website of **Dr. Javad Rezazadeh Yazdeli**.

## Strategic architecture
The site combines four connected identities without collapsing them into one page: academic scholarship, research programmes, educational/talent consulting, and a news/insights publishing layer.

### Search themes
Primary topical clusters are developed through substantive pages rather than keyword stuffing:
- Dr. Javad Rezazadeh Yazdeli / Javad Rezazadeh
- talent identification and talent development
- educational consulting and academic guidance
- university entrance examination counselling and field-of-study selection
- applied linguistics and English language education
- human-centred assessment and responsible educational measurement
- teacher education, professional learning and educational development

### Production origin and URL stability
GitHub Pages is the public static host for the owned production domain `https://drjavadrezazadeh.com`; Cloudflare is used for DNS, edge delivery and the payment/commerce Worker architecture. GitHub `main` remains the source-of-truth repository. The canonical-origin migration is complete: canonical, hreflang, Open Graph, structured-data URLs/IDs, sitemaps and robots use the owned HTTPS domain. Vercel has been decommissioned by the owner and is **not** an active deployment, API, payment, monitoring or authentication dependency. Do not invoke Vercel integrations, assume Vercel CI statuses certify production, or reconnect it without a new explicit owner decision. Other explicitly retired integrations likewise must not be restored.

Public URL identity is treated as an SEO contract. Existing indexable paths are frozen in `platform/public-url-stability-manifest.json`; a path must not be renamed or removed without an intentional one-hop permanent redirect plan. CI blocks broken internal links, missing fragment targets, redirect chains, sitemap drift and canonical drift.

### Verified identity links
Academia.edu, Semantic Scholar, ORCID, Instagram and GitHub are linked. Google Scholar currently uses a name-specific Scholar search until the exact profile URL is verified. Facebook and X/Twitter are intentionally withheld until exact official profile URLs are verified.

© Dr. Javad Rezazadeh Yazdeli. All rights reserved.


## Active delivery baseline — v4.4 (2026-10-09)

The current v4.4 progress checkpoint is `foundation/V4.4-ACADEMIC-COMMERCE-SEO-CHECKPOINT-2026-10-09.md`; the earlier v4.3 baseline `foundation/V4.3.0-EXECUTION-BASELINE.md` remains historical context. The authoritative runtime policy is `foundation/ACTIVE-INFRASTRUCTURE-POLICY-2026-10-09.md`. The frozen ecosystem roadmap remains in `foundation/MASTER-ECOSYSTEM-ROADMAP.md`, with machine-readable status rules in `foundation/ROADMAP-STATUS.json`. Roadmap items are never silently removed; they move through explicit DONE / MODIFIED / RENEWED / IN PROGRESS / PLANNED / WAITING / DEFERRED / RETIRED states.

## Master Foundation
The repository now contains an explicit foundation layer under `/foundation/`. New application, assessment, research-lab and commerce namespaces are reserved as `noindex` routes until substantive content/data and an explicit SEO release decision exist.

**Indexing is opt-in.** Public URLs are added to the XML sitemap only after an SEO release gate. Private/personal data will ultimately be protected by authentication; static foundation pages are placeholders only and contain no personal user data.

Research data architecture is defined before data collection so assessment, parent, teacher, educational-record and qualitative data can later be exported reproducibly for SPSS/R/Python and qualitative analysis environments without treating the operational database as the research dataset.
