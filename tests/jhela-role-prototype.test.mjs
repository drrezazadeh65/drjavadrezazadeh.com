import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const roles=JSON.parse(read('platform/jhela-ojs-editorial-workflow-v1.json')).panels;
const dir='docs/journal/prototypes/';
const roleTitle=k=>k.split('_').map(x=>x[0].toUpperCase()+x.slice(1)).join(' ');
const file=p=>dir+'jhela-'+p.id+'-preview.html';
test('exactly eight, contract-derived and independently scoped premium role designs exist',()=>{
 assert.equal(roles.length,8);
 assert.equal(new Set(roles.map(x=>x.id)).size,8);
 for(const p of roles){
  const path=file(p),html=read(path);
  assert.ok(html.includes('lang="en"'),'editorial source prototype English language');
  assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(html,/jhela-role-showroom\.css/);
  assert.ok(html.includes('../../../assets/images/jhela/wordmark-en-reverse.svg'));
  assert.ok(html.includes('ROLE SCOPE: '+p.scope),'missing exact least-privilege source scope '+p.id);
  assert.ok(html.includes('STATUS: NOT CONNECTED'),'must never invent private journal metrics');
  assert.ok(html.includes(p.implementation.replaceAll('_',' ').toLowerCase()),'deployment boundary '+p.id);
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
  assert.ok(html.includes('aria-label="Eight editorial role prototypes"'));
  for(const view of p.views)assert.ok(html.includes(roleTitle(view)),'missing permitted view '+view+' in '+p.id);
  for(const action of p.actions)assert.ok(html.includes(roleTitle(action)),'missing permitted action '+action+' in '+p.id);
  for(const linked of roles){
   const href='./jhela-'+linked.id+'-preview.html';
   assert.ok(html.includes('href="'+href+'"'),'missing navigation to '+linked.id);
   assert.ok(fs.existsSync(dir+href.slice(2)),'broken local reference to '+linked.id);
  }
  assert.ok(!/<(?:form|button|script)\b|onclick=|onload=|fetch\(|localStorage|sessionStorage|api\/admin\//i.test(html),'functionality or secrets must not be simulated');
 }
});
test('reviewer, finance, audit, handling editor and EIC clearly disclose privacy/conflict restrictions',()=>{
 const reviewer=read(file(roles.find(x=>x.id==='reviewer')));
 assert.match(reviewer,/Other reviewers.*restricted/i);
 const finance=read(file(roles.find(x=>x.id==='financial_officer')));
 assert.match(finance,/cannot view blinded manuscripts/);
 const audit=read(file(roles.find(x=>x.id==='audit_officer')));
 assert.match(audit,/redacted|confidential/i);
 const handling=read(file(roles.find(x=>x.id==='handling_editor')));
 assert.match(handling,/unconflicted/);
 const eic=read(file(roles.find(x=>x.id==='editor_in_chief')));
 assert.match(eic,/recuse/);
});
test('all role previews use scoped luxury scholarly design, keyboard, mobile, motion and print tokens',()=>{
 const css=read(dir+'jhela-role-showroom.css');
 for(const token of ['#0b203c','#b48a3f','#f4f0e6','focus-visible','@media(max-width:760px)','prefers-reduced-motion','@media print','.jhela-showroom-hero','.jhela-role-card','.jhela-showroom-sidebar']){
  assert.ok(css.toLowerCase().includes(token.toLowerCase()),'missing design token or breakpoint '+token);
 }
 assert.ok(read(dir+'README.md').includes('SOURCE PROTOTYPES ONLY'));
 const live=JSON.parse(read('platform/jhela-ojs-activation.json'));
 assert.equal(live.publicSubmissionsEnabled,false);
 assert.equal(live.ojsInstalled,false);
});
