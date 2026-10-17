# MASTER PLAN — Modular Mother Database · DrJavad Academic Ecosystem
**نسخه 1.0 | ۲۵ مهر ۱۴۰۵ / 2026-10-17 | CANONICAL ARCHITECTURE / PREDEPLOYMENT PLAN**
> **OPERATIONAL UPDATE — 2026-10-17 (owner-executed on Bertina):** The earlier *PREDEPLOYMENT PLAN* and deferred-DDL instructions below are historical planning records. The owner has since explicitly authorized and manually executed the 28 additive MariaDB table creations. phpMyAdmin screenshots confirm **253 BASE TABLEs in `drjavad1_store`**, including **225 baseline + 3 services + 5 JHELA intake + 20 publishing**, and audit counts for the 28 additions: **28 InnoDB, 28 utf8mb4_unicode_ci, 41 foreign-key constraints, 44 referenced columns**. Their exact names and provenance (no rows or secrets) are in the [sanitized observed schema catalog](BERTINA_OBSERVED_TABLE_CATALOG_20261017.json). This is **HOST_SCHEMA_SCREENSHOT_VERIFIED**, not independent authenticated runtime E2E, payment activation, a tested restore or permission to deploy. The main database default remains `latin1_swedish_ci` (pre-existing legacy schema default); do **not** mass-convert tables. The separate OJS vendor DB `drjavad1_jhela_ojs` is **empty (0 tables)** and its default was owner-updated to **utf8mb4 / utf8mb4_unicode_ci**; official PKP installation still pending. Journal subdomain SSL is **self-signed** in 2026-10-17 cPanel screenshots; a support request was sent to Bertina by the owner-authorized Gmail workflow (ticket number not received). Do not repeat these 28 migrations, create a second mother database, edit order/payment records, disclose dump contents, or claim journal/author-sales readiness. Future actual database checks must use fresh `information_schema` and independent backups/restore evidence. An externally verified live program version and OJS native editorial E2E remain **NOT VERIFIED**.


> **وضعیت:** مرجع پایدار معماری، موجودی مهاجرت‌ها و تصمیم‌نامه مرحله آخر؛ به‌معنی نصب جدول، آزمون سرور واقعی، انتشار، یا ۹۹٪ تکمیل اثبات‌شده نیست. اجرای SQL و انتقال PDF طبق فرمان مالک به مرحله مشترک قبل از انتشار موکول شده است.

## 1. قانون غیرقابل‌مذاکره: یک مادر، چند ماژول

- **Production:** فقط Bertina Linux / PHP / MySQL یا MariaDB با اتصال و نام پایگاه داده موجود در `api/config.local.php` (خصوصی). `api/index.php` و ماژول‌های `api/` API هم‌مبدأ هستند. از دیتابیس، backend، login، پرداخت، پورتال و صف مستقل دوم استفاده نشود.
- **Git:** فقط `drrezazadeh65/drjavadrezazadeh.com`، شاخه `migration/bertina-linux6`. **Release:** فقط `.github/workflows/deploy-bertina.yml` با کنترل `scripts/masterplan-100-release-gate.mjs`.
- **Core shared identity:** `customer_accounts` و جداول `customer_auth_*`؛ ورود ایمیلی تأییدشده، مالکیت رکورد و نقش‌ها. اتصال هر مؤلف/داور/مشاور/مشتری به هویت واحد، نه ساخت `author_users` یا `journal_users` موازی بدون تحلیل تخصصی.
- **Core shared commerce:** `commerce_orders`، `commerce_payment_claims` و `commerce_outbox`؛ BitPay معتبر و مدل پرداخت فعلی، رویدادِ idempotent و بازپرداخت مستند. Donation موفق اعلام‌شده توسط مالک باید بدون عقب‌گرد حفظ شود؛ هیچ جدول آزمایشی ادعای تراکنش واقعی نمی‌کند.
- **Only additive, approved changes:** ابتدا موجودی ساختار فعال و وضعیت مهاجرت‌ها از طریق `information_schema`، سپس طراحی کمینه و بدون رگرسیون؛ هیچ `DROP`، `TRUNCATE`، حذف ستون، حذف فیلد، بازنویسی سفارش‌ها/موجودی یا seed صوری. هر جدول باید علت، مالک داده، دسترسی، FK، شاخص، دوره نگهداری، سیاست بک‌آپ و آزمون روشن داشته باشد.
- **Research distinction:** فایل‌های `platform/db/migrations/001_…030_…sql` صریحاً **PostgreSQL conceptual/future** هستند و برای تولید Bertina نیستند. دستور `BEGIN;`، `uuid`، `REFERENCES` و RLS آن‌ها مجوز import به MariaDB نیست. `platform/db/social-distribution.mysql.sql` نیز طرح Bertina پیشنهادی است، نه اثبات نصب عملیاتی.
- **Deployment freeze:** هیچ جدول جدید، تغییر DB واقعی، PDF خصوصی یا فعال‌سازی مالی پیش از مرحله مشترک آخر؛ همانجا با مالک، نسخه، بک‌آپِ قابل‌بازیابی، DDL staging، انطباق و rollback گام‌به‌گام تأیید شود. هدف «۹۹٪ آماده‌سازی منبع» مجوز جعل وضعیت `VERIFIED` در `MASTERPLAN_100_RELEASE_ACCEPTANCE.json` نیست.

## 2. نقشه منطقی مادر و مرز مسئولیت‌ها

```text
[One Bertina MySQL/MariaDB mother DB]
  customer_accounts + customer_auth_* + MFA + consent
        |
        +-- commerce_orders + commerce_payment_claims + commerce_outbox
        |       +-- commerce_book_stock / book_reservations / parcels / refund_requests
        |       +-- commerce_service_cases -> service_intakes -> service_files -> buyer_receipts
        |       +-- publishing_* (authors/works/versions/rights/contracts/offers/assets/
        |       |                  sale_allocations/platform_costs/funding/settlements/
        |       |                  download_grants/notification_outbox/audit)
        |       +-- Donation/beneficiary protection + fund accounting
        +-- consultation availability / appointments / delivery evidence
        +-- educational assessments (Golden Talent, RCAS, BAHAR, Golden Path)
        +-- scholarly/editorial integration (JHELA, OJS boundary)
        +-- verified newsletter preferences, opt-out and notifications
        +-- moderated reviews/comments and public CMS content
        +-- owner dashboard, audit, analytics, fraud/abuse controls

[Private filesystem OUTSIDE public_html]
  paid PDF originals + source hashes + permitted signed documents + service inputs

[Public HTML/CSS/JS + indexable CMS metadata]
  NO raw assessment records / buyer tokens / author signed contracts / private PDF binary
```

**Single source of truth:** وضعیت پرداخت فقط از سرور و ادعای معتبر درگاه؛ وضعیت اجرای خدمت، تحویل، تأیید مشتری، تسویه بانکی، تخصیص کمک، خرج‌کرد واقعی، حق نشر، تأیید داوری علمی و انتشار ژورنال **همگی موجودیت‌ها و وضعیت‌های مستقل** هستند. یک مقدار `paid` نمی‌تواند همه این‌ها را اثبات کند.

## 3. جدول‌های عملیاتی و ماژول‌های توسعه (موجودی «سورس»، نه موجودی تأییدشده سرور)

| ماژول | منبع قانونی فعلی کد/DDL | قاعده پیوند و تفکیک |
|---|---|---|
| Identity / Auth / Consent | `docs/BERTINA_MYSQL_SCHEMA.sql`؛ `api/index.php`؛ مهاجرت‌های تأییدشده فعلی | `customer_accounts.id` کلید هویت مادر؛ owner/account-scope, session, email verification, MFA و CSRF |
| Bank, Orders, Refunds, Outbox | `docs/migrations/20261012_stage09_commerce.sql`؛ `api/commerce-stage9.php` | `commerce_orders.id` کلید معامله؛ ادعای درگاه با provider/trans_id/verified_amount یکتا؛ idempotent |
| Physical Bookstore | Stage09 book stock/reservations/parcels؛ book catalogue | کد موجودی فیزیکی جدا از entitlements دیجیتال؛ بازگشت موجودی فقط با سند |
| Paid 21 Services | Stage09 `commerce_service_cases`; `20261016_private_service_intake.sql`; `20261017_private_service_files.sql`; `20261017_service_buyer_receipt.sql` | فایل/دریافت مشتری/تحویل مدیر با order+sku و RBAC، encryption، private storage و audit |
| Digital Authors / Publisher | **Canonical:** `20261017_jr_future_publishing.sql` سپس `20261017_jr_publishing_contract_and_reserve.sql`؛ `api/publishing.php`؛ `api/internal/jr-publishing-*.php` | فقط جداول **`publishing_*`** به `customer_accounts` و `commerce_orders` متصل شوند |
| Author contract / rights | `publishing_author_contracts`؛ `publishing_contract_signature_evidence`؛ `publishing_rights_licences` | پیش‌نویس داشبورد امضا نیست؛ نسخه نهایی، مجوز، signer، checksum، زمان و scope به شواهد خصوصی متصل باشد |
| Author finance / fund | `publishing_sale_allocation_entries`؛ `publishing_author_settlements`؛ `publishing_platform_cost_entries` و `publishing_platform_funding_entries` | author 600k + fund earmark 400k از هر 1m فروش معتبر؛ reserve 70k افزوده از بودجه مستقل سایت، نه کسر از این دو و نه مالیات قانونی |
| Paid digital delivery | `publishing_private_assets`؛ `publishing_digital_access_grants`؛ `publishing_notification_outbox` | دقیقاً ۲ فایل private با SHA256، اسکن، پیوند موقت، token فقط hash، تأیید بانک پیش از entitlement |
| Appointments | `20261014_consultation_availability.sql`؛ `20261014_consultation_preferences.sql`؛ `20261015_consultation_online_voice_upgrade.sql` | ظرفیت و رزرو واقعی از منبع یکتا، بدون ساعت فرضی یا تأیید پرداخت‌نشده |
| Golden Talent / RCAS / BAHAR | کد آزمون‌ها و سیاست‌های علمی/رضایت موجود؛ رجیستری نسخه ابزار | امتیاز/تشخیص صرفاً با روایی پایایی و اجازه معتبر؛ سوابق کودک، رضایت ولی و دسترسی حداقلی |
| JHELA/OJS | `docs/journal/`؛ `api/jhela-intake.php`؛ مدارک OJS / preflight | اصالت مؤلف/داور، manuscript، decision و پرداخت تفکیک؛ OJS می‌تواند schema تخصصی خود را الزام کند، اما بانک و هویت تجاری سایت نباید موازی‌سازی شوند؛ نصب فقط طبق بررسی نسخه و مالکیت داده |
| Newsletter / communications | `eco_notification_*`، صف و ترجیحات موجود، کد suppression/opt-out | consent/version/suppression به حساب مادر؛ email رسید مالی و marketing جدا؛ ارسال واقعی نیاز به SMTP و worker تأییدشده دارد |
| Social publishing | `platform/db/social-distribution.mysql.sql` (طرح افزایشی، هنوز نیازمند احراز اجرا) | حساب و consent صاحب کانال، approval، UTM/queue، idempotency و بازبینی انسانی؛ بدون credential عمومی |
| SEO/CMS/Analytics | فایل‌های catalogue، SEO schema graph، public registry و owner ops | public metadata از source projection؛ فعالیت خصوصی هرگز index یا cache نشود؛ آمار مشاهده‌ای ≠ تراکنش |

### رد قطعی طراحی موازی

`docs/migrations/20261017_jr_future_publishing_draft.sql` پیش‌نویس **`jr_pub_*`** است؛ **در deployment import نشود.** پیاده‌سازی PHP کنونی و قراردادهای source، schema اصلی `publishing_*` را مصرف می‌کنند. هم‌زمان اجراکردن هر دو طرح موجب نویسندگان، سفارش‌ها و تسویه‌های موازی می‌شود. این فایل تنها سابقه طراحی است و حذف نشود.

## 4. سیاست ماژولارسازی برای توسعه‌های بعدی

هر خدمت تازه باید نخست `service_id` در کاتالوگ واحد و نقشه نقش‌ها، قیمت/ارز سرور، نمونه خروجی، رضایت، رسید/بازپرداخت و پنل مشتری/مدیر را مشخص کند؛ **تا وقتی می‌توان با `commerce_orders` و `commerce_service_cases` و جداول امن موجود آن را مدل کرد، جدول جدید لازم نیست.** جدول تخصصی فقط وقتی ایجاد شود که:
1. مفهوم دامنه‌ای واقعاً مستقل یا state machine جدا لازم باشد؛
2. نیاز به index/FK/atomic transaction بر ساختار فعلی قابل‌حل نباشد؛
3. حفظ داده/امنیت/محرمانگی الزام مشخص ایجاد کند؛
4. نام و dependency با `information_schema` و migration ledger روی Bertina تطبیق شود؛
5. نسخه staging، rollback، foreign-key و تست MySQL/MariaDB واقعی موفق شوند.

در پیشنهاد جدول جدید: `purpose, table_name, owner_module, parent FK, customer scope, primary/unique key, expected cardinality, indexes, personal-data class, retention, migration order, fixture tests, rollback, operator sign-off` ثبت شود؛ هیچ `CREATE TABLE IF NOT EXISTS` به تنهایی اثبات سازگاری schema قدیمی نیست.

## 5. قواعد یکپارچگی و کیفیت داده

- InnoDB، UTF-8MB4، FK واقعی و unique idempotency؛ در طراحی پول فقط **integer toman** و مبنای پولی/ارز مصوب. از float برای تخصیص مالی استفاده نکنید.
- منبع پول فقط تراکنش بررسی‌شده سرور؛ تخصیص author/fund در transaction واحد، برگشت وجه با entry منفی مستقل و audit؛ `reserved`، `funded`، `paid_to_beneficiary` و `bank_settled` حالات جداگانه.
- سازگاری concurrent callback با locks/uniqueness، replay و idempotency؛ عدم ارسال دو ایمیل برای یک فروش؛ رخداد ایمیل `SMTP accepted` مساوی `inbox delivered` نیست.
- فقط verified owner/admin در محیط خصوصی می‌تواند نسخه قرارداد و signer را تأیید کند؛ هیچ امضای فرضی یا داوری ۹۹۷ صفحه‌ای از رویداد رابط کاربر نتیجه‌گیری نشود.
- دسترسی child/guardian/assessment، encryption at rest، consent version، auditing، no-store، least privilege، log redaction، نداشتن راز در GitHub.
- مهاجرت production با preflight قبل/بعد، backup+tested restore، ردیابی نام فایل و SHA، نمونه row counts، وضعیت FK و plan بازگشت. هیچ مداخله مستقیم برای «زیبا شدن داشبورد» روی order ledger مجاز نیست.
- API/owner/customer dashboard باید از مادر واحد بخوانند؛ نمونه‌داده ساختگی و metadata فروش واقعی ممنوع.

## 6. موجودی مهاجرت و ترتیب پیشنهادیِ مرحله نهایی

**مرحله صفر ـ اکنون فقط READ/PLAN:** اجرای `scripts/masterplan-evidence-reuse-audit.mjs` و کنترل نسخه‌ها/CI؛ تأیید سورس بر اساس `AGENTS.md`، وضعیت فعلی Bertina و manifest. هیچ تغییر SQL، انتقال PDF یا پرداخت در این مرحله انجام نشود.

**مرحله ۱ ـ با حضور مالک در روز انتشار (private):** snapshot SQL+filesystem، بررسی بازیابی واقعی، شناسایی DB active از config خصوصی بدون افشای credential، مشاهده `information_schema` و ثبت installed/missing/drift برای هر جدول و index.

**مرحله ۲ ـ طراحی نهایی DDL:** با توجه به موجودی واقعی، صرفاً migrationهای لازم و additive با dependency graph و نسخه‌های قفل‌شده. نمونه ترتیب بررسی (نه دستور اجرای بی‌قید):
- baseline `docs/BERTINA_MYSQL_SCHEMA.sql`؛ بررسی اینکه هویت و `commerce_orders` *از پیش* وجود دارند؛ بدون واردکردن دوباره داده.
- `docs/migrations/20261012_stage09_commerce.sql` اگر schema از پیش نصب نشده یا drift ندارد.
- `20261014_consultation_availability.sql`، `20261014_consultation_preferences.sql` و `20261015_consultation_online_voice_upgrade.sql` فقط در صورت نیاز.
- `20261016_private_service_intake.sql`، `20261017_private_service_files.sql` و `20261017_service_buyer_receipt.sql` به ترتیب dependency، فقط وقتی لازم و verified.
- برای Mirkarimi: **فقط** `20261017_jr_future_publishing.sql` سپس `20261017_jr_publishing_contract_and_reserve.sql`؛ هرگز `20261017_jr_future_publishing_draft.sql` یا `jr_pub_*`.
- Social/Newsletter/OJS فقط براساس نیاز واقعی و audit مستقل؛ `platform/db/migrations/*.sql` PostgreSQL هرگز در Bertina اجرا نشود.

**مرحله ۳ ـ staging:** import انتخاب‌شده روی clone ایزوله به‌همراه fixture واقعی syntax/index/constraint، tests موجود PHP/MySQL، replay/negative cases و سیاست backup restore.

**مرحله ۴ ـ انتقال دو PDF با حضور مالک:** فقط `JR_Publishing_PDF_Private_Server_Staging_v2.zip` به محیط خصوصی **خارج از `public_html`**، با `api/internal/jr-publishing-private-install-cli.php` و مستر راهنمای `docs/governance/JR_PUBLISHING_DIGITAL_PAYMENT_ACTIVATION_20261017.md`. Hashهای منبع:
- questions PDF = `6245641c453e92ee005c4176575ef315b96ac72fd8535b7e3ff67c2369dda7c8`
- answers PDF = `db8070f8a88723c1947a094a461ad2f703192092b09f03255867bbab53fa2ab4`
- **فایل آپلود معتبر فقط v2 با دقیقاً چهار عضو:** `tefl_1370_1405_questions.pdf`، `tefl_1370_1405_answers.pdf`، `private-asset-manifest.json` و `READ_ME_PRIVATE_DEPLOYMENT.txt`؛ ZIP SHA-256: `a0fb784d92f0b3b40fc03f370444bfda41af40a1dc72d6b90568c4c9ffcdbbcf`؛ حجم ZIP: **9,031,196 bytes**؛ نسخه قدیمی دو‌فایلی با اسکریپت نصب سازگار نیست و **نباید برای آپلود استفاده شود**. بررسی محتوای ZIP قبل از نصب ضروری است.

- **اصل حقوق نشر و توزیع دیجیتال** و بررسی محتوای آزمون‌های ادوار گذشته، هویت مؤلف، نسخه قرارداد و اذن مستند مستقل؛ sandbox/owner bank & SMTP setup و malware scan واقعی.

**مرحله ۵ ـ فعال‌سازی کنترل‌شده:** بعد از مجوز مؤلف و تأیید مالک، provisioning خصوصی account-role، ایمیل تأییدشده، outbox worker، BitPay و price، ثبت منبع پرداخت reserve ۷٪؛ آزمون پرداخت مجاز با همان محصول، دو download، نامه مستقل مؤلف، حسابداری ۶۰/۴۰، برگشت وجه و عدم دریافت تکراری.

**مرحله ۶ ـ انتشار یک‌باره:** فقط زمانی که `docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json` بر پایه شواهد واقعی، ۴۱ gate، ۲۱ service، ۴۰ مقصد داخلی و تأیید مالک را محقق کرده و workflow موجود اجازه دهد. تطبیق SHA candidate/live، SSL، CSS/JS cache، sitemap/FA/EN/hreflang، 42 detail pages، شماره نسخه، privacy و rollback. پس از deploy، آزمون مستقل تولید الزامی است.

## 7. پروتکل ثابت ورود به چت/جلسه جدید

پیش از هر تغییر، به‌ترتیب: (۱) HEAD واقعی همین شاخه؛ (۲) `AGENTS.md` و **همین سند**؛ (۳) `docs/governance/SOURCE_OF_TRUTH.json`؛ (۴) `MASTERPLAN_100_RELEASE_ACCEPTANCE.json`؛ (۵) آخرین Actions همان SHA؛ (۶) fingerprint نصب‌شده Bertina و gap واقعی؛ (۷) بررسی DB migrations موجود؛ (۸) **تنها کوچک‌ترین تغییر لازم با تست رگرسیون، بدون موازی‌کاری**. در گزارش، برای هر جزء چهار حالت مجزا بنویسید: `SOURCE_PRESENT`، `SOURCE_TESTED`، `HOST_VERIFIED`، `PRODUCTION_E2E_ACCEPTED`. از پیشرفت ساختگی و ادعای «۹۹٪» بدون denominator/evidence خودداری کنید.

**مدارک بالادستی:** `AGENTS.md`، `foundation/DESIGN-SYSTEM.md`، `docs/governance/FINAL_INTEGRATION_SUPER_MASTER_PLAN_20261016.md`، `SUPER_MASTER_ALL_SERVICES_VISUAL_IDENTITY_100_PERCENT_20261016.md`، `JR_FUTURE_PUBLISHING_MASTER_20261017.md`، `UNIFIED_MASTER_WEBSITE_AND_MEHRAB_RELEASE_CANDIDATE_20261017.md` و `MASTERPLAN_100_RELEASE_ACCEPTANCE.json`.

**مالک تأیید کرد:** «فعلاً تا آستانه انتشار ادامه بده؛ بارگذاری فایل‌های PDF جدید و افزودن جدول‌های لازم را در آخرین گام، قدم‌به‌قدم با هم انجام می‌دهیم.» این تصمیم، جایگزین تست و رضایت حقوقی مستقل نیست.


## 8. Author identity, banking and document verification — additive extension

**Release class: SOURCE IMPLEMENTED / PRIVATE DDL DEFERRED / PRODUCTION UNVERIFIED.** This section extends the original mother architecture. It does not create any new customer-login, author-login, commerce, payment or payout database. The previous 17-table canonical publishing base remains unmodified; **three additional additive tables** are staged for final owner-approved migration:
`docs/migrations/20261017_jr_publishing_author_onboarding.sql` → `publishing_author_profiles`, `publishing_author_bank_accounts`, `publishing_author_documents`. This is a proposed 17+3 module layout, *not* a claim that 20 tables exist on Bertina. The current read-only mother-schema inventory still examines the 17 canonical tables, with the new three staged separately until approved.

**Identity and author workflow:** `customer_accounts` is the one verified login authority. A trusted manager first binds an author role to the customer account in `publishing_author_accounts`; the author completes the private `fa/app/author/` onboarding form, uploads genuine identity/CV/bank-ownership evidence, and agrees to versioned private-data handling. This initial author-role invitation is not itself verification of legal identity, copyright, academic rank, bank ownership, scientific merit or an executed contract. The author-facing profile route is `/api/publishing/author/onboarding` and submission routes are `.../profile`, `.../bank` and `.../document`. They require the verified existing account and ownership of the author ID, exact-origin POST, rate limits and active separate schema. Missing schema means fail-closed 503; no silent fallback public upload.

**Protected fields:** legal identity number, birth date, mobile and postal address are sealed with authenticated AES-256-GCM; full bank card number and IBAN are separately sealed with authenticated encryption and distinct domain bindings. The response and dashboard reveal only verification state and last four digits, never raw account or ID numbers. The encrypted document bytes are malware-scanned and stored in a restrictive owner-only private directory *outside* `public_html`, with SHA-256 and recorded review state. Documents never appear in public Git, a CMS asset, SEO metadata, email or static links. PII/financial documents should be collected only when needed, with purpose limitation and explicit privacy notice, retention/deletion policy and lawful consent. Prefer a redacted bank-ownership confirmation document to unnecessary statement histories.

**Manager reviews:** The existing `fa/app/admin/` adds a publishing-author verification queue backed by `/api/admin/operations/publishing/authors`. Only the real configured `SUPER_ADMIN` with fresh TOTP/MFA can inspect document bytes and issue state transitions. Requests require CSRF. Document review is a separate state from profile review and bank verification. Approval requires approved identity and CV evidence; bank verification additionally requires approved legal profile and independently reviewed account-ownership evidence. Human reviewer must compare the real legal name to the account holder name and bank document; matching format/checksum alone does not establish ownership. A person who is also linked as an author must not approve their own author identity. Updates to identity or bank details reset verification and require a new review.

**Account settlement gate:** Read-only accounting dashboards continue to show gross 60/40 allocations, refundable-sale history and the 7% *platform-funded* reserve. Entering card/IBAN data does not authorize a transfer. Prior to any author payout the operator must independently verify profile approval, bank-account approval, signed/licensed author rights, no unresolved refund reversals, non-negative audited payable amount and actual bank transfer evidence. `publishing_author_settlements.bank_verified` must only reflect observed banking proof; no source submission or review button automatically changes it. Payout and bank settlement code must fail closed until complete independent review is documented.

**Staged test/evidence hooks:** `api/publishing-onboarding.php`, `assets/js/jr-author-onboarding-v1.js`, `assets/js/operations-publishing-authors-v1.js`, `assets/css/jr-publishing-onboarding-v1.css`, `tests/jr-publishing-author-onboarding.test.mjs`, and the existing v5.1.0 nondeploy CI. They provide code/contract evidence only. The final joint host step will review (1) running `information_schema` and existing live accounts, (2) isolated migration on restored clone, (3) TLS/CSRF/MFA uploads and document antivirus, (4) bank validation and duplicate-review/race tests, (5) privacy/retention/deletion and access log controls, (6) independent reviewer approval and bank payout reconciliation. The full 41+21+40 release gate remains authoritative and remains blocked pending actual evidence.

**Owner final-step rule unchanged:** no SQL execution on Bertina, no private PDF upload, no real identity/bank data entry and no live payment activation during source preparation.
