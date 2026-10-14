import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const manifest=JSON.parse(read('platform/jhela-ojs-activation.json'));
const failures=[];
const requireTrue=(condition,message)=>{if(!condition)failures.push(message);};
const expectedHost='https://journal.drjavadrezazadeh.com';
requireTrue(manifest.authoritativeRepository==='drrezazadeh65/drjavadrezazadeh.com','Unexpected journal repository');
requireTrue(manifest.developmentBranch==='migration/bertina-linux6','Unexpected source branch');
requireTrue(manifest.reservedScholarlyOrigin===expectedHost,'Journal target hostname changed');
const selected=manifest.canonicalDomainDecision;
requireTrue(selected?.decidedBy==='SITE_OWNER' && selected?.date==='2026-10-15','Explicit final owner journal-domain decision missing');
requireTrue(selected?.selectedHost==='journal.drjavadrezazadeh.com','Journal final canonical domain must remain singular');
requireTrue(selected?.currentCpanelHost==='journals.drjavadrezazadeh.com','Observed plural cPanel host must be preserved in migration provenance');
requireTrue(selected?.currentCpanelDocumentRoot==='/public_html/journals','Do not silently rewrite existing OJS document root');
requireTrue(selected?.status==='DOMAIN_CREATED_CPANEL_TLS_UNVERIFIED','Confirmed cPanel domain creation must not be represented as OJS/TLS readiness');
requireTrue(selected?.singularHostProvisionedInCpanel===true && selected?.singularCpanelDocumentRoot==='/public_html/journals',
  'Owner-confirmed singular host must continue to point to recovered OJS directory');
requireTrue(selected?.pluralHostStillPresent===true,'Do not remove the legacy plural domain without validated cutover');
requireTrue(selected?.sslCertificateVerified===false && selected?.ojsInstallerVerifiedOnSingularHost===false,
  'Unverified TLS and native OJS installation cannot be certified from the cPanel domain list');
requireTrue(selected?.httpsForceRedirectObserved==='OFF_WITH_WARNING','Protect cPanel observed SSL caution until verified');
requireTrue(selected?.existingApplicationPreservationRequired===true,'Do not reinstall or overwrite recovered OJS application');
requireTrue(selected?.manuscriptStorageOutsidePublicHtmlRequired===true,'Manuscripts must remain outside the public webroot');
requireTrue(selected?.publicJournalInformationRoutesPreserved===true,'Existing /journal/ routes and sitemap must be preserved');
requireTrue(selected?.canonicalCutoverAuthorized===false && selected?.legacyRedirectAuthorized===false,
  'Cutover and redirects require separate verified cPanel+TLS+OJS readiness and owner activation');

requireTrue(manifest.originState==='RESERVED_NOT_LIVE','Journal host must remain reserved until verified live');
requireTrue(manifest.journalPublicationLanguage==='en','Scholarly publication language cannot be changed by a public-language UI task');
requireTrue(JSON.stringify(manifest.publicInformationLanguages)===JSON.stringify(['en','fa']),'Public journal languages must remain English and Persian');
for(const flag of ['ojsInstalled','secureFilesDirectoryVerified','dedicatedDatabaseVerified','ownerEditorialRolesVerified','independentRestoreVerified','smtpDeliveryConfirmed','realReviewEndToEndConfirmed','publicSubmissionsEnabled','firstIssuePublished','doiAssigned','issnAssigned']){
 requireTrue(manifest[flag]===false,'Unverified activation flag was set: '+flag);
}
requireTrue(manifest.activation==='FAIL_CLOSED_UNTIL_NATIVE_OJS_RUNTIME_AND_OWNER_GATES_PASS','Real OJS activation gate weakened');
const root=read('sitemap.xml'),journalMap=read('journal/sitemap.xml');
requireTrue(root.includes('/journal/sitemap.xml'),'Independent JHELA sitemap missing from root XML index');
requireTrue(!journalMap.includes('journal.drjavadrezazadeh.com'),'Reserved subdomain prematurely advertised as canonical');
for(const locale of ['','fa/']){
 const path='journal/'+locale+'submission/index.html';
 const html=read(path);
 requireTrue(/name="robots" content="noindex/.test(html),'Unopened manuscript intake must remain noindex: '+path);
 requireTrue(!journalMap.includes('/journal/'+locale+'submission/'),'Unopened submission page in public sitemap: '+path);
 requireTrue(!/action=["']https?:\/\//.test(html),'Unapproved submission endpoint: '+path);
}
requireTrue(read('scripts/jhela-ojs-readiness.php').includes("PHP_SAPI !== 'cli'"),'PHP OJS preflight must remain CLI-only');
requireTrue(read('scripts/jhela-ojs-readiness.php').includes('submission_files_outside_webroot'),'Private files security gate missing');
requireTrue(read('scripts/jhela-ojs-readiness.php').includes('native_ojs_schema_present'),'Native OJS database evidence gate missing');
requireTrue(read('scripts/jhela-ojs-readiness.php').includes('review_workflow_e2e_test'),'End-to-end review evidence gate missing');
requireTrue(read('docs/governance/JHELA_OJS_INSTALLATION_RUNBOOK_20261012.md').includes('NO PUBLIC SUBMISSIONS'),'OJS rollout runbook lacks explicit launch restriction');
if(failures.length){
 console.error('JHELA OJS activation contracts FAILED:',failures.join('; '));process.exit(1);
}
console.log('JHELA OJS independent provisioning blueprint and fail-closed source controls PASS. This is not installed-OJS or Bertina live evidence.');
