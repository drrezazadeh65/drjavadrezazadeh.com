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
Two unmodified uploaded PDFs are **only** in the ChatGPT staging archive, not in GitHub, not in Bertina private storage. Archive: `JR_Publishing_PDF_Private_Server_Staging.zip`; this archive must be transferred securely by the operator to the owner's private server, NOT to public_html or an accessible URL.
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
- The two exact original PDF hashes inside `JR_Publishing_PDF_Private_Server_Staging.zip` were rechecked using SHA-256 and the ZIP passed archive integrity testing in the preparation container. This does not prove files were transferred to Bertina.
- Commercial authorisation has been explicitly given by the website owner. The separate author licence and third-party exam-content rights must still be recorded; the draft contract itself is not that licence.
- Current program status is **private implementation and staged handoff, not paid live activation**: no host filesystem/database/SMTP operational access exists within this conversation.
