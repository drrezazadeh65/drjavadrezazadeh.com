# Preview engine (non-production)

Run tests: `node --test identity/engine/preview.test.mjs`

Use `renderDocumentPreview({type,locale,document_id,template_version,recipient,description})` to render an escaped, standalone HTML preview for browser print-to-PDF. Supported types: receipt, invoice, certificate, talent_report, letterhead, assessment. Supported locales: fa-IR, en.

**Security boundary:** This renderer is not an issuance service. It does not check payment, sign certificates, authorize document access, persist records, issue sequential IDs or verify QR tokens. Do not connect it to live user data without server-side authorization, a verified source-of-truth, audit logs and privacy review. The Persian production logo is still awaiting vector review; therefore preview uses verified text brand name rather than the deprecated Latin JR mark.
