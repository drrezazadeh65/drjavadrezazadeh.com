# JREI V5.1 — Forward-only development ledger, 23 October 2026

Repository: drrezazadeh65/drjavadrezazadeh.com
Canonical branch: migration/bertina-linux6
Production: Bertina Linux / LiteSpeed / PHP 8.3.35
Mother DB: drjavad1_store

## Historic baseline, not a newly executed test

Two independently signed Windows workers, JREI-NODE-A and JREI-NODE-B, were observed ONLINE after the owner-authorized signature hotfix on 23 October 2026. This confirms the connection milestone at that time, not model inference or continuously available hardware. Do not rerun initialisation, regenerate private keys, re-register public keys, change UUIDs or rerun the one-file signature hotfix.

## Development changes in canonical branch

1. Versioned educational public-corpus registry, with PENDING/APPROVED/SUSPENDED owner decisions and rights metadata, exact dataset/evidence digests, a reviewed-case count and canonical baseline BM25 policy fingerprint.
2. Matching approved corpus and evaluation versions to signed node offers; pre-lease approval locking to prevent new dispatches racing with owner suspension; suspension quarantines in-flight results and cancels pending jobs.
3. Signed offer metadata to report what each machine declares available, with distinction between matching approved versions and nonmatching/missing offers.
4. Original MFA, CSRF and SUPER_ADMIN control plane now supports corpus proposal/approval/suspension, queue requests, audited review of returned aggregates, and explanation of incomplete node eligibility.
5. Local read-only public-corpus manifest generator; does not reconfigure a PC, send raw evidence, change identities or certify independent review.
6. Governed educational source registry and proposal history, including rights, publisher, declared versions, document hashes, suspension and metadata-only human decisions; no automatic publication.
7. Pure bounded source-intake provenance/change-detection module. It does NOT make HTTP requests or claim a live crawler. Future acquisition needs independently approved public HTTPS transport, DNS pinning, robots/access terms enforcement, extraction and audit.
8. PHP policy-hash canonicalization matches the Node evaluator order b,k1,maxEvidence; this prevents an erroneous stale-policy block.
9. Existing public assistant fallback, customer accounts, payments, SEO URLs and working node identities are not intentionally changed.

## Release state

Two additive migrations are STAGED ONLY:
- docs/migrations/20261023_jrei_governed_corpus_mother_mysql.sql
- docs/migrations/20261023_jrei_governed_source_registry_mother_mysql.sql

Neither new migration has been applied. No intermediate automated/manual test, live evaluation, server deployment, model download, inference runtime activation or production source crawl has been executed in this batch, following the owner's explicit instruction.

Both private Windows configurations were last reported with datasets: []; no independently reviewed public evaluation corpus has been supplied. The approved-dataset route cannot be accepted end-to-end without real licensed public data, at least 200 separately reviewed held-out cases, independent checks and operator authorization. Existing JREI local-model code remains a staged adapter, NOT a proven live LLM. Broader 117 website requirements remain to be reconciled with their canonical tracker; they are not claimed complete.

## Final owner-authorized acceptance campaign (deferred; do not run now)

1. Freeze the intended commit SHA and inspect current Bertina mother-DB schema, credentials boundaries and released files; back up working state.
2. Apply only the new additive migrations after schema review and explicit authorization; NEVER rerun the original node registration migration.
3. Review licence, provenance and independent truth labels for a real public holdout with at least 200 cases; compute its manifest locally. Approve the version in the original master dashboard.
4. Provision matching, per-PC public dataset entries in each machine's existing private config without regenerating private keys or UUIDs.
5. Run consolidated PHP/Node/JS syntax and contract checks, worker signature/authentication, version/digest matchup, queue/lease/expiry/recovery, result receipt, manual review, concurrency, CPU/RAM limits, disconnection, suspension, revocation and privacy controls.
6. Separately assess scientific truth labels, multilingual quality, coverage, fairness, licence and source integrity. Never equate signed Worker reports with independent scientific verification.
7. Verify protected original functions: users, payment processing, MFA/CSRF, SEO/GEO, journal, bilingual admin experience, and public static fallback.
8. Produce acceptance evidence and release manifest. Only the owner explicitly authorizes and performs production deployment.

Status: SOURCE IMPLEMENTED IN DEVELOPMENT; NOT TESTED, NOT DEPLOYED, NOT SCIENTIFICALLY VALIDATED.


## Continued source development — model provenance, acquisition and dispatch diagnostics

- A new owner-invoked HTTPS intake adapter stages document provenance only. It uses approved HTTPS sources, public-address DNS pinning, strict transport bounds, explicit rights confirmation, robots directives and no redirects. The CLI stores no fetched text by default. **Neither the adapter nor a source crawl has been executed.**
- The separate claim-level gate refuses unchecked local model drafts, verifies each quoted extract against the specifically cited approved passage and screens uncited numerical claims. It can only mark a draft eligible for another human-controlled review; no automatically published answer is authorized.
- A Windows localhost-only inference coordinator is added as a development source. It cannot install model weights, call paid inference, execute arbitrary shell commands or change signed Worker allowlists. It returns review decisions and claim digests, not public model output.
- Additive model metadata registry migration `docs/migrations/20261023_jrei_model_registry_mother_mysql.sql` records rights and artifact SHA-256, with runtime/performance markers remaining UNKNOWN until final authorized acceptance.
- Model version/rights actions and metrics placeholders are present in the original bilingual MFA-protected dashboard. A read-only Windows GGUF checksum CLI is staged. No model download, checksum execution, runtime benchmark or live inference has been undertaken.
- Per-node dispatch diagnostics now distinguish suspended/offline/busy nodes, missing approved corpus, absent advertised version and an existing matching queue, querying authoritative mother DB records rather than claiming successful execution.
- During continued development, a malformed robots-parser source edit was detected and repaired at source level. **It has not yet undergone the deferred consolidated test campaign.**

## Operational constraints still unresolved

The two Windows nodes previously connected with signed telemetry, but their locally approved dataset arrays were last known to be empty. No independently reviewed public corpus has been delivered and no licence-approved GGUF inference runtime has been installed or accepted. Owner-authorized additive migrations, separate local configuration updates, a genuinely reviewed 200+ case evaluation and all final acceptance tests remain outstanding.

**Do not migrate, run tests, activate AI weights or deploy from this development ledger.** The entire final safety, syntax, transport, scientific, UX and regression acceptance is deferred by explicit owner instruction. Record a fresh branch SHA and check all concurrent changes before the eventual release.

## 23 October 2026 — continued source-only protection and integrity work

The owner explicitly directed continued development of the complete 117-atomic programme without any interim tests, builds, runtime checks, migrations or production deployment. Work below is code committed to the canonical development branch only:

- `e3a6e1d83eaa359c402e600bd22821b54a8deef2`: Removed a duplicate global PHP `jrHybridOwnerDispatchDiagnostics` declaration from `api/jrei-hybrid-owner-corpus.php`. The dedicated `api/jrei-hybrid-diagnostics.php` function is retained by the established owner API; duplicate declaration had created a source-level PHP redeclaration risk.
- `ac9453b1e49c8abb37f9965cc76387b52f941101`: Under the existing registry-first transaction lock, metadata approval now rejects a source-version proposal whose recorded predecessor differs from the currently approved source fingerprint. Manual rejection remains possible; concurrent proposals cannot silently roll an approved digest backward. Successful write row counts are checked.
- `e61681310bb5dcac00efdd91ddccd4b032d12081`: Immutable duplicate source digests report their actual persisted review status and existing proposal ID, rather than falsely claiming a rejected/reviewed proposal was reopened as PENDING_REVIEW.
- `2b97dffb885a21966ac6c0ddd5c83d2a7b313c6a` and `79b7494f705a4005b256d109bf744c7f499bf849`: Added and source-corrected a shared Persian/Arabic digit-aware direct-identifier screening helper. It is a conservative detection layer, not anonymization or permission to ingest private records.
- `d2e7fb4f4338b4d990495c631ee624f96d0bdf09` and `a89eda7f786f6b3f6ebc96f2f14a33fa315180af`: Applied the shared screen to the independent draft claim gate and pre-inference Windows source prompt, without changing the existing public STATIC_BROWSER_FALLBACK or activating local weights.

**Trace to the unchanged original 117 ledger:** GOV-05, GOV-06, DB-04, DB-05, AI-03, AID-06, AID-08, DASH-04, REL-01. These improvements address concrete source-level risks and **do not** transition any atomic requirement to a QA pass.

**Deferred acceptance:** Consolidated PHP syntax/load, source-digest predecessor concurrency, duplicate-proposal status, Persian/Arabic numeral screening, local-adapter import and public-assistant fallback regression checks have NOT RUN. Windows Node A/B registration and earlier observed connectivity are preserved by source scope, but ongoing connection has not been newly verified. No host, mother DB, private configuration, model weight, payment route or public URL has been changed.
