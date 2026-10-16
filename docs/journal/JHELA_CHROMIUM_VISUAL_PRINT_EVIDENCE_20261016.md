# JHELA — Chromium Visual, Responsive & Print Evidence
**Evidence checkpoint · 16 October 2026 · Source revision `8a077a644ad57fb6c314d94b915c646220921275`**

**Direct evidence:** [JHELA Dedicated Visual & Print QA — GitHub Actions run 38858314492](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38858314492) · **conclusion: success**, **43 Playwright tests passed / 0 failed**. A screenshot/PDF artifact named `jhela-visual-and-print-evidence` was uploaded (approximately **82 MB**, 14-day retention). This artifact is reproducible and downloadable by an authorised repository collaborator while GitHub retains it; it is not a permanent preservation copy or a deployed public asset.

## Verified in Chromium (local repository fixture, not production)

- **33 source-listed bilingual journal HTML pages**: 17 English and 16 Persian, measured at **320, 390, 768, 1440px**, for **132 page/viewport combinations**; navigated to actual local HTML with HTTP 200; checked one visible H1, correct lang/RTL, applied journal CSS, local first-screen logo loaded, shared masthead, main region, local resource/network errors and horizontal overflow at each width.
- **8 source-only role design specimens**: author, reviewer, handling editor, Editor-in-Chief, journal manager, production, financial officer and audit officer, measured at 390 and 1440px (16 combinations). Browser checks ensure their authorised preview-specific role is selected, canonical eight-role navigation appears, no script is embedded, the JHELA wordmark is loaded, previews say `STATUS: NOT CONNECTED` and no viewport overflow occurs.
- **7 A4 specimen exports:** invitation, review report, editorial decision, fee/waiver notice, article galley, future issue cover and reviewer acknowledgement. Each renders through Chromium print output and retains the exact unissued banner.
- **Review evidence created:** full-page screenshots for English/Persian desktop and mobile journal source pages plus the role specimens; seven A4 PDFs. Screen/print images are **evidence for subsequent human visual inspection**, not automatically proof of compositional excellence.

## Still required before claiming complete design approval

1. Personally inspect the stored screenshots for visual hierarchy, alignment, typography, real readability, RTL spacing, adequate breathing room and any clipped contents. Automated screenshot capture does not constitute expert visual approval.
2. Check printed documents physically or in a qualified PDF renderer for actual pagination, bleed/margins, contrast, text wrapping and legal/ethical status wording; browser PDF generation alone is not print-production signoff.
3. Apply the **approved standalone OJS theme CSS** to the real, supported native OJS version. Verify all protected author/reviewer/editor and production screens **in real authenticated OJS**, including negative permission cases and narrow screens. Current prototypes remain excluded from public deployment.
4. Audit actual WCAG 2.2 AA conditions using assistive technology, zoom at 200%, keyboard-only flow and complete contrast sampling. Static palette/lint checks are necessary but insufficient.
5. Coordinate one owner-authorised production release after all independent website/SEO gates are green. Main-site Browser QA has recorded unrelated login/register design regressions, and current main-site SEO/publishing workflows still fail their broader suites; those are not waived by the journal-specific CI pass.

## Maintenance rule

`tests/jhela-browser-visual.spec.js` and `.github/workflows/jhela-visual-qa.yml` are the canonical automated browser/print evidence instruments. They run on relevant modifications to bilingual journal pages, brand assets, print specimens and the eight design-source role mockups. Screenshots are withheld from `.public-site/` and no live admissions, fees, DOI/ISSN or index rank is certified.

**Baseline:** `docs/journal/JHELA_UNIFIED_DESIGN_MASTER_V3_20261016.md`, `platform/jhela-unified-brand-v3.json`, `foundation/DESIGN-SYSTEM.md`, `identity/brand-governance.md`. Changes should strengthen this agreed design system rather than create a new competing identity.
