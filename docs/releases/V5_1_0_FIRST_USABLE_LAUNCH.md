# DrJavad Ecosystem v5.1.0 — First Usable Release Acceptance

**Target:** `v5.1.0` — **NOT RELEASED until exact live Bertina evidence exists**. This milestone is an operational, bounded *first usable* launch, not a declaration that every academic, psychometric, journal, social, or financial engine is finished.

**Canonical development:** `drrezazadeh65/drjavadrezazadeh.com`, branch `migration/bertina-linux6`. **Production:** Bertina, `https://drjavadrezazadeh.com`. Never deploy from another source, retarget canonical URLs, reset orders, or mark unfinished features complete.

## Acceptance contract — verified source is not verified production

| User journey | Intended minimum usable experience | Required evidence before celebrating |
| --- | --- | --- |
| Public bilingual website | Existing Persian/English pages and working canonical navigation | Live HTML, sitemap, correct security/private cache policy, no unexpected 404, mobile cross-browser checks |
| RCAS Start free | 3-step browser-only, explanatory non-diagnostic report; no raw answers sent to server | Real browser acceptance; no invented scientific norms or forced upsells |
| Consultation discovery | Owner chooses 1–4 genuine consulting hours per Tehran day, with seven-day published calendar | Additive MariaDB capacity table verified; MFA owner opens genuine windows; public API reports actual hours |
| Time requests | Green requestable, red booked, unpublished hours neutral; dashboard and intake share same source | Real calendar API, actual bookings, duplicate/overlap tests; request remains unconfirmed until server records an appointment |
| Customer account | Verified email sign-in, private history, consented enquiries, paid-service appointment state and preferences | Authenticated owner-scoped live read and write acceptance, 401 for guests, no private cache or leaked identifiers |
| Catalog and commerce | Three books, 21 service SKUs, six VIP plans, truthful payment/readiness messaging | Prices/stock preserved, verified callback and provider evidence; do not assert bank settlement without independent evidence |
| Service delivery | Paid, provider-verified order followed through scheduling, booking, delivery evidence and customer visibility | End-to-end one real customer-case acceptance; no direct booking without an eligible order and explicit owner capacity |
| Support and safety | Guardian restrictions, consent, private reports, error feedback and safe unavailability | Consent boundaries verified; missing infrastructure returns unavailable rather than invented records |
| Owner operations | MFA administration, published hour controls, audit and health visibility | Actual Bertina owner MFA session, controlled insert/close with audit, prevention of closing booked capacity |

## Exact release decision

1. Source CI must pass: `DrJavad v5.0.0 Nondeploying Release Candidate` (legacy workflow name), customer dashboard audit, responsive/browser QA, Stage09 MariaDB compatibility, SEO/GEO and provider-guard checks for the **same Git SHA**. A green workflow alone does not establish server readiness.
2. Compare that SHA with **live Bertina**; if GitHub automatic preflight blocks because of historically protected SQL/governance changes, use the owner-authorized GitHub Actions **manual hosting_managed release** with the exact approved SHA and observed live SHA. Do not delete/disable access or security guards.
3. Observe successful post-upload checksum/Service Worker fingerprint verification and public/mobile navigation.
4. Independently verify the live `/api/commerce/consultation-week`: if the additive table is not deployed, the API must respond **503** and no green hours may be shown. Schedule the reviewed additive SQL separately after owner approval. No fabricated availability to simulate conversion.
5. In a verified owner admin session, publish only genuinely available Tehran hours, capped at **four per day**; confirm that public and customer dashboards read the same windows. Confirm a booked hour turns red only after actual owner-confirmed booking.
6. Verify the customer journey with an authorized test account: account ownership, selected phone/video format, order and consultation-state access; inspect failure handling and no marketing consent leakage. Avoid using real money solely to pass a test.
7. Record exact **Git SHA, live SHA, GitHub deployment run, dates, URL evidence, actual schema/owner/account acceptance status**, and any failures in a post-release acceptance record.

## What v5.1.0 must not imply

- **Not** verified Golden Talent/RCAS/BAHAR psychometric standardization, real student files, or automatically granted paid digital entitlements.
- **Not** proof of bank settlement, real-world inventory reconciliations, e-mail provider delivery or every one of the 21 services fulfilled.
- **Not** live OJS editorial intake, ISSN/DOI/ISI/Scopus indexing or social posting authorization.
- **Not** an unattended agent that keeps editing or deploying after this chat.

**Promotion:** The words **RELEASED / جشن راه‌اندازی نسخهٔ ۵.۱.۰** require recorded source–production equivalence and successful minimum operational journey, not a source commit, snapshot UI, placeholder numbers or a green staging CI.
