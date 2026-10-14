# JHELA — operational PKP OJS installation and manuscript/review cutover
**Working source:** `migration/bertina-linux6` in the existing site repository.  
**Host:** Bertina Linux, private PHP/MySQL/cPanel configuration.  
**Status (2026-10-12):** PRE-PROVISIONING; **NO PUBLIC SUBMISSIONS**.  
**Editorial language:** manuscripts and review workflow in English; public journal information and invitations in English and Persian.

## 1. Install the actual OJS application, not a mock editorial dashboard

Select a currently supported official Public Knowledge Project **OJS 3.5** distribution from https://pkp.sfu.ca/software/ojs/download/ and verify the current PKP release announcement. PKP's official download page currently identifies **OJS 3.5.0-5 LTS**, released June 30, 2026 (https://pkp.sfu.ca/software/ojs/download/). Use that official LTS package unless a more recent vendor-supported security release is independently confirmed at deployment. This replaces the earlier 3.5.0-4 candidate. Obtain the exact publisher-released distribution and record the SHA-256 of the official package fetched over CA-trusted HTTPS and verify that digest after every transfer; where the vendor supplies an independently verifiable checksum/signature, compare that as well (a locally calculated checksum by itself is not a publisher signature). Do **not** upload an unverified archive, download application source from an unofficial mirror, or copy OJS into the site's public static `journal/` directory.

The existing `journal/` pages and independent XML sitemap stay in this repository. The separate OJS installation belongs to the already-planned *Bertina journal virtual host*, not a new GitHub development repository/branch and not an additional replacement application developed in source.

## 2. Bertina hosting preparation before any upload or registration

1. Provision `journal.drjavadrezazadeh.com` with a **dedicated virtual-host document root**, independent of the main domain's `public_html`. Confirm authoritative DNS, a CA-trusted TLS certificate, strict HTTPS redirects and no URL collision with `/journal/`.
2. Ensure PHP 8.2+ and the required OJS PHP extensions, memory, uploads and database engine supported by the selected official release. Run `php scripts/jhela-ojs-readiness.php --contract` in an appropriate PHP 8.2+ environment for minimum capabilities.
3. Create a **separate, least-privilege MySQL database and user** for OJS. Never reuse the site's existing customer/commerce/student database credentials. Private values must remain in Bertina-only configuration, not source, CI logs, or public installation forms.
4. Create a **writable private manuscript directory outside every web-accessible document root**. No web URL, direct static rule, alias or path traversal may expose submissions, reviewer reports or private author metadata. Lock down permissions and test retrieval of an unpublished known fixture **fails** for anonymous and unauthorised users.
5. Provision separate private application configuration including installation-specific random secrets; secure administration credentials and verified SMTP receipt, bounce and password reset. Enable periodic anti-malware checks on uploaded files, strict type/size enforcement, backpressure and rate limits where supported.
6. Configure independent encrypted daily database+private-file backups with a recorded **successful restore** before any real author account or manuscript is accepted. Keep OJS application backups version-aligned.

**Do not share session cookies, role tables, account passwords, access tokens or student data with the main website.** A user may navigate through links from the main site, but an account created in the main site is not automatically a reviewer or editor. Staff accounts are individually provisioned and MFA-protected where supported.

## 3. Install and configure the publisher's OJS release

Extract the verified official OJS package to the isolated journal document root using Bertina's authorised deployment facility or shell. Follow its bundled README and configuration instructions. Give only the narrow required directories write access. Configure:
- Official URL `https://journal.drjavadrezazadeh.com`; private `files_dir` outside web root; independent DB; secure credentials and unique application secrets.
- Default scholarly article language **English** and English metadata requirements. Enable **Persian only as an information/user-interface locale** if the official package and its language packs support the requested pages. Do not mark Persian research article uploads as the journal's ordinary publication language.
- Journal acronym **JHELA**, long title **Journal of Human-Centred Education, Learning and Assessment**, and only verified institutional, publisher, postal address and contact metadata.
- Author self-registration only after the reviewed author-privacy notice and real email verification work; no public editor/reviewer-role self-assignment; editor and reviewer invitations require role-by-role approval.
- Double-anonymised external research-article review, **at least two appropriately qualified independent reviewers** ordinarily, recusal for editor-authored manuscripts, confidential reviewer identities, and a documented independent handling-editor decision.
- Submissions, editing, revision, editorial decisions, production, open-access licences, article identifiers, metadata deposit and archiving configured in OJS itself. No custom parallel manuscript decision system, fake DOI/ISSN, fabricated issues or editorial membership.
- Email queues and scheduled tasks/cron according to the selected OJS version; test successful task execution without leaking sensitive messages.

## 4. Real end-to-end acceptance test (staging only)

Use *fictitious, clearly marked* staging documents and consented test accounts. Do not place real unpublished research in an unverified environment. Record evidence at each transition:
1. Separate author account registers, verifies its email and signs in; anonymous requests to private manuscript URLs are denied.
2. Author enters English title, abstract, co-authors and required declarations, and uploads a benign PDF/Word fixture. OJS persists the submission in the **dedicated OJS database** and its file contents only in the **private directory**.
3. Managing editor screens the manuscript, assigns an unconflicted independent section editor and records an editorial audit trail.
4. Handling editor selects two **different** independent reviewer accounts. Confirm reviewer A cannot access reviewer B's private report, protected author-identifying material or unrelated manuscripts; neither can change editorial decisions.
5. Reviewers accept/decline invitations and submit two confidential reports; an editor records a reasoned **major/minor revision or rejection** outcome and a proper notification. Verify the author does not receive review identities or confidential editorial notes.
6. Author uploads a revised version; editor considers reviewer reports and records a new decision. Do not simulate an acceptance by altering database rows directly.
7. Independently test rejection, conflicted reviewer recusal, expired access, closed/reopened assignment, repeat submission, large/malicious file rejection, CSRF, session expiry, password recovery, deletion/withdrawal and failure to send mail.
8. Restore a staging snapshot of the OJS database *and* private files and verify integrity. This test does **not** touch the existing customer system.

A test is completed only if there is durable evidence from the **actual OJS application**, not a synthetic API response or a GitHub job title. Stage tests must be clearly labelled as not real scholarly publication.

## 5. Enforce a hard public-launch boundary

Run `php scripts/jhela-ojs-readiness.php --runtime` **on the configured Bertina server** with private `JHELA_OJS_*` variables stored privately, not in GitHub. Runtime PASS must verify native PKP files/config and installed OJS database tables, isolated writable private storage, separate database, TLS, real SMTP receipt, independently restored backups, approved staff roles, manuscript access controls and review-workflow E2E evidence. Boolean evidence flags alone do not create their underlying proof. **Keep public manuscript submissions OFF until owner-approved editorial policies, independent editor appointments, contact details and the real smoke/restore evidence are separately signed off.**

Never run installation, migrations or uploads as part of the main site's routine source SEO CI. Do not mutate the main `api/index.php`, `docs/BERTINA_MYSQL_SCHEMA.sql`, `/journal/` or customer authentication contracts to fake OJS readiness. Do not start a second deployment while another is running. The existing site’s private signed backup/restoration approval remains mandatory for releases affecting existing production files.

## 6. Canonical, sitemap and cross-language cutover

Before the journal subdomain is actually accessible: retain all existing English and Persian `/journal/` pages, their independent sitemap and noindex submission/current/archive. After validated subdomain deployment, first ensure journal-host `robots.txt` advertises `https://journal.drjavadrezazadeh.com/sitemap.xml` and OJS emits **only real indexable journal pages/accepted publications**. Test self-canonical, English/Persian alternatives, HTTP 200, XML metadata, mobile accessibility and no duplicate indexing.

Make a **one-hop 301 mapping per old public /journal/ route** to its verified equivalent, only when the new page exists. Keep the main-domain academic/marketing pages distinct from OJS internal editorial screens. Request re-crawl through the actual verified journal Search Console property and monitor indexation; an XML file alone is never evidence of indexation. URLs for published articles, DOI, ISSN, issue archive and indexing must not be fabricated before verified publication/assignment.

## 7. Roles and responsibility owners

The scholarly publisher/founding editor is responsible for honest policies, editorial independence, verified board consent and academic decisions. Bertina system administration is responsible for secure DNS/TLS/private filesystem, backup/restore, PHP/MySQL isolation and mail delivery. The designated managing editor and handling editors are responsible for ensuring real reviewer assignments and manuscript confidentiality. No arbitrary GitHub collaborator receives editor/reviewer permissions.

**Acceptance state:** This runbook and its source preflight start genuine OJS provisioning; they do not establish that OJS is currently installed, that any submission has been received, or that international indexing/accreditation has been granted.

## Offline package verification before installation

Use the new `scripts/jhela-ojs-stage-package.py` with `JHELA_OJS_OFFLINE_STAGE` set to a new private staging path and `JHELA_MAIN_PUBLIC_ROOT` pointing to the existing site's public root. Provide `--archive` pointing to the downloaded official PKP tarball and `--sha256` set to the independently recorded trusted transfer digest. The script rejects overwrite, directory traversal, symlinks/device entries and any staging location overlapping the main live root, then validates the extracted native PKP layout. It does not edit DNS, import OJS database schema, deploy files, create roles or open submission. Its adversarial fixture tests run in the isolated OJS readiness workflow. The official package is approximately 120 MB; never commit it to the main website source or include it in the site's sanitized public ZIP.

## 8. Bertina installer recovery checkpoint — 2026-10-15 (owner screenshots; not independently live-certified)

After recovering earlier incomplete PHP/OJS files, the owner reached the **official OJS 3.5.0-5 installer interface**. Previous errors for `lib/pkp/includes/bootstrap.php`, `lib/pkp/lib/vendor/autoload.php`, `dbscripts/xml/version.xml` and `lib/pkp/templates/install/install.tpl` should therefore be treated as historical until a fresh runtime check reproduces them. **Do not restart piecemeal restoration solely from old errors, do not delete the recovered OJS instance, and do not overwrite the main `/journal/` pages.**

**Recovered installation candidate:** a cPanel directory beneath the site's `public_html/journals/` (plural). An extracted `ojs-3.5.0-5` release was also inspected beneath the site's existing `public_html/journal/portal/` tree. The extracted archive is not the active OJS application. The plural `journals` directory is now shown as the cPanel document root of the actual `journals.drjavadrezazadeh.com` subdomain, but this is not proof of TLS, private storage, protected installer access or suitability as the final canonical journal origin.

**Critical configuration risk exposed by the installer screenshot:** `files_dir` had been proposed beneath the main site's `public_html/files`. This is **unacceptable**, even though it is outside the `journals` application directory. Set the manuscript directory to a pre-created, writable, private location under the hosting account's home directory, strictly outside **every** web-accessible document root, and verify an unauthenticated HTTP request to a benign private fixture is denied. No real manuscript or reviewer attachment may be placed into `public_html`.

**Before selecting Install:**
1. Restrict public access to the uninstalled wizard in Bertina (for example, temporary cPanel Directory Privacy on the *installation path*, not the public `/journal/` information site), ensuring attackers cannot create the first administrator. Verify the restriction without exposing credentials.
2. Verify the existing `journals.drjavadrezazadeh.com` subdomain's distinct OJS application directory, without assuming that cPanel permits directories outside `public_html`. A nested OJS application is acceptable only when `files_dir` is outside *every* public root and the main-domain `/journals/` alias is independently restricted or redirected only after the official subdomain is ready. Do not relocate the OJS application without a backup, a confirmed permitted destination and evidence that production routing will not break. The previous reserved `journal.` (singular) canonical and the actual `journals.` (plural) host must be reconciled explicitly before final launch.
3. Run `scripts/jhela-ojs-installer-check.php --installer-check` with private environment variables `JHELA_OJS_DOCROOT`, `JHELA_MAIN_PUBLIC_ROOT` and `JHELA_OJS_PRIVATE_DIR`, in the **Bertina PHP CLI**. The check is read-only and prints no absolute paths, usernames or passwords. A red result blocks the install; a green result verifies only local source and filesystem, not live security.
4. Verify the package as one consistent official PKP 3.5.0-5 release against the trusted download and transfer digest. Avoid blindly merging arbitrary partial folders from an old copy. Confirm all native libraries, templates, DB scripts and version metadata before continuing.
5. Use an isolated OJS-only MySQL database and its exact cPanel-authorized user, `localhost` only if the Bertina MySQL service confirms it, and a private secret. Never post the DB credentials or first administrator password in a chat, screenshot, workflow log or repository. Do not equate a cPanel username with an OJS administrator role.
6. Set **effective web PHP**, not merely CLI PHP, to the supported release version, with correct extensions and upload/post limits (the prior form showed a low 2 MiB upload limit; raise to an appropriately tested bound before accepting journal submissions).
7. Independently certify CA-trusted HTTPS, working outbound journal email/password reset, app-specific secret keys, backups with a tested restore, and author/editor/reviewer role isolation. Only then complete the protected installer.
8. Keep real public submissions disabled until the actual English-language editorial workflow, double-anonymous review, qualified independent reviewers, human policy approval, and private-file access tests pass. Only publish journal-subdomain sitemap and migrate existing `/journal/` URLs after verified cutover.

**Current evidence status:** Source scripts and CI can verify logic, but this project has no direct authenticated cPanel terminal, file-manager, virtual-host, private-MySQL, or journal administrator access through the GitHub integration. An installation wizard seen in a screenshot is **not** an installed, secure, editorially operational journal. All readiness flags in `platform/jhela-ojs-activation.json` remain false until independent Bertina and editorial evidence is recorded.

## 9. cPanel Domains evidence — 2026-10-15

The owner-supplied cPanel Domains screenshot establishes:
- Main domain: `drjavadrezazadeh.com` → `/public_html`.
- **Actual installed subdomain**: `journals.drjavadrezazadeh.com` (plural) → `/public_html/journals`.
- Domain redirect: not configured for the journal subdomain.
- Force HTTPS Redirect: Off with a warning marker on the journal row. This does **not** establish the absence or presence of a valid SSL certificate; independently inspect cPanel SSL/TLS Status or actual CA-trusted HTTPS before toggling it on.

As documented in cPanel's own Domains/WHM configuration instructions, a shared-hosting provider may restrict subdomain roots to `public_html`. This structural arrangement does not necessarily invalidate OJS. The actual critical safeguards are a distinct OJS directory, secret config protection, **private files_dir outside `/home/drjavad1/public_html`**, access control for the installer, controlled duplicate access from `https://drjavadrezazadeh.com/journals/`, and a certified journal-host HTTPS endpoint.

**Do not blindly replace the existing plural host with the planned singular `journal.` address**, create a new subdomain or change OJS `base_url` until the final permanent journal address is approved. Existing public `/journal/` information pages and their sitemap stay unchanged. The canonical journal-subdomain plan, archive and sitemap must be made mutually consistent *before* any public journal-subdomain launch.

To proceed safely in cPanel without exposing passwords:
1. Open the existing `journals.drjavadrezazadeh.com` **Manage** page and inspect whether New Document Root is available. Do not press Update, Rename, Remove or Redirect yet.
2. Open **SSL/TLS Status** and check the certificate for the plural journal host. If missing or invalid, resolve AutoSSL/DNS with Bertina before enabling Force HTTPS Redirect.
3. Use File Manager to create/check a manuscript `files_dir` beneath the user's private home directory (for example `/home/drjavad1/ojs_private_files`), **not anywhere beneath `public_html`**. Do not upload private articles until deny-access has been verified.
4. Use the read-only CLI checker and review the `nested_main_webroot` / `main_domain_alias_status` warning. Runtime readiness additionally requires `JHELA_OJS_MAIN_DOMAIN_PATH_VERIFIED=true` backed by an independently observed main-domain URL access test when nested.
5. Finish independent journal database, web-PHP extensions, restore, SMTP, privacy and reviewer smoke tests without touching the main website commerce/customer database.

**Evidence boundary:** No shell/file-manager connection to Bertina is available via the connected GitHub repository. These source/CI checks do not demonstrate that production OJS is installed, operational or accepting manuscripts.

## 10. Owner-approved permanent host — 2026-10-15

**Decisive owner instruction:** the permanent journal origin is **`https://journal.drjavadrezazadeh.com` (singular)**. This choice is final. The existing **`journals.drjavadrezazadeh.com` (plural)** is only the observed cPanel installation host and must **never** become the journal's declared permanent canonical. `platform/jhela-ojs-activation.json` records the decision without falsely switching `RESERVED_NOT_LIVE` or enabling public submissions.

**Official cPanel limitation (Manage the Domain, last updated 2026-07-22):** `Rename Domain` does **not** rename a *subdomain*. Do not attempt to rename the plural host using that control. cPanel's `Create a New Domain` supports entering a fully qualified subdomain and, when the hosting plan allows, customizing its document root. The `Share document root` checkbox points to the **main domain's `public_html`**, not automatically to the plural journal's `public_html/journals`. Leave it unchecked to avoid replacing the main site. Official references:
- https://docs.cpanel.net/cpanel/domains/domains/manage-the-domain/
- https://docs.cpanel.net/cpanel/domains/domains/create-a-new-domain/

### Preferred no-loss provisioning
1. Confirm current `public_html/journals` folder and snapshot its OJS files, `config.inc.php`, independent DB (if created), and the separate private `files_dir` (if created). Do not expose backups inside `public_html`. Do not share secrets in screenshots.
2. In cPanel `Domains > Create a New Domain`, select a registered-domain/subdomain entry and enter exactly `journal.drjavadrezazadeh.com`. **Uncheck `Share document root`**. If cPanel allows assigning an already-existing dedicated document root `public_html/journals` to both hosts, do so only after checking that the setting does not change the main domain. If the form refuses reusing that root, stop and seek an authorized Bertina configuration rather than deleting the plural host or copying incomplete OJS files.
3. **Never use `public_html/journal` as a new OJS document root.** That path belongs to the site's existing independent `/journal/` public pages and sitemap. If Bertina cannot map the new subdomain to the existing OJS root, coordinate a separately backed-up relocation to a noncolliding directory with Bertina, preserving the full PKP file tree and its private assets.
4. Confirm independent DNS records, effective web PHP, CA-trusted SSL and HTTPS for `journal.` (singular). An SSL warning on the old `journals.` entry is not a certificate test for `journal.`. Configure protected access to the unfinished installer before exposing the new hostname.
5. Create/verify the private `files_dir` **outside `/home/drjavad1/public_html`**. Do not install OJS with `public_html/files`, `public_html/journals/files` or any other web-served upload directory.
6. While OJS is still in the installer, configure its secure `base_url` for `https://journal.drjavadrezazadeh.com` only after the hostname serves the intended OJS application with CA-trusted HTTPS; install using the dedicated DB and administrator credentials entered privately through Bertina. Do not put private values in GitHub.
7. Carry out real after-install checks: confirmed admin login, transactional journal email, password recovery, private files access denial, backups + restore, English-only manuscript workflow, two independent reviewers, human editorial decisions, double-anonymous access separation. Until accepted, restrict access / registrations and keep production submissions closed.
8. **Only after the journal's canonical hostname, OJS paths and TLS are verified**, decide whether to redirect the plural host to the singular one. Prevent redirect loops and leaking uninstalled/private URLs. **Do not implement blanket main-domain `/journal/` redirects** before one-to-one target routes are verified to exist; preserve legacy bilingual editorial pages and independent sitemap.

### Current state: decision approved, domain provisioning still unverified
- **CONFIRMED:** owner selected permanent singular hostname.
- **OBSERVED IN CPANEL SCREENSHOT:** plural hostname mapped to `/public_html/journals`.
- **UNKNOWN/NOT YET PROVED:** new singular host created, its root mapped to recovered OJS, valid TLS, protected install, DB, private uploads, installed OJS, public-safe URL routing, editor/reviewer and restoration tests.
- **NO-GO:** publishing submissions, official `journal.` sitemap, old-host redirect or production-canonical cutover until all appropriate checks pass.

**Next human-visible checkpoint:** cPanel `Domains > Create a New Domain`, with `journal.drjavadrezazadeh.com` entered and the **Share document root box unchecked**. Inspect whether the `Document Root` field accepts `public_html/journals` (do not Submit until supported). Screenshot that configuration without credentials. If that path is not offered, ask Bertina support to map the singular hostname to the existing verified OJS root or approve a no-loss alternate root.
