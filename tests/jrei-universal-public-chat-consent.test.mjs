import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {includeJreiAssistant,isJreiPublicChatRoute}
 from '../scripts/jrei-public-assistant-surface.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const publicHtml='<!doctype html><html lang="fa"><head><meta name="robots" content="index,follow"></head><body>محتوا</body></html>';
test('all ordinary public pages can display JREI but never fake live model readiness',()=>{
 for(const r of ['fa/index.html','en/index.html','fa/exams/konkur/index.html',
                  'en/services/konkur_month/index.html','journal/fa/index.html']){
  const html=includeJreiAssistant(r,publicHtml);
  assert.match(html,/\/assets\/js\/assistant\.js/);
  assert.match(html,/\/assets\/css\/assistant\.css/);
  assert.equal(includeJreiAssistant(r,html),html,'idempotent injection '+r);
 }
 const js=read('assets/js/assistant.js');
 assert.match(js,/policy\?\.schema!=='jr\.jrei\.assistant-capability\.v1'/);
 assert.match(js,/policy\.live!==true/);
});
test('all private, payment, account and noindex routes excluded',()=>{
 for(const p of ['fa/app/admin/index.html','en/account/student/index.html',
    'fa/shop/cart/index.html','en/services/checkout/index.html','fa/exams/my/index.html',
    'fa/login/index.html','fa/assessments/golden-talent/start/index.html',
    'journal/fa/submission/index.html']){
  assert.equal(isJreiPublicChatRoute(p,publicHtml),false,p);
 }
 const noindex=publicHtml.replace('index,follow','noindex,nofollow');
 assert.equal(isJreiPublicChatRoute('fa/konkur-ai-lab/index.html',noindex),false);
});
test('public site greeting asks permission, protects decliners, and does not train or send conversation text',()=>{
 const js=read('assets/js/assistant.js');
 assert.doesNotThrow(()=>new vm.Script(js,{filename:'assets/js/assistant.js'}));
 assert.match(js,/jr\.jrei\.feedback-preference\.v1/);
 assert.match(js,/ACCEPTED','DECLINED/);
 assert.match(js,/PRIVATE_PREFIXES/);
 assert.match(js,/No chat transcripts are currently collected for model training/);
 assert.match(js,/privacyChoice\.addEventListener\('click',openWelcome\)/);
 assert.match(js,/consent.*?guardian|guardian/);
  assert.ok(js.includes("providerMode==='JREI_LM_LOCAL_WINDOWS'?"));
 assert.match(js,/history=\[\];lastQuery='';busy=false;ephemeralVisitorId=null/);
});
