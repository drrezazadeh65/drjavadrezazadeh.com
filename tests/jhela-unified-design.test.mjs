import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const brand=JSON.parse(read('platform/jhela-unified-brand-v3.json'));
const publicCss=read('assets/css/journal-v2.css');
const intake=read('assets/css/jhela-intake.css');
const admin=read('assets/css/operations-jhela-workstream.css');
const print=read('identity/jhela-document.css');

test('unique v3 sub-brand inherits immutable mother design rather than replacing Persian mark',()=>{
 assert.equal(brand.schema,'jhela-unified-visual-identity-v3');
 assert.equal(brand.baseline,'foundation/DESIGN-SYSTEM.md');
 assert.equal(brand.identity.corePalette.journalNavy.toLowerCase(),'#0b203c');
 assert.equal(brand.identity.corePalette.journalBrass.toLowerCase(),'#b48a3f');
 assert.equal(brand.identity.corePalette.royalBlack.toLowerCase(),'#0b0b0b');
 assert.equal(brand.identity.corePalette.parentGold.toLowerCase(),'#d4af37');
 assert.match(brand.identity.relationship,/separate English editorial wordmark/);
 assert.ok(read(brand.identity.wordmarkLight).startsWith('<svg '));
 assert.ok(read(brand.identity.wordmarkDark).startsWith('<svg '));
 assert.ok(brand.identity.components.length>=15);
 assert.equal(brand.status,'SOURCE_DESIGN_SYSTEM_NOT_PRODUCTION_VISUAL_CERTIFICATION');
});
test('public, native intake, admin and print share academic navy/brass without mixing trust and typography',()=>{
 for(const [name,css] of [['public',publicCss],['intake',intake],['admin',admin],['print',print]]){
  for(const hex of ['#0b203c','#b48a3f'])assert.ok(css.toLowerCase().includes(hex),'Palette mismatch in '+name);
  assert.ok(css.includes('focus-visible'),'No keyboard focus in '+name);
  assert.ok(css.includes('@media'),'Missing responsive or print design in '+name);
 }
 assert.ok(publicCss.includes('.journal-page.jhela-fa-page'));
 assert.ok(publicCss.includes('prefers-reduced-motion'));
 assert.ok(admin.includes('#ops-jhela-workstream'));
 assert.ok(intake.includes('.jhela-intake-portal'));
 assert.ok(intake.includes('.jhela-intake-form'));
 assert.ok(!intake.includes('.jhela-intake-form{display:none'));
 assert.ok(print.includes('@page{size:A4'));
});
test('four editable print previews use authentic English JHELA wordmark and make no claims of issue or payment',()=>{
 const paths=[
 'identity/templates/jhela-reviewer-invitation-preview-en.html',
 'identity/templates/jhela-editorial-decision-preview-en.html',
 'identity/templates/jhela-finance-waiver-preview-en.html',
 'identity/templates/jhela-article-galley-preview-en.html'
 ];
 for(const path of paths){
   const html=read(path);
   assert.match(html,/<html lang="en">/);
   assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
   assert.ok(html.includes('../../assets/images/jhela/wordmark-en.svg'));
   assert.ok(html.includes('../jhela-document.css'));
   assert.match(html,/DRAFT TEMPLATE — NOT ISSUED/);
   // This unissued-record guard verifies the current editorial disclaimer without
   // coupling safety to superseded sample copy.
   assert.match(html,/Illustrative editorial document, not an issued record\./);
   assert.match(html,/Manuscript submissions, decisions, reviews, fees, waivers and scholarly identifiers require separate confirmation/);
   assert.equal((html.match(/<h1\b/g)||[]).length,1);
   assert.ok(!/<script\b|<form\b|onload=|onerror=/.test(html));
 }
 assert.ok(read(paths[2]).includes('CHF 2,000'));
 assert.ok(read(paths[2]).includes('CHF 990'));
 assert.ok(read(paths[2]).includes('100% APC waiver'));
});
test('public JHELA remains indexable as approved while private manuscript intake remains closed',()=>{
 const manifest=JSON.parse(read('platform/jhela-native-intake-activation-v1.json'));
 assert.equal(manifest.publicIntakeReady,false);
 assert.equal(manifest.ownerAuthorizesPreliminaryManuscriptSubmission,true);
 for(const path of ['journal/index.html','journal/roadmap/index.html','journal/fees/index.html','journal/fa/peer-review/index.html']){
  assert.ok(read(path).includes('journal-v2.css'),'Missing shared visual layer '+path);
 }
 for(const path of ['journal/submission/index.html','journal/fa/submission/index.html']){
  assert.match(read(path),/name="robots" content="noindex/);
 }
 assert.ok(read('docs/journal/JHELA_UNIFIED_DESIGN_MASTER_V3_20261016.md').includes('WCAG 2.2 AA'));
});
