# JR Official Documents — Master Template Registry

All templates are **design previews**, not issued legal, fiscal, or bank-settlement records. The Persian mother-brand assets remain canonical; do not replace them with Latin JR initials.

| Document | Canonical source | Operational status |
| --- | --- | --- |
| Donation confirmation preview | `identity/templates/donation-receipt-fa.html` | Preview only; actual customer receipt is rendered after server-verified payment in `assets/js/student-sponsorship-dashboard.js` |
| Persian official letterhead | `identity/templates/official-letterhead-fa.html` | Preview; no authentic signature or outgoing correspondence number |
| Service invoice | `identity/templates/service-invoice-fa.html` | Preview; no fiscal issuance or verified transaction |
| Shared print stylesheet | `identity/document.css` | Reusable design primitives |
| Shared identity tokens | `identity/tokens.css` | Reusable design primitives |
| Native browser print / Save as PDF | `assets/js/jr-document-export.js` | Connected only to authenticated verified donation confirmations; not a PDF-generation backend |

## Immutable design constraints
1. Use `identity/references/persian-symbol-gold.png` and `identity/references/persian-wordmark-gold.png` for the Persian brand. Never substitute fabricated seals, signatures, certificates, or QR codes.
2. Use an A4 print layout with RTL typography, restrained gold, readable ink, adequate margins, repeated table headers and page-break controls.
3. Separate preview data from real customer data. Only an authorized server endpoint may issue transaction-specific documents after validating ownership and the relevant payment claim.
4. Keep private documents unindexed and out of public caches; avoid exposing names, emails, invoice numbers or transaction identifiers in public static templates.
5. Label donation confirmation accurately; payment-claim matching is not proof of bank settlement, tax deductibility, or allocation to a beneficiary.
6. New document types must reuse shared tokens and styles rather than duplicating brand styling.
7. No deployment to production without source tests, visual print/PDF review, and user authorization.

## Remaining integration work
- Implement authenticated server-backed invoice issuance and appropriate numbering only after payment/accounting schema review.
- Connect real reports, certificates and correspondence to approved templates with role-based access and verified source data.
- Validate Persian fonts, logo fidelity, multi-page A4 layout, mobile print dialog, and browser Save as PDF.
- Validate legal invoice requirements and fiscal integrations before calling a document a tax invoice.
