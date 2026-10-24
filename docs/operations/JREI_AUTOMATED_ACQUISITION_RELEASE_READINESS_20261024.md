# JREI automated acquisition — release readiness (2026-10-24)

## Verified owner-side observations
- Both Windows workers were observed ONLINE in the mother database and launched through Windows Task Scheduler. These are point-in-time observations, not a 24/7 uptime guarantee.
- Bertina support confirmed Cron installation (ticket t975913). Private server log showed a recent scheduler invocation with `JR master scheduler disabled by private owner policy.`
- Mother DB `jrei_ka_controls`: `scheduling_enabled=0`, `acquisition_enabled=0`; queue/source-policy counts were zero.
- Owner manually archived four public HTML pages and extracted 385 links, 7 preliminary candidate URLs, 0 direct document links. No PDF acquisition was demonstrated.
- A single exam source candidate is `DISCOVERED` with `PERMISSION_UNVERIFIED`. It is not an approved download target.

## Release scope and required sequence
1. Preserve the existing single Bertina master Cron and mother database. Do not create another scheduler, DB or worker identity.
2. Verify that the deployed source includes the existing JREI KA scheduler, acquisition dispatcher, and the operations master registry worker entries.
3. Run source and integration CI; review any failed or cancelled checks. Confirm deployment SHA and post-deploy health before claiming publication.
4. In the private owner configuration, inspect (do not blindly flip) `operations_cron_master_enabled`, `jrei_ka_schedule_enabled`, and `jrei_ka_autofetch_enabled`. Only authorize after real host checks and owner approval.
5. In mother DB, enroll individual sources with correct provenance, source URL, rights evidence, robots/terms review, transport review, and approved policy. Do not mark sources approved without evidence.
6. Enable the relevant allowlisted Cron job(s) through the owner-controlled operations workflow, then opt in to the KA control flags only after eligible sources exist.
7. Test one bounded acquisition and confirm source, job, observation, file checksum and private archive; then enable recurring discovery and downloads with per-host throttling, retries, deduplication and storage monitoring.
8. Leave model inference, exam question publication and restricted-source scraping OFF until independently validated.

## Operator notes
- Automated discovery of public metadata can be broader than automated downloading. Respect robots, source access restrictions, rate limits and publisher rights. No paywall or authentication bypass.
- Source presence, passing CI and a running Windows process do not prove that real crawling has begun.
- Keep a rollback switch: disable the KA job and acquisition flags without disabling unrelated website jobs.
- Production deployment remains owner-authorized under the existing GitHub Actions release gates; no full-masterplan acceptance claim is made.
