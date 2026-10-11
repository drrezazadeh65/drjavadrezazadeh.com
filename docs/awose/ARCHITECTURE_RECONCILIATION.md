# Unified 13-engine Control Center and AWOSE reconciliation

Both owner-supplied master prompts were read in full: Website v4.4.1 (637 lines) and AWOSE v1.0 (2018 lines). This is the combined implementation contract, not a completion claim.

## Actual current production

GitHub source is `migration/bertina-linux6`, deployed to Bertina PHP/MySQL/LiteSpeed. `main` is a separate older/different line and must not overwrite this release. The previous local draft base0273e4e1 is stale: production advanced186commits to73cdbf8a, then to1cfeb14e during read-only review. Both live shop pages carry the exact deployed SHA. Preserve the new3D bookstore hero, bilingual checkout/cart feedback, strict bank amount/retry protections, donations, consent-controlled sponsor dashboard, owner-directed410 retirements and existing tests. No stale full-file replacement is permitted.

The73cdbf8a deployment verified570managedchecksums,6TLS cases and55browser tests. Its final historical URL gate failed112/137: some HTTP/www retired URLs return410plusLocation to404. The artifact is live; the overall release is not fully certified. A newer production change0d444b18 already replaces the internal410ErrorDocument subrequest with an inline native Gone response and tests its safety. Preserve that new change; this reconciliation does not replace its response or verifier. The new release still requires its own final live certification.

Anonymous live health currently reports Auth ready, book checkout enabled and donations enabled. This establishes runtime configuration, not independent bank settlement or inbox delivery. The bookstore was checked in a real Chromium browser forFA/EN at320,390,430,768and1440pixels: zero horizontaloverflow, three add-book controls, hero visible, zero JavaScript errors. Read-only review blocked all non-GET/HEAD requests.

## One canonical architecture

Keep ENG-01..ENG-13 and their exact names from the13engine prompt. Engines01–12own domain execution; ENG-13owns reporting, audit and explanation. AWOSE is shared execution/policy/memory infrastructure under unified administration and operations, with evidence consumed by ENG-13. It does not replace or rename domain engines.

Keep every immutable action ID ENG-XX.ACT-NNN. Extend its versioned contract with AWOSE input/output schemas, risk, idempotency, timeout, retry, side effects, verification, rollback/compensation, logging and compatibility. Unimplemented executors remain explicitly unavailable. Unknown actions, shell commands, SQL, paths or generated code from a browser are denied.

Preserve the36original OP reports and their history. The new36domain views are12engines×3perspectives (health, execution/recovery, learning/improvement), backed by the same records. They do not replace, renumber or pretend to be identical to the36original reports. ENG-13also supports executive, per-engine, per-action and consolidated master reporting. Existing estimates, measured completion, evidence coverage, production readiness and commercial readiness remain separate.

The first prompt defines RAVE as analytical/business intelligence; AWOSE mentions an assessment-related equivalent only conditionally. Inspect and map authentic existing RAVE capabilities before connecting analytics or assessment logic. Never invent psychometric rules or mutate scientific interpretation through learned technical playbooks.

## Durable operation without a connected AI assistant

Implement DISCOVER→DIAGNOSE→RECALL→PLAN→AUTHORIZE→EXECUTE→VERIFY→LEARN→MONITOR. MySQL jobs require immutable version/input references, idempotency, resource locks, leases, bounded retries/dead letters and restart recovery. Deterministic executors and scheduling must run without generative AI. Optional AI can prepare proposals, not grant permissions or deploy generated code.

Persist experiences, incident/evidence references, normalized error fingerprints, successful and failed interventions, compatibility, verified playbook versions and capability gaps. Approved automation policy is separate from learned content. Promotion is OBSERVED→TESTED→VERIFIED→APPROVED→AUTOMATABLE; stale or unsafe knowledge is suspended. Untrusted logs/content never become authority.

Reuse existing PHP administrator MFA/CSRF/object-scope controls and append-only evidence ledger. Do not expose private operational data or store passwords, keys, raw payment credentials or child/research records in operational memory. APIs stay same-origin and no-store/noindex. Heavy source checks use verified GitHub adapters; production cannot assume a persistent Node worker. Cron and workflow-dispatch authority must be demonstrated before claiming autonomous scheduling.

## Authorization and execution order

The owner previously authorized development/deployment, a restricted10000toman payment procedure, and private use of BITPAY_API_KEY. The AWOSE document does not grant broader financial/credential authority; the prior narrow authorization remains scoped and does not imply refunds, donations, credential rotation or destructive actions. Reuse the already-configured private gateway rather than reinstalling it or disabling existing commerce. Human bank/MFA steps and independently verified receipts remain distinct.

Preserve the owner's commerce-first priority, with SEO/security/mobile gates. First reconcile current source/live state; resolve the failed historical gate; then apply only still-needed account/mail/inventory changes against the fresh code, with compatible encrypted backup/readback and tested recovery before schema promotion. Existing pending/paid book orders must be reconciled before initial stock migration; do not reset stock or strand current bank callbacks.

Next integrate the canonical engine/action registry and reports, build the AWOSE durable core and learning foundation, prove a controlled detect→repair→verify→remember→reuse SEO cycle without AI, then add approved schedules and other domain workflows. External indexing, scientific validation, bank reconciliation and physical delivery remain evidence-dependent.

`discovery.json` is the initial machine-readable capability inventory. Source presence is classified conservatively. Later actual jobs/releases update evidence, not percentages by assertion. Preserve a resumable ledger and do not claim background work after a session ends.
