# Bilingual Cinematic Academic Ecosystem
## Mobile-first desktop and mobile experience design specification

**Date:** 13 October 2026  
**Repository source:** `drrezazadeh65/drjavadrezazadeh.com`  
**Canonical branch:** `migration/bertina-linux6`  
**Design baseline:** `37fb949dea96e5caaf070c322a72790a1a08acc8`  
**Status:** Design direction approved in conversation; written specification for owner review. This document authorizes no production deployment.

## 1. Purpose and intended outcomes

The site should feel like a distinctive, international academic and educational ecosystem rather than a static profile page. It should retain Dr. Javad Rezazadeh Yazdeli's scholarly identity while helping each visitor reach a relevant service, publication, book, or account with little effort. Mobile use is the leading constraint; desktop is a full presentation surface and must receive equally deliberate visual design.

The experience should support four related outcomes:

1. Establish scholarly identity and trust through accurate academic evidence and a coherent personal visual identity.
2. Let students and families, researchers, teachers, and institutions identify their pathway quickly.
3. Make genuinely available paid services and books visible with direct links to their existing pages.
4. Reduce account-creation friction through Google sign-in while retaining the current email-based authentication and optional phone-for-fulfilment policy.

Visual appeal is a means to make those paths easier to understand. It does not by itself guarantee traffic, sales, or income; post-release evaluation must use real engagement and completed-request/purchase events.

## 2. Research and design rationale

The direction synthesizes current guidance and research rather than following a short-lived visual trend:

- Baymard's 2025 homepage and category-navigation benchmark reports that 67% of mobile ecommerce sites assessed performed at mediocre-to-poor levels. This supports prioritizing clear service/product discovery and category labels over decorative complexity.
- web.dev treats responsive design, accessibility, performance, reliability, and installability as connected foundations of a PWA.
- WCAG 2.2 SC 2.5.8 sets a 24-by-24 CSS-pixel minimum target with exceptions; this design should use larger practical controls for primary touch actions and keep keyboard focus visible.
- Google Identity Services returns an ID token that must be sent securely and verified server-side. A visual Google button without a verified backend flow is not a valid implementation.

These sources inform choices; they do not guarantee a particular conversion outcome.

## 3. Chosen visual direction

**Academic cinematic ecosystem** is the selected direction. It combines a refined scholarly editorial layout with the immediacy and discoverability of a digital service platform.

- Preserve the black, ivory, and restrained gold identity already present in the codebase.
- Introduce controlled surface variation, richer image composition, confident typography, clear spacing, and subtle depth so sections are visually distinct and the page feels composed rather than static.
- Use motion only to clarify hierarchy or acknowledge an interaction. Honor `prefers-reduced-motion`; avoid autoplay video, parallax that impedes reading, and animation-dependent content.
- Keep the approved portrait and book-cover assets unchanged unless their owner-approved source is confirmed. Any new imagery must have a defined role, mobile crop, and textual alternative.
- Keep English and Persian layouts equivalent in hierarchy and quality, not merely mirrored. Respect RTL/LTR, localized labels, text length, and language-appropriate typography.

This direction was preferred over a software-dashboard aesthetic, which could obscure the personal academic identity, and over a magazine-only aesthetic, which could leave service and purchase paths secondary.

## 4. Page and navigation architecture

### 4.1 Language gateway

Preserve the root language gateway and its `x-default` role. Improve visual entry and provide clear English and Persian choices. Do not silently redirect search crawlers or remove either language choice. A remembered preference may be offered as a convenience only if it never blocks a manual switch and does not change indexable URLs or canonical/hreflang behavior.

### 4.2 Desktop navigation

Replace the current long visible link row with a concise set of understandable groups, using the existing destination URLs and an accessible expandable menu where needed:

- Research and publications
- Services and academic consulting
- Golden Talent and student guidance
- Books and shop
- About and contact

Keep language selection and account access visible. Navigation labels and menu interactions must remain keyboard-operable; no hover-only controls. Do not invent unavailable services or routes.

### 4.3 Mobile app shell

Retain and improve the existing `mobile-app-v431.css` shell, five-item app dock, mobile menu sheet, safe-area padding, and install prompt. Do not add a second dock or a competing navigation mechanism. Map its five items to the highest-value, verified destinations and use clear icons plus readable labels. Make sure floating controls do not cover content, form actions, cookie/privacy choices, or focused elements.

## 5. Home page composition

### Desktop

1. **Compact header:** brand, grouped navigation, language switch, and account entry.
2. **Hero:** editorial two-column composition with approved portrait or a suitable image area, a short positioning statement, and two or three direct actions (academic profile/research, services, or student guidance as validated against actual goals).
3. **Audience pathways:** four cards for students/families, researchers/academics, teachers/educators, and schools/institutions. Each card states what the audience can do next.
4. **Services and shop preview:** make real, available paid services and books discoverable without making the academic homepage resemble a generic store.
5. **Evidence and publications:** show selected, verifiable credentials, publications, research, and current projects; distinguish published work from work in development.
6. **Footer:** bilingual contact, privacy, terms, and relevant social/academic profiles.

The page should use deliberate section composition and generous desktop whitespace. Responsive changes must not simply stretch the mobile cards across a wide canvas.

### Mobile

1. A compact sticky header with brand, language/account access, and the existing menu trigger.
2. A concise hero with a clear first action and no oversized copy that pushes all useful paths below the fold.
3. Quick-access pathway cards for the four audiences, sized for easy tapping and scannable at 320–430 px.
4. A compact, visible services/shop area with product imagery only where it improves choice.
5. The existing five-item dock, refreshed for clarity and destination accuracy.
6. Registration and sign-in access, including Google, placed where users encounter account-specific tools; do not require account creation to read public content or browse the shop.

Use an editorial rhythm and varied card emphasis rather than a long sequence of identical boxes.

## 6. Google sign-in and account requirements

The interface may show **Continue with Google** on registration and login. It must connect to the site's same-origin PHP/API and existing account model:

- Use Google Identity Services and HTTPS.
- Verify the ID token on the server using a maintained Google client library or a well-maintained JWT library and validate issuer, audience, signature, expiry, and relevant claims.
- Link an existing account only after matching a verified email and applying the existing account-linking policy. Handle collisions and revoked/unavailable Google sign-in with clear recovery paths.
- Keep client secrets and session signing material in private server-side configuration; never put secrets in HTML, JavaScript, Figma, or source history.
- Create a normal site session with the existing secure cookie/session controls. Google identity must not bypass admin MFA, roles, entitlement, consent, or age/guardian protections.
- Phone number remains optional and is collected only when needed for service fulfilment; it is never a login or verification factor.
- Update privacy and consent language before collecting Google profile claims. Request only the identity claims the site needs.

The Figma prototype may illustrate the screen states, but successful authentication is not claimed until the backend contract and real Google OAuth configuration have been tested.

## 7. SEO, accessibility, privacy, and performance constraints

### SEO and URL stability

- Preserve all public paths, language-specific canonical URLs, validated `hreflang`, sitemaps, redirects, structured data, and crawler directives.
- Preserve server-rendered/crawlable HTML content. No core service or research information may depend solely on client-side interaction.
- Maintain text alternatives for meaningful images; decorative visuals are hidden from assistive technology.
- Do not index account, student, assessment, checkout, payment, or private advisory data.
- Re-run the repository's SEO and link/URL regression checks after implementation. Require zero new broken links and no unintended public-path changes.

### Accessibility and responsive behavior

- Test 320–430 px phones, tablet widths, and wide desktop, in Persian RTL and English LTR.
- Use semantic headings, landmarks, accessible names, visible keyboard focus, logical focus order, adequate color contrast, and reduced-motion behavior.
- Meet WCAG 2.2 AA as the target. Primary tap targets should generally be at least 44 by 44 CSS pixels where layout allows, with spacing that avoids accidental activation.
- Ensure mobile sheets, dock controls, dialogs, and form errors are usable with keyboard and screen-reader navigation.

### Privacy, caching, and PWA behavior

- Preserve the repository's network-first mutable-asset strategy and do not persistently cache account, checkout, payment, or assessment information.
- Provide honest offline messaging; never imply that an unavailable submission has been received.
- Verify service-worker update and cache invalidation behavior after changed pages/assets.

### Performance

- Preserve Core Web Vitals quality at the 75th percentile, measured separately for mobile and desktop.
- Use responsive image sizes and modern formats; avoid unneeded heavyweight effects or third-party scripts.
- Record before/after field and lab evidence. Do not claim performance improvement from design intent alone.

## 8. Figma prototype deliverable

Create an editable Figma file with the following primary frames:

- Persian home: 393 × 852 mobile and 1440 × 1000 desktop.
- English home: 393 × 852 mobile and 1440 × 1000 desktop.
- Google sign-in/register entry states for both languages, with error/unavailable fallback.
- A small style-and-interaction page showing type scale, color roles, buttons, cards, navigation dock, and mobile sheet states.

All interface elements should be editable Figma layers, not a flattened screenshot. Existing source visuals may be used as references; approved assets must be traceable to the repository. Because the source homepage includes a portrait image, capture it as a temporary visual reference if necessary, transfer the relevant asset into the editable design, then remove the flattened reference frame from the final file.

## 9. Implementation and validation sequence

1. Owner reviews and approves this written design specification.
2. Prepare and review the Figma prototype; confirm visual direction across Persian/English and phone/desktop.
3. Owner approves the final Figma prototype and requests implementation.
4. Inspect fresh canonical HEAD and open changes; implement only in `migration/bertina-linux6`, preserving existing routes, design work, and account contracts.
5. Implement visual changes in a focused pass; treat verified Google authentication as a separately gated backend integration if credentials, provider setup, or account-link rules are unresolved.
6. Run tests appropriate to the changed files, responsive/accessibility review, link/SEO regression, cache/privacy checks, and performance measurement.
7. Recheck the exact branch HEAD and deployment state. Production deployment is a separate release action and is not authorized by this design document.

## 10. Acceptance criteria

The design is ready for implementation when:

- Four home frames communicate one coherent identity while fitting RTL and LTR naturally.
- A first-time visitor can identify their audience pathway and reach the relevant service/shop route without scanning a long navigation row.
- Mobile and desktop each have intentional compositions and no horizontal overflow.
- Current dock/PWA elements are coherently integrated and do not obscure content or actions.
- No unverifiable credential, false availability, misleading checkout state, or fabricated result is added.
- Google account access is represented accurately and its backend security dependencies are explicit.
- Existing URLs, crawlability, and the approved SEO baseline can be preserved.
- Editable Figma layers, image provenance, and meaningful interaction states are present.
- No production deploy or financial operation is inferred from design approval.

## References

- Baymard Institute. Homepage & Category Navigation UX 2025. https://baymard.com/research-articles/collections/homepage-and-category
- web.dev. PWA Foundations. https://web.dev/learn/pwa/foundations
- W3C. WCAG 2.2, Success Criterion 2.5.8 Target Size (Minimum). https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Google for Developers. Authenticate with a backend server. https://developers.google.com/identity/sign-in/web/backend-auth
- Google for Developers. Verify the Google ID token on your server side. https://developers.google.com/identity/gsi/web/guides/verify-google-id-token


## Approved owner-provided visual assets — 15 October 2026

The owner explicitly selected the original gold Persian calligraphic symbol (not Latin JR) as the canonical favicon and installed mobile/desktop PWA icon. Five owner-provided design references are the visual foundation for website, shop, account, operations dashboard, receipts, certificates, assessments and reports.

Canonical binary asset destinations, to be supplied from the exact owner uploads:
- `identity/references/brand-board.png`: brand board and document layout.
- `identity/references/persian-wordmark-gold.png`: complete gold Persian name lockup.
- `identity/references/persian-symbol-gold.png`: original isolated Persian icon.
- `identity/references/brand-board-secondary.png`: additional original board.
- `identity/references/website-design-board.png`: responsive site/app screen reference.
- `assets/images/persian-brand-symbol.png`: same original symbol for shared identity components.
- `assets/images/pwa-icon-192.png`, `pwa-icon-512.png`, `pwa-icon-maskable-512.png`, `pwa-icon-180.png`, `pwa-icon-16.png`, `pwa-icon-32.png`, `pwa-icon-48.png`: image derivatives for installed apps and favicon.
- `favicon.ico` and `favicon.png`: browser favicon derivatives.

Keep existing public icon URLs in `site.webmanifest`, `sw.js`, HTML and shortcut definitions where possible, so replacement of binaries at those same paths updates all installed-app consumers. Update service worker cache version and audit Safari apple-touch-icon references at release time. Do not switch the favicon SVG to an invented vector: the authentic icon is currently a raster source. Verify maskable safe-zone visually before deployment.

**Integration gate:** source PNGs must physically exist in the branch, have valid image dimensions and provenance, and the relevant HTML/manifest/service-worker references must resolve. This specification alone does not mean that binary files have been uploaded or the site deployed. The exact owner-provided image package was prepared as `jr-brand-master-assets.zip` and favicon package as `jr-persian-favicon-ready.zip` in the conversation.


## Master-plan visual reference index — approved files

All owner-provided visual concepts are maintained as **canonical source files** in `identity/references/`, linked here rather than duplicated in the documentation directory:

| Reference | Repository file | Design application |
| --- | --- | --- |
| Primary visual identity board | [brand-board.png](../../../identity/references/brand-board.png) | Persian gold calligraphic identity, palette, typography, invoice/receipt, assessments, reports, certificates |
| Secondary visual identity board | [brand-board-secondary.png](../../../identity/references/brand-board-secondary.png) | Additional approved brand-board reference |
| Persian full lockup | [persian-wordmark-gold.png](../../../identity/references/persian-wordmark-gold.png) | Official bilingual header, letterhead, receipts, certificates |
| Standalone Persian mark | [persian-symbol-gold.png](../../../identity/references/persian-symbol-gold.png) | Favicon, mobile/desktop PWA app icon and compact marks |
| Mobile/desktop ecosystem prototype | [website-design-board.png](../../../identity/references/website-design-board.png) | Homepage, shop, dashboards, navigation, checkout and receipt flow |

Design sources are separate from optimized runtime derivatives in `assets/images/`. This is intentional: original artwork must not be replaced by downscaled favicon derivatives. The owner uploaded these source assets to `migration/bertina-linux6` on 2026-10-15. Before release, check binary integrity, favicon rendering, manifest icons and cache refresh. Do not silently substitute a Latin JR glyph.
