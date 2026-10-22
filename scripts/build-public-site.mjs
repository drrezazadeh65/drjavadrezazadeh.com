import fs from 'node:fs';
import path from 'node:path';
import {isOwnershipVerificationArtifact,verifyOwnershipArtifact} from './site-ownership-verification.mjs';
import {checkStylesheetBundles} from './stylesheet-bundles.mjs';
import {projectCommunityServicePages} from './community-service-bundle.mjs';
import {CONNECTORS} from '../platform/social-distribution/connections.mjs';
import {generateQualityInventory} from './operations-page-quality.mjs';
import {hiddenFeatureSourceInventory} from './operations-hidden-features.mjs';

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
  'assets/js/operations-control.js','assets/css/operations-control.css',
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
const approvedPublicHtmlRoutes=existingBaseHtmlRoutes+approvedEnglishServices.length+protectedNewRoutes.length+2+approvedEnglishVipRoutes.length+1+1+1; // English author + noindex AI lab + reviewed English academic book
const aiLabRoute='fa/konkur-ai-lab/index.html';
const aiLabPath=path.join(out,aiLabRoute);
const aiLabJs=path.join(out,'assets/js/jr-konkur-ai-lab-public-v1.mjs');
if(!fs.existsSync(aiLabPath)||!fs.existsSync(aiLabJs))failures.push('Isolated AI lab or its public-only adapter missing from sanitized artifact');
else if(!/<meta name="robots" content="noindex,nofollow,noarchive">/.test(fs.readFileSync(aiLabPath,'utf8')))failures.push('AI research lab must remain noindex and nonpublic');
for(const route of ['journal/roadmap/index.html','journal/fa/roadmap/index.html']){
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
console.log('Sanitized public-site artifact built:',all.length,'files;',html.length,'HTML routes; internal engineering directories excluded.');
