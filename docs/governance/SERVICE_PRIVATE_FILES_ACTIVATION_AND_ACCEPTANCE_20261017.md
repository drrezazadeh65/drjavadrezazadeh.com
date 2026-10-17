# Secure service-file custody — Bertina source-to-production acceptance
**Version:** SERVICE-FILES-V1 · 2026-10-17  
**Owner standard:** `docs/governance/SUPER_MASTER_ALL_SERVICES_VISUAL_IDENTITY_100_PERCENT_20261016.md`  
**Source:** `drrezazadeh65/drjavadrezazadeh.com`, branch `migration/bertina-linux6`  
**Release state:** Source implementation with synthetic/static contract checks. **Not evidence of a deployed, configured, end-to-end file workflow.**

## Purpose and existing capabilities
A paid client already has a verified email account, provider-claim-backed order history, encrypted text brief, a case status and private dashboard. Preserve those contracts. This addition handles **real attached PDF/DOCX artifacts** for that exact paid order, without treating an uploaded file, an owner action or a gateway return as a completed transaction or as independent confirmation of customer receipt.

- Authenticated client: `GET/POST /api/commerce/service-files`, `GET /api/commerce/service-file?id=...`. The verified email must own the order; payment state, amount, provider transaction and claim must match. Uploads are permitted before the case is closed; customer downloads of professional outputs only after `delivered`.
- Fresh-MFA SUPER_ADMIN: `GET/POST /api/admin/operations/commerce/service-files`, `GET /api/admin/operations/commerce/service-file?id=...`. All mutations retain the existing CSRF/origin/rate checks.
- Private metadata: `commerce_service_files`, with composite foreign key to the real `commerce_service_cases`. No original filename, buyer email, document text, plaintext blob, public object URL, card details or payment key is stored in this new table.
- Consent tracking: client uploads require an explicit service-scoped storage and scanning acknowledgment; when the subject is a minor, the buyer must separately attest parent/legal-guardian authority. The table stores only consent version, minor flag, guardian acknowledgment and timestamp. A checkbox does **not** independently verify legal guardianship, and confidential documents remain private.
- Binary custody: 12 MiB limit per file, PDF or macro-free DOCX, MIME+magic/ZIP checks, ClamAV scan, random 192-bit filename, AES-256-GCM envelope with HKDF-derived purpose-specific key, authenticated context `orderId|sku`, outside any document root, directory mode 0700 and blob mode 0600. Restricted to 10 attachments per case per role.
- Actual report handover: `document_handed_over` attestation now requires a **real professional output file ID** and checks case match, existence, authenticated decryption and SHA-256 integrity **before** updating status to `delivered`. A consultant can still attest a genuinely elapsed booked session with the separate session evidence code. Recording a professional output never claims independent customer download, satisfaction, refund or bank settlement.
- Two language interfaces: private order history in `/fa/app/account/orders/` and `/en/app/account/orders/`, and owner queue in operations dashboard. No additional independent gateway.

## Production activation gates — do not skip
1. Confirm trusted TLS, host operator backups and a tested rollback. **No CI job may write to production MySQL.** Only the owner-approved Bertina migration procedure can apply `docs/migrations/20261017_private_service_files.sql`, after the existing Stage09 schema. It is additive and leaves existing orders untouched.
2. Provision **an existing, dedicated directory outside public_html**, preferably `/home/<hosting-account>/private-service-files`. Restrict it to the web-service account at **0700**; never create or place files in a deployable GitHub directory. Check realpath and document root, disk quota, system backups and lifecycle policies.
3. Install the **approved ClamAV executable** at `/usr/bin/clamscan` or `/usr/local/bin/clamscan`, make sure the daemon/signatures are maintained and the website's PHP process can execute it. A missing scanner must fail closed, not silently admit unchecked files.
4. Using the server's **private environment settings or the existing ignored `api/config.local.php` private array** (not a public page or GitHub), configure `JR_SERVICE_PRIVATE_STORAGE=/absolute/private/path`, `JR_SERVICE_AV_BINARY=/usr/bin/clamscan`, `JR_SERVICE_FILES_ENABLED=true` (equivalent private config keys: `service_private_storage`, `service_antivirus_binary`, `service_files_enabled`) and keep `JR_PUBLIC_TLS_CONFIRMED=true` **only if** the trusted production certificate has genuinely been verified. `JR_AUTH_PEPPER` must remain the existing >=32-byte strong secret; never rotate it casually as existing encrypted briefs and attached files depend on it. The new file key is derived in a distinct HKDF context.
5. Ensure PHP has `fileinfo`, `openssl`, `zip` (DOCX), `hash_hkdf`, `proc_open` and adequate upload/post limits to handle a 12 MiB file. The scanner must succeed before encrypted storage.
6. Confirm the 20261016 owner delivery-evidence migration was also applied, then verify its table and `commerce_service_files` InnoDB schema. If any gate is absent, display the verified unavailable state rather than pretending documents were saved.

## Acceptance tests before public release
- Run `php -l api/service-files.php` and `php -l api/index.php`, `php -l api/operations.php`, `php -l api/operations-service-delivery.php`.
- Run `php tests/service-private-files-crypto.php`, `node --test tests/service-private-files-contract.test.mjs tests/service-delivery-evidence-contract.test.mjs tests/service-intake-security-contract.test.mjs` and `php tests/commerce-service-advance-mysql.php` against **only an isolated fixture database**. The GitHub v5 release-candidate CI includes these checks, but a committed workflow is not proof that the job actually ran or passed.
- Verify the private upload and download on desktop and Android mobile in both languages using **synthetic** non-sensitive PDF and DOCX fixtures; check real response codes, file contents, scanned/private ciphertext, upload/retry messages, buyer vs owner access, forced signout, expired MFA, concurrent upload limits and deny-by-default configuration.
- Assert that an unpaid or merely pending order cannot upload or download; other signed-in accounts cannot enumerate UUIDs, list files or read the output; a staff account lacking SUPER_ADMIN cannot upload a deliverable; a completed, cancelled or booked-but-unfinished service cannot be falsely marked delivered.
- Confirm a PDF output is still hidden from the buyer **until the owner deliberately attests a matching, existing and decryptable output**. Then confirm a buyer with verified email can download it, but neither the website nor its emails claim independent buyer acceptance. Repeat with a DOCX after production `zip` and antivirus readiness.
- Validate that Donation, original checkout, BitPay, receipts, order amounts, customer account login, Golden Talent and JHELA have no regressions, and that private file URLs are `noindex`, `no-store`, owner-authorized, never in a sitemap or CDN cache.
- Check server backups include the **private storage directory and its encryption key recovery procedure** in separately secured recovery controls. Retention/deletion requests must be handled without breaking immutable fiscal records.

## Independent client file receipt — added 2026-10-17

The buyer now has a separate, optional **explicit self-attested receipt** action only for the exact professional output released by the owner. The record is not created on a download GET, gateway callback, scheduling change or owner attestation. It is not a quality/satisfaction endorsement, independent network-download proof or bank-settlement certificate.

- Additive migration **after** the private files migration: `docs/migrations/20261017_service_buyer_receipt.sql`, creating `commerce_service_buyer_receipts` with actual output and service-case foreign keys.
- Buyer route: `POST /api/commerce/service-receipt`. Requires an active verified account, same-origin request, rate limiting, provider-claim-matched paid order and exact file-ID equality with the owner's HMACed document-delivery evidence. A draft, a merely completed session, a different order and a false `received` input are rejected.
- Receipt replay is idempotent; first timestamp is preserved. `GET /api/commerce/service-files` projects only the client's permitted output and its real self-receipt status, leaving other internal outputs private.
- Owner panel distinguishes **private draft**, **released output awaiting buyer declaration**, and **buyer self-attested receipt**. No finance, orders, delivery evidence or client satisfaction is automatically mutated.
- CI fixtures: `tests/service-buyer-receipt-contract.test.mjs` and `tests/commerce-service-advance-mysql.php` include schema, wrong-email, no-consent, draft and replay checks. Run PHP/MySQL integration in an isolated fixture before deploying to Bertina.
- New receipt schema not applied means buyer acknowledgement must fail closed without affecting login, payment or already-released file download.

## Operational limits and explicit exclusions
This new feature does **not** claim that antivirus, filesystem, TLS, production DB migration or external operator permissions have been configured. It does not send transactional email or certify that a client downloaded the result. It does not establish academic effectiveness, validation of assessment instruments, actual professional delivery or published journal acceptance. DOCX files remain attachment-only; no public document preview is performed. Future additional file types require separately validated MIME, AV and safe rendering controls.

**Security principle:** Payment identity, file access, real output, owner confirmation, customer receipt and bank settlement are separate records. Keep them separate in both the database and all user-facing wording.


## Operator visibility and fail-closed release gate — 2026-10-17 addition

The **existing bilingual operations dashboard** now shows eleven **boolean-only** prerequisite checks: feature activation, trusted HTTPS, commerce schema, private file schema, non-public storage, antivirus executable, cryptography and key, document parsers, PHP upload capacity, owner-delivery evidence schema and buyer-receipt schema. No path, API key, database password, file metadata or account content appears in this diagnostic panel. The front-end assets in both admin locales are explicitly versioned to bypass stale cached scripts.

**All-or-nothing secure file readiness:** `jrServiceFilesReady()` must reject requests until **both** `commerce_service_delivery_evidence` and `commerce_service_buyer_receipts` have been migrated, in addition to file storage, antivirus, upload and payment schema requirements. Being able to accept a file while having no legal route to actually deliver or acknowledge it must not be described as a complete service. This stricter condition does not gate the preexisting Donation checkout or general customer registration.

The source-level `tests/service-private-files-contract.test.mjs` includes a check for every diagnostic status and the full-cycle schema condition; seven source-contract cases passed in a direct check during this session. A positive source check is **not** proof the private hosting directory, ClamAV, TLS, database migration or browser flow exists on Bertina. The owner should see the exact remaining checks in the dashboard after the nondeploying CI and independent operator review.


### Buyer/owner interface fail-closed visibility — 2026-10-17

A client must not see or be able to submit the confidential-file upload form until the account-bound `GET /api/commerce/service-files` succeeds with the expected private-service-files schema. An unavailable gateway-independent private storage feature, expired session, invalid response or closed view **revokes the upload controls and clears the rendered private-file listing**. Reopening the panel revalidates readiness and authorization. Both the HTML `hidden` property and the element's explicit CSS `display` state are updated because an inline `display:grid` or `display:flex` can override a browser's default `[hidden]` styling. Minor/guardian declarations must remain visually hidden until relevant, and completed-case owner upload controls cannot remain visible.

This is a usability/privacy correctness fix, **not evidence of live Bertina PHP, ClamAV, MySQL, or browser acceptance**. The associated source checks are included in `tests/service-private-files-contract.test.mjs`; final production activation remains owner-gated.
