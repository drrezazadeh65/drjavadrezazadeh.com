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
- human-centred assessment, Humanability and TESTLY
- teacher development and Teacher Humanization

### Migration
GitHub Pages is the temporary host. Paths and internal architecture are intended to remain stable when a custom domain is acquired. Canonical, Open Graph, schema, sitemap and robots URLs must be migrated together, followed by Search Console verification.

### Verified identity links
Academia.edu, Semantic Scholar, ORCID, Instagram and GitHub are linked. Google Scholar currently uses a name-specific Scholar search until the exact profile URL is verified. Facebook and X/Twitter are intentionally withheld until exact official profile URLs are verified.

© Dr. Javad Rezazadeh Yazdeli. All rights reserved.


## Master Foundation v3.0
The repository now contains an explicit foundation layer under `/foundation/`. New application, assessment, research-lab and commerce namespaces are reserved as `noindex` routes until substantive content/data and an explicit SEO release decision exist.

**Indexing is opt-in.** Public URLs are added to the XML sitemap only after an SEO release gate. Private/personal data will ultimately be protected by authentication; static foundation pages are placeholders only and contain no personal user data.

Research data architecture is defined before data collection so assessment, parent, teacher, educational-record and qualitative data can later be exported reproducibly for SPSS/R/Python and qualitative analysis environments without treating the operational database as the research dataset.
