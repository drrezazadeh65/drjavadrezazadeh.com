# drjavadrezazadeh.com
Official website of **Dr. Javad Rezazadeh Yazdeli**.

## Strategic architecture
The site combines academic scholarship, research programmes, educational/talent consulting, commerce, and a bilingual news/insights layer while preserving a single canonical public identity.

## Production architecture — Bertina only
GitHub remains the source-control and CI repository. **Bertina is the only production hosting, DNS, PHP, MySQL and domain-mail infrastructure for the website.** The public origin is `https://drjavadrezazadeh.com`.

The live browser must use same-origin application endpoints under `/api/`. Provider-specific edge runtimes, retired Worker hosts and third-party transactional-email runtimes are not part of the active architecture and must not be reintroduced without a new explicit owner decision.

Public URL identity remains an SEO contract. Existing indexable paths are frozen in `platform/public-url-stability-manifest.json`; paths may not be renamed or removed without a deliberate one-hop permanent redirect. Canonical, hreflang, Open Graph, structured-data URLs/IDs, sitemaps and robots remain on the owned HTTPS domain.

## Security and private services
Private/account/payment routes are fail-closed until the corresponding Bertina service is configured and verified. Authentication is email-only. The Bertina PHP API stores private state in MySQL and uses domain email on the Bertina host for verification/recovery/transactional delivery after mailbox and transport testing. Secrets must remain outside Git.

## Search themes
Primary topical clusters are developed through substantive pages rather than keyword stuffing:
- Dr. Javad Rezazadeh Yazdeli / Javad Rezazadeh
- talent identification and talent development
- educational consulting and academic guidance
- university entrance examination counselling and field-of-study selection
- applied linguistics and English language education
- human-centred assessment and responsible educational measurement
- teacher education, professional learning and educational development

## Verified identity links
Academia.edu, Semantic Scholar, ORCID, Instagram, GitHub, X/Twitter and Facebook are linked on the bilingual About pages and in Person `sameAs` schema. Production publication and live-domain behaviour are verified independently after deployment.

© Dr. Javad Rezazadeh Yazdeli. All rights reserved.
