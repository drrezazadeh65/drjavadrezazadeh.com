# GOV-004 / SEO-URL-001 — FROZEN PUBLIC URL PERMANENCE LAW
**Project:** drjavadrezazadeh.com  
**Adopted:** 2026-10-22 — explicit owner instruction and technical-SEO review  
**Authority:** binding addition to the frozen FINAL MASTER SEO STANDARD — Bilingual International Edition (2026), AGENTS.md, and MASTER-ECOSYSTEM-ROADMAP GOV-004  
**State:** FROZEN / MUST NOT REGRESS  
**Scope:** production website, Persian and English pages, journal public routes, commerce pages, PWA entry points, future development and deployment.

## 1. Binding rule (فارسی)

**آدرس هر صفحهٔ عمومی که منتشر شده یا در سایت‌مپ رسمی وارد شده است، دارایی دائمی وب‌سایت محسوب می‌شود.** توسعه‌دهنده حق ندارد در جریان بازطراحی، بهبود UX، جابه‌جایی محتوا، بازنویسی کد، تغییر هاست، توسعه موتورهای آموزشی یا بهینه‌سازی سئو، آن نشانی را تغییر نام دهد، حذف کند یا کاربر و موتور جست‌وجو را بدون ضرورت به نشانی جدید منتقل کند.

**مجاز و مطلوب:** ویرایش و ارتقای محتوا، عنوان و توضیحات، طراحی و UI/UX، ارتقای داده‌های ساخت‌یافتهٔ معتبر، افزودن یا اصلاح لینک‌های داخلی، افزودن صفحات و نشانی‌های تازه، افزودن نشانی تازه به سایت‌مپ، اصلاح واقعی تاریخ تغییر محتوا در lastmod، به‌روزرسانی درست hreflang، و تغییر زیرساخت بدون تغییر URL عمومی.

**ممنوع در توسعهٔ عادی:** تغییر slug، مسیر، زبان‌پیشوند /fa/ یا /en/، حذف صفحات معتبرِ شناخته‌شده، تغییر canonical تثبیت‌شده به مقصدی نامرتبط، حذف خودکار URLهای معتبر از سایت‌مپ، جایگزین‌کردن مجموعه‌ای از URLهای قدیمی با یک آدرس عمومی، ایجاد زنجیرهٔ ریدایرکت و جابه‌جایی URL برای زیبایی ظاهری.

**قانون مهم:** ثبات «آدرس صفحه» با ثبات «لینک‌های داخل صفحه» یکی نیست. لینک‌سازی داخلی آزاد است تا زمانی که URLهای تثبیت‌شده همچنان سالم و قابل‌دستیابی باقی بمانند. فایل سایت‌مپ قابل توسعه است؛ هیچ URL معتبر منتشرشده نباید به‌صورت بی‌مجوز تغییر یا حذف شود.

## 2. Normative implementation details

1. Preserve the **exact publicly established URL** including hostname, HTTPS scheme, path, existing slug, letter case and trailing-slash policy. Do not switch /fa/ to /en/, remove the language namespaces or rename previously published paths.
2. Treat canonical URLs as long-lived identifiers; retain self-referencing HTTPS canonical for indexable pages. Keep sitemap URLs and canonical signals consistent. Do not rewrite canonical tags to a newly invented location during a redesign.
3. Internal navigation, anchors, cross-links, hub cards and CTA destinations **may change**. New informational or service pages **may be created**, with new canonical URLs and appropriate reciprocal hreflang when genuinely translated equivalents exist.
4. Sitemap XML files are **not frozen verbatim**: add new eligible canonical pages, update verifiably accurate lastmod dates, and improve metadata. Do not edit/delete an established eligible URL simply to improve the URL structure. A sitemap is a current indexable-URL inventory, not an archive of permanently removed content.
5. Pages which are private, login-only, noindex or otherwise non-indexable must not be forcibly added to public sitemaps. Preserve server-side authentication and privacy controls. Keep public and private indexing separate.
6. A published URL must continue returning correct content, not be converted to a 404, soft-404, 410 or misleading home-page redirect during normal development.
7. For a **genuine, independently documented exception** (legal takedown, exposure of personal information, exploitation risk, duplicate/canonical repair, or technically unavoidable permanent move), stop normal development for the affected route and require an **explicit separate owner approval**, original-to-destination URL mapping, per-URL status policy, evidence and a rollback plan. This instruction does **not** authorize any exception today.
8. When a legitimate permanent move is approved, implement direct server-side 301/308 to the most relevant successor, avoid chains, maintain redirects at least one year and preferably indefinitely, use correct canonical/hreflang and internal-link replacements, and update sitemap entries only as part of that approved migration. When content genuinely must disappear with **no relevant replacement**, use a real 404/410 as appropriate and remove the non-indexable URL from the active sitemap rather than retaining a misleading 200. These are exceptional SEO-compliant retirements, not routine permissions.
9. Require a diff-based publication registry and CI guard: check protected public routes, accumulated sitemap loc history from the frozen baseline onward, historical canonical identifiers and pre-existing permanent redirect mappings. Block release for unauthorized breaking changes. **Never block legitimate internal-link edits, content improvements, new routes or accurate lastmod updates.**
10. Development builds and commits do not prove a URL is live, indexed or ranking. Confirm live publication separately with deployment evidence, direct origin HTTP response and Search Console where applicable. No tests or deployment should be claimed solely because a guard file exists.

## 3. Precedence & release rule

- This is a **binding elaboration of GOV-004**, not permission to replace the 2026-10-05 SEO master baseline.
- Every developer, assistant, Codex process and GitHub workflow must read and honor this file **before changing routes, canonical tags, sitemap loc entries or .htaccess**.
- The published source registry cannot be reset to a newer commit just to legitimize a URL change. A release with an unapproved frozen-URL change must fail closed.
- The owner has requested that **comprehensive integrated testing remain deferred until development completion**; committing this guard is not a statement that tests have run or a release has occurred.

## 4. Authoritative research grounding

- Google Search Central, [Build and Submit a Sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): sitemap URLs represent preferred canonicals; meaningful lastmod may change; URL listings are extendable.
- Google Search Central, [How to Specify a Canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): consistent redirect/canonical/sitemap signals; internal links support the selected canonical.
- Google Search Central, [Site Moves with URL Changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes): planned URL mapping, direct permanent redirects, coordinated internal links/hreflang/sitemap and at least one year of redirects.
- Google Crawling Infrastructure, [How HTTP Status Codes Affect Google's Crawlers](https://developers.google.com/crawling/docs/troubleshooting/http-status-codes): 301 and 308 are permanent-move signals, 404 and 410 can be correct for genuinely removed resources.

**Project-specific conclusion:** Stable published URLs are the non-negotiable default. Editing page content and internal links is normal. Creating a new URL does not authorize renaming an old URL. Indexing and rankings are not guaranteed by URL stability alone.
