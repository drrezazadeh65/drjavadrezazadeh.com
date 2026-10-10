# Account service — implementation boundary

**Status: design and reference artifacts only; not deployed or exposed.**

The public Persian and English registration/login pages remain disabled until an independently audited account service exists. Do not repurpose the payment Worker or payment D1 database.

## Minimum security requirements

1. Create a **new dedicated D1 database** for identities; apply `schema.sql` there only. Never run migrations against payment data.
2. Implement Cloudflare Worker code with Web Crypto (the Node reference token policy is **not** deployable to Workers).
3. Store passwords using a vetted, memory-hard password-hashing implementation with operationally appropriate parameters; do not store plaintext, reversible passwords, or unsalted SHA-256 password hashes.
4. Require email verification before privileged access. Generate 32-byte opaque tokens, persist only their SHA-256 digest, and use 15-minute expiry for reset and verification flows (subject to usability review).
5. Consume tokens with a conditional **atomic D1 UPDATE**, checking exactly one changed row; do not rely on a check-then-update sequence.
6. Apply rate limits by hashed account/email and IP, neutral responses to prevent account enumeration, CSRF protections for cookie-based mutations, secure HttpOnly SameSite cookies, and session revocation after password reset.
7. Connect the authorized account Worker to `drjavadrezazadeh-email` via private `EMAIL_SERVICE` service binding; do not expose a public send-email endpoint.
8. Phone numbers are for service contact only, never login or verification. Eitaa support remains restricted to verified purchasers.
9. Enable public registration/login pages only after integration, security, accessibility, bilingual and mobile QA pass.

No secret values, user records, payment data or production credentials belong in this repository.
