import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(path,'utf8');
test('JHELA bilingual search reuses public index and never exposes private routes',()=>{
 const engine=read('assets/js/site-search.js');
 assert.match(engine,/data-journal-search/);
 assert.match(engine,/startsWith\('journal\/'\)/);
 assert.match(engine,/safePublicPath\(x\.path\)/);
 assert.match(engine,/\^\(\?:fa\|en\|journal\)/);
 assert.match(engine,/esc\(base\+x\.path\)/);
 for(const path of ['journal/search/index.html','journal/fa/search/index.html']){
  const page=read(path);
  assert.match(page,/data-journal-search/);
  assert.match(page,/noindex,follow/);
  assert.doesNotMatch(page,/api\/publishing\/author/);
 }
 const index=JSON.parse(read('assets/search-index.json'));
 assert.ok(index.some(x=>x.path==='journal/'&&x.lang==='en'));
 assert.ok(index.some(x=>x.path==='journal/fa/'&&x.lang==='fa'));
 for(const item of index){
  assert.ok(['fa','en'].includes(item.lang));
  assert.doesNotMatch(item.path,/^(?:api\/|fa\/app\/|app\/|en\/account\/)/);
  assert.doesNotMatch(item.path,/\/(?:checkout|cart|payment-start|payment-result|receipt)\//);
 }
 assert.ok(read('fa/jostojo/index.html').includes('data-site-search'));
 assert.match(read('assets/js/assistant.js'),/fa\/jostojo\//);
});
test('Golden Talent, RCAS, BAHAR and Choice Studio retain scientific boundaries',()=>{
 const rcas=read('assets/js/rcas-start.js');
 const english=read('assets/js/rcas-start-en.js');
 assert.match(rcas,/CORE_ITEM_IDS\.length!==28/);
 assert.match(english,/28 items/);
 const bahar=read('assets/js/bahar-formative-workspace-v1.js');
 assert.match(bahar,/data-bahar-week-list/);
 assert.match(bahar,/data-bahar-print/);
 assert.match(bahar,/in-memory only/);
 assert.match(bahar,/reviewGaps\.push/);
 assert.match(bahar,/jr-bahar-summary-gaps/);
 assert.match(bahar,/!weekly\.length/);
 assert.match(bahar,/weekly\.some\(day=>day\.tried&&!day\.observed\)/);
 assert.match(bahar,/data-bahar-week-day/);
 const scienceCss=read('assets/css/jr-scientific-experience-v1.css');
 assert.match(scienceCss,/\.jr-bahar-summary-gaps/);
 for(const pagePath of [
  'fa/app/student/bahar/index.html',
  'en/golden-talent/dashboard/bahar/index.html'
 ]){
  const html=read(pagePath);
  assert.match(html,/bahar-formative-workspace-v1\.js\?v=20261019-7day-continuity-v3" defer><\/script>/);
  assert.match(html,/bahar-rcas-handoff-v52\.js\?v=20261019-v2" defer><\/script>/);
  assert.match(html,/jr-scientific-experience-v1\.css\?v=20261019-science-premium-v11/);
  assert.doesNotMatch(html,/defer><script src="\/assets\/js\/bahar-rcas-handoff/);
 }

 const studio=read('assets/js/jr-choice-feedback-v1.js');
 for(const group of ['experimental','mathematics','humanities','languages','arts','technical','kardanesh']){
  assert.ok(studio.includes("id:'"+group+"'"),'missing choice category '+group);
 }
 assert.match(studio,/No account reads, network, tracking, storage/);
 assert.match(read('assets/js/golden-talent-evidence-studio-v1.js'),/NON-SCORED/);
});
test('installed PWA updates are opt-in and retain private no-store boundaries',()=>{
 const sw=read('sw.js');
 const banner=read('assets/js/pwa-release-notice.js');
 const manifest=JSON.parse(read('site.webmanifest'));
 assert.match(sw,/PRIVATE_PREFIXES/);
 assert.match(sw,/cache:'no-store'/);
 assert.match(sw,/CACHE_FAMILY/);
 assert.match(banner,/controllerchange/);
 assert.match(banner,/visibilitychange/);
 assert.match(banner,/window\.confirm/);
 assert.match(banner,/action\.addEventListener\('click'/);
 assert.ok(manifest.icons.some(x=>x.src==='./favicon.svg'&&x.type==='image/svg+xml'));
 assert.match(read('assets/js/site-extras.js'),/pwa-release-notice\.js/);
});
test('admin author preview remains read only, owner MFA guarded and non-public',()=>{
 const owner=read('assets/js/operations-publishing-authors-v1.js');
 const api=read('api/publishing-onboarding.php');
 const dashboard=read('fa/app/admin/index.html');
 assert.match(owner,/jp-owner-preview/);
 assert.match(owner,/session\.mfaRequired===true/);
 assert.match(owner,/method:'POST'/); // existing approval actions remain separately guarded
 assert.match(owner,/preview\.replaceChildren/);
 assert.match(api,/SUPER_ADMIN/);
 assert.match(api,/operations account \+ fresh TOTP/);
 assert.match(dashboard,/noindex,nofollow/);
 assert.match(dashboard,/operations-author-preview-v52\.css/);
});
test('community article ratings stay moderation-gated and include public guides',()=>{
 const api=read('api/community.php');
 assert.match(api,/JR_COMMUNITY_ENABLED/);
 assert.match(api,/JR_COMMUNITY_MIGRATION_APPROVED/);
 assert.match(api,/community_moderation_audit/);
 assert.match(api,/akhbar\|rahnamaha/);
 assert.match(read('assets/js/community-comments.js'),/akhbar\|rahnamaha/);
});
test('bilingual terms no longer describe a permanently inactive payment site',()=>{
 const fa=read('fa/sharayet-estefade/index.html');
 const en=read('terms/index.html');
 assert.match(fa,/jr-legal-v52\.css/);
 assert.match(en,/jr-legal-v52\.css/);
 assert.doesNotMatch(fa,/سایت استاتیک فعلی هنوز احراز هویت تولیدی ندارد/);
 assert.doesNotMatch(en,/The current static website does not yet provide secure account access/);
 assert.match(fa,/تأیید معتبر سمت سرور/);
 assert.match(en,/payment provider has confirmed a successful transaction/);
});
