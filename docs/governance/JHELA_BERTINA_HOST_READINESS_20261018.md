# JHELA — Bertina owner host readiness (native system)

## Read-only diagnostics
After deployment, sign in to the **existing** main-site administrator dashboard and complete the current two-factor verification. Open **Live journal host readiness / آزمون زنده زیرساخت امن مجله**. The endpoint `/api/admin/operations/jhela/host-readiness` is restricted to a fresh-MFA `SUPER_ADMIN` and returns booleans only. It never discloses private paths, credentials or manuscript content.

## Minimum Bertina settings, only if checks fail
1. In cPanel File Manager, create a private directory such as `/home/drjavad1/jhela_private_manuscripts` **outside** `public_html`. Do not put PDFs under the website's public root or in GitHub. Set ownership to the PHP account and restrictive permissions; verify PHP can write there.
2. In the existing private PHP configuration (`api/config.local.php`, if this is the site's active private configuration), add/verify these *non-secret* keys in the returned configuration array:
   - `'jhela_private_storage' => '/home/drjavad1/jhela_private_manuscripts'`
   - `'jhela_av_binary' => '/usr/bin/clamscan'` **only if that exact executable exists**; otherwise use the verified `/usr/local/bin/clamscan` path. Ask Bertina to provision antivirus if neither exists. Do not disable the antivirus requirement.
   - `'public_tls_confirmed' => true` **only after** trusted HTTPS is independently verified.
   - `'jhela_intake_enabled' => true` **only after** the DB, TLS, private storage, antivirus, clean/malicious scan and actual author E2E receipt have been tested in a safe environment. Leave `false` before that.
   - `'jhela_reviewer_intake_enabled' => true` only after reviewer consent and account verification flow has passed live tests.
   Existing environment variables `JR_JHELA_PRIVATE_STORAGE`, `JR_JHELA_AV_BINARY`, `JR_PUBLIC_TLS_CONFIRMED`, `JR_JHELA_INTAKE_ENABLED`, `JR_JHELA_REVIEWER_INTAKE_ENABLED` can be used instead, if supported by the host; **the private config overrides environment defaults**.
3. Keep `JR_DB_DSN` pointing only at the existing `drjavad1_store` mother database. Do not create another journal DB. Do not delete existing manuscript or finance records.
4. Never share `config.local.php`, passwords, tokens or private PDFs in chat or screenshots. The admin diagnostics only disclose safe booleans.

## Verification boundary
An executable scanner check does not prove that its malware signatures are up-to-date or that a real scan succeeded. A successful source test does not prove a live submission. Do not enable or advertise full peer review, journal payments, article publication, DOI registration or indexing without independent live evidence. The journal's current public pages stay online throughout.

## Release
Use the existing owner-operated GitHub Actions `deploy-bertina.yml` on `migration/bertina-linux6` only when CI and the current source snapshot are clean. The host configuration above is never committed to the repository.

## cPanel without Terminal (owner screenshot verified 18 October 2026)
The owner already has private directories at `/home/drjavad1/jhela_private_files` and `/home/drjavad1/jhela_private_manuscripts`. **Reuse and verify** the latter; do not create duplicate directories or delete any old folder during activation. The cPanel search shown to the owner does not expose a Terminal tool. Do not require shell access.

The owner can use File Manager for folder permission inspection and to add **only non-secret** JHELA settings to the existing private `public_html/api/config.local.php` (without replacing any other keys). Bertina support must confirm whether live LiteSpeed PHP can run the real `clamscan` binary and `proc_open`; CLI availability alone is insufficient. The existing owner dashboard displays the host-readiness booleans and per-check remediation without exposing private paths.

**Correct enablement sequence:** first leave `jhela_intake_enabled=false`; verify the directory, schema, HTTPS, executable scanner and test scans in a safe staging setting. Then explicitly enable the flag for a controlled test receipt, verify owner-only access and audit trail, and only then announce public manuscript intake. This avoids the impossible requirement to observe a live receipt before allowing any test intake.
