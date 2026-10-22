# JR User-First One-Popup Consent & Education Onboarding Standard

**Status:** BINDING UX REQUIREMENT — frozen by the owner, 22 October 2026.
**Scope:** drjavadrezazadeh.com, all six education engines, store, mobile/PWA and the account dashboard. This standard does **not** replace purpose-specific consent or legal obligations.

## The product contract

**Lead with the benefit.** The free first step must be usable without registering or uploading a private educational file. After a learner experiences value and explicitly chooses a feature requiring storage, present **one short and genuinely optional popup** that explains the requested data, concrete benefit, intended use, retention choices and a meaningful alternative. A single affirmative click records the precise permission needed for that benefit; no redundant checkboxes, serial consent dialogs, repeated confirmations or impossible CAPTCHA-like workflows.

**Suggested Persian copy** for voluntarily saving the BAHAR workbook:

> ✨ برنامه‌ات را برای دفعه بعد نگه دار!
>
> با موافقت تو، فقط برنامه و یادداشت‌هایی را که خودت برای ذخیره انتخاب می‌کنی، به‌صورت رمزگذاری‌شده در حسابت نگه می‌داریم تا دفعه بعد از همان‌جا ادامه بدهی. از این اطلاعات برای فروش داده، تبلیغات یا نمره‌گذاری استعداد استفاده نمی‌کنیم. هر وقت بخواهی می‌توانی تنظیمات حریم خصوصی‌ات را مدیریت کنی.
>
> **موافقم، ادامه بده**   /   **فعلاً بدون ذخیره ادامه می‌دهم**

**Suggested English copy:**

> ✨ Keep your study plan for next time.
>
> With your permission, we will encrypt and save only the workbook you choose, so you can continue later. We will not use it for advertising, sale of data or aptitude scoring. You can manage your permission later.
>
> **I agree — continue**   /   **Continue without saving**

## Evidence of consent

1. The choice must be affirmative, tied to the currently displayed purpose-specific privacy notice and account/subject identity, and stored only in the approved consent ledger. Closing, declining, inactivity or navigating away is **not** consent.
2. The full bilingual notice must remain readily expandable inside the popup, without requiring another approval. A separate optional newsletter, sponsor contact, advertising or scientific research purpose must never inherit private-workbook consent.
3. There is no legitimate blanket consent to “all current and future uses.” The system may provide human-readable privacy commitments only where technical and organizational controls actually exist.
4. The free BAHAR programme, Golden Talent/RCAS introductory experiences and preliminary decision support must not be held hostage to account storage, marketing permission or acceptance of unsupported claims.
5. For children, guardians and accounts without the required authorization, protect sensitive data in the background and provide an accessible non-uploaded or properly authorized path rather than repeated warning modals. Never falsely imply that a child's consent or a checkbox equals verified guardian authority.
6. No user notes or scorecards may appear in URLs, browser analytics, support logs, external APIs or PWA caches. An explicitly user-initiated, same-tab short-lived transfer can temporarily hold an approved local workbook for a private account continuation; upload or permanent saving still requires explicit permission.
7. The user can keep their own offline copy, refuse consent without losing free education access, and exercise meaningful account data management when the feature is provisioned.
8. Communicate benefits **first**, use readable Persian and English, keyboard-compatible native dialog semantics, larger text, 44px touch controls, and clear compact primary/secondary actions.

## Implementation recorded in source

- Free public BAHAR routes: `/fa/bahar/`, `/en/bahar/`.
- User-initiated five-minute same-tab handoff: `assets/js/jr-bahar-compass-v1.js`.
- Single popup, optional encrypted account continuation, direct sign-in, offline file backup: `assets/js/jr-bahar-adult-account-workbook-v1.js`.
- Existing private BAHAR account workspace route paths remain unchanged; optional private account storage is default OFF until genuine backend approval.
- Native accessible modal appearance: `assets/css/jr-bahar-adult-account-v1.css`.
- Owner controls: `api/operations-education-workbook-policy.php`, only once required evidence exists.
- The permanent GOV-004 URL law remains binding: existing published URLs never renamed.

## Non-negotiable accuracy

Do not claim “100% guaranteed security,” independently verified age/guardian status, published predictive validity, approved provider payment, GDPR compliance or account storage readiness unless actual independent evidence supports it. Consent UX simplicity is achieved by **moving necessary controls behind the scenes**, never by pretending that data was secured or legitimately collected.

**Development-phase status:** SOURCE IMPLEMENTATION ONLY. No intentional tests, live migrations, release or production approval conducted in the current source-first development phase.
