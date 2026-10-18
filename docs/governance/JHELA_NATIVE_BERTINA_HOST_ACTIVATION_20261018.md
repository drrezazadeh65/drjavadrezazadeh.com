# JHELA — first-party journal host activation (2026-10-18)

**Status: operator actions required; not evidence of a completed live manuscript submission.**

## Architecture and preservation

- The journal is first-party and uses the existing Bertina PHP application and the existing `drjavad1_store` mother database; do not create, reset, replace or import a second database.
- Existing verified tables `jhela_author_profiles`, `jhela_intake_manuscripts`, `jhela_intake_events`, `jhela_reviewer_candidates`, `jhela_finance_records` must be inspected, not recreated. Existing orders and identities are untouched.
- Public journal pages are under `/journal/`; the reserved `journal.drjavadrezazadeh.com` host redirects to the main public journal until its independent HTTPS and native host cutover have been verified.
- Reviewer applications, manuscript intake and manuscript file storage use the existing account/session and operator controls. Public articles, registered identifiers, peer review and payments must not be invented.

## Operator actions in Bertina cPanel

1. **SSL/TLS Status:** verify a CA-trusted certificate for `drjavadrezazadeh.com` and `journal.drjavadrezazadeh.com`; repair any self-signed or expired certificate through Bertina support. Do not change canonical host/redirects prematurely.
2. **File Manager → Home (outside public_html):** create `/home/drjavad1/jhela_private_manuscripts`, writable by the same PHP site user, preferably mode 0700. Never upload manuscript files to `public_html`. Keep public file listings disabled.
3. **Bertina support or Terminal:** confirm that the active PHP 8.3 worker has `fileinfo`, `proc_open` and an executable ClamAV scanner at `/usr/bin/clamscan` or `/usr/local/bin/clamscan`. If either executable or function is unavailable, ask Bertina to enable it; do not turn off antivirus verification.
4. **Existing private `public_html/api/config.local.php`:** edit the *existing returned PHP array*, preserving all current keys, credentials, authentication and commerce settings. Insert only the following keys (do not replace the entire file):

```php
'jhela_private_storage' => '/home/drjavad1/jhela_private_manuscripts',
'jhela_av_binary' => '/usr/bin/clamscan', // change only if host confirms /usr/local/bin/clamscan
'jhela_intake_enabled' => false,
'jhela_reviewer_intake_enabled' => false,
```

5. Ensure the existing `public_tls_confirmed` key is true **only after live TLS is genuinely trusted**. Keep both journal flags false until all preflight conditions pass. Then change `jhela_intake_enabled` and `jhela_reviewer_intake_enabled` to true, without modifying unrelated keys.
6. **Read-only production check:** open `https://drjavadrezazadeh.com/api/journal/intake/health`. It must return JSON with `profile: true`, `manuscriptIntake: true`, `reviewerIntake: true` before advertising operational intake. This endpoint exposes no private manuscript or identity.
7. **End-to-end owner acceptance:** use a genuine verified test account to save a profile, submit metadata, upload a clean PDF, verify the tracking number and private author workspace, then apply as a reviewer and verify the application appears in the MFA-protected owner dashboard. Verify no file can be downloaded publicly. A successful PDF receipt is not editorial acceptance or peer review.
8. Only after these checks, run the existing owner-controlled one-click Bertina deployment workflow. Do not alter the established deployment pipeline.

## Security and release gate

The code fails closed without a valid verified account, same-origin request, trusted TLS, existing schema, a writable private directory, an executable scanner and explicit enablement. A CI success proves source contracts, not that Bertina provides a scanner or that an article was accepted. Do not expose passwords, tokens or private manuscripts in chat, GitHub or public screenshots.

**Host-blocker decision:** If Bertina cannot provide ClamAV and `proc_open`, the operator must report that capability gap. Manuscript PDF intake stays disabled; reviewer registration and public journal information can be enabled separately after their own checks.
