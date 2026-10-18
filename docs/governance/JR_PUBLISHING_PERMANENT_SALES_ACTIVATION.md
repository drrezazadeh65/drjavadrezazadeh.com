# JR Future Publishing — Permanent Digital Sales Operating Standard
Owner direction: 2026-10-18. Scope: the TEFL MA questions-and-answers two-PDF bundle, SKU `digital:tefl-ma-exams-1370-1405`.

## Commercial decision — permanent, not a temporary pilot

The owner directs that the sales feature remain an active, first-class part of the website, rather than be routinely disabled at each release. The owner accepts commercial operational responsibility. **This does not fabricate an author's copyright permission, a completed malware scan, an actual payment, or a delivered PDF.** A checkout that cannot deliver the purchased files must not collect funds.

The proven Bertina one-click deployment workflow #395 is FROZEN and SHALL NOT be edited. Its `phased_live_audit` scope intentionally defers PDF installation, SQL migrations, payouts and full certification. Product activation is a separate, explicitly authorized, private **host operation**; no deployment change is necessary.

## Source now supports persistent sales activation

- `api/internal/jr-publishing-digital.php`: the offer uses an operator-only durable switch `publishing_digital_enabled => true` in the private `api/config.local.php`, OR a real server `JR_PUBLISHING_DIGITAL_ENABLED=true` environment variable. Neither is set by GitHub code or a buyer.
- `api/internal/jr-publishing-activate-existing-cli.php`: `--check` is read-only. `--activate` only promotes the EXISTING author/work/offer in a transaction after verified account, approved author role, separately documented distribution licence, exact private PDFs, approved scan records, bank/SMTP, mail cron and separate 7% platform funding are present. It never invents a signature, inserts rights or scan records, re-seeds an existing author, or migrates schema.
- `/api/publishing/offer`: public checkout becomes available only when the existing BitPay and publishing preflight actually pass. The browser is never the source of truth.
- Once activated, neither code deployment nor the frozen workflow should reset `publishing_offers.checkout_enabled` or the private config switch. Temporary service outages can still suspend **transactions** through the protective preflight until restored.

## Bertina operator execution (private, not GitHub)

1. Preserve the already-installed publishing tables and existing author/work/offer rows; do not run the first-time seeder against existing records or create parallel tables. Confirm a verified customer account for the actual author and its approved `publishing_author_accounts` mapping. Verify a real, attributable `digital_distribution` licence and original-content permissions; store only its genuine evidence digest in `publishing_rights_licences`.
2. Verify both PDFs outside `public_html` against the pinned original SHA-256 values, real malware-scan reports, and set `publishing_private_assets.malware_scanned_at` and `approved_at` only for independently inspected assets. Confirm existing BitPay, TLS, SMTP, delivery cron, refund route and the separately financed 70,000-toman reserve.
3. In private `/home/drjavad1/public_html/api/config.local.php` (never GitHub), merge `'publishing_digital_enabled' => true` into the array returned by that existing file. Do not overwrite or expose other config entries. Alternatively use a persistently configured server environment variable. Keep `publishing_private_storage` pointed to the actual private PDF directory.
4. From authenticated cPanel Terminal/SSH with the site's private runtime configuration, provide actual evidence-confirmation variables and run:
   ```sh
   php /home/drjavad1/public_html/api/internal/jr-publishing-activate-existing-cli.php --check
   ```
   Review `missing_checks`; resolve each against real source evidence. Never set a flag to YES merely to pass a test. The owner approval flag is `JR_PUBLISHING_OWNER_APPROVED=YES_20261017`. Required independent operator flags include `JR_PUBLISHING_DIGITAL_RIGHTS_EVIDENCED=YES`, `JR_PUBLISHING_ANTIVIRUS_COMPLETE=YES`, `JR_PUBLISHING_SEPARATE_7PCT_BUDGET=YES`, and `JR_PUBLISHING_MAIL_CRON_TESTED=YES`.
5. Only when `--check` returns `all_checks_passed:true`, run:
   ```sh
   php /home/drjavad1/public_html/api/internal/jr-publishing-activate-existing-cli.php --activate
   ```
   It is idempotent and rolls back on failed post-activation catalogue validation.
6. Independently verify `https://drjavadrezazadeh.com/api/publishing/offer` returns `available:true`, `checkoutEnabled:true`, `priceToman:1000000`. Perform a real owner-authorized test purchase with a verified BitPay payment, buyer and author emails, two working private PDF links, five downloads each within seven days, idempotent callbacks and proper 600,000/400,000 accounting. Check the additional 70,000 platform reserve is separately funded. Do not call live paid sales *verified* until this test passes.

## Known real-world activation limitations

GitHub repository write access is **not** access to Bertina private config, customer accounts, MySQL, author-rights evidence, file scanning, SMTP or the bank account. Committing this source does not turn on the current production product. The last observed public offer had `checkoutEnabled:false`. A prior operator view showed the author unregistered/unverified, rights/asset approvals pending, and the offer disabled; these facts must be rechecked on Bertina.

## No-regression commitments

Price 1,000,000 toman; gross split 600,000 author / 400,000 talent fund; independent platform reserve 70,000; private original PDFs; verified payment only; two unique download links; no duplicate charge or author notification; all private pages noindex/no-store. Never change the frozen deployment process to force a commercial activation.
