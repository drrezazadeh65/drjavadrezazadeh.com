# JR Unified Identity & Publishing Infrastructure v1.0

Status: foundation / implementation in progress. This is not a production deployment or an approved final logo.

## Governing principles
- One master brand: Dr. Javad Rezazadeh Yazdeli / دکتر جواد رضازاده یزدلی.
- Golden Talent, RCAS, BAHAR and Golden Path are endorsed sub-brands, never unrelated visual identities.
- Digital dark cinematic and print light editions share the same semantic tokens, logo geometry and document structure.
- Persian RTL and English LTR are authored separately and verified visually. Persian numerals and localized dates in Persian-facing documents.
- Scientific findings are conditional, evidence-based, versioned and revisable. Never portray scores as destiny.
- All official outputs originate from versioned templates and verified records. Never fabricate signatures, document numbers, accreditation, seals or credentials.
- Do not place personal test results, payment data or private booking details into public QR verification URLs.
- Existing site functionality, URLs, SEO and checkout remain unchanged until integration tests pass.

## Deliverable families
1. Brand marks: standalone JR symbol, horizontal bilingual lockups, monochrome, favicon/PWA.
2. Documents: letterhead, invoice/receipt, pro forma, refund, certificate, invitation, official letter.
3. Research: assessment form, answer sheet, scoring guide, RCAS/BAHAR/Golden Path reports, academic profile, slide and publication templates.
4. Commerce and operations: order confirmation, booking confirmation, account emails, donation acknowledgements, admin exports.
5. Accessible UI: responsive navigation, forms, charts and focus styles.

## Release gates
Logo legibility at 16/24/48px; vector master reviewed; font licensing checked; print at A4 and grayscale; bilingual typography; accessible contrast; valid PDF output; document numbering; secure verification; automated snapshot tests; no regressions.

## Governance
Tokens in tokens.css are the initial machine-readable source of truth. Template versions are immutable for already issued records. A brand change is reviewed and propagated via versioned release, never manually edited across outputs.
