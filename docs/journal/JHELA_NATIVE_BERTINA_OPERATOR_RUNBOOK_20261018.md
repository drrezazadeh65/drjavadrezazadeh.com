# JHELA — Native Bertina operator activation and evidence (18 October 2026)

**Status:** source implementation / NOT a production activation certificate. This procedure applies only to the existing site, its existing mother database, and the owner-authorised first-party JHELA journal. Do **not** reinstall OJS, create an OJS database, or change the existing one-click deployment workflow.

## 1. Read-only live status

Visit the exact URL in a normal browser:
`https://drjavadrezazadeh.com/api/journal/intake/health`

Record the JSON booleans `profile`, `manuscriptIntake`, `reviewerIntake` and the HTTP status. A successful response with `manuscriptIntake:false` is **not** evidence of manuscript acceptance. If the API is inaccessible, verify the deployed release and the existing same-origin API routing before changing host flags. Do not send authentication cookies, database credentials, tokens, or private PDF files in screenshots.

## 2. Bertina host prerequisites

- Confirm the **apex HTTPS** certificate and redirect chain work with a trusted certificate. The JHELA subdomain is currently a temporary GET/HEAD redirect to the working apex journal; no second login backend is authorised.
- Use only the already-provisioned MariaDB mother database and the existing verified account/session API. The `jhela_author_profiles`, `jhela_intake_manuscripts`, `jhela_intake_events`, `jhela_reviewer_candidates`, and `jhela_finance_records` tables must exist and match their source columns.
- Create a private directory **outside** `public_html`, e.g. `/home/drjavad1/jhela_private_manuscripts`, owned by the PHP account and writable only by that account. For cPanel File Manager: Home > New Folder; never create the upload folder inside `public_html`. The directory must be real, not a symlink.
- Confirm ClamAV `clamscan` is executable by the actual **web PHP** process at `/usr/bin/clamscan` or `/usr/local/bin/clamscan`, and that PHP `proc_open` and `finfo` work. The CLI PHP configuration can differ from LiteSpeed PHP, so a terminal result alone is insufficient.
- No email payment gateway, publication, peer review or DOI activation is implied by these checks.

Safe, non-secret cPanel Terminal diagnostics (if Terminal is enabled):

```sh
command -v clamscan || true
php -r 'echo "proc_open=".(function_exists("proc_open")?"yes":"no").PHP_EOL; echo "finfo=".(class_exists("finfo")?"yes":"no").PHP_EOL;'
```

If ClamAV is absent or blocked by hosting policy, ask Bertina to provide the binary and web-PHP execution capability; **do not bypass the scanner** to force intake on.

## 3. Host configuration (operator-controlled, not committed to Git)

The application reads these exact runtime environment variables:

```text
JR_PUBLIC_TLS_CONFIRMED=true
JR_JHELA_PRIVATE_STORAGE=/home/drjavad1/jhela_private_manuscripts
JR_JHELA_AV_BINARY=/usr/bin/clamscan
JR_JHELA_REVIEWER_INTAKE_ENABLED=true
JR_JHELA_INTAKE_ENABLED=true
```

These values are examples, **not** instructions to enable blindly. The private path and ClamAV binary must match the real server; `JR_PUBLIC_TLS_CONFIRMED` requires actual verified TLS. Set `JR_JHELA_INTAKE_ENABLED=true` **last**, after prerequisites and source deployment are confirmed. If Bertina does not expose persistent PHP runtime variables, request a supported host-side configuration mechanism. Never put secrets into GitHub, public pages, a public .htaccess, or chat.

## 4. Live end-to-end acceptance, after source deployment

1. Re-open the public readiness URL and require `profile:true`, `manuscriptIntake:true`, and `reviewerIntake:true` (reviewer intake can be separately enabled).
2. Register and verify a test academic account through the existing site identity flow; complete the academic profile; submit genuine test metadata and a harmless small PDF. Verify a unique JHELA tracking code and private receipt. **Never use real unpublished research as test data.**
3. Open the protected owner dashboard; complete TOTP; inspect the real preliminary manuscript queue. As SUPER_ADMIN, download the PDF, verify that it is the submitted document, and record an information request. As the author, reply in the private workspace and verify status/history updates.
4. Apply as a test reviewer, verify private owner approval and public listing only with separate opt-in consent.
5. Confirm the PDF cannot be fetched without owner login + fresh MFA, cannot be fetched via public URL, and that no files are stored in `public_html`.
6. Verify mobile Persian/English UI, error cases, duplicate requests, session expiry, private `no-store` headers, and the existing commerce/auth regression suite.

**Publication and formal peer review are distinct future gates.** A received PDF or preliminary screening is not a scientific acceptance, indexing claim, publication or financial transaction.

## 5. Release boundary

The owner performs the existing one-click Bertina release. Do not modify the deployment workflow. Source CI passes do not prove the host's runtime readiness; final operational status requires the live tests above. The existing mother database, working store, orders, services, and author accounts must be preserved without regression.
