# Published poetry bibliography and Book entity graph — source change

Date: 2026-10-18. This source-only improvement is in the approved master plan for scholarly, accurate bilingual page content and structured entity SEO.

## Primary internal evidence
The canonical `assets/data/book-catalog.json` records verified bibliographic metadata from original photographed colophon pages. It contains three *published* Persian poetry collections with their original cover-image paths, publisher `نشر دارما`, ISBNs, and Solar Hijri publication years: سپیدی (9786229465141; 1404), تاریکی (9786229636275; 1401), and بن‌بست (9786229636237; 1399). Existing covers and ISBNs are reused rather than invented.

## Implementation
- Two already public indexable routes: `/fa/ketab-ha/` and `/en/books/`. Preserve all canonical and reciprocal hreflang declarations.
- Each public book card now includes source-grounded original cover, title, imprint, Solar Hijri year, edition and link to its existing noindex commerce book detail, with no new URL path.
- Both pages include `CollectionPage` + `BreadcrumbList` plus `ItemList` and three `Book` JSON-LD nodes grounded in the existing catalogue; shared stable Book and Person @ids, real ISBN and publisher. No ratings, offers, stock, review, Gregorian publication date or professional-award claims are inserted into JSON-LD.
- Responsive styles are restricted to this card family, with images preserving intrinsic proportions, mobile 390px coverage, semantic dl and keyboard focus.

## Acceptance limitations
Static HTML/source checks must pass; verify actual images, metadata, schema parser, mobile overflow, and crawler rendering in approved staging/production. Schema.org annotation does not itself guarantee Google Rich Results or indexing. No payment/stock/receipt or database state changed; no deployment performed solely by this source commit.
