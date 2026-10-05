# Architecture Decision Register

This directory records foundation decisions that should not be casually changed after indexing or data collection begins.

## ADR-001 — Search-first public/private boundary
Public knowledge pages are designed for crawlability and search intent. Account, assessment-taking, personal results, educational records, messages, orders, research administration and other private/application routes are non-indexable and ultimately authentication-protected.

## ADR-002 — Indexing is opt-in
The default for newly reserved routes is `noindex,follow`. A route becomes indexable only after substantive content, verified facts, canonical/hreflang decisions, structured-data review, internal-link review and explicit release approval. Only approved canonical URLs enter the XML sitemap.

## ADR-003 — Stable multilingual namespaces
Persian public content lives under `/fa/`. English canonical architecture is retained without automatic machine-translated mirrors. Hreflang is used only where a genuine alternate exists.

## ADR-004 — Research-ready data
Operational data is not treated as a research dataset. Raw responses are immutable; instruments, items, scoring and interpretations are versioned; provenance is retained; identity is separated from research IDs; research exports are de-identified and version-frozen.

## ADR-005 — Golden Talent assessment integrity
Assessment records retain instrument version, item version, respondent role, timestamps, missingness, scoring version, interpretation version and report version. Historical results are never silently recalculated under a newer scoring model.

## ADR-006 — Commerce publication rule
Shop/category foundations may exist as noindex routes. Product/Offer markup and product indexing are activated only for genuine, purchasable products with verified price, availability and applicable commerce policies.

## ADR-007 — International journal independence
The future scholarly journal is architected as an independent publication identity/domain, linked to the research ecosystem but not buried as a personal-site subdirectory.

## ADR-008 — Accessibility, security and interoperability
Production implementation targets WCAG 2.2 AA and OWASP ASVS Level 2. The assessment/institutional integration boundary remains compatible with future QTI, OneRoster and LTI workflows.
