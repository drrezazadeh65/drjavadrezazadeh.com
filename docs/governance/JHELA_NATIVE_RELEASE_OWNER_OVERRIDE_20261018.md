# JHELA Native Release — Latest Owner Override (18 October 2026)

**Priority:** Later explicit instruction, superseding incompatible earlier 18–27 October OJS/manuscript suspension and planning-only restrictions. Historic documents remain unchanged for audit. This decision is not proof of production activation.

## Owner instruction
- Discard the 27 October calendar hold. Build the native scholarly publishing system now, in the single existing repository and Bertina mother database. No OJS reinstallation or OJS runtime dependency.
- Prepare the integrated native editorial, author, reviewer, finance, publication, international metadata and mobile bilingual experiences for one owner-controlled release candidate; avoid unnecessary fragmented releases.
- Owner authorizes preliminary manuscript creation and confidential PDF intake **only when all technical security controls pass**. This does not authorize accepting malware, publicly exposing PDFs, waiving account verification, or presenting intake as peer-reviewed publication.
- After publication, assess 100% operational readiness using independent evidence for **every promised user journey**. Do not assert 100% merely because CI/deployment is green.

## Current implemented delta
- Removed the historical unconditional PHP/JS intake pause. Host-controlled `JR_JHELA_INTAKE_ENABLED` remains **off by default** and blocks creation/upload before DB access unless explicitly enabled.
- Existing verified-email session, same-origin protection, rate limiting, owner-scoped manuscript records, TLS readiness, private storage outside public_html, antivirus execution, file MIME/magic/size/hash, atomic DB receipt and event log remain mandatory.
- Bilingual public submission pages display availability as conditional, never claim unverified receipt. The author workspace shows forms only if `/api/journal/intake/health` returns `manuscriptIntake: true`.
- This change does **not** activate native editorial review, financial checkout, public DOI registration, ISSN, indexing or article publication. All require their own real end-to-end gates.

## Mandatory live preflight (never hardcode secrets in Git)
1. Confirm the active deployment commit and safe, correctly configured `https://drjavadrezazadeh.com/journal/` / verified account session.
2. Confirm `drjavad1_store` is the only active database, existing five `jhela_*` tables are correct, all FK relationships intact, and no old OJS is invoked.
3. Provision a writable private journal file directory **outside** the document root and source tree with strict filesystem ownership, and an executable trusted `/usr/bin/clamscan` or `/usr/local/bin/clamscan`; test an actual clean sample and rejected malicious sample in a safe staging environment.
4. Set `JR_JHELA_PRIVATE_STORAGE` and `JR_JHELA_AV_BINARY` in secure host configuration, verify `cfg()['public_tls_confirmed']===true`, then set `JR_JHELA_INTAKE_ENABLED=true` only after all checks. Never commit local credentials.
5. Exercise verified author profile → metadata create → private PDF upload → unique receipt → owner-only dashboard/history → retry/concurrency → rejection of wrong user/oversized/non-PDF/unsafe request. Confirm no public or indexed PDF URL.
6. Separately test reviewer opt-in, editorial RBAC/COI, confidential review, decisions, finance and public article metadata before claiming full scholarly platform operational. A preliminary receipt is not peer review or acceptance.
7. Release through the **existing** owner-operated `.github/workflows/deploy-bertina.yml` only after matching CI, regression and real Bertina acceptance evidence. Do not bypass the deployment guards or silently modify hosting.

## Current evidence and no-go
The previous public journal recovery deploy #397 succeeded; that does not certify native intake or complete scholarly operations. Until the above gates are demonstrated, `publicIntakeReady=false`, `nativePublishingWorkflowOperational=false` and `independentReviewOrAcceptanceOperational=false` remain accurate. Never invent live receipts, DOI, editorial appointments or fee transactions.
