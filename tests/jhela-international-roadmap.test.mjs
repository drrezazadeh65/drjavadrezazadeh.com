/* International roadmap public publishing and claim-governance contracts.
 * Source-only checks: cannot certify OJS installation, indexing or external ratings.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const model=JSON.parse(read('platform/jhela-international-roadmap-v1.json'));
const activation=JSON.parse(read('platform/jhela-ojs-activation.json'));
const sitemap=read('journal/sitemap.xml');
const manifest=JSON.parse(read('platform/public-url-stability-manifest.json'));
const search=JSON.parse(read('assets/search-index.json'));
const discovery=read('scripts/jhela-discovery-audit.mjs');
const base='https://drjavadrezazadeh.com';
const urls=['/journal/roadmap/','/journal/fa/roadmap/'];

test('roadmap contains exactly ten distinguishable externally evidenced ambitions',()=>{
 assert.equal(model.schema,'jhela-international-roadmap-v1');
 assert.equal(model.phases.length,10);
 assert.deepEqual(model.phases.map(p=>p.id),Array.from({length:10},(_,i)=>'JH-'+String(i+1).padStart(2,'0')));
 assert.equal(new Set(model.phases.map(p=>p.id)).size,10);
 assert.equal(model.kind,'PUBLIC_PLAN_NOT_PRODUCTION_EVIDENCE');
 assert.equal(model.governance.noAutoComplete,true);
 assert.equal(model.governance.noGuaranteeOfIndexingOrQ1,true);
 for(const p of model.phases){
  assert.ok(p.en.length>8&&p.fa.length>8);
  assert.ok(p.gateEn.length>24&&p.gateFa.length>20);
  assert.ok(p.descriptionEn.length>50&&p.descriptionFa.length>40);
  assert.ok(p.source.startsWith('https://'));
  assert.doesNotMatch(p.status,/^(?:COMPLETE|APPROVED|INDEXED)$/);
 }
});

test('roadmap public metrics and DOAJ/Scopus/Clarivate eligibility are accurate and non-promissory',()=>{
 const t=model.thresholds;
 assert.equal(t.doajAnnualResearchMin,5);
 assert.match(t.doajNewJournalHistory,/\bOR\b/);
 assert.equal(t.clarivateQualityCriteria,24);
 assert.equal(t.clarivateImpactCriteria,4);
 assert.equal(model.scopusTwoYearConditionRemoved,undefined);
 assert.equal(model.publicationStatus,'PRELAUNCH');
 assert.equal(model.manuscriptsAccepted,false);
 assert.equal(model.ojsCertified,false);
 assert.deepEqual(model.indexesConfirmed,[]);
 assert.equal(activation.publicSubmissionsEnabled,false);
 assert.equal(activation.doiAssigned,false);
 assert.equal(activation.issnAssigned,false);
 assert.equal(activation.firstIssuePublished,false);
});

for(const [lang,route] of [['en',urls[0]],['fa',urls[1]]]){
 test('public '+lang+' roadmap has self canonical, bilingual alternates, ten accessible evidence sections and no false awards',()=>{
  const html=read(route.slice(1)+'index.html');
  const url=base+route;
  assert.match(html,new RegExp('<html lang="'+lang+'"'));
  if(lang==='fa')assert.match(html,/<html lang="fa" dir="rtl">/);
  assert.ok(html.includes('rel="canonical" href="'+url+'"'));
  assert.ok(html.includes('hreflang="en" href="'+base+urls[0]+'"'));
  assert.ok(html.includes('hreflang="fa" href="'+base+urls[1]+'"'));
  assert.match(html,/<meta name="robots" content="index,follow/);
  assert.match(html,/<meta property="og:description"/);
  assert.match(html,/<script type="application\/ld\+json">/);
  assert.match(html,/<main id="main"/);
  assert.equal((html.match(/class="jhela-roadmap-milestone"/g)||[]).length,10);
  assert.equal((html.match(/class="jhela-roadmap-phase-state"/g)||[]).length,10);
  assert.ok(html.includes('doi.org')===false||html.includes('indexing')===true);
  assert.ok(!html.includes('application/ld+json">{"@context":"https://schema.org","@type":"ScholarlyArticle"'));
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  for(const p of model.phases){
   assert.ok(html.includes('id="stage-'+p.id.toLowerCase()+'"'));
   assert.ok(html.includes(lang==='fa'?p.fa:p.en));
  }
  assert.ok(sitemap.includes('<loc>'+url+'</loc>'));
  assert.ok(manifest.frozen_indexable_routes.includes(route));
  assert.ok(search.some(item=>item.path===route.slice(1)&&item.lang===lang));
  assert.ok(discovery.includes("'"+route+"'"));
 });
}

test('roadmap appears on bilingual public home, public dashboards and inside existing authenticated admin workspace',()=>{
 for(const p of ['journal/index.html','journal/dashboard/index.html']){
  assert.ok(read(p).includes('/roadmap/'));
 }
 for(const p of ['journal/fa/index.html','journal/fa/dashboard/index.html']){
  assert.ok(read(p).includes('/journal/fa/roadmap/'));
 }
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(p);
  const i=html.indexOf('id="ops-jhela-roadmap"');
  assert.ok(i>html.indexOf('<div id="ops-workspace" hidden>'));
  const k=html.indexOf('</ol>',i),segment=html.slice(i,k);
  assert.ok(i>0&&k>i);
  assert.equal((segment.match(/data-jhela-roadmap-stage=/g)||[]).length,10);
  assert.ok(html.includes('/journal/roadmap/')||html.includes('/journal/fa/roadmap/'));
 }
});

test('prelaunch noindex, live OJS flags and independent sitemap boundaries remain intact',()=>{
 for(const p of ['journal/submission/index.html','journal/fa/submission/index.html']){
   assert.match(read(p),/name="robots" content="noindex/);
 }
 assert.ok(!sitemap.includes('<loc>https://journal.drjavadrezazadeh.com/'));
 assert.ok(!sitemap.includes('/journal/submission/'));
 assert.equal((sitemap.match(/<loc>/g)||[]).length,26);
 assert.ok(read('llms.txt').includes(base+urls[0]));
 assert.ok(read('assets/css/jhela-roadmap.css').includes('.jhela-roadmap-milestone'));
});
