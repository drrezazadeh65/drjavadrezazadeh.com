# DESIGN SYSTEM — v1.0

**Ecosystem:** Dr. Javad Rezazadeh Yazdeli  
**Applies to:** public website, consulting surfaces, Golden Talent public surfaces, Rezazadeh Foundation Press, JHELA public/founding pages, and future app/PWA shell.  
**Status:** FROZEN baseline — components may evolve, but token meanings should remain stable.

## 1. Visual language

The visual system is **academic, restrained, premium and human-centred**. It should not resemble a generic SaaS dashboard, a flashy coaching website, or a decorative “AI” template.

Core palette:
- Obsidian / near-black background
- Graphite elevated surfaces
- Ivory primary text
- Warm muted secondary text
- Muted gold for emphasis, state and identity
- Gold is an accent, not a fill-everywhere colour

## 2. Current semantic tokens

The production stylesheet already defines semantic tokens including:
- `--bg`
- `--bg-elev`
- `--surface`
- `--surface-2`
- `--text`
- `--muted`
- `--gold`
- `--gold-2`
- `--line`
- `--line-strong`
- `--max`
- `--r-sm`, `--r-md`, `--r-lg`, `--r-xl`
- `--shadow`

Components should consume semantic tokens rather than introduce arbitrary one-off values unless a component-specific visual requirement is documented.

## 3. Typography

### English
- Interface/body: system-safe sans stack until final self-hosted production font is completed.
- Editorial/authority display: Georgia / Times fallback where used deliberately.
- Avoid mixed font loading that can produce missing-glyph or corrupted-rendering failures.

### Persian
- Current safe fallback: Tahoma / Arial.
- Final target: self-hosted professional Persian font after font-integrity QA.
- Persian paragraph rhythm should remain generous; do not compress line-height merely to fit more content.

## 4. Layout

- Primary content width: approximately 1120–1160 px.
- Reading/editorial measure should remain narrower than dashboard/service-grid measure.
- Desktop uses generous negative space rather than maximum-density layouts.
- Mobile is not a reduced desktop page; it has app-like navigation and touch-first actions.
- Fixed/bottom navigation must respect safe-area insets.

## 5. Component families

### Authority
- Authority Hero
- Authority Card
- Teaching/Engagement Timeline
- Status Chip
- Portrait Shell
- Publications List

### Service
- Service Hero
- Service Card
- Principle Grid
- Process Step
- Outcome Card
- FAQ
- Book/Golden Talent Bridge

### Editorial
- Article Hero
- Editorial Figure
- Pull Quote
- Article Points
- News Card
- Breadcrumbs

### Platform/App
- Mobile App Dock
- Mobile App Sheet
- Authentication shell
- Future dashboard cards, private record views and assessment flows

## 6. Interaction rules

- Primary action: one clear high-priority CTA.
- Secondary actions remain visually subordinate.
- Hover is supplementary; all actions must work without hover.
- Touch targets should be comfortable on mobile.
- Keyboard focus must be visible.
- Reduced-motion preferences must be respected.
- No auto-playing movement, urgency animation or manipulative countdown behaviour.

## 7. Image system

- Every meaningful editorial/service visual requires a descriptive filename and alt text.
- Decorative images use empty alt only when they truly convey no content.
- Explicit width/height is preferred to reduce layout shift.
- Hero/editorial visuals use a stable aspect ratio where appropriate.
- Human portraits must be verified user-provided assets; no generated or substitute portrait is permitted.
- SEO/social image assignment is part of the page release gate.

## 8. Accessibility baseline

Target: WCAG 2.2 AA.

Required baseline:
- semantic headings;
- one page H1;
- skip links on major templates;
- visible focus state;
- keyboard-operable navigation;
- sufficient target size;
- text alternatives for meaningful images;
- reduced-motion support;
- semantic labels for navigation/controls;
- no information conveyed only by colour;
- form errors must be programmatically and visually connected to their fields when production forms launch.

## 9. Mobile behaviour

Mobile public navigation prioritises:
1. Home
2. relevant service/discovery action
3. talent/assessment entry when applicable
4. content/news
5. account/menu

The future authenticated app target remains:
**Home · Discover · Tests · My Path · Account**

## 10. Design governance

A new component should be introduced only when an existing family cannot express the requirement clearly.

A page is not “luxury” because it uses more gold, more shadows or larger text. Premium quality is defined by:
- hierarchy;
- restraint;
- spacing;
- typography;
- information clarity;
- motion discipline;
- image quality;
- mobile execution;
- content credibility.

## 11. Release checks

Before release:
- desktop and mobile hierarchy reviewed;
- no overflow or cropped critical content;
- headings scale correctly;
- keyboard focus visible;
- buttons/links remain distinguishable;
- images reserve space;
- RTL and LTR both checked where paired;
- bottom dock does not cover content;
- content remains readable at 200% zoom;
- reduced-motion state remains usable.

## 12. Known next design work

- final self-hosted bilingual font system;
- whole-site component convergence;
- PWA icons/service worker/offline shell;
- authenticated app component library;
- accessibility testing beyond source-level rules;
- live-device QA after permanent domain/production hosting.
