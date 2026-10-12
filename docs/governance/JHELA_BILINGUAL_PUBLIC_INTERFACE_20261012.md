# JHELA Bilingual Public Interface — Authorised 2026-10-12

## Public-language decision

The editor/publisher authorised Persian-language **public information** and **reviewer and editorial recruitment** across the journal's established core pages. This does not change the formal **English-only scientific-article publication language** or imply that an OJS submission/peer-review workflow is already available.

- International English pages retain their existing canonical URLs: `/journal/`, `/journal/dashboard/`, `/journal/call-for-reviewers/` and other released /journal/ information pages.
- Persian equivalents are under the same journal namespace at `/journal/fa/` with corresponding slugs, e.g. `/journal/fa/call-for-reviewers/` and `/journal/fa/founding-collaborators/`.
- The 12 genuinely equivalent EN/FA pairs are registered in `platform/hreflang-pairs.json`, with reciprocal `en`, `fa`, `x-default` signals; both language versions self-canonicalise.
- All 24 public information/recruitment URLs are governed by the independent `/journal/sitemap.xml`, not duplicated in `sitemap-core.xml`. Journal-host cutover waits for real verified DNS/TLS/OJS and one-hop redirect tests.
- The bilingual public-search index and frozen URL-stability manifest include released public URLs only.
- UI is semantically Persian `lang="fa" dir="rtl"`; mobile layout, screen-reader labels and keyboard-accessible links remain required.
- The Iranian reviewer call and founding editorial collaboration call provide transparent interim `mailto:` channels; private dossiers or confidential review files are not transmitted to client-side services.
- There is no claim of active manuscript intake, peer-review appointments, ISSN, DOI, Clarivate/Web of Science, Scopus, DOAJ listing, existing journal articles or impact metrics.
- No content is translated or presented as a *published scientific article*; the public translations exist only to support accurate journal orientation and recruitment.

## Long-term journal subdomain

The future certified host `https://journal.drjavadrezazadeh.com` should preserve independent English and Persian public information paths and establish a separate journal-host sitemap/robots and matching hreflang. Changing primary host prematurely creates duplicate-canonical and indexing risks. The main website's standard bilingual paths `/fa/` and `/en/` are not alternatives to the journal's own self-contained public interface.

## Deployment and verification

The shared source branch remains `migration/bertina-linux6`. Run the following before any staged Bertina release: complete source SEO regression; `scripts/jhela-discovery-audit.mjs`; `scripts/jhela-release-audit.mjs`; hreflang and URL-stability checks; metadata and link integrity; responsive UI/a11y; sanitized public build. Application deploy is held by the shared owner-private signed backup/restore and serialized-release gate. A GitHub commit or CI PASS **does not certify** the live Bertina version or search-engine indexation.

## Noindex preparation pages (Persian)

Persian information counterparts for `/journal/submission/`, `/journal/current/`, and `/journal/archive/` are available at `/journal/fa/submission/`, `/journal/fa/current/`, and `/journal/fa/archive/`. Like their English equivalents, these three paths remain **noindex, absent from both public search and the independent JHELA sitemap, and without release/ISSN/DOI/article-count claims**. They explain in Persian that formal article submission is closed, the founding issue has no published research articles, and the journal archive is intentionally empty. No hreflang equivalence record is declared for these unindexed preparation pages; visible EN/FA links may still help users navigate between their public status notices. Their disclosure content must be reviewed when OJS and actual publication become operational.

## Scholarly policy parity checkpoint — 2026-10-12

Owner-authorised pre-publication strengthening of four English and Persian information-page pairs: ethics, peer review, author guidelines and access/fees. The texts describe confidentiality and generative-AI risks for reviewers and editors, planned independent external reports, context-sensitive method reporting, protected education-participant data, explicit reuse and copyright decisions, repository deposit and long-term preservation. English remains the scientific manuscript/publication language. Persian is provided for informed reviewer/author recruitment and public access to substantive policy information.

The journal remains **in formation**: no real manuscript intake, verified journal ISSN/DOI, DOI registration arrangement, operational preservation deposit, appointed international editorial board, completed external reports, accepted articles, indexing, impact factor or recognised accreditation is claimed. Open-access licence and rights agreements remain pending explicit owner/editorial approval before launch. DOAJ's published guide says journal policy information must be substantively the same across languages; it is an external benchmark, **not** a declaration that JHELA is already eligible or indexed: https://doaj.org/apply/guide/.

The updated `scripts/jhela-release-audit.mjs` checks these high-risk bilingual policy disclosures alongside the existing separate journal sitemap, 12 indexed language pairs, noindex staging routes and dashboard safeguards. Publication of this source remains independently gated by the Bertina backup/restore and serialized-deployment controls.
