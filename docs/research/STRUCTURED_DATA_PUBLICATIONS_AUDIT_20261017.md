# Publications JSON-LD: bibliographic evidence and six-warning correction

Date: 2026-10-17 · Branch: `migration/bertina-linux6` · Status: **source-level repair completed; external live validator and production verification pending**.

## Starting baseline (owner's validator observation)
`https://drjavadrezazadeh.com/en/publications/` was reported with **0 errors and 6 warnings**: all three `ScholarlyArticle` objects incorrectly contained direct `volumeNumber` and `issueNumber`. Inspection of the current repository independently confirmed those six placements in both the English and Persian publication page HTML (12 duplicated placements across both language pages).

## Semantic correction, no URL changes
- Both `en/publications/index.html` and `fa/entesharat-elmi/index.html` now carry the **same canonical 12-node bibliographic graph**: three `ScholarlyArticle`, three `PublicationIssue`, three `PublicationVolume`, and three `Periodical`.
- For each article: `ScholarlyArticle.isPartOf → PublicationIssue.issueNumber → PublicationVolume.volumeNumber → Periodical` using stable `@id` links. No issue or volume properties are placed directly on article nodes.
- Article authors are represented in publication order by `author` instead of incorrectly relegating coauthors to `contributor`. The existing site-wide author's `@id` remains `https://drjavadrezazadeh.com/#person`; no new identity was invented.
- Existing English/Persian canonical URLs, hreflang paths, visible citation strings, pagination, date and verified DOI links were retained. No claims of awards, affiliation, journal metrics, invented DOI or Rich Results eligibility were introduced.

## Article-level evidence ledger

| Source record | Existing page fields | Author evidence | Outcome / limitation |
| --- | --- | --- | --- |
| Evaluating the Cultural and Pedagogical Fits of the Top-Notch Series in Iranian EFL Contexts: A Mixed-Methods Study | 2026-03-01, 9(1), 1–12, DOI `10.61838/kman.ijes.1413` | Javad Rezazadeh Yazdeli; Moussa Ahmadian; Hooshang Yazdani | Publisher confirms metadata, author order and DOI. `https://www.qijes.com/index.php/ijes/article/view/1413` and `https://qijes.com/index.php/ijes/issue/view/73`. |
| The Relationship between Lexical Fluency, Temporal Fluency, and Language Proficiency in Iranian EFL Context | 2016, 22(1), 111–125, DOI `10.17576/3L-2016-2201-09` | Javad Rezazadeh Yazdeli; Morteza Mellati; Mostafa Mehdizadeh | Publisher's journal record and full-text PDF confirm coauthor order and the volume/issue/pagination. `https://ejournals.ukm.edu.my/3l/article/view/10244` and `https://ejournal.ukm.my/3l/article/download/10244/3948`. |
| On the Effect of Phonetic Transcription and Morphological Awareness on Performing Listening Tasks | 2016, 3(2), 1791–1800; **no DOI established** | Hooshang Yazdani; Afsaneh Afshin Mehr; Hojjat Yousefali; Javad Rezazadeh Yazdeli | **Verified against the journal's original issue index PDF**, entry 140 (pp. 1791–1800), *International Journal of Humanities and Cultural Studies*, Vol. 3 Issue 2, 2016, ISSN 2356-5926. Primary source: `https://www.ijhcs.com/index.php/IJHCS/issue/download/10/28`. Third-party listings mislabel the journal; defer to publisher. No DOI has been inferred. |

## Independent specification
- `https://schema.org/ScholarlyArticle`
- `https://schema.org/PublicationIssue` — `issueNumber` is valid here.
- `https://schema.org/PublicationVolume` — `volumeNumber` is valid here.
- `https://schema.org/Periodical`

## Actual test evidence and outstanding gates
- A direct source-level inspection of both committed publication pages using the new inventory parser returned **three parsed JSON-LD blocks in English, two in Persian, and zero inventory errors** for these pages. All 12 graph nodes and semantic relationships were present; injecting direct issue/volume data into a synthetic article correctly produced both expected errors.
- Automated regression tests: `tests/publications-entity-graph.test.mjs`, `tests/schema-entity-inventory.test.mjs`.
- Whole-source inventory engine: `scripts/schema-entity-inventory.mjs` writes `.artifacts/schema-entity-inventory.json` in nondeploy CI, tracking canonical, language, robots, schema types and suspected privacy leakage for public HTML. This **does not** inspect PHP/OJS server-rendered pages.
- **Pending:** run complete GitHub Actions and inspect its artifact; use actual Schema Markup Validator and Google Rich Results Test on **staging** and **live** after all owner release gates; expand full-site annotation, entity reconciliation and noindex/sitemap crosschecks. A cleaned source page is not proof of a fresh **0-warning live validator result**.

**No production deployment is claimed.** Existing verified Donation/payment and the owner's 100% release freeze remain untouched.
