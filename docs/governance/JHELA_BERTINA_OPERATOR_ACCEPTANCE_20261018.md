# JHELA Native Release — Bertina Operator Acceptance Checklist

This is a **release gate**, not a request to reinstall or duplicate any journal system. Source commit, CI success and public-site restoration are not proof of secure manuscript intake, editorial peer review, financial settlement or indexing.

## Operator actions on the existing Bertina account

1. Confirm the deployed domain `drjavadrezazadeh.com` is CA-trusted HTTPS and the private API's `public_tls_confirmed` setting is true only if independently verified. Keep the journal subdomain's existing temporary canonical bridge until native hosting has been separately tested.
2. Reuse **only** `drjavad1_store` with existing `drjavad1_storeapi` credentials in the private `api/config.local.php`. Do not recreate tables or apply `004c_jhela_founding_intake.sql` blindly: inspect the five existing `jhela_*` tables and their indexes first.
3. In cPanel File Manager, create a journal-private directory **outside** `public_html` and the deploy source, e.g. `/home/drjavad1/jhela_private_files` if that home directory is accurate. Restrict access to the account owner/PHP process, avoid public symlinks, and verify the PHP process can write there. Do not use `/public_html/journals` for private uploads.
4. Ask Bertina whether PHP 8.3 can execute `/usr/bin/clamscan` or `/usr/local/bin/clamscan` via `proc_open`, and whether its signatures are kept updated. If neither path is executable, **do not activate PDF intake**. Provide only the binary path and a yes/no result; never paste credentials or private files into chat.
5. In the existing private `api/config.local.php`, use:
   ```php
   'jhela_private_storage' => '/home/drjavad1/jhela_private_files', // only after actual path verified
   'jhela_av_binary' => '/usr/bin/clamscan', // only if actually executable
   'jhela_intake_enabled' => false, // keep false until full secure acceptance
   'jhela_reviewer_intake_enabled' => false, // independent consent workflow acceptance
   ```
   The example path is not a confirmed live path. Environment alternatives are `JR_JHELA_PRIVATE_STORAGE`, `JR_JHELA_AV_BINARY`, `JR_JHELA_INTAKE_ENABLED`, `JR_JHELA_REVIEWER_INTAKE_ENABLED`; private config takes precedence.
6. When source tests and host checks pass, verify `GET /api/journal/intake/health` reports truthful readiness. Use a verified test author and private test PDF to exercise profile, metadata, upload, unique receipt, owner MFA queue, protected download, request for information and author reply. Test rejection of wrong account, bad origin, non-PDF, oversize and infected file.
7. Turn on `jhela_intake_enabled` **only after** successful tests and monitoring. The separate native peer-review, editorial decisions, finance and publication features must remain disabled until their own implementation and evidence gates pass. Do not claim 100% operational until every journey is tested.

## Deployment
Use the existing GitHub Actions Bertina deployment on `migration/bertina-linux6`, only when source tests are green and operator prerequisites are met. No modifications to the workflow, central database, DNS, old backups or payments are authorised by this checklist.
