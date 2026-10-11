# Registration failure: diagnosis and controlled recovery (2026-10-11)

## Observed symptom
The account creation form displays a generic Persian request-failed message. The browser registration client calls the `/auth/register` route of a Workers.dev origin and previously discarded the server's explicit safe error code.

## Verified provider facts
- Resend has published templates for email verification and password recovery.
- Resend's sending domain was reported `failed` on inspection; DKIM was the failed record while the other sending and receiving DNS records were reported verified at that time.
- A re-verification request was submitted. Its eventual result must be checked in the Resend domain dashboard. A pending status is not a success.
- No direct production registration request, email delivery, or Cloudflare D1 migration has been verified by this repository change.

## Source-level issues addressed
1. `/auth/health` previously checked only `customer_accounts`, not the token, session, and rate-limit tables required by registration and login.
2. The mere presence of `RESEND_API_KEY` was treated as evidence of email readiness.
3. The registration UI silently collapsed known error responses into one generic message.
4. The UI did not distinguish a login-capable backend from one able to complete new email-verified registrations.

## Operator recovery sequence
1. Confirm the authoritative active authentication endpoint: the current frontend calls `https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev`. Verify whether the active production deployment still uses this Worker or an approved Bertina API. Do not redirect to an unverified backend.
2. In the DNS control panel for the verified domain, compare the `resend._domainkey` TXT record with the **current** DKIM public value shown in Resend. Do not replace existing inbound MX records as a shortcut.
3. Re-run Resend domain verification and confirm the sending domain's final status is `verified`. Do not interpret `pending` as success.
4. Back up and inspect the active auth database. Ensure the four required auth tables exist and match the approved migration. Do not apply D1 SQL to an unrelated MySQL database; use the correct runtime-specific migration.
5. Deploy the reviewed Worker/auth runtime source through the authorized deployment process, and verify the exact active revision. A GitHub source commit does not deploy the Worker.
6. Test a controlled verification email to an approved test mailbox. Validate Resend API acceptance, delivery outcome, and successful single-use token verification without logging or exposing tokens.
7. Only after that end-to-end delivery test succeeds, set the Worker runtime variable `AUTH_EMAIL_DELIVERY_VERIFIED=true`. This is a deployment flag, **not a secret**; never set it based solely on Resend API-key presence.
8. Check `GET /auth/health` for `ready=true`, `registrationReady=true`, and `emailDeliveryVerified=true`. Check the public registration page again, then perform an authorized controlled registration.
9. Validate pending accounts, repeated requests, login, and password recovery without account enumeration. Recheck mobile layout and privacy after release.

## Safety constraints
- Do not put Resend API keys, passwords, email-verification URLs, personal email addresses, phone numbers, or customer records in Git or reports.
- If sending fails after a pending account is created, a second attempt must not be misrepresented as an entirely new account. Investigate delivery and pending-account state before retrying.
- Do not enable payment, commerce, or other unrelated capabilities as part of an auth fix.
- If runtime deployment or DNS authority is unavailable, keep registration fail-closed and record the external blocker rather than reporting production success.
