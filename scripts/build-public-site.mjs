import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {isOwnershipVerificationArtifact,verifyOwnershipArtifact} from './site-ownership-verification.mjs';
import {checkStylesheetBundles} from './stylesheet-bundles.mjs';
import {projectCommunityServicePages} from './community-service-bundle.mjs';
import {CONNECTORS} from '../platform/social-distribution/connections.mjs';
import {generateQualityInventory} from './operations-page-quality.mjs';
import {hiddenFeatureSourceInventory} from './operations-hidden-features.mjs';
import {includeJreiAssistant} from './jrei-public-assistant-surface.mjs';
import {fingerprintCoreStyles} from './release-fingerprint-core-styles.mjs';
import {bundleOwnerStyles} from './release-bundle-owner-styles.mjs';

checkStylesheetBundles();

const root=process.cwd();
const out=path.join(root,'.public-site');
const excludedTop=new Set(['.git','.github','docs','edge','payment-api','foundation','node_modules','platform','database','migrations','scripts','tests','test-results','playwright-report','proposals','work','identity','.public-site']);
const excludedRoot=new Set(['README.md','AGENTS.md','.bertina-deploy-trigger','.bertina-backup-trigger','.bertina-bootstrap-authorization.json','CACHE_STANDARD.md','CNAME','_headers','_redirects','_config.yml']);
const excludedExact=new Set(['assets/media-registry.json','assets/release-v4.4.json',
  // Retired third-party journal stylesheet is archival source, never public release material.
  'assets/css/jhela-ojs-theme.css']);
const forbiddenReleasePath=/(?:^|\/)(?:\.env(?:\.[^/]*)?|config\.local\.php|[^/]+\.(?:pem|p12|pfx|key|sql|bak|dump))$/i;

fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});

function copy(rel=''){
  const src=path.join(root,rel);
  for(const ent of fs.readdirSync(src,{withFileTypes:true})){
    const child=rel?rel+'/'+ent.name:ent.name;
    if(forbiddenReleasePath.test(child)) throw Error('Refusing to package credential, database or backup file: '+child);
    if(!rel&&excludedTop.has(ent.name)) continue;
    if(!rel&&excludedRoot.has(ent.name)) continue;
    if(excludedExact.has(child)) continue;
    const from=path.join(root,child);
    const to=path.join(out,child);
    if(ent.isDirectory()){
      fs.mkdirSync(to,{recursive:true});
      copy(child);
    }else if(ent.isFile()){
      fs.mkdirSync(path.dirname(to),{recursive:true});
      fs.copyFileSync(from,to);
    }
  }
}
copy();
// JREI-LM needs THREE fixed reviewed DDL statements on Bertina.
// docs/ is deliberately excluded from the production package. Project only
// these exact SQL sources into the original HTTP-denied api/internal folder,
// retaining source hashes; NEVER ship docs/, plaintext backups or credentials.
const jreiSqlMigrations=[
  '20261023_jrei_model_registry_mother_mysql.sql',
  '20261024_jrei_local_inference_queue_mother_mysql.sql'
];
const jreiSqlOut=path.join(out,'api/internal/jrei-reviewed-ddl-v1.json');
const jreiSqlDeny=path.join(out,'api/internal/.htaccess');
if(!fs.existsSync(jreiSqlDeny)||
   !/Require\s+all\s+denied/i.test(fs.readFileSync(jreiSqlDeny,'utf8')))
  throw Error('JREI private DDL cannot be packaged without HTTP deny policy');
const jreiSqlEntries=jreiSqlMigrations.map(name=>{
  const file=path.join(root,'docs/migrations',name);
  const sql=fs.readFileSync(file,'utf8');
  if(sql.length>20000||!/CREATE TABLE IF NOT EXISTS jrei_local_/i.test(sql)||
     /\b(DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE\s+DATABASE)\b/i.test(sql))
    throw Error('JREI reviewed DDL source unexpected');
  return {name,sha256:(awaitHashSql(sql)),sql};
});
function awaitHashSql(data){
  return crypto.createHash('sha256').update(data).digest('hex');
}
fs.writeFileSync(jreiSqlOut,JSON.stringify({
  schema:'jr.jrei.owner-reviewed-local-ddl.v1',
  entries:jreiSqlEntries
})+'\n',{flag:'wx',mode:0o600});
// End private JREI SQL source projection.

// Bundle the original MFA-gated JREI News PHP dependency closure only inside
// the EXISTING api/internal/ HTTP-denied private directory. Never copy the
// platform/ source tree or expose a new public entrypoint. All features remain
// OFF until existing owner/release policy explicitly authorizes them.
const newsPrivateDir=path.join(out,'api/internal/jrei-news');
const parentDeny=path.join(out,'api/internal/.htaccess');
if(!fs.existsSync(parentDeny) ||
   !/Require\s+all\s+denied/i.test(fs.readFileSync(parentDeny,'utf8')))
  throw Error('News private PHP cannot be packaged without original api/internal deny policy');
fs.mkdirSync(newsPrivateDir,{recursive:true});

/**
 * JREI News additive owner-authorized DDL projection. Four FIXED source-
 * reviewed CREATE TABLE statements only; never ship the docs directory,
 * never apply migrations during a site build or a public web request.
 * The private CLI worker separately requires the verified fresh backup,
 * restore rehearsal, owner switch and mother-DB lock.
 */
const newsTableMigrationSpecs=[
  ['jrei_news_standing_policies',
   '20261025_jrei_news_standing_official_publication_mother_mysql.sql'],
  ['jrei_news_independent_qa_receipts',
   '20261025_jrei_news_independent_qa_mother_mysql.sql'],
  ['jrei_news_owner_exceptions',
   '20261025_jrei_news_owner_exception_queue_mother_mysql.sql'],
  ['jrei_news_admin_source_submissions',
   '20261025_jrei_news_admin_source_submissions_mother_mysql.sql']
];
const newsCreateEntries=newsTableMigrationSpecs.map(([table,name])=>{
  const original=fs.readFileSync(path.join(root,'docs/migrations',name),'utf8');
  if(original.length>14000)throw Error('JREI News reviewed DDL source oversized');
  const clean=original.replace(/^\s*--[^\r\n]*$/gm,'')
    .replace(/^\s*SET NAMES utf8mb4\s*;/gim,'');
  const statements=clean.split(';').map(v=>v.trim()).filter(Boolean);
  const create=statements.filter(v=>v.startsWith('CREATE TABLE IF NOT EXISTS '+table+' '));
  if(create.length!==1 || statements.filter(v=>/^CREATE TABLE/i.test(v)).length!==1)
    throw Error('JREI News additive DDL source inventory incompatible');
  const sql=create[0];
  if(!sql.endsWith(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci')||
     /\b(?:DROP|TRUNCATE|INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+|GRANT|REVOKE|CREATE DATABASE)\b/i.test(sql))
    throw Error('JREI News additive DDL unsafe');
  return {table,sha256:crypto.createHash('sha256').update(sql).digest('hex'),sql};
});
fs.writeFileSync(path.join(out,'api/internal/jrei-news-reviewed-additive-ddl-v1.json'),
  JSON.stringify({schema:'jr.jrei.news-reviewed-additive-ddl.v1',
    entries:newsCreateEntries})+'\n',{flag:'wx',mode:0o600});
// End JREI News private reviewed DDL projection.

/* Fail the future sanitized release rather than silently shipping a front
 * page whose original news engine, calendar or MFA newsroom module is absent.
 * This check does NOT install DB schema, activate Cron or publish a story.
 */
for(const [relative,required] of [
  ['api/news-public-calendar.php','jrNewsOriginalPublicCalendarRoute'],
  ['api/jrei-news-schema-caretaker.php','jrNewsAdditiveSchemaCaretaker'],
  ['api/internal/jrei-news-schema-caretaker-worker.php','PHP_SAPI'],
  ['assets/js/jrei-news-owner-panel-v1.mjs','mountNewsOwnerPanel']
]){
  const file=path.join(out,relative);
  if(!fs.existsSync(file)||!fs.readFileSync(file,'utf8').includes(required))
    throw Error('JREI News original delivery component missing: '+relative);
}


const newsModelName='public-read-model.php';
const newsModelSrc=path.join(root,'platform/news-intelligence/php',newsModelName);
const newsModelBody=fs.readFileSync(newsModelSrc,'utf8');
if(!newsModelBody.includes("if (!defined('BERTINA_API_BOOTSTRAPPED'))")||
   !newsModelBody.includes('function jrNewsPublishedSearch')||
   !newsModelBody.includes("s.index_state='PUBLISHED'")||
   !newsModelBody.includes("p.publisher_state='PUBLISHED'"))
  throw Error('News public-read model lost its owner-approved-only/bootstrapped constraints');
fs.writeFileSync(path.join(newsPrivateDir,newsModelName),newsModelBody,{flag:'wx'});
const newsPhpSourceDir=path.join(root,'platform/news-intelligence/php');
const newsLibraryBody=fs.readFileSync(path.join(newsPhpSourceDir,'news-library.php'),'utf8');
const requiredNewsPhp=newsLibraryBody.split('\n')
  .filter(line=>line.startsWith("require_once __DIR__.'/") &&
    line.endsWith(".php';"))
  .map(line=>line.slice("require_once __DIR__.'/".length,-"';".length));
if(requiredNewsPhp.some(name=>!/^[a-z][a-z0-9-]*[.]php$/.test(name)))
  throw Error('JREI News private library lists unsafe dependency names');
if(requiredNewsPhp.length<24 || requiredNewsPhp.length>60 ||
   new Set(requiredNewsPhp).size!==requiredNewsPhp.length ||
   !requiredNewsPhp.includes('public-read-model.php') ||
   !requiredNewsPhp.includes('news-api-adapter.php'))
  throw Error('JREI News private runtime library dependency list is unexpected');
for(const name of ['news-library.php',...requiredNewsPhp]){
  const body=name==='news-library.php'?newsLibraryBody:
    fs.readFileSync(path.join(newsPhpSourceDir,name),'utf8');
  if(!body.startsWith('<?php') ||
     !body.includes("defined('BERTINA_API_BOOTSTRAPPED')"))
    throw Error('JREI News private runtime bootstrap guard missing: '+name);
  const output=path.join(newsPrivateDir,name);
  if(name===newsModelName){
    if(body!==newsModelBody)throw Error('JREI News public projection mismatch');
  }else{
    fs.writeFileSync(output,body,{flag:'wx'});
  }
}
// Only anonymized aggregate data is packaged; original MA/PhD source
// documents are NEVER copied to public output or the API bundle. Runtime
// owner approval separately pins the measured corpus SHA in private cfg.
// The Persian profile is not yet measured/approved; never fabricate one.
const officialEnglishProfile=path.join(root,
  'platform/news-intelligence/style-profiles/owner-en-ma-measured-20261025.json');
const profile=JSON.parse(fs.readFileSync(officialEnglishProfile,'utf8'));
if(profile.schema!=='jr.jrei.private-author-style-aggregate.v1'||
   profile.language!=='en'||profile.privacy?.rawDocumentIncluded!==false||
   profile.privacy?.quotationsIncluded!==false||
   profile.boundaries?.requireOriginalOwnerApprovalAndCorpusProvenanceBeforeAutomaticJreiUse!==true)
  throw Error('JREI News original approved-style aggregate provenance changed');
fs.writeFileSync(path.join(newsPrivateDir,'style-profile-en.json'),
  JSON.stringify(profile)+'\\n',{flag:'wx'});
// A working source tree is NOT evidence that deployable PHP can resolve imports.
// Assert the two private news bridges use exactly the bundled HTTP-denied
// dependency closure, never the excluded platform/ source directory.
for(const [bridge,module] of [
  ['jrei-news-private-feed-bridge.php','feed-discovery.php'],
  ['jrei-news-private-article-bridge.php','candidate-intake.php']
]){
  const bridgePath=path.join(out,'api',bridge);
  const bridgeBody=fs.readFileSync(bridgePath,'utf8');
  const bundledImport="require_once __DIR__.'/internal/jrei-news/"+module+"';";
  if(!bridgeBody.includes(bundledImport) ||
     bridgeBody.includes("dirname(__DIR__).'/platform/news-intelligence/php/") ||
     !fs.existsSync(path.join(newsPrivateDir,module)))
    throw Error('JREI News bridge cannot resolve packaged private PHP: '+bridge);
}
// Project the canonical reviewed public-search UI into the existing site bundle.
// platform/ is private source code and is not served by LiteSpeed directly.
const newsArchiveClient=fs.readFileSync(
  path.join(root,'platform/news-intelligence/ui/news-search.js'),'utf8');
if(!newsArchiveClient.includes('[data-ni-archive-search]') ||
   !newsArchiveClient.includes('/api/news/v1/search') ||
   !newsArchiveClient.includes('textContent'))
  throw Error('JREI News public archive UI contract changed unexpectedly');
// Keep both the source-link auditor and sanitized release verification strict:
// real public assets exist in the source tree and are copied as ordinary assets.
// The platform source remains the reviewed UI contract; divergence fails build.
const newsArchiveAsset=path.join(out,'assets/js/jrei-news-archive-v1.js');
if(!fs.existsSync(newsArchiveAsset) ||
   fs.readFileSync(newsArchiveAsset,'utf8')!==newsArchiveClient)
  throw Error('JREI News archive asset differs from canonical reviewed source');
for(const [locale,route] of [
  ['fa','fa/akhbar/index.html'],
  ['en','en/news-insights/index.html']
]){
  const page=fs.readFileSync(path.join(out,route),'utf8');
  if(!page.includes('data-ni-archive-search data-ni-language="'+locale+'"') ||
     !page.includes('/assets/js/jrei-news-archive-v1.js') ||
     !page.includes('/assets/css/jrei-news-archive-v1.css'))
    throw Error('JREI News bilingual public archive entry not packaged: '+route);
}
// The 23 October owner master lists exactly 21 newsroom sections.
// These are finished FIRST-PARTY canonical pages, not an optional mockup.
// Packaging must refuse an incomplete bilingual release; it never activates
// the private Python JREI AI, owner CMS, social APIs, or news source workers.
for(const [locale,route] of [
  ['fa','fa/akhbar/index.html'],
  ['en','en/news-insights/index.html']
]){
  const page=fs.readFileSync(path.join(out,route),'utf8');
  const canonical='https://drjavadrezazadeh.com/'+
    (locale==='fa'?'fa/akhbar/':'en/news-insights/');
  if(!page.includes('<link rel="canonical" href="'+canonical+'">')||
     (page.match(/<h1(?=[ >])/g)||[]).length!==1||
     !page.includes('data-jrn21 data-jr-language="'+locale+'"')||
     !page.includes('/assets/css/jrei-news-21-v3.css')||
     !page.includes('/assets/js/jrei-news-21-v3.js')||
     (page.match(/data-ni-archive-search data-ni-language=/g)||[]).length!==1)
    throw Error('JREI News canonical bilingual master-21 page not packaged: '+locale);
  for(let section=1;section<=21;section++){
    const marker='data-jrn21-section="'+String(section).padStart(2,'0')+'"';
    if(page.split(marker).length!==2)
      throw Error('JREI News master section missing or duplicated: '+locale+'/'+section);
  }
}
for(const asset of [
  'assets/css/jrei-news-21-v3.css',
  'assets/js/jrei-news-21-v3.js'
]){
  const full=path.join(out,asset);
  if(!fs.existsSync(full)||fs.statSync(full).size<2000)
    throw Error('JREI News full newsroom asset unavailable: '+asset);
}
// End master-21 release projection contract.

// Every ORIGINAL CMS news page references these first-party public assets.
// A missing companion used to leave the on-page JREI button inert and the
// public article unstyled even though isolated publisher SQL tests passed.
const jreiNewsAssistant=fs.readFileSync(
  path.join(root,'platform/news-intelligence/ui/news-assistant.js'),'utf8');
const bundledArticleAssistant=path.join(out,'assets/js/jrei-news-assistant-v1.js');
const bundledArticleCss=path.join(out,'assets/css/jrei-news-article-v1.css');
if(!fs.existsSync(bundledArticleAssistant)||
   fs.readFileSync(bundledArticleAssistant,'utf8')!==jreiNewsAssistant ||
   !jreiNewsAssistant.includes('data-jrei-existing-assistant-slot')||
   !jreiNewsAssistant.includes('openOriginalAssistant')||
   !fs.existsSync(bundledArticleCss)||
   !fs.readFileSync(bundledArticleCss,'utf8').includes('.ni-article')||
   !fs.readFileSync(bundledArticleCss,'utf8').includes('[data-jrei-news-context]'))
  throw Error('Original JREI News published article assistant/style assets missing');
const originalNewsHtml=fs.readFileSync(
  path.join(newsPhpSourceDir,'verified-news-page-render.php'),'utf8');
for(const asset of ['/assets/js/assistant.js',
                    '/assets/js/jrei-news-assistant-v1.js',
                    '/assets/css/jrei-news-article-v1.css']){
  if(!originalNewsHtml.includes(asset))throw Error(
    'Original JREI News article HTML no longer references expected public asset: '+asset);
}

// The owner newsroom panel remains inside the established MFA dashboard;
// no platform/ sources may be served and there is no unauthenticated API.
// The source module carries only client code, never private account data.
const ownerNewsroomSource=fs.readFileSync(
  path.join(root,'platform/news-intelligence/ui/admin-newsroom.js'),'utf8');
if(!ownerNewsroomSource.includes('export function mountNewsOwnerPanel') ||
   !ownerNewsroomSource.includes("apiBase='/api/admin/operations/jrei-news'") ||
   ownerNewsroomSource.includes("apiBase='/api/news/v1'"))
  throw Error('JREI News owner module is not bound to the original MFA API');
// The reviewed owner panel is already copied from assets/js by copy().
// Do not overwrite it with the separate platform source: the browser loads
// precisely this public asset and the existing MFA/CSRF contract must survive.
const ownerPanelAsset=path.join(out,'assets/js/jrei-news-owner-panel-v1.mjs');
if(!fs.existsSync(ownerPanelAsset))throw Error('JREI News owner asset missing from release');
const shippedOwnerPanel=fs.readFileSync(ownerPanelAsset,'utf8');
if(!shippedOwnerPanel.includes('export function mountNewsOwnerPanel') ||
   !shippedOwnerPanel.includes('/api/admin/operations/jrei-news') ||
   !shippedOwnerPanel.includes("credentials:'same-origin'") ||
   shippedOwnerPanel.includes("apiBase='/api/news/v1'"))
  throw Error('JREI News release owner panel violates original MFA route');
for(const pagePath of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const shell=fs.readFileSync(path.join(out,pagePath),'utf8');
  // Owner redesign is an additive, MFA-guarded enhancement. Every release must
  // keep both private dashboards and ship BOTH source files atomically.
  if(!/<meta name="robots" content="noindex,nofollow,noarchive"/.test(shell) ||
     !shell.includes('id="ops-mfa-form"') ||
     !shell.includes('/assets/css/operations-command-deck-v1.css') ||
     !shell.includes('/assets/js/operations-command-deck-v1.js'))
    throw Error('Owner command deck or existing private auth shell missing: '+pagePath);
  if(!shell.includes('id="ops-workspace"') ||
     !shell.includes('id="ops-jrei-newsroom"') ||
     !shell.includes('/assets/js/operations-jrei-newsroom-v1.js') ||
     !shell.includes('/assets/css/operations-jrei-newsroom-v1.css'))
    throw Error('Original owner dashboard lost JREI Newsroom binding: '+pagePath);
}
// Insert an opt-in public Q&A surface only on catalogued public service detail pages.
// Server deployment flags remain OFF unless separately approved after real QA.
projectCommunityServicePages(root,out);
// Confirm exact Yandex verification bytes in both source and final public_html bundle.
verifyOwnershipArtifact(root);
verifyOwnershipArtifact(out);

// Project the existing private registry for the MFA-protected admin API.
// No platform paths, secrets, account details or third-party measurements cross this boundary.
const freeInventory=JSON.parse(fs.readFileSync(path.join(root,'platform/free-resources-registry.json'),'utf8'));
if(freeInventory.schema!=='free-resource-inventory-v1'||freeInventory.resources?.length!==30)throw Error('Free resources registry contract drift');
const adminToolInventory={schema:'operations-free-resources-v1',catalogueDate:freeInventory.date,categoryCounts:{GROWTH:8,TECHNICAL:12,SCHOLARLY:10},connectionStatus:'UNVERIFIED',automatedDataInUse:false,resources:freeInventory.resources.map(r=>({id:r.id,name:r.name,url:r.official_url,category:r.category,ownerEngine:r.owner_engine,accessPath:r.access_path,purpose:r.purpose,connection:r.external_connection,automatedDataInUse:false}))};
const inventoryOutput=path.join(out,'api/internal/free-resources-registry.json');
if(!/Require all denied/.test(fs.readFileSync(path.join(out,'api/internal/.htaccess'),'utf8')))throw Error('Private admin registry protection missing');
fs.writeFileSync(inventoryOutput,JSON.stringify(adminToolInventory)+'\n');
// Project ONLY source-level, nonpersonal 1405 guide-review metadata to the
// private operations API. No PDF, Drive file ID, filename or extracted text is
// bundled or exposed. Manifest figures are historical inventory, not approval.
const admissionManifest=JSON.parse(
  fs.readFileSync(path.join(root,'platform/konkur-1405-sources.json'),'utf8')
);
if(admissionManifest.schema!=='jr-konkur-official-source-inventory-v1'
  ||admissionManifest.cycle!==1405
  ||!Array.isArray(admissionManifest.sources)
  ||!Array.isArray(admissionManifest.coverageGaps))
  throw Error('1405 source manifest contract drift');
const sourceReviewPrivate={
  schema:'jr-1405-source-review-admin-v1',
  sourceState:'HISTORICAL_MANIFEST_UNREVIEWED',
  cycle:1405,
  auditedOn:admissionManifest.inventoryAudit?.verifiedOn||null,
  reviewComplete:false,
  officialProgrammeRecordsApproved:0,
  predictionAuthorized:false,
  canActivateOfficialCatalogue:false,
  sourceCount:admissionManifest.sources.length,
  totalPdfPages:admissionManifest.sources.reduce((sum,r)=>sum+(
    Number.isSafeInteger(r.pdfPageCount)&&r.pdfPageCount>0?r.pdfPageCount:0),0),
  guides:admissionManifest.sources.map(r=>({
    key:r.key,category:r.category,
    pdfPageCount:r.pdfPageCount,
    // Original-PDF SHA256 is integrity metadata, not a Drive credential.
    pdfSha256:r.sha256,
    pageAudit:r.pdfPageAudit,
    tableReview:r.criticalTablesVerification,
    extraction:r.extractionStatus,
    approvedForEligibility:false
  })),
  missingCoverage:admissionManifest.coverageGaps.map(r=>({
    kind:r.kind,status:r.status
  })),
  disclaimer:'Manifest counts alone do not validate PDF programme rows, amendments, official cutoffs, eligibility or admission probabilities.'
};
fs.writeFileSync(path.join(out,'api/internal/jr-1405-source-review-admin.json'),
  JSON.stringify(sourceReviewPrivate)+'\n');
// Versioned PRIVATE source-derived page quality inventory for the existing
// administrator dashboard. Server refuses non-admin/MFA reads. It never fetches
// live URLs, scores real search rankings or includes HTML/customer content.
// Score only files that actually enter the sanitized public_html bundle;
// never count repository docs, private fixtures, proposal/test HTML as pages.
const qualityInventory=generateQualityInventory(out);
if(qualityInventory.schema!=='operations-page-quality-inventory-v1'
   ||qualityInventory.total<1||qualityInventory.total>15000)
  throw Error('Page quality source inventory contract drift');
fs.writeFileSync(path.join(out,'api/internal/operations-page-quality.json'),
    JSON.stringify(qualityInventory)+'\n');
// Dispersed legacy capabilities remain grouped by their EXISTING ENG IDs;
// source presence must never be called an independently verified deployment.
const existingFeatures=hiddenFeatureSourceInventory(root);
fs.writeFileSync(path.join(out,'api/internal/operations-existing-features.json'),
    JSON.stringify(existingFeatures)+'\n');

/* Existing Stage-13 channel catalogue projected into the SAME private API
 * directory, not a new public registry or an assertion of OAuth connectivity.
 * The platform/ source is intentionally excluded from the Bertina bundle.
 */
const adminSocialDirectory=Object.entries(CONNECTORS).map(([id,c])=>({
  id,name:c.name,official:c.official,kind:c.kind,
  prerequisites:c.status,connectionState:'UNVERIFIED',
  providerMetricsAvailable:false
}));
if(adminSocialDirectory.length!==16)throw Error('Social provider directory contract drift');
fs.writeFileSync(path.join(out,'api/internal/admin-social-directory.json'),
  JSON.stringify({schema:'operations-social-directory-v1',channelCount:16,
    source:'platform/social-distribution/connections.mjs',
    disclaimer:'Connection status and provider-side metrics are unverified until independently observed.',
    channels:adminSocialDirectory})+'\n');

// Create a strict, non-sensitive projection for the MFA-only JHELA administrator endpoint.
// Original platform contracts, manuscript records, reviewer identities and evidence files are never shipped.
const journalProjectionDefinitions=[
  {name:'jhela-native-intake-activation-v1.json',map:d=>({
    schema:d.schema,
    ownerAuthorizesPreliminaryManuscriptSubmission:d.ownerAuthorizesPreliminaryManuscriptSubmission,
    publicIntakeReady:d.publicIntakeReady,
    independentReviewOrAcceptanceOperational:d.independentReviewOrAcceptanceOperational,
    nativePublishingWorkflowOperational:d.nativePublishingWorkflowOperational
  })},
  {name:'jhela-international-roadmap-v1.json',map:d=>({
    schema:d.schema,publicationStatus:d.publicationStatus,
    phases:d.phases.map(p=>({id:p.id,en:p.en,fa:p.fa}))
  })},
  {name:'jhela-target-architecture-v1.json',map:d=>({
    schema:d.schema,status:d.status,scaleStages:d.scaleStages.map(p=>({id:p.id}))
  })},
  {name:'jhela-gate-evidence-ledger-v1.json',map:d=>({
    schema:d.schema,
    stageRecords:d.stageRecords.map(p=>({id:p.id,status:p.status,claimsAllowed:p.claimsAllowed,evidence:[]}))
  })}
];
for(const def of journalProjectionDefinitions){
  const original=JSON.parse(fs.readFileSync(path.join(root,'platform',def.name),'utf8'));
  if(typeof original.schema!=='string')throw Error('Invalid JHELA contract source: '+def.name);
  if(def.name==='jhela-gate-evidence-ledger-v1.json' &&
      (original.stageRecords.length!==10||original.stageRecords.some(x=>x.status!=='UNVERIFIED'||x.claimsAllowed!==false||x.evidence.length>0))){
    throw Error('A JHELA verification claim needs a separately authorised protected audit integration, not a static public-package projection');
  }
  const safe=def.map(original);
  if(safe.schema!==original.schema||JSON.stringify(safe).match(/password|credential|apiKey|reviewerEmail|manuscriptText/i))
    throw Error('Unsafe JHELA administrative projection');
  const dest=path.join(out,'api','internal',def.name);
  fs.writeFileSync(dest,JSON.stringify(safe)+'\n');
}


const failures=[];
for(const blocked of ['database','migrations']) if(fs.existsSync(path.join(out,blocked))) failures.push('Database or migration source leaked into public artifact: '+blocked);
const required=[
  'index.html','404.html','offline.html','robots.txt','llms.txt','site.webmanifest','sw.js',
  'sitemap.xml','sitemap-core.xml','journal/sitemap.xml','journal/.htaccess','sitemap-fa.xml','sitemap-en.xml','sitemap-news.xml',
  'assets/data/book-catalog.json','assets/data/service-catalog.json','assets/data/analytics-config.json',
  // Owner operations dashboard relies on this exact source/runtime bundle.
  // Guard against a syntactically valid release missing its require_once target.
  'api/operations-activation.php','api/operations-page-quality.php',
  'api/operations-alerts.php','api/operations-response-monitor.php',
  'api/internal/operations-page-quality.json',
  'api/internal/jrei-reviewed-ddl-v1.json',
  'assets/js/operations-control.js','assets/css/operations-control.css',
  'api/jrei-remote-api-client.php','api/jrei-admin-ai-report-client.php',
  'assets/js/operations-jrei-ai-api-reports-v1.js',
  // These runtime modules must ship together with api/index.php; publishing
  // routes without their bound PHP source would cause an immediate 500.
  'api/service-files.php','api/service-buyer-receipt.php','api/operations-service-delivery.php',
  // Native JHELA must ship with its owner MFA queue and preliminary-screening UI.
  'api/jhela-intake.php','api/jhela-native-editorial.php',
  'assets/js/operations-jhela-manuscripts.js','assets/js/jhela-author-workspace.js',
  // Every paid digital dependency must be in the deployment artifact together,
  // otherwise the gateway may accept money while PHP fails to deliver PDFs.
  'api/publishing.php','api/internal/jr-publishing-digital.php',
  'api/internal/jr-publishing-allocation-policy.php',
  'api/internal/jr-publishing-policy-70-30-cli.php',
  'api/internal/jr-publishing-mailer.php','api/internal/jr-publishing-mail-worker.php',
  'api/internal/jr-publishing-contract-draft.php','api/internal/jr-publishing-notifications.php',
  'api/internal/jr-publishing-provision-cli.php','api/internal/jr-publishing-preflight-cli.php',
  'api/internal/jr-publishing-private-install-cli.php',
  // Dated AI search evidence must deploy atomically with its MFA-only API and
  // both administrator shells. A missing part would silently break monitoring.
  // The Ubersuggest snapshot is strictly read-only and never served as public
  // editorial or real-time indexation evidence.
  'api/operations-ai-visibility.php',
  'api/internal/ai-search-visibility-baseline-20261020.json',
  'assets/js/operations-ai-visibility.js',
  // GSC owner-only projection must ship with the existing MFA router and both admin shells.
  // Never bundle a live private GSC snapshot or service-account credentials.
  'api/operations-gsc-direct.php','assets/js/operations-gsc-direct.js',
  'fa/app/admin/index.html','en/account/admin/index.html',
  // New protected command deck remains tied to the original MFA operations UI.
  'assets/js/operations-command-deck-v1.js',
  'assets/css/operations-command-deck-v1.css',
  'api/internal/.htaccess','assets/js/jr-publishing-checkout-v1.js',
  'assets/js/book-store.js','assets/js/jr-author-workspace-v1.js',
  'assets/css/jr-author-dashboard-v52.css','assets/css/jr-publishing-store-catalog-v1.css',
  // Owner admin author-workspace preview must ship with both protected admin shells.
  'assets/js/operations-author-dashboard-preview-v1.js',
  'assets/js/operations-author-real-view-v1.js',
  'assets/js/operations-scientific-readiness-v1.js',
  'assets/css/operations-scientific-readiness-v1.css',
  'assets/css/operations-author-real-view-v1.css',
  'assets/css/operations-author-dashboard-preview-v1.css',
  'fa/app/author/index.html','fa/shop/authors/mehrab-mirkarimi/index.html',
  'assets/js/account-order-history.js','assets/js/operations-commerce.js',
  // Approved luxury bilingual commerce help + checkout must be packaged atomically:
  // no image-less pages, no unstyled navigation, no checkout pages without guides.
  'assets/css/shop-customer-premium-20261017.css',
  'assets/css/mobile-app-v431.css','assets/js/mobile-app-v431.js',
  'assets/css/jr-future-publishing-author-v1.css',
  // The v5.2 author interface is incomplete without this frozen-brand stylesheet.
  'assets/css/jr-author-premium-v52.css',
  // The two bilingual author CV pages depend on the accessible resume layer and
  // progressive optional-portrait script; public build must package them together.
  'assets/css/jr-author-resume-portrait-v52.css',
  'assets/js/jr-author-portrait-v52.js',
  'en/shop/authors/mehrab-mirkarimi/index.html',
  'assets/images/bookstore-talent-cinematic-approved-original-20261011.png',
  'assets/images/bookstore-talent-cinematic-approved-20261011.webp',
  'assets/images/editorial-launch/scholarly-bookstore-library-20261011.webp',
  'assets/images/editorial-launch/professional-services-decisions-20261011.webp',
  'assets/images/editorial-launch/unified-customer-dashboard-20261011.webp',
  'assets/images/editorial-launch/academic-research-editing-20261011.webp',
  'fa/shop/cart/index.html','fa/shop/checkout/index.html',
  'fa/shop/purchase-guide/index.html','fa/shop/customer-policy/index.html',
  'fa/shop/receipt/index.html',
  'en/shop/cart/index.html','en/shop/checkout/index.html',
  'en/shop/purchase-guide/index.html','en/shop/customer-policy/index.html',
  'en/shop/receipt/index.html'
];
for(const rel of required) if(!fs.existsSync(path.join(out,rel))) failures.push('Missing required public artifact: '+rel);

const premiumCommercePages=[
 'fa/shop/cart/index.html','fa/shop/checkout/index.html','fa/shop/purchase-guide/index.html',
 'fa/shop/customer-policy/index.html','fa/shop/receipt/index.html',
 'en/shop/cart/index.html','en/shop/checkout/index.html','en/shop/purchase-guide/index.html',
 'en/shop/customer-policy/index.html','en/shop/receipt/index.html'
];
for(const rel of premiumCommercePages){
 const file=path.join(out,rel);
 if(!fs.existsSync(file))continue;
 const html=fs.readFileSync(file,'utf8');
 if(!html.includes('shop-customer-premium-20261017.css'))
  failures.push('Premium bilingual customer-commerce page shipped without approved stylesheet: '+rel);
 const imageRefs=[...html.matchAll(/<img\b[^>]*\bsrc=["'](\/assets\/images\/[^"']+)["']/gi)]
  .map(match=>match[1]);
 if(!imageRefs.length)failures.push('Premium commerce page missing meaningful licensed image: '+rel);
 for(const src of imageRefs)if(!fs.existsSync(path.join(out,src.slice(1))))
  failures.push('Premium commerce page references unpackaged image '+src+' in '+rel);
 if((rel.includes('/cart/')||rel.includes('/checkout/')||rel.includes('/receipt/')) &&
    !/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html))
  failures.push('Private commerce route missing noindex protection: '+rel);
}


for(const blocked of [...excludedTop]){
  if(fs.existsSync(path.join(out,blocked))) failures.push('Internal top-level directory leaked into artifact: '+blocked);
}
for(const blocked of excludedRoot){
  if(fs.existsSync(path.join(out,blocked))) failures.push('Internal root file leaked into artifact: '+blocked);
}
if(fs.existsSync(path.join(out,'api/internal/operations-gsc-direct-snapshot.json'))) failures.push('Private direct GSC observation must not be packaged in a public artifact');
if(fs.existsSync(path.join(out,'assets/media-registry.json'))) failures.push('Internal media registry leaked into artifact');
if(fs.existsSync(path.join(out,'assets/release-v4.4.json'))) failures.push('Internal release manifest leaked into artifact');
if(!fs.readFileSync(path.join(out,'api/internal/.htaccess'),'utf8').includes('Require all denied'))
  failures.push('Author payments must not ship with web-readable private PHP modules');


const all=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(p); else if(ent.isFile()) all.push(p);
  }
}
walk(out);
// Hard fail if any retired vendor asset reappears in the deployed artifact.
// Historical source documents stay outside the public package for provenance.
const retiredJournalAsset=/(?:^|[\/._-])ojs(?:[\/._-]|$)/i;
for(const file of all){
  const relative=path.relative(out,file).replaceAll('\\','/');
  if(retiredJournalAsset.test(relative))
    failures.push('Retired journal platform asset in public package: '+relative);
}
const retiredJournalLabel=/\bOJS\b|Open Journal Systems/i;
const journalUi=all.filter(file=>{
  const rel=path.relative(out,file).replaceAll('\\','/');
  return (/^journal\/.*\.html$/.test(rel)||
    ['fa/app/admin/index.html','en/account/admin/index.html'].includes(rel)||
    /^assets\/js\/(?:jhela-|operations-jhela-).*\.js$/.test(rel));
});
for(const file of journalUi){
  if(retiredJournalLabel.test(fs.readFileSync(file,'utf8')))
    failures.push('Retired journal platform label in public UI: '+path.relative(out,file));
}
// Never distribute paid PDFs or private staging archives via public_html.
for(const risky of ['tefl_1370_1405_questions.pdf','tefl_1370_1405_answers.pdf',
  'JR_Publishing_PDF_Private_Server_Staging.zip','JR_Publishing_PDF_Private_Server_Staging_v2.zip']){
  if(all.some(file=>path.basename(file)===risky))
    failures.push('Private paid scholarly resource must not be in sanitized public release: '+risky);
}
const html=all.filter(p=>p.endsWith('.html') &&
  !isOwnershipVerificationArtifact(path.relative(out,p)));

 // JREI guide is a safe, honest directory fallback on every ordinary public
 // route; model inference still requires explicit live server readiness.
 // Never inject into noindex, private, exam-response, payment or account flows.
 for(const file of html){
   const relative=path.relative(out,file).replaceAll(path.sep,'/');
   const old=fs.readFileSync(file,'utf8');
   const updated=includeJreiAssistant(relative,old);
   if(updated!==old)fs.writeFileSync(file,updated,'utf8');
 }

// Ownership files are valid deployable HTML assets, not approved editorial URLs.
// Route count includes the public engine-status page, the approved noindex customer dashboard, and approved noindex commerce relays.
// Keep a fixed route count as a guard against accidentally publishing engineering files.
// Verified against the healthy cb2b26b2 baseline, the successful 1c5d3b74 deployment,
// and the current source tree: each had exactly 320 publishable HTML routes prior to two approved journal roadmap pages.
// Nine additional HTML files under identity/ and foundation/ are deliberately excluded.
// 2026-10-16: two approved, canonical, indexable bilingual journal roadmap URLs added.
// Do not increase this count for unapproved templates or engineering paths.
// Explicit owner-approved scope expansion 2026-10-16:
// 21 matched English academic service pages, one English noindex payment form,
// and one English noindex authenticated service-order history page.
// These are specific, checked routes; never infer authority from a directory count.
const existingBaseHtmlRoutes=322;
const approvedEnglishServices=JSON.parse(fs.readFileSync(path.join(root,'assets/data/service-catalog.json'),'utf8'))
  .services.map(item=>'en/services/'+item.id+'/index.html');
if(approvedEnglishServices.length!==21||new Set(approvedEnglishServices).size!==21)
  failures.push('Approved English service expansion must contain exactly 21 unique canonical entries');
const protectedNewRoutes=['en/services/checkout/index.html','en/app/account/orders/index.html',
  'journal/search/index.html','journal/fa/search/index.html']; // Public scoped search; both require noindex.
for(const route of [...approvedEnglishServices,...protectedNewRoutes]){
  if(!fs.existsSync(path.join(out,route))) failures.push('Approved bilingual service route missing: '+route);
}
for(const route of protectedNewRoutes){
  const file=path.join(out,route);
  if(fs.existsSync(file)&&!/<meta name="robots" content="[^"]*noindex/i.test(fs.readFileSync(file,'utf8')))
    failures.push('English commerce private route must be noindex: '+route);
}
// 2026-10-17 approved independently indexable Persian author storefront.
// Explicitly account for precisely this new route, never weaken the
// global sanitized-route count or permit arbitrary new public paths.
const approvedAuthorPage='fa/shop/authors/mehrab-mirkarimi/index.html';
const authorHtml=path.join(out,approvedAuthorPage);
if(!fs.existsSync(authorHtml)){
  failures.push('Approved Persian author page absent from sanitized artifact: '+approvedAuthorPage);
}else{
  const content=fs.readFileSync(authorHtml,'utf8');
  if(!content.includes('<link rel="canonical" href="https://drjavadrezazadeh.com/fa/shop/authors/mehrab-mirkarimi/">')
    ||!/<meta name="robots" content="index,follow/.test(content))
    failures.push('Approved author page canonical/indexability differs from frozen route approval');
}
// 2026-10-18 owner-approved English counterpart: indexable, localized,
 // reciprocal to the existing Persian author storefront and registered in the SEO map.
const approvedEnglishAuthorPage='en/shop/authors/mehrab-mirkarimi/index.html';
const englishAuthorFile=path.join(out,approvedEnglishAuthorPage);
if(!fs.existsSync(englishAuthorFile)){
  failures.push('Approved English author page missing from sanitized artifact: '+approvedEnglishAuthorPage);
}else{
  const source=fs.readFileSync(englishAuthorFile,'utf8');
  if(!source.includes('<link rel="canonical" href="https://drjavadrezazadeh.com/en/shop/authors/mehrab-mirkarimi/">')
    ||!source.includes('hreflang="fa"')
    ||!source.includes('hreflang="en"')
    ||!/<meta name="robots" content="index,follow/.test(source))
    failures.push('English author canonical/bilingual/indexability contract missing');
}
// 2026-10-17 approved private author workspace: noindex is mandatory,
// and this singular route is counted without weakening the engineering leak guard.
const approvedPrivateAuthorPage='fa/app/author/index.html';
const privateAuthorFile=path.join(out,approvedPrivateAuthorPage);
if(!fs.existsSync(privateAuthorFile))
  failures.push('Approved private author dashboard missing from sanitized artifact');
else {
  const privateHtml=fs.readFileSync(privateAuthorFile,'utf8');
  if(!/<meta name="robots" content="[^"]*noindex[^"]*nofollow/i.test(privateHtml))
    failures.push('Author dashboard must be private noindex,nofollow');
}
// 2026-10-18: seven owner-approved English VIP routes; each must exist with
// its own canonical/indexable metadata before any package is accepted.
const approvedEnglishVipRoutes=[
   "en/vip/index.html",
   "en/vip/academic-direction/index.html",
   "en/vip/university-selection/index.html",
   "en/vip/golden-talent-signature/index.html",
   "en/vip/research-publication/index.html",
   "en/vip/educator-development/index.html",
   "en/vip/institutional-advisory/index.html"
 ];
for(const route of approvedEnglishVipRoutes){
  const file=path.join(out,route);
  if(!fs.existsSync(file)){failures.push('Approved English VIP route missing: '+route);continue;}
  const html=fs.readFileSync(file,'utf8');
  const publicUrl='https://drjavadrezazadeh.com/'+route.replace(/index\.html$/,'');
  if(!html.includes('<link rel="canonical" href="'+publicUrl+'"')||
     !/<meta name="robots" content="index,follow/.test(html)||
     !html.includes('public-v2.css'))
    failures.push('Approved English VIP route lacks canonical/indexable/visual contract: '+route);
}
// Owner-reviewed additional EN academic introduction: explicit route and scientific-status gate.
const approvedAcademicBook='en/books/how-languages-are-learned/index.html';
const bookEntry=path.join(out,approvedAcademicBook);
if(!fs.existsSync(bookEntry))failures.push('Approved English academic book missing: '+approvedAcademicBook);
else {
  const book=fs.readFileSync(bookEntry,'utf8');
  for(const marker of [
    '<link rel="canonical" href="https://drjavadrezazadeh.com/en/books/how-languages-are-learned/">',
    '<link rel="alternate" hreflang="fa" href="https://drjavadrezazadeh.com/fa/ketab-ha/how-languages-are-learned/">',
    '<meta property="og:description"',
    '<meta name="twitter:card" content="summary">',
    '<meta name="robots" content="index,follow'
  ])if(!book.includes(marker))failures.push('Approved English academic book missing metadata: '+marker);
  if(/add-to-cart|buy-now|preorder-now|data-preorder/.test(book))
    failures.push('Unpublished book incorrectly offers checkout or preorder');
}
// 2026-10-23: precisely six publicly indexed bilingual educational introduction
// routes. Verify EACH immutable approved canonical and two-language reciprocal
// map before including them in the sanitized artifact route count.
const approvedBilingualEducationalRoutes=[
  ['fa/masir-man/index.html','en/my-path/index.html'],
  ['fa/bahar/index.html','en/bahar/index.html'],
  ['fa/rcas/index.html','en/rcas/index.html']
];
for(const [fa,en] of approvedBilingualEducationalRoutes){
  const faUrl='https://drjavadrezazadeh.com/'+fa.replace(/index\.html$/,'');
  const enUrl='https://drjavadrezazadeh.com/'+en.replace(/index\.html$/,'');
  for(const [route,canonical,twin,lang] of [
    [fa,faUrl,enUrl,'fa'],[en,enUrl,faUrl,'en']
  ]){
    const file=path.join(out,route);
    if(!fs.existsSync(file)){
      failures.push('Approved bilingual educational route missing: '+route);
      continue;
    }
    const source=fs.readFileSync(file,'utf8');
    if(!source.includes('<link rel="canonical" href="'+canonical+'">')||
       !/<meta name="robots" content="index,follow/.test(source)||
       !source.includes('hreflang="'+lang+'"')||
       !source.includes('href="'+twin+'"'))
      failures.push('Approved educational canonical/hreflang/indexability mismatch: '+route);
  }
}
// Eight public examination information routes and two PRIVATE noindex exam
// candidate pages have been owner-authorized for this stage only. All
// published exam products/checkout remain under independent release gates.
const approvedPublicExamPages=[
  'fa/exams/index.html','fa/exams/konkur/index.html',
  'fa/exams/masters/index.html','fa/exams/phd/index.html',
  'en/exams/index.html','en/exams/konkur/index.html',
  'en/exams/masters/index.html','en/exams/phd/index.html'
];
const approvedPrivateExamPages=['fa/exams/my/index.html','en/exams/my/index.html'];
for(const route of approvedPublicExamPages){
  const file=path.join(out,route);
  if(!fs.existsSync(file)) {failures.push('Approved exam information missing: '+route);continue;}
  const html=fs.readFileSync(file,'utf8');
  const url='https://drjavadrezazadeh.com/'+route.replace(/index\.html$/,'');
  if(!html.includes('<link rel="canonical" href="'+url+'"')||
     !/<meta name="robots" content="index,follow/.test(html)||
     !html.includes('public-v2.css')||
     !html.includes('<meta property="og:url" content="'+url+'">'))
    failures.push('Exam information release contract incomplete: '+route);
}
for(const route of approvedPrivateExamPages){
  const file=path.join(out,route);
  if(!fs.existsSync(file)) {failures.push('Private candidate examination route missing: '+route);continue;}
  const html=fs.readFileSync(file,'utf8');
  if(!/<meta name="robots" content="[^"]*noindex/i.test(html))
    failures.push('Private candidate exam must be noindex: '+route);
}
// 2026-10-28: two explicitly reviewed charitable collectible detail URLs.
// Preserve the strict fixed-count guard: adding an arbitrary HTML file must
// still fail a production build. Verify both canonical URLs, reciprocal
// language alternates, publication visibility and owner-approved composite promotional poster.
const approvedBilingualCollectibleRoutes=[
  'fa/shop/collectibles/websters-third-1981/index.html',
  'en/shop/collectibles/websters-third-1981/index.html'
];
const collectibleFa='https://drjavadrezazadeh.com/fa/shop/collectibles/websters-third-1981/';
const collectibleEn='https://drjavadrezazadeh.com/en/shop/collectibles/websters-third-1981/';
for(const route of approvedBilingualCollectibleRoutes){
  const file=path.join(out,route);
  if(!fs.existsSync(file)){
    failures.push('Approved bilingual collectible route missing: '+route);
    continue;
  }
  const source=fs.readFileSync(file,'utf8');
  const ownCanonical=route.startsWith('fa/')?collectibleFa:collectibleEn;
  for(const marker of [
    '<link rel="canonical" href="'+ownCanonical+'">',
    '<link rel="alternate" hreflang="fa" href="'+collectibleFa+'">',
    '<link rel="alternate" hreflang="en" href="'+collectibleEn+'">',
    '<meta name="robots" content="index,follow',
    'assets/images/books/webster-collectible-owner-poster-20261028.jpg',
    'application/ld+json'
  ]){
    if(!source.includes(marker))
      failures.push('Approved collectible canonical, locale, media or schema contract missing: '+route);
  }
}
// The existingBaseHtmlRoutes=322 baseline already includes both JHELA
// roadmap pages (320 legacy pages plus 2 approved journal roadmap routes).
// Verify each route separately below; never double-count them here.
const approvedJhelaRoadmapRoutes=['journal/roadmap/index.html','journal/fa/roadmap/index.html'];
const approvedPublicHtmlRoutes=existingBaseHtmlRoutes+approvedEnglishServices.length+protectedNewRoutes.length+2+approvedEnglishVipRoutes.length+1+1+1+approvedBilingualEducationalRoutes.length*2+approvedPublicExamPages.length+approvedPrivateExamPages.length+approvedBilingualCollectibleRoutes.length;

const aiLabRoute='fa/konkur-ai-lab/index.html';
const aiLabPath=path.join(out,aiLabRoute);
const aiLabJs=path.join(out,'assets/js/jr-konkur-ai-lab-public-v1.mjs');
if(!fs.existsSync(aiLabPath)||!fs.existsSync(aiLabJs))failures.push('Isolated AI lab or its public-only adapter missing from sanitized artifact');
else if(!/<meta name="robots" content="noindex,nofollow,noarchive">/.test(fs.readFileSync(aiLabPath,'utf8')))failures.push('AI research lab must remain noindex and nonpublic');
for(const route of approvedJhelaRoadmapRoutes){
  if(!fs.existsSync(path.join(out,route))) failures.push('Approved JHELA roadmap page missing: '+route);
}
if(html.length!==approvedPublicHtmlRoutes) failures.push(
  'Expected '+approvedPublicHtmlRoutes+' public HTML routes in sanitized artifact, found '+html.length
);
const customerDashboard='fa/customer-dashboard/index.html';
if(!fs.existsSync(path.join(out,customerDashboard))) failures.push('Approved noindex customer dashboard missing: '+customerDashboard);
else{
  const dashboard=fs.readFileSync(path.join(out,customerDashboard),'utf8');
  if(!/<meta name="robots" content="[^"]*noindex[^"]*nofollow/i.test(dashboard)) failures.push('Customer dashboard must remain noindex,nofollow');
}
const engineStatus='fa/app/engine-status/index.html';
if(!fs.existsSync(path.join(out,engineStatus))) failures.push('Public engine dashboard missing: '+engineStatus);
for(const rel of ['fa/support-talented-students/index.html','en/support-talented-students/index.html']){
  const page=path.join(out,rel);
  if(!fs.existsSync(page))failures.push('Missing bilingual student support landing: '+rel);
  else{
    const html=fs.readFileSync(page,'utf8');
    if(!html.includes('<meta name="robots" content="noindex,follow')||!html.includes('data-support-form')){
      failures.push('Student support landing must remain noindex until safeguarding approval and include guest giving form: '+rel);
    }
  }
}
const paymentRelay='fa/shop/payment-return/index.html';
const relayPath=path.join(out,paymentRelay);
if(!fs.existsSync(relayPath)) {
  failures.push('Approved noindex payment-return relay missing: '+paymentRelay);
}else{
  const relay=fs.readFileSync(relayPath,'utf8');
  if(!relay.includes('<meta name="robots" content="noindex,nofollow">')){
    failures.push('Payment-return relay must remain noindex,nofollow');
  }
  for(const sitemap of ['sitemap.xml','sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml']){
    if(fs.existsSync(path.join(out,sitemap)) &&
       fs.readFileSync(path.join(out,sitemap),'utf8').includes('/fa/shop/payment-return/')){
      failures.push('Noindex payment-return relay must not enter '+sitemap);
    }
  }
}

const textExt=/\.(?:html|js|css|json|xml|txt|webmanifest)$/i;
for(const file of all.filter(p=>textExt.test(p))){
  // The private API directory is denied by Apache (verified above). Those
  // read models intentionally reference canonical source file names for
  // provenance. They are not public assets or client-side imports.
  const relative=path.relative(out,file).replaceAll(path.sep,'/');
  if(relative.startsWith('api/internal/'))continue;
  const content=fs.readFileSync(file,'utf8');
  if(/(?:["'(=]|url\()\s*\/?(?:platform|foundation|scripts|tests|edge|payment-api|docs)\//i.test(content)){
    const rel=path.relative(out,file).replaceAll(path.sep,'/');
    failures.push('Public artifact still references excluded engineering path: '+rel);
  }
}

if(failures.length){
  console.error('Sanitized public-site build failed ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
// All confidentiality, canonical, ownership and frozen-route assertions above
// must pass before producing immutable copies. Only packaged HTML is rewritten;
// authoring sources and source-side SEO audit paths remain unchanged.
// Private HTML remains no-store. The 20–22 public CSS files referenced by
// each authenticated owner shell are combined without changing their order.
// This reduces style request overhead on high-RTT mobile connections in Iran.
const ownerStyles=bundleOwnerStyles(out);
const sharedStyleAliases=fingerprintCoreStyles(out);
console.log('Release owner styles:',JSON.stringify(ownerStyles));
console.log('Release core styles:',JSON.stringify(sharedStyleAliases));
console.log('Sanitized public-site artifact built:',all.length,'files;',html.length,'HTML routes; internal engineering directories excluded.');
