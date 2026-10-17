# JR Future Publishing: real-money activation handoff (Bertina only)
Date: 2026-10-17 · TARGET: first paid PDF bundle · STATUS: SOURCE IMPLEMENTED, NOT ACTIVE ON LIVE HOST

## Owner instruction
Owner explicitly approved commercial pricing and opening PDF payments on 2026-10-17. This is an authorization to offer the product, not a representation that independent author rights or bank delivery tests have been completed. The author contract is a **nonbinding, read-only draft** in the author's authenticated panel. Signing and negotiated amendments are later and separate from the commercial owner's approval. The scientifically unreviewed or disputed answers must be disclosed honestly; do not invent academic approval.

## Fixed buyer price & gross allocation (toman)
Buyer pays 1,000,000. Author entitlement = 600,000. Talent-support fund earmark = 400,000. A further 70,000 (7% of buyer gross) is an independent platform reserve, borne from a SEPARATE platform budget. The reserve is not a statutory tax rate, it must never reduce author or fund amounts, and 1,070,000 total obligations require at least 70,000 platform subsidy (plus gateway/other external costs). Actual taxes and disbursements must be reconciled separately.

## Source paths
- Public Persian SEO sales page: `fa/shop/authors/mehrab-mirkarimi/index.html`
- Buyer checkout JS: `assets/js/jr-publishing-checkout-v1.js`
- Existing BitPay payment gateway/controller: `api/index.php`, `api/commerce-stage9.php`
- New PHP bank-checked digital offer/entitlements/download: `api/internal/jr-publishing-digital.php`
- Authenticated author financial dashboard: `fa/app/author/`, `api/publishing.php`
- Private draft (read only): `api/internal/jr-publishing-contract-draft.php`
- Email worker: `api/internal/jr-publishing-mailer.php` and `api/internal/jr-publishing-mail-worker.php`
- One-time private seeder: `api/internal/jr-publishing-provision-cli.php`
- Required MySQL tables: `docs/migrations/20261017_jr_future_publishing.sql`, followed by `docs/migrations/20261017_jr_publishing_contract_and_reserve.sql`
- Nondeployment CI: `.github/workflows/v5-release-candidate.yml`

## Files required in private host custody
Two unmodified uploaded PDFs are **only** in the ChatGPT staging archive, not in GitHub, not in Bertina private storage. Archive: `JR_Publishing_PDF_Private_Server_Staging_v2.zip`; this archive must be transferred securely by the operator to the owner's private server, NOT to public_html or an accessible URL.
- questions: `tefl_1370_1405_questions.pdf` (3,660,392 bytes), SHA256 `6245641c453e92ee005c4176575ef315b96ac72fd8535b7e3ff67c2369dda7c8`
- answers: `tefl_1370_1405_answers.pdf` (7,656,609 bytes), SHA256 `db8070f8a88723c1947a094a461ad2f703192092b09f03255867bbab53fa2ab4`
PDF 425 + 572 = 997 pages. Verify antivirus and filesystem checks before any offer is admitted to checkout.

## Operator action order (never publish a bypass)
1. Obtain documented confirmation of author's **digital distribution** permission (it can precede final negotiated contract, but must exist). Record hash of author consent as a private evidence file; do not fake signature/consent. Verify whether redistributed past exam questions require additional permissions.
2. Ensure contributor signs in with a real email-verified customer account; privately bind his author role and email through MySQL. User-provided author mailbox should not be written in public GitHub source, logs, analytics, or user-facing pages.
3. Confirm hosting backups; apply **canonical** publishing base SQL, then additive contract/overhead SQL in a Bertina staging database; check foreign keys, rollback procedure and real MySQL 8 compatibility. Do not apply similarly named `jr_pub_` experimental migrations. Only then apply reviewed migration to the live MySQL DB.
4. Place both exact PDFs in a restricted directory outside /public_html, check perms and SHA256, scan with antivirus; verify that static, PHP, or direct URL access never exposes private bytes.
5. Ensure existing BitPay checkout, PHP CLI, TLS, SMTP and Stage09 order storage are functional. In server-private environment/config, set: `JR_PUBLISHING_PRIVATE_STORAGE` = absolute private folder, `JR_PUBLISHING_AUTHOR_EMAIL` = verified author's email, `JR_PUBLISHING_RIGHTS_EVIDENCE_SHA256` = independently verified rights record digest, `JR_PUBLISHING_OWNER_APPROVED=YES_20261017`, `JR_PUBLISHING_DIGITAL_RIGHTS_EVIDENCED=YES`, `JR_PUBLISHING_ANTIVIRUS_COMPLETE=YES`, `JR_PUBLISHING_SEPARATE_7PCT_BUDGET=YES`. Then set `JR_PUBLISHING_DIGITAL_ENABLED=true` only after all other checks pass.
6. Execute the private, CLI-only provisioning script once using authorized hosting operator credentials. It refuses duplicate author slugs, missing account verification, incomplete evidence, mismatched files, unconfigured SMTP/payment, wrong hash and absent schema. It never submits a payment itself. NOTE the script currently seeds an activated SKU after its strict checks: do not run on public production until ready to sell.
7. Schedule `php /path/public_html/api/internal/jr-publishing-mail-worker.php` via hosting's privileged cron once per 5–15 minutes to recover failed SMTP dispatch; cron must have private runtime configuration. No CLI access should ever be exposed through HTTP. Confirm `api/internal/.htaccess` denies public.
8. Validate /api/publishing/offer ONLY once all gates pass; it must return `checkoutEnabled=true` and price 1000000, otherwise the customer form must stay hidden. Perform a controlled **real** transaction with authorised owner buyer, bank verification, 2 separate private grant links, two functioning PDFs, buyer email, author email, two 600000/400000 immutable allocations, independent 70000 platform reserve, replay-safe callbacks, no duplicate messages and refund/manual redress. Restore/de-duplicate test accounting as necessary; never label test sale as beneficiary disbursement.
9. Verify mobile, screenreader, privacy/noindex, page indexing/SEO, complaint/refund disclosures, checkout and status flows, CI and browser run; obtain owner approval for final *staged code release* without disabling the global independent release masterplan, before going live.

## Known blockers today (not presumed fixed)
- No Bertina private SSH/SFTP/cPanel/MySQL write connection is available through this ChatGPT conversation. GitHub file commits alone cannot upload two PDF bytes, provision account, execute MySQL migrations, configure SMTP cron or prove a real bank transaction.
- No author distribution authorization was supplied in chat; the owner authorised sales for the *site*, but author's copyright permission is a distinct matter.
- Author's registered, verified website account has not been established by these tools.
- Signed final contract isn't present, but the owner specifically requested its **draft preview now**, and separate rights evidence for sales.
- Scientific review is still ongoing, transparently disclosed, and is not automatically represented as approved.
- The existing global full-site publication gate remains blocked; only a separately reviewed release process can make code live.
- The 7% extra platform budget has not been reconciled to a real bank source.
- Source CI pass (PHP lint, SEO, accounting guards) is not a substitute for live payments or fulfilment tests.

## Release criterion
**Do not call this product LIVE until a test customer pays through the real gateway and receives exactly two working secured PDF downloads, the author receives a separate genuine notification, and the operator can reconcile 60/40 and 7% against actual payment evidence.** No shortcut or placeholder file URL can satisfy this condition.

## 2026-10-17 operational hardening amendment
- A separate CLI-only read-only audit is available at `api/internal/jr-publishing-preflight-cli.php` for host operators. It checks staging configuration, schema, registered author and digital rights record, both private PDFs and exact hashes, bank/SMTP configuration, privacy and cron readiness. It prints no credentials and performs no charges, account mutations or email sends. **Its output always records ready_for_public_sales=false** because owner-set environment switches, by themselves, do not substantiate real bank delivery, legal permission or bank reconciliation. A host operator must review evidence separately.
- `jr-publishing-mailer.php` now checks that the grant list contains exactly one questions PDF and one answers PDF. SMTP outcomes that could have succeeded but lack a persisted delivery record are treated as ambiguous, never automatically re-sent. `jr-publishing-mail-worker.php` puts abandoned processing leases in the dead-letter state for operator reconciliation. An explicit SMTP rejection can be retried within the allowed budget.
- `tests/jr-publishing-digital-payment-guard.test.mjs` enforces the private digital delivery, deferred queue behaviour, no fake public-release flag and safe two-PDF links. Source CI is still not equivalent to real-world payment.
- Operator must monitor dead_letter records (without exposing buyer identity or the download token in logs), reconcile ambiguous send status against actual SMTP evidence, and only manually retry with documented reason.
- The two exact original PDF hashes inside `JR_Publishing_PDF_Private_Server_Staging_v2.zip` were rechecked using SHA-256 and the ZIP passed archive integrity testing in the preparation container. This does not prove files were transferred to Bertina.
- Commercial authorisation has been explicitly given by the website owner. The separate author licence and third-party exam-content rights must still be recorded; the draft contract itself is not that licence.
- Current program status is **private implementation and staged handoff, not paid live activation**: no host filesystem/database/SMTP operational access exists within this conversation.

## Secure original-PDF archive extraction (2026-10-17 update)
The CLI-only private installer has been added at api/internal/jr-publishing-private-install-cli.php. The two-PDF archive is still in the conversation working files; it is NOT present on Bertina until independently transferred by the hosting operator.

1. In Bertina cPanel File Manager, create /home/ACCOUNT/private-inbox/ and /home/ACCOUNT/jr-publishing-private/, both OUTSIDE /home/ACCOUNT/public_html/. Confirm directory owner and PHP runtime permissions.
2. Upload the verified JR_Publishing_PDF_Private_Server_Staging_v2.zip into the private-inbox directory. Never upload or extract it inside public_html, a public upload folder, GitHub or a CDN.
3. After deploying the CLI-only PHP installer with the site's normal controlled release, execute via authenticated Terminal/SSH (NOT an HTTP address):
   php /home/ACCOUNT/public_html/api/internal/jr-publishing-private-install-cli.php --archive=/home/ACCOUNT/private-inbox/JR_Publishing_PDF_Private_Server_Staging_v2.zip --dest=/home/ACCOUNT/jr-publishing-private --confirm=INSTALL_VERIFIED_PRIVATE_PDFS
4. The installer rejects wrong SHA256, unexpected archive paths, wrong sizes, wrong PDF signatures, public document root, symlink targets, existing mismatched files and missing ZipArchive. It saves two exact PDFs with 0640 permissions and never turns payments on. If ZipArchive is missing, hosting support must enable it; NEVER use public_html extraction as a workaround.
5. In the private host configuration set JR_PUBLISHING_PRIVATE_STORAGE=/home/ACCOUNT/jr-publishing-private after installation. Separately complete genuine malware scan and author-rights verification evidence.
6. Only apply audited canonical MySQL migrations after an independent tested backup. Register the verified author account and a genuine digital distribution permission. Preserve the nonbinding contract draft for separate later negotiation.
7. Run the private read-only preflight and test SMTP delivery, signed-link downloads, dead-letter handling and external 7% cost provision.
8. Carry out a controlled real BitPay test: verified amount and factor, buyer gets exactly two different PDF links and both resolve, author receives one sale notice, one 600k/400k split pair, separate 70k platform reserve, callback replay creates no duplicates. Activate public sales only after actual site-level verification.

GitHub CI success is not evidence of production transactions or email inbox delivery.


## Corrected operator ZIP — four-member installer contract (2026-10-17)

The earlier two-member PDF-only staging ZIP was valid as a ZIP but NOT valid input to the existing `jr-publishing-private-install-cli.php`: that installer explicitly requires four exact members. Do NOT upload or run the old PDF-only ZIP. The corrected operator package is `JR_Publishing_PDF_Private_Server_Staging_v2.zip` (the **private conversation download**, not a public GitHub asset), ZIP SHA-256 `a0fb784d92f0b3b40fc03f370444bfda41af40a1dc72d6b90568c4c9ffcdbbcf`, compressed size **9,031,196 bytes**. It contains precisely `tefl_1370_1405_questions.pdf`, `tefl_1370_1405_answers.pdf`, `private-asset-manifest.json` and `READ_ME_PRIVATE_DEPLOYMENT.txt` (no directories, binaries, bank credentials, signatures or personal email). The schema inside the manifest is `jr-private-publishing-upload-v1`, with two exact pinned original PDF sizes and SHA-256 digests as listed above. Python ZipFile CRC and bytewise original PDF SHA-256 verification passed. The server installer has NOT yet been executed on Bertina, and host ZipArchive availability / scan / secure directory permissions remain unverified.

The operator MUST verify this exact ZIP SHA before the private upload and MUST use `--archive` pointing to the new v2 filename, not the old PDF-only package. Use the current CLI-only installer unchanged, validate storage outside `public_html`, and keep digital checkout disabled until all rights, funding, bank, SMTP, receipts and owner-approval gates are genuinely satisfied.

## Source QA checkpoint for corrected mobile + publishing checkout (2026-10-17)

Code candidate `1d0f1a662231c284e1299e44266b5702b485f26e`: the seven matching nondeploying Actions workflows all concluded `success`, including [Browser QA](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39038401698), [v5.1.0 nondeploying candidate](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39038401748), [SEO/GEO](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39038401723), [Bertina Master SEO](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39038401722), [Provider Guard](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39038401687), [Progressive Release Policy](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39038401709) and [Safe Scientific Experience](https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/39038401742). This proves source/browser checks only, NOT deployment. Buyer checkout now fails closed on uncertain payment outcomes and permits only the exact same-origin gateway relay, with regression test. Storefront mobile QA now correctly checks the preserved third Persian author-link and two English controls rather than deleting approved navigation. No money, private production files, DB data or external author consent was touched.
