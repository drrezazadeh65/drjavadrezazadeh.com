# JHELA — operational PKP OJS installation and manuscript/review cutover
**Working source:** `migration/bertina-linux6` in the existing site repository.  
**Host:** Bertina Linux, private PHP/MySQL/cPanel configuration.  
**Status (2026-10-12):** PRE-PROVISIONING; **NO PUBLIC SUBMISSIONS**.  
**Editorial language:** manuscripts and review workflow in English; public journal information and invitations in English and Persian.

## 1. Install the actual OJS application, not a mock editorial dashboard

Select a currently supported official Public Knowledge Project **OJS 3.5** distribution from https://pkp.sfu.ca/software/ojs/download/ and verify the current PKP release announcement. PKP documented OJS 3.5.0-4 on April 11, 2026 (https://forum.pkp.sfu.ca/t/ojs-omp-and-ops-3-5-0-4-released/98135); this is an *observed minimum candidate*, not proof that it remains the newest version at install time. Obtain the exact publisher-released distribution and verify the download's authoritative SHA-256 or signature out-of-band. Do **not** upload an unverified archive, download application source from an unofficial mirror, or copy OJS into the site's public static `journal/` directory.

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
