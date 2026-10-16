# Shared Luxury Design Acceptance — Community & Every Future Website Module

**Authority:** `foundation/DESIGN-SYSTEM.md` v1.0 (frozen). This ADR supplements it; it does not redefine the baseline or authorize publication. Date: 2026-10-16.

## Visual identity is a release requirement, not a post-release cosmetic task
The website's public, commercial, educational, scholarly and authenticated functions must read as one integrated academic ecosystem. A new feature is unfinished if its CSS merely works while the page hierarchy, typography, motion, brand mark or mobile experience deviates from the parent system.

### Reusable system constraints
- Use the **actual official site logo** (`/favicon.svg` as the existing verified mark); no generative human portrait, fake institutional seal or interchangeable stock media.
- Public components inherit `--bg`, `--bg-elev`, `--surface-2`, `--text`, `--muted`, `--gold`, `--line`, `--r-*` and `--shadow`. The administrator UI uses mapped `--ops-*` semantic tokens, not an unrelated palette.
- Academic luxury is defined by restrained obsidian/graphite/ivory and *muted* gold, coherent measures, editorial spacing, subtle borders and restrained elevation. Avoid glowing filler gradients, gold-everywhere buttons and generic dashboard cards.
- Pair English academic headings carefully with Persian Tahoma/Arial-safe UI fallback; avoid broken glyphs or font file leaks.
- Maintain descriptive image alternatives; decorative brand marks can use empty alt only where adjacent contextual identity is already obvious.
- Consent and moderation controls have fully visible text and keyboard focus. Ratings are a real radio control, not clickable painted stars with missing input semantics.
- At small widths, buttons remain at least 44 px tall, rating groups wrap, copy remains readable in RTL and LTR, and fixed mobile navigation cannot obscure the section.
- Reduced-motion and forced-colors support must remain enabled. Target WCAG 2.2 AA and screen zoom 200% for release checks.

## Current source implementation
**Reader commentary** (`assets/css/community-comments.css`, `assets/js/community-comments.js`):
- Publisher-style editorial heading and official emblem; comment cards with readable line lengths and proper whitespace.
- Authentic native radio-based 1–5 rating selection with visible selected state, plus no-rating option; publication consent and privacy explanation.
- Disabled feature disappears completely if API is not operational. No fabricated testimonials, rankings, aggregateRating or perceived engagement.

**Private moderation** (`assets/css/operations-community-moderation.css`, `assets/js/operations-community-moderation.js`):
- Editorial Governance header, official site mark, operational dashboard palette, readable pending and approved queues.
- Action hierarchy distinguishes approval, rejection and removal; none is allowed until server confirms membership, CSRF and fresh MFA.

## Mandatory acceptance matrix (all modules)
| Family | Desktop and mobile | Interaction/accessibility | Integrity |
|---|---|---|---|
| Login / Register | Logo, bilingual welcome, slogan and responsive split hero | Password manager, focus, 200% zoom and validation | No changes to real customer-auth contracts |
| Bookstore / Checkout | Matching product imagery, price hierarchy, persistent cart | Tap/keyboard flows, error messages, screen readers | Real catalog, inventory, gateway and receipt |
| Editorial / News | Reading measure and verified imagery, ALT semantics | Related links and moderated responses | Canonical/hreflang remain stable |
| Assessments / Golden Talent | Calm evidence-focused layout and ethical labels | Consent, role-specific status, accessible reports | No unvalidated psychometric claims |
| Public assistant / GEO | Distinguishable citations and evidence states | Accessible input and feedback, no coercive UI | No fabricated AI citations, no exposed prompts/secrets |
| Admin / Schema / Keyword / Journal | Private professional console and honest scores | Desktop/mobile, MFA, noncolor status labels | No private content publicly cached |
| Ratings / Comments | Authentic branded discussion surfaces | Native radio stars, real consent and moderation controls | No publication until approved; no fake review schema |

## Required evidence before a 10/10 design verdict
1. Capture actual mobile and desktop rendered screenshots for RTL and LTR (e.g., 390 px, 768 px and 1440 px); assess against existing approved design baseline and any verified Canva/Figma source assets.
2. Run accessibility audits and manually exercise full keyboard and 200% zoom, reduced motion, landscape mobile and forced-colors mode.
3. Execute immutable-SHA CI, page loading without JS, error states and real customer/admin flows.
4. Verify no clipped sections, no currency mismatch, no incorrect alternative text and no regressions to the production main navigation.
5. Record designer/editor signoff and defect list in private acceptance evidence. Automated source checks alone cannot justify a 10/10 or production-ready claim.

**New CI source tests:** `tests/community-design-consistency.test.mjs` protects token lineage, official mark, accessible rating inputs, responsive and reduced-motion contracts. It is necessary but not sufficient for visual QA.
