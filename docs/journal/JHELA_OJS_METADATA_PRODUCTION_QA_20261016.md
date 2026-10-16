# JHELA — International Article Metadata and Native OJS 3.5 Production QA
**16 October 2026 · Scholarly governance / production specification · Not a live publication system**

## Purpose and evidence boundary

The editorial and production team must distinguish **well-formed article metadata** from **documented scholarly acceptance**, **actual publication**, **DOI registration** and **journal indexing**. A source-only metadata checker may assess title, abstract, keywords, authors' public bibliographic identities, ethical declarations, licence and date consistency. It may never independently certify that a manuscript passed peer review, that a DOI exists in Crossref, that an ISSN has been awarded, or that a journal has reached DOAJ, Scopus, ESCI, SSCI or Q1.

In this repository:
- `platform/jhela-article-metadata-quality-policy-v1.json` is the versioned scholarly production-quality standard.
- `scripts/jhela-article-metadata-audit.mjs` is a privacy-preserving, nonmutating article **metadata** validator and ORCID checksum checker.
- `tests/jhela-article-metadata.test.mjs` supplies strictly synthetic article data, including adversarial fixtures that reject false index claims and leaked reviewer identities.
- `.github/workflows/jhela-ojs-readiness.yml` runs the offline checks. No authentic article, reviewer report, student or participant data is included in the code or test logs.

**Important:** a metadata preflight `pass:true` means only that the submitted data satisfies this static content-quality contract. All outcomes explicitly set `publicationAuthorised:false` and `registryCertified:false`.

## Native PKP OJS 3.5 workflow

Use the **official vendor-supported OJS 3.5** on a privately provisioned host; do not invent a custom independent editorial engine or write directly to OJS private tables. PKP's OJS 3.5 author guide specifies a native manuscript submission wizard, while the editorial workflow guide covers selection of editors, blind review, revisions, accepted copyediting, proof production and issue publication.

1. **Author registration:** configure the actual journal on the isolated OJS subdomain only after HTTPS, SMTP verification, compliant private storage and permission checks. Authors prepare accurate English bibliographic metadata; never treat the informational main-website self-check as real submission.
2. **Initial editorial screening:** verify manuscript scope, research article type, language, complete original metadata, conflict/ethics disclosures, author rights and de-identification of all review-stage files. Account details and manuscripts remain in OJS.
3. **Independent peer review:** routinely secure reports from two qualified independent reviewers; check conflicts and author/reviewer blinding. The unconflicted handling editor records the final reasoned decision, which is **never based solely on automated ratings**.
4. **Acceptance and editorial history:** retain the actual accepted version, dated editorial decision and revisions in OJS. Metadata QA may flag missing acceptance date and inconsistency but cannot independently attest that the underlying decision truly occurred.
5. **Copyediting and typesetting:** validate article title, methodological description, accessible abstract, keywords, references, public affiliations, funding/ethics/conflict/data/AI declarations and approved rights. Provide full text in an accessible publication format and maintain one durable canonical article landing page.
6. **DOIs, ORCID, ROR and Crossref:** do not issue identifiers manually without a lawful authority. In OJS 3.5, DOI assignment, status and registration are core functionality. Following publisher membership and valid Crossref credentials, an authorised Journal Manager may enable **Crossref Manager** under Settings → Website → Plugins, then configure Settings → Distribution → DOIs. Official Crossref guidance recommends **Articles only** for DOI assignment, opaque default suffixes, correct registration-agency settings and enabling reference metadata. OJS 3.5 supports built-in ORCID and ROR capabilities; verify each author-provided ORCID checksum and correctly formatted ROR affiliation, but do not infer identity or employer verification solely from the identifier string.
7. **Actual DOI registration:** in the OJS DOIs page distinguish **DOI assigned**, **unregistered**, **submitted**, **registered**, **has error** and **needs sync**. A local DOI field, locally selected `registered` status or an apparently valid DOI syntax **does not prove Crossref registration**. Check the live Crossref authoritative record and DOI resolution in a separate verified service or human audit before a public claim.
8. **Final publication:** publish only on the approved OJS journal host after scholarly decision, licence, copyedit, proof and preservation checks. Changes to post-publication metadata should trigger the appropriate Crossref re-deposit and a verified correction workflow.
9. **Journal-level status:** publication of a real paper is not evidence that JHELA has an ISSN, DOI registration programme, DOAJ membership, Scopus listing or any quartile ranking. Maintain these as separate evidence-led and revocable journal gates.

## Normalised private QA input contract (synthetic data only in repository)

Use a versioned `jhela-article-metadata-v1` object with `journal`, `type`, `language`, `title`, `abstract`, `keywords`, publicly consented bibliographic `authors` and `affiliations`, `references`, `declarations`, `rights`, `history`, `review`, `production` and `publication` metadata. The script returns only **codes and overall content-structure status**, not a copy of the submitted record. Never store authentic manuscripts or actual author correspondence in GitHub. Official editorial decisions must be queried only through supported and independently audited native OJS interfaces.

### Mandatory quality conditions

| Category | Requirement | Qualifier |
| --- | --- | --- |
| Scholarly identity | Meaningful title, English abstract, 3–8 distinct keywords | Avoid fabricated claims or artificially lengthened prose; discipline-specific article types vary |
| Authorship | Real names/affiliations formally approved by authors; ORCID optional but checksum validated | A format-valid ORCID/ROR is **not** proof of identity or institutional affiliation |
| Sources | Documented references and valid DOI syntax where DOI citations are supplied | For genuine theory or perspective work, relevance is more important than counts |
| Ethics | Research ethics, consent, funding, competing interests, data availability and AI assistance declared | No participant identities or raw approvals in the public metadata object |
| Intellectual property | Copyright/licence agreement recorded and correct CC BY 4.0 display only where approved | Licence changes require rights-holder approval; no retrospective automatic relicensing |
| Publication history | Submitted and accepted timestamp consistency, version of record and accessible HTTPS landing/full text | Authenticated native OJS source remains authoritative |
| DOI | OJS-assigned article DOI only after membership and registration controls | Registration and external resolution must be independently verified |
| Independence | No blind reviewer identity, confidential referee text or bank/card data in public metadata | Source checker rejects prohibited keys as a defence-in-depth mechanism |
| Acceptance | Recorded scientific/editorial decision, ordinarily two independent reviewers and conflict controls | Automated metadata checker never grants publication authority |

## Practical release testing

Prior to opening real manuscript intake, use consented non-identifying staging author and reviewer accounts to verify: correct metadata submission; permissions by role; confidential review files; conflict recusal; independent reviewer assignments; 401/403 responses for foreign manuscripts; decision messages; revised manuscripts; proofs; author-approved licence; metadata export; DOI registration when lawful; backup restoration; email receipts; no customer-account session sharing. All observations need a dated, verified server-evidence dossier and operator signoff.

This document is compatible with planned hosting expansion and future stronger server resources, but **capacity changes never relax scholarly or security gates**.

## Official references

- PKP OJS 3.5 for authors: https://github.com/pkp/pkp-docs/blob/main/learning-ojs/author/en/index.md
- PKP OJS editorial review: https://github.com/pkp/pkp-docs/blob/main/learning-ojs/editorial-workflow/en/review.md
- PKP OJS issue publication: https://github.com/pkp/pkp-docs/blob/main/learning-ojs/editorial-workflow/en/publication.md
- Crossref's OJS 3.5 DOI management, reference, ORCID and ROR guidance (updated September 2026): https://www.crossref.org/documentation/register-maintain-records/ojs-plugin/ojs-3.5/
- PKP secure system and private files: https://github.com/pkp/pkp-docs/blob/main/admin-guide/en/securing-your-system.md
