# Owner's first-delivery acceptance standard — 19 October 2026

**Authority:** Explicit website-development instruction from the site owner. Apply this standard to every subsequent implementation and release review of `drjavadrezazadeh.com`. This document supplements, and does not replace, the frozen bilingual SEO, privacy, design, mother-database and owner-triggered Bertina deployment standards.

> For every development task on my website, I want the finished, best possible version on the first delivery, not a draft.
>
> Before you build anything:
> - Research the task thoroughly: current best practices, common pitfalls, browser and device compatibility, accessibility, performance, and security.
> - Work out exactly what "complete" means for this task and write the acceptance criteria for yourself.
>
> While building:
> - Deliver the full, working result. No placeholders, no "you can add this later", no partial code.
> - Handle edge cases, errors, mobile and desktop, and both English and Persian (RTL) where relevant.
>
> Before you tell me it is done:
> - Review your own work line by line against your acceptance criteria, as a strict reviewer who is trying to find faults.
> - Fix every fault you find. Do not list faults for me to chase later.
> - Only after that, report back.
>
> Be honest in your report. Do not say "done" unless it truly is. If something is untested, uncertain, or impossible from your side, tell me clearly and say why. A truthful "not finished yet" is far better than a false "completed".
>
> Report format:
> 1. What was built
> 2. What you checked and how
> 3. Anything still unresolved, if any
>
> I expect the highest standard in every task: complete, researched, tested, and final.

## Operational acceptance interpretation

1. **10/10 is an independently supported result, never a self-assigned rating.** Do not mark an issue, product, instrument, payment gateway, or site section complete solely because files exist or CI tests pass. Keep an item open until its defined functional, visual, privacy/security, accessibility, bilingual, integration and operational evidence has been reviewed.
2. **One authoritative architecture.** Preserve working services, URLs and frozen branding. Reuse the Bertina PHP/MySQL mother database, canonical commerce order/receipt and entitlement flow, and `.github/workflows/deploy-bertina.yml`; introduce no parallel gateway, login, database or release mechanism.
3. **Golden Talent / RCAS / BAHAR.** Assess actual users' ability to complete the task, reset it, produce usable transparent reports and understand limitations. Human review and scientific validation are distinct from source-code correctness. Never manufacture psychometric validity, child consents or performance data.
4. **Mirkarimi and payment.** Verify a real lawful-rights record, author identity, the two exact approved private PDFs, bank-side payment confirmation, idempotent callbacks, buyer and author email receipt, two download grants, refund handling, the 600,000/400,000 toman allocation and separate platform reserve. A test gateway, a green flag, a UI button or a simulated checkout does not establish a real settled sale.
5. **Construction versus release.** In accordance with the owner's current batch-first directive, perform cheap syntax/security contract checks during development, then the consolidated full QA and mobile/bilingual review at the end. The owner controls the preserved one-click live release. No premature final-completion announcement.
6. **Reporting.** Use the three mandatory parts above. Where an external provider, private host, original media or real-world empirical evidence remains inaccessible, name exactly the unverified condition instead of changing the completion definition or marking it green.

**Standing execution note:** Do the self-review first, and don't report back until you've fixed everything you find. Record non-remediable external blockers honestly without suggesting they have been cleared.
