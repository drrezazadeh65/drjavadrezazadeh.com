# JHELA — Independent Sitemap, Subdomain and Scholarly Indexing Governance
Last reviewed: 2026-10-12
Repository source of truth: drrezazadeh65/drjavadrezazadeh.com / migration/bertina-linux6

## 1. Independently managed public discovery NOW
Current verified production origin: https://drjavadrezazadeh.com
Current journal mount: https://drjavadrezazadeh.com/journal/
Current dedicated journal sitemap: https://drjavadrezazadeh.com/journal/sitemap.xml

The root `sitemap.xml` includes a child-sitemap entry for `/journal/sitemap.xml`; no published journal route may also be duplicated in `sitemap-core.xml`. The root `robots.txt` advertises the root index and the dedicated journal XML. Journal XML contains only validated, released, self-canonical, indexable JHELA pages: /journal/, aims-scope, author-guidelines, contact, editorial-board, ethics, fees, peer-review, reviewer-registration, call-for-reviewers, founding-collaborators. This is journal independence by URL namespace **not yet subdomain hosting**.

Do not include the empty current issue or archive, private reviewer files, nonexistent article landing pages, unfinished OJS submission workflow, unassigned ISSN/DOI, false indexing and impact badges, future subdomain URLs or any `noindex` page. Do not claim search-engine indexation simply because XML was created.

## 2. Subdomain activation is a separate migration gate
Reserved permanent origin: https://journal.drjavadrezazadeh.com
Reserved planned sitemap: https://journal.drjavadrezazadeh.com/sitemap.xml
Status: NOT LIVE or production-certified in this document. **Do not emit its URLs in public sitemap/canonical/structured data now.**

A permanent subdomain cutover requires verified DNS, strict CA-trusted TLS, correct Bertina virtual host and OJS-ready PHP/DB/storage, protected private files, real SMTP, role-based editorial controls, backups, a tested restore and stable DOI metadata procedures. Only then generate the subdomain's real sitemap and its own `robots.txt`, validate Search Console property, and map every previously released `/journal/...` URL to its specific new canonical with one-hop 301 redirects. Retire old journal URL entries from the main domain after redirect testing; never create dual-canonical or cross-origin duplicate pages. The existing main journal home/calls already have public historical links, so continuity is mandatory.

## 3. Before claiming international-journal readiness
JHELA remains a founding-stage English-language publication. OJS is planned, submissions are not yet open and no articles have been published. Do not assert ISSN, DOI membership, DOAJ/Scopus/Web of Science indexing, impact factor, fabricated editorial board members or institutional affiliation. The publisher must provide a truthful physical business address, stable journal identity and lawful identifier application records.

External evaluation bases:
- Clarivate Web of Science: https://clarivate.com/academia-government/scientific-and-academic-research/research-discovery-and-referencing/web-of-science/web-of-science-core-collection/editorial-selection-process/journal-evaluation-process-selection-criteria/ — 24 journal quality criteria, 4 impact criteria; initial submissions are evaluated on quality for ESCI consideration.
- DOAJ: https://doaj.org/apply/guide/ — open access licensing, actual published research and clear journal records are prerequisites.
- COPE: https://publicationethics.org/core-practices — publication ethics guidance, **without falsely claiming membership**.

## 4. Scholarly operations required, not website decoration
1. Verify publisher identity/physical address and official journal mailbox.
2. Establish real, diverse editorial leadership with independently verified affiliations and explicit consent.
3. Install and certify OJS or equivalent on secure journal origin; separate journal manuscripts and reviewer information from educational student/customer databases.
4. Finalise conflict of interest, complaints/appeals, research-ethics, AI disclosures, corrections/retractions, plagiarism checks, copyright/licensing and waiver policies.
5. Establish lawful e-ISSN and DOI routes, actual metadata production, access licenses and preservation strategy.
6. Perform end-to-end independent peer review, editorial decision, copyediting, publication, persistent article URLs and accessibility tests.
7. Publish authentic, independently reviewed scholarly articles, stable volumes/issues, dated full-text pages, bibliographic references, and truthful author institutions.
8. Confirm actual discovery and indexing separately through verified webmaster/academic indexing consoles; apply to DOAJ and Web of Science only when eligible.

## 5. Internal release gates
`scripts/seo-regression.mjs`, `scripts/url-stability-audit.mjs`, `scripts/llms-txt-audit.mjs`, `scripts/sitemap-lastmod-audit.mjs`, sanitized public build, link/canonical tests, desktop/mobile accessibility tests and Bertina strict live checks must all pass on the exact intended release. No deployment-trigger mutation before coordinated safe release and existing signed private recovery procedures. Search index, frozen URL manifest and ecosystem registry are updated with each approved public journal route.

The independent journal sitemap is **a firm invariant**, even after a permanent subdomain transition.
