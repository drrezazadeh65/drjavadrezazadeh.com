import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {composeInstitutionalBrief} from '../assets/js/institutional-brief-builder.mjs';

const read=p=>fs.readFileSync(p,'utf8');
const input={format:'advisory',audience:'school',size:'small',
  window:'quarter',mode:'remote',
  goal:'Teachers need a context-sensitive and practicable professional learning programme.'};

test('bilingual institutional briefs reflect actual chosen scope without fabricated agreements',()=>{
  const en=composeInstitutionalBrief(input,'en');
  const fa=composeInstitutionalBrief(input,'fa');
  assert.match(en.subject,/Institutional enquiry/);
  assert.match(en.body,/Teachers need a context-sensitive/);
  assert.match(fa.body,/مدرسه|شبکه مدارس/);
  assert.match(en.body,/not a contract|not a contract, booking/i);
  assert.match(fa.body,/هنوز ارسال نشده/);
  assert.equal(en.serviceId,'vip:institutional-advisory');
  assert.equal(fa.serviceId,en.serviceId);
  assert.doesNotMatch(en.body,/guaranteed outcome|confirmed payment/i);
});

test('all five institutional pathways map only to already published relevant SKU or an unselected general route',()=>{
  const available=new Set([
    ...JSON.parse(read('assets/data/service-catalog.json')).services.map(x=>'service:'+x.id),
    ...JSON.parse(read('assets/data/vip-catalog.json')).services.map(x=>'vip:'+x.id)
  ]);
  for(const mode of ['keynote','workshop','teacher','advisory','research']){
    const x=composeInstitutionalBrief({...input,format:mode},'en');
    if(x.serviceId!==null)assert.ok(available.has(x.serviceId),x.serviceId);
  }
  assert.equal(composeInstitutionalBrief({...input,format:'keynote'},'en').serviceId,null);
});

test('invalid or unsuitable enquiry fields fail closed and never invent scope',()=>{
  for(const [key,value] of [['format','secret_scheme'],['audience','person'],
    ['mode','IN_PERSON_CONFIRMED'],['size','999999'],['window','tomorrow'],
    ['goal','hi']]){
    assert.throws(()=>composeInstitutionalBrief({...input,[key]:value},'en'));
  }
  assert.throws(()=>composeInstitutionalBrief(input,'fr'));
  assert.throws(()=>composeInstitutionalBrief(null,'fa'));
  const cleaned=composeInstitutionalBrief({...input,goal:'Review realistic classroom objectives.\u0000\u0001 For teacher learning.'},'en');
  assert.doesNotMatch(cleaned.body,/[\u0000\u0001]/);
});

test('institutional UI is available within the existing FA/EN indexable canonical routes',()=>{
  const routes=[['fa/hamkari-sazmani/index.html','fa'],['en/invite/index.html','en']];
  for(const [route,lang] of routes){
    const html=read(route);
    assert.equal(html.split('data-institutional-brief-builder').length-1,1);
    assert.match(html,/institutional-brief-builder\.css\?v=/);
    assert.match(html,/type="module" src="\/assets\/js\/institutional-brief-builder\.mjs\?v=/);
    assert.match(html,/data-ib-preview/);
    assert.match(html,/data-ib-email/);
    assert.match(html,/data-ib-copy/);
    assert.match(html,/data-ib-account/);
    for(const field of ['format','audience','size','window','mode','goal'])
      assert.match(html,new RegExp('name="'+field+'"'));
    assert.match(html,/<link rel="canonical"/);
    assert.doesNotMatch(html,/<meta[^>]+name="robots"[^>]+content="noindex/);
    assert.match(html,new RegExp('<html[^>]*lang="'+lang+'"'));
    assert.match(html,/maxlength="450"/);
  }
});

test('local draft never auto-transmits, tracks, stores or publishes student data',()=>{
  const js=read('assets/js/institutional-brief-builder.mjs');
  assert.doesNotMatch(js,/\bfetch\s*\(|sendBeacon|XMLHttpRequest|localStorage|sessionStorage|indexedDB|innerHTML|document\.cookie/);
  assert.match(js,/mailto:dr\.rezazadeh65@gmail\.com/);
  assert.match(js,/encodeURIComponent\(draft\.subject\)/);
  assert.match(js,/encodeURIComponent\(draft\.serviceId\)/);
  assert.match(js,/result\.hidden=false/);
  const css=read('assets/css/institutional-brief-builder.css');
  assert.match(css,/@media\(max-width:640px\)/);
  assert.match(css, /focus-visible/);
});

test('existing high-intent discovery pages preserve route paths and transmit only verified catalogue intent',()=>{
  for(const [route,sku] of [
    ['fa/estedaadyabi/index.html','talent_initial'],
    ['fa/entekhab-reshteh/index.html','field_selection_standard'],
    ['fa/moshavere-tahsili/index.html','academic_consult_60'],
    ['en/services/index.html','manuscript_diagnostic']]){
      assert.match(read(route),new RegExp('request-consultation/\\?service='+sku+'|darkhast-moshavere/\\?service='+sku));
  }
  const intake=read('assets/js/consented-lead-intake.js');
  assert.match(intake,/URLSearchParams\(location\.search\)/);
  assert.match(intake,/vip-catalog\.json/);
  assert.match(intake,/serviceLabels\.has\(requested\)/);
  assert.match(intake,/consentGiven:true,consentVersion,marketingOptIn:false/);
  assert.match(read('api/index.php'),/function localCatalog\(\): array/);
  assert.match(read('api/growth-stage14.php'),/explicit_consultation_consent_required/);
});
