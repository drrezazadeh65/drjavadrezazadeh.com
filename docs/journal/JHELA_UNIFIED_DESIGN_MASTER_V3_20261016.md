# JHELA — Unified Luxury Scholarly Design Master v3.0
**16 October 2026 · Source implementation master · Not an OJS deployment approval**

## Authoritative hierarchy

1. `foundation/DESIGN-SYSTEM.md`: frozen site-wide academic, restrained and human-centred system.
2. `identity/brand-governance.md`: approved Persian-first parent calligraphic mark and provenance. Do not replace it with Latin JR or a newly invented family mark.
3. `docs/journal/JHELA_EDITORIAL_DESIGN_FINANCE_RELEASE_MASTER_20261016.md`: separate scholarly JHELA wordmark, editorial navy and brass, independent confidential/OJS boundaries.
4. `platform/jhela-unified-brand-v3.json`: **single written journal sub-brand contract** with colours, component family and acceptance criteria; responsive implementations are scoped to the appropriate trust domain.
5. `assets/css/journal-v2.css`, `assets/css/operations-jhela-workstream.css` and `assets/css/jhela-ojs-theme.css`: implementation layers; **do not** blindly load the public journal CSS inside authenticated native OJS or apply OJS reader classes to an editor's private dashboard.

## Rationale and language

Luxury in an academic journal means editorial calm, coherent identity, typographic confidence, readable long-form argument, generous margins and transparent provenance—not indiscriminate gold, moving banners, fabricated awards or ornamental numerical progress. The parent brand uses royal black, Persian gold and ivory; JHELA uses the same mother principles, with its **approved English academic open-book wordmark**, a distinctive deep navy `#0B203C`, restrained brass `#B48A3F` and warm ivory `#F4F0E6`.

The OJS reader template is intentionally **light paper on a dark scholarly header** to support extended article reading and printed galleys. The main public site and protected owner workspace use dark surfaces and light text. Their colours share semantic meanings but not identical background treatment. Persian supporting pages retain RTL rhythm and legible sans-serif; the publication language stays English.

## Component and document coverage

| Surface | Actual source | Minimum acceptance |
|---|---|---|
| Journal home, scope, policies, fees, author guidance, roadmap, public dashboard | `assets/css/journal-v2.css` | Consistent navy/brass/ivory system, content measure, clear H1, readable cards, meaningful status, responsive navigation |
| Reviewer and editorial role workstreams | `assets/css/operations-jhela-workstream.css` | Same semantic identity, role differentiation, keyboard tabs, no fabricated OJS accounts or decisions |
| Native OJS after installation | `assets/css/jhela-ojs-theme.css` | Standalone OJS style, accessible article layout, forms and proofs without hiding installer messages or changing role permissions |
| Review invitation, reasoned decision letter | `identity/jhela-document.css`; `identity/templates/jhela-*-preview-en.html` | A4 print-safe stationery, official wordmark, draft status, confidential workflow text, no simulated send |
| Finance, fee/waiver and publisher communication | Same print family | Fixed prospective APC, inaugural waiver, no fake invoice number, payment account, tax status or settlement |
| Article galley / first page | Same print family | Bibliographic metadata and accessible structure, no invented DOI/ISSN, published issue or acceptance |
| Future reviewer report, certificate and audit export | **Use this token and print family when authorised** | All real labels/roles/serials must come from official OJS/evidence vault; no static HTML pretending to authorise |
| Digital assets/social previews | Current approved wordmark and canonical media library | Provenance, alt, dimensions, honest founding description; no external index logo before official acceptance |

## Responsive visual requirements

- Desktop 1440px: restrained maximum widths and article line length around 78 characters, separate navigation and readable decision hierarchy.
- Tablet 768px: clear two-column or collapsed cards as needed, no arbitrary horizontal overflow.
- Mobile 320–430px: visible keyboard and tap targets of at least 44px, headings that reflow without clipping, touch navigation, real RTL support.
- Zoom 200% and large text: labels and form responses not truncated; screen readers retain article heading order and actual gate states.
- Motion and colour: WCAG 2.2 AA objective with visible keyboard focus, reduced motion and status labels beyond colour alone.
- Print A4: no paper clipped, high-contrast document content, title/licence/author attribution and factual status labels; no manufactured seals, signatures or serials.
- OJS: test the stylesheet in an authentic supported OJS build with anonymous reader, author, reviewer and editor roles. Fail on inaccessible disclosure, role bleed, hidden errors or wrong nav reading order.

## Separate scientific and deployment gates

**This release adds shared style contracts and offline stationery previews.** It does not upload the CSS into OJS, create accepted articles, activate payments or certify manuscripts. For each web/print asset, perform actual screenshots at 320, 375, 768 and 1440px in both languages where applicable, test a print/PDF export, check 4.5:1 body-text contrast and 3:1 focus or control affordance, and record verified owner approval before the single coordinated host release.

Governance references: `docs/journal/JHELA_FUTURE_SCALE_ARCHITECTURE_ADR_20261016.md`, `docs/journal/JHELA_SCIENTIFIC_EVIDENCE_AND_INDEXING_AUDIT_SOP_20261016.md`, `docs/journal/JHELA_OJS_METADATA_PRODUCTION_QA_20261016.md`.

The GitHub master exists to prevent repeated incompatible redesigns; future changes should update the same token manifest, journal theme, owner workspace, stationery and tests within one reviewed versioned change, not overwrite a functioning product.


## Canonical masthead and print family rollout — 16 October 2026

The approved reverse English wordmark is **not redrawn**. Its exact original emblem group was extracted as `assets/images/jhela/mark-en-reverse.svg` for narrow scholarly headers and registered with provenance in `assets/media-registry.json`. The full English wordmark remains on both international roadmap pages and the prominent scholarly hero. All 31 other discovered English/Persian journal route mastheads now display the matching compact emblem with visible adjacent title; the former `identity.svg` remains in the repository for rollback and historical provenance. No other website, Golden Talent or parent Persian mark was changed.

Seven coordinated A4, English-only **unissued design specimens** now share `identity/jhela-document.css`: reviewer invitation, editorial decision letter, future APC/waiver explanation, article galley, reviewer report, future issue cover, and consent-based reviewer acknowledgement. Drafts do not send messages, assign real ISSN or DOI, certify service, collect money, create submissions or provide functioning native OJS reviewer data. The private reviewer-report layout explicitly distinguishes author-facing assessment from editor-only confidential comments.

`tests/jhela-brand-route-coverage.test.mjs` verifies every discovered English/Persian journal index page against the canonical icon/full-logo family, safe SVG extraction, registered asset, logo loading and dimension contract, WCAG body-text pairings, seven print specimens and fail-closed OJS conditions. This source audit is additional to future human visual review; real screenshot and print/OJS testing remain independent release gates.
