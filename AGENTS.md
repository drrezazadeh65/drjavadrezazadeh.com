# AGENTS.md — Dr. Javad Rezazadeh Website

## Modular mother database — permanent canonical reference (2026-10-17)

**Read first for ANY database, publishing, commerce, service, author, journal, or deployment task:** [MOTHER_DATABASE_MODULAR_MASTERPLAN_20261017.md](docs/governance/MOTHER_DATABASE_MODULAR_MASTERPLAN_20261017.md). It is the enduring mother-database schema crosswalk and dependency/order checklist. Production uses the **ONE EXISTING Bertina PHP + MySQL/MariaDB database**, with `customer_accounts`, `commerce_orders`, `commerce_payment_claims`, and existing service/payment tables as the foundation. Do not introduce a parallel database, fork or checkout, reinterpret future PostgreSQL design files as production migrations, or import the alternate `jr_pub_*` draft schema. Author publishing runs on canonical `publishing_*` migrations only. **Owner decision:** Defer ALL actual private PDF uploads, new MariaDB table installation, and final live activation to the last joint owner/operator deployment step; until then continue source-level work and nondeploying CI only. Do not declare a fictitious 99% verified status or alter 41/21 release-acceptance records without genuine independent evidence.


> Repository-wide coordination instructions for coding agents.
> **CURRENT STATUS: SHARED DEVELOPMENT OPEN — OWNER AUTHORIZED**
> Exclusive lock lifted by the owner on 2026-10-12 (Asia/Tehran). Historical lock issue: https://github.com/drrezazadeh65/drjavadrezazadeh.com/issues/28

## Governing owner directive and evidence requirement — 2026-10-15

The owner's current [Super Master Execution Directive](docs/governance/SUPER_MASTER_EXECUTION_DIRECTIVE_20261015.md) is the governing **scope and acceptance standard** for further website development. Follow the [evidence-led reconciliation ledger](docs/governance/MASTER_DIRECTIVE_AUDIT_RECONCILIATION_20261015.md) for findings raised by other chats. The master directive complements—not replaces—the frozen bilingual SEO standard, science/privacy safeguards, approved project decisions and this repository's single-source-of-truth protocol.

**No ungrounded discretionary change:** first trace a proposed change to an owner requirement, inspect current code, confirm the defect or an unmet acceptance gate, implement only a justified safe correction, then record tests and remaining production evidence. Third-party audits and AI suggestions are hypotheses to evaluate, never independent authorization for unrelated modifications. If instructions genuinely conflict or require irreversible changes, obtain the owner's explicit decision.

**Approved parallel schema directive — 2026-10-17:** The owner's full [Structured Data, Entity SEO & Knowledge Graph Master Execution](docs/governance/MASTER_STRUCTURED_DATA_ENTITY_GRAPH_EXECUTION_20261017.md) runs alongside (not instead of) the full services/design/academic/science master. Use [the 9-phase evidence ledger](docs/governance/STRUCTURED_DATA_PHASE_ACCEPTANCE_20261017.json) and [source-level publisher verification](docs/research/STRUCTURED_DATA_PUBLICATIONS_AUDIT_20261017.md). Preserve canonical Person/WebSite IDs, existing service URLs, verified publications, nonindex private pages and all frozen SEO governance. An inventory/source test is not a live validator or license to bypass the 100% production release freeze.

**Owner release freeze — 2026-10-17:** The owner expressly requires completion of the ENTIRE accepted Super Master Plan to a verified 100% BEFORE any new production publication, not only services or a passing source build. `docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json` is intentionally BLOCKED; `scripts/masterplan-100-release-gate.mjs` and `.github/workflows/deploy-bertina.yml` refuse release without 41 independently evidenced workstream approvals, 21 paid-service cases, 40 real destinations, immutable reviewed candidate, staging/operations/science evidence and explicit owner's final authorization. Do not mark a gate VERIFIED without authentic linked evidence, bypass the guard, introduce another deploy workflow, or confuse code coverage with live-readiness. Keep source changes in `migration/bertina-linux6` and execute only nondeploying CI until that complete threshold is actually met.

**Final deployment remains manually owner-authorized.** Never conflate a passing source test or nondeploying candidate with a production release, and never delete, replace or downgrade existing functional work merely to satisfy a generic redesign suggestion.

## Binding source instruction for every chat and Codex

The owner requires **one repository and one existing development source**, applying equally to Codex, all other authorized chats, subagents and future sessions:

- Repository: `drrezazadeh65/drjavadrezazadeh.com`; branch: `migration/bertina-linux6`.
- Use the existing primary checkout. In this environment it is `/workspace/drjavadrezazadeh.com`; all prepared work resumes there. Do not start another repository, fork, development branch, application folder or separate replacement system for this website.
- Other local review copies and historical branches are archived references/recovery material. Read them only to recover or compare valid contributions; transfer accepted work into the canonical source and never develop, publish or deploy from an archive.
- On every return, fetch fresh canonical HEAD, inspect current CI/live release and recorded work, then fix only remaining justified gaps. Do not rebuild features already implemented or replace newer designs, content, SEO or working authentication/payment contracts with an older copy.
- All owner-authorized contributors remain allowed to write in this same source. Coordinate edits and one deployment at a time; no Codex-exclusive lock is reinstated.
- Machine-readable coordinates: [SOURCE_OF_TRUTH.json](docs/governance/SOURCE_OF_TRUTH.json). Archive/provenance: [ARCHIVED_SOURCES_20261012.json](docs/governance/ARCHIVED_SOURCES_20261012.json). GitHub's actual default-branch setting must be verified separately; a local symbolic ref is not proof of changing repository settings.

## Who may write?

The owner explicitly lifted the Codex-exclusive development lock. **All owner-authorized assistant chats, coding agents and operators may implement changes and contribute to this repository using their existing authorized connections.** There is no Codex-only or repository-wide read-only restriction.

**There is exactly one development source: `migration/bertina-linux6` in this repository. Work directly in that existing source; do not create another development branch, parallel application folder or independent rewrite.** Review fresh source, existing commits, open pull requests and live evidence before editing. Coordinate edits to shared files and production releases. Keep one deployment in progress at a time; this protects the live site without imposing an exclusive developer lock. Historical copies of the previous lock in old branches do not reinstate it. Read this current policy on the active Bertina branch when starting or resuming work.

## Verified project coordinates

- Canonical site: https://drjavadrezazadeh.com
- GitHub repository: `drrezazadeh65/drjavadrezazadeh.com`
- **Active Bertina development/deployment branch**: `migration/bertina-linux6`
- `main` and older proposal branches are historical references, not development sources. Valid main contributions are reconciled into `migration/bertina-linux6`, preserving all history and the newer valid Bertina code, content, media and SEO. Read this policy on the canonical branch even when a repository UI opens on another default ref.
- Bertina Linux is the sole production web/PHP/MySQL/domain-email infrastructure. GitHub is for source control and CI/CD.
- Live app endpoints are same-origin `/api/`, not third-party Worker functions.
- Do not reintroduce Vercel, Neon, old Cloudflare Worker/D1 checkout, or retired payment/email providers.
- Deployment workflow: `.github/workflows/deploy-bertina.yml`. Avoid competing releases.
- Source of release-state truth: `docs/V4.4.1-BLOCKERS.md`, `docs/BERTINA_MIGRATION.md`, `assets/release-v4.4.json` and live evidence. They can become stale: revalidate first.

## Immutable priorities: SEO First / Mobile App-like First / Search+AI Visibility First

**SEO First**
- Preserve every approved public path, self-canonical, validated fa/en/hreflang relations, sitemaps and 301 redirects.
- No unintentional 404, broken links, cross-language canonical, thin/duplicate content, indexable private route, or fake schema claims.
- Maintain academic authorship, verifiable citations/claims, quality content, image provenance/approved book covers, and meaningful internal links.
- Run `scripts/seo-regression.mjs`, link/URL stability, metadata/structured-data, `llms.txt`, crawler and sitemap audits. Validate public-origin results with **strict trusted TLS** separately from temporary diagnostic `curl -k`.

**Mobile App-like First**
- Treat 320px–430px phones as primary; also verify tablet and desktop, RTL/LTR, screen readers, keyboard, and real-browser behavior.
- No horizontal overflow, hidden calls to action, inaccessible forms, deceptive offline message, or private caching.
- Preserve network-first mutable assets and zero persistent caching of account, checkout, payment or assessment data.
- Measure real-world Core Web Vitals and test PWA navigation/installability when public TLS is trusted.

**Search/AI Visibility First**
- Public scholarly and services pages should be crawlable, indexable where appropriate, well-linked, use accurate entity relationships/structured data, and be reflected in `robots.txt`, `sitemap.xml`, `llms.txt`, RSS and relevant search-console workflows.
- Never promise crawler access guarantees, ranking, AI citations or indexation; verify using search-engine consoles and external crawl evidence.
- Do not expose private account, payment, student, assessment, or advisory records to search engines/AI crawlers.

## Operational safety gates

- Public HTTPS is not fully trusted until a public CA-issued SSL certificate is independently validated for apex and www.
- Authentication must be **email-only**. Phone may be collected solely as optional fulfilment contact, never verification/login. Eitaa support belongs only to verified paying/entitled users.
- Payment/donations stay **fail-closed** until public TLS is trusted, confidential BitPay credentials and currency conversion are checked, fulfilment settings are reviewed, callbacks are verified, and separate real-money authorization is granted.
- Production MySQL, SMTP and gateway secrets belong only in private host or repository secret stores. Do not print, commit or request them in chat.
- Preserve pricing as server-authoritative and do not rewrite approved book-cover images.
- Source or mock tests are not proof of public readiness, real email delivery or money movement.

## Shared development and coordinated release protocol

1. Start from `migration/bertina-linux6`; fetch latest; record base commit SHA and inspect current CI, open PRs and live deployment to avoid repeating or undoing work.
2. Develop only on the existing `migration/bertina-linux6` source. Do not create separate work branches or parallel development folders. Coordinate shared-file edits, inspect fresh HEAD before every write and retain reviewable commits with evidence; no chat has exclusive implementation ownership.
3. Before release, verify build, SEO, responsive, accessibility, AI-discovery, cache/privacy, commerce fail-closed and GitHub Actions gates. Record evidence.
4. Never publish a stale commit or race another deploy. Re-check branch head before a production deployment.
5. For TLS, infrastructure, credential, payment or external approvals, document the precise blocker and continue safe source tasks without bypassing gates.
6. The owner has lifted the exclusive lock. Keep issue #28 and this policy consistent with open collaboration; do not reintroduce an exclusive restriction without a new explicit owner instruction.

## Access and handoff scope

This update opens development collaboration. GitHub connections, repository permissions, protected customer/admin routes and private credential stores retain their existing security controls. It does not change account subscription quotas or distribute credentials. Record unfinished work and evidence in this same canonical source with exact base/head SHAs and explicit deployment status so another authorized chat can inspect and continue without repeating work. Temporary test/build/recovery artifacts are not separate application sources; keep private backup material outside the repository.
