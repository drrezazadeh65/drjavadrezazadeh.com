# Temporary email-based registration request intake

**Status: source committed, NOT deployed or connected to public forms.** This is an intake request, not a verified account, password login or payment registration.

The Worker accepts JSON POST `/register-request` from `https://drjavadrezazadeh.com` only, requires a valid Cloudflare Turnstile token for the same hostname, and forwards a request notice to `info@drjavadrezazadeh.com` through the private `EMAIL_SERVICE` RPC binding. It also sends a receipt to the applicant. It collects only name, email and role (student/parent/teacher/adviser/book), and stores no application data. Inbound mail delivery and reply handling depend on separately configured MX/mail routing and are NOT implemented by this Worker.

Deployment prerequisites:
- Create a Cloudflare Turnstile widget for `drjavadrezazadeh.com` and store its **secret** on the intake Worker as `TURNSTILE_SECRET` (never in GitHub).
- Deploy the intake Worker and configure a route, e.g. `drjavadrezazadeh.com/api/register-request` (the handler already accepts this path) or a dedicated custom hostname. Never bind it to payment routes.
- Wire the bilingual form with the public Turnstile site key and the exact deployed URL, after testing the request and receipt end-to-end.
- Ensure inbound replies to `info@drjavadrezazadeh.com` actually reach a monitored inbox. Resend outbound sending alone does not create an inbox.
- Add Cloudflare rate limiting/WAF rule to intake route before enabling public traffic; Turnstile alone is not sufficient for abuse control.
- Test both email sends, failure paths, and accessibility on mobile before public enablement.

Note: outbound receipt is sent after the administrative notice. A failure in the second call can lead to a delivered notice and an error response; do not automatically retry without deduplication/storage. This minimal service is not a durable order or account system.
