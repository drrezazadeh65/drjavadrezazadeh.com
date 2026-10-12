# AGENTS.md — Dr. Javad Rezazadeh Website

> Repository-wide coordination instructions for coding agents.
> **CURRENT STATUS: SHARED DEVELOPMENT OPEN — OWNER AUTHORIZED**
> Exclusive lock lifted by the owner on 2026-10-12 (Asia/Tehran). Historical lock issue: https://github.com/drrezazadeh65/drjavadrezazadeh.com/issues/28

## Who may write?

The owner explicitly lifted the Codex-exclusive development lock. **All owner-authorized assistant chats, coding agents and operators may implement changes and contribute to this repository using their existing authorized connections.** There is no Codex-only or repository-wide read-only restriction.

Use separate work branches for concurrent changes, review current source and open pull requests before editing, and coordinate shared files and production releases. Keep one deployment in progress at a time; this protects the live site without imposing an exclusive developer lock. Historical copies of the previous lock in old branches do not reinstate it. Read this current policy on the active Bertina branch when starting or resuming work.

## Verified project coordinates

- Canonical site: https://drjavadrezazadeh.com
- GitHub repository: `drrezazadeh65/drjavadrezazadeh.com`
- **Active Bertina development/deployment branch**: `migration/bertina-linux6`
- `main` contains historical and parallel contributions; its name or latest timestamp does not establish the live Bertina release. Reconcile useful changes selectively against fresh deployment evidence and preserve newer valid code, content, media and SEO.
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
2. Use isolated work branches and reviewable PRs for substantive changes. Coordinate merges and releases with other active contributors; no chat has exclusive implementation ownership.
3. Before release, verify build, SEO, responsive, accessibility, AI-discovery, cache/privacy, commerce fail-closed and GitHub Actions gates. Record evidence.
4. Never publish a stale commit or race another deploy. Re-check branch head before a production deployment.
5. For TLS, infrastructure, credential, payment or external approvals, document the precise blocker and continue safe source tasks without bypassing gates.
6. The owner has lifted the exclusive lock. Keep issue #28 and this policy consistent with open collaboration; do not reintroduce an exclusive restriction without a new explicit owner instruction.

## Access and handoff scope

This update opens development collaboration. GitHub connections, repository permissions, protected customer/admin routes and private credential stores retain their existing security controls. It does not change account subscription quotas or distribute credentials. Preserve unfinished work in reviewable branches with exact base/head SHAs, test evidence and explicit deployment status so another authorized chat can continue safely.
