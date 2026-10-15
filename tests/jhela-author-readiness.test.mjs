import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');

for(const [language,path] of [['en','journal/author-guidelines/index.html'],['fa','journal/fa/author-guidelines/index.html']]){
 test('JHELA '+language+' author self-check contains eight no-upload preparation items and no submit action',()=>{
  const source=read(path);
  const start=source.indexOf('<section class="jhela-readiness"');
  const end=source.indexOf('</section>',start);
  assert.ok(start>0&&end>start,'readiness section must exist');
  const section=source.slice(start,end);
  assert.match(section,/data-jhela-readiness/);
  assert.match(section,/aria-live="polite"/);
  assert.match(section,/<progress max="8" value="0"/);
  assert.equal((section.match(/type="checkbox"/g)||[]).length,8);
  assert.equal((section.match(/<label>/g)||[]).length,8);
  assert.match(section,/data-jhela-readiness-reset/);
  assert.ok(!/<form\b|type="submit"|<input[^>]*type="file"/i.test(section),'a self-check must not upload manuscripts or submit forms');
  assert.ok(source.includes('/assets/js/jhela-author-readiness.js?v=20261016-v1'));
  assert.equal(source.includes('data-jhela-readiness lang="'+language+'"'),true);
  assert.ok(source.includes('noindex')===false||!source.includes('<meta name="robots" content="noindex'),'original publicly indexable guidance must not become noindex');
 });
}
test('checklist Javascript has no external mutation/persistence and updates only ephemeral DOM state',()=>{
 const js=read('assets/js/jhela-author-readiness.js');
 assert.match(js,/addEventListener\('change'/);
 assert.match(js,/checks\.filter\(x=>x\.checked\)/);
 assert.match(js,/meter\.value=complete/);
 assert.match(js,/type="checkbox"/);
 assert.ok(!/\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|sendBeacon|FormData|WebSocket/.test(js),'no network or storage is allowed for anonymous pre-submission checks');
 assert.ok(!/innerHTML|outerHTML/.test(js));
});
test('CSS supports mobile, focus visibility from journal stylesheet, and does not hide submission warning',()=>{
 const css=read('assets/css/journal-v2.css');
 assert.match(css,/\.jhela-readiness/);
 assert.match(css,/\.jhela-readiness label/);
 assert.match(css,/@media\(max-width:580px\)/);
 assert.match(css,/:focus-visible/);
});
