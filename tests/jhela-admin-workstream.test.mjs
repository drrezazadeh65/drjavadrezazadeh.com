import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const roles=JSON.parse(read('platform/jhela-ojs-editorial-workflow-v1.json'));
const policy=JSON.parse(read('platform/jhela-ojs-role-policy-v1.json'));
const manifest=JSON.parse(read('platform/jhela-ojs-activation.json'));
const names=roles.panels.map(x=>x.id);

test('journal roles remain separate from site superadmin and OJS external finance/audit',()=>{
  assert.equal(new Set(names).size,8);
  assert.equal(names.length,8);
  assert.deepEqual(roles.implementationBoundary.separateIntegrations,['financial_officer','audit_officer']);
  assert.equal(roles.panels.find(p=>p.id==='financial_officer').implementation,'INTEGRATION_NOT_BUILT');
  assert.equal(roles.panels.find(p=>p.id==='audit_officer').implementation,'INTEGRATION_NOT_BUILT');
  assert.equal(roles.separation.sharedCustomerPasswordHashes,false);
  assert.equal(roles.separation.clientSideAuthorisation,false);
  assert.equal(policy.segregation.superadmin.includes('never equates'),true);
  assert.equal(policy.canEnablePublicSubmissions,false);
});

test('native OJS 3.5 settings changes reserved for journal manager, not editor/production',()=>{
  const entries=policy.groupSettings;
  assert.equal(entries.length,6);
  assert.deepEqual(entries.filter(g=>g.permitChangesToSettings).map(g=>g.group),['Journal Manager']);
  assert.deepEqual(policy.baseline.openRegistrationRoles,['Author','Reader']);
  for(const name of ['Reviewer','Section Editor','Journal Editor','Journal Manager','Production Editor']){
    assert.ok(policy.baseline.publicSelfAssignmentForbidden.includes(name));
  }
  assert.equal(policy.baseline.noOneClickReviewAccessByDefault,true);
  assert.equal(policy.baseline.minimumIndependentReviewersNormally,2);
  assert.equal(policy.baseline.reviewModel,'Anonymous Reviewer/Anonymous Author');
});

for(const [locale,path] of [['fa','fa/app/admin/index.html'],['en','en/account/admin/index.html']]){
 test(locale+' JHELA admin workstream stays inside original MFA gated workspace with correct a11y roles',()=>{
   const html=read(path);
   const hiddenWorkspace=html.indexOf('<div id="ops-workspace" hidden>');
   const jhela=html.indexOf('<details id="ops-jhela-workstream"');
   const workspaceEnd=html.indexOf('</div></main>');
   const block=html.slice(jhela,html.indexOf('<details class="ops-panel" id="ops-commerce">',jhela));
   assert.ok(hiddenWorkspace>=0&&jhela>hiddenWorkspace&&workspaceEnd>jhela);
   assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive">/);
   assert.match(html,/src="\/assets\/js\/operations-control\.js\?/);
   assert.match(html,/src="\/assets\/js\/operations-jhela-workstream\.js\?/);
   assert.match(html,/href="\/assets\/css\/operations-jhela-workstream\.css\?/);
   assert.equal((block.match(/data-jhela-admin-tab=/g)||[]).length,8);
   assert.equal((block.match(/data-jhela-admin-panel=/g)||[]).length,8);
   assert.equal((block.match(/aria-selected="true"/g)||[]).length,1);
   assert.equal((block.match(/role="tabpanel"/g)||[]).length,8);
   assert.ok(!html.includes('https://journal.drjavadrezazadeh.com/index.php/jhela/submissions/'));
   for(const role of names){
     assert.match(html,new RegExp('id="ops-jhela-tab-'+role+'"'));
     assert.match(html,new RegExp('id="ops-jhela-panel-'+role+'"'));
     assert.match(html,new RegExp('aria-controls="ops-jhela-panel-'+role+'"'));
     assert.match(html,new RegExp('aria-labelledby="ops-jhela-tab-'+role+'"'));
   }
   assert.ok(html.includes('issues/65'));
   assert.match(html,/journal\/(fa\/)?submission\//);
   assert.ok(html.includes(locale==='fa'?'پذیرش مقاله بسته':'Submissions closed'));
 });
}

test('role tab Javascript is keyboard accessible and contains no editor-privilege or fake data mutation',()=>{
 const js=read('assets/js/operations-jhela-workstream.js');
 const css=read('assets/css/operations-jhela-workstream.css');
 for(const key of ['ArrowRight','ArrowLeft','Home','End','aria-selected','tabIndex','document.documentElement.dir'])assert.ok(js.includes(key));
 assert.match(js,/scope\.contains\(root\)/);
 assert.match(js,/panels\.forEach/);
 assert.ok(!/localStorage|sessionStorage|fetch\s*\(|XMLHttpRequest|innerHTML/.test(js));
 assert.match(css,/#ops-jhela-workstream\s*\{/);
 assert.match(css,/\.ops-jhela-tabs button\[aria-selected="true"\]/);
 assert.ok(css.includes('ops-jhela-workstream')&&css.includes('@media(max-width:600px)'));
});

test('native journal submissions and financial activation stay closed',()=>{
 assert.equal(manifest.publicSubmissionsEnabled,false);
 assert.equal(manifest.ojsInstalled,false);
 assert.equal(manifest.realReviewEndToEndConfirmed,false);
 assert.equal(roles.finance.feeActivation.startsWith('DISABLED'),true);
});
