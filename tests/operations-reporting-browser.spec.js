const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const registry=require(path.resolve(process.cwd(),'api/internal/operations-registry.json'));
const base=(process.env.OPERATIONS_BROWSER_BASE||'http://127.0.0.1:4173').replace(/\/$/,'');
// Report export/privilege regressions target the authenticated full-tools
// layout. The modern default is exercised in the separate owner UI suite
// and in the cross-view tests; no API or MFA security is bypassed.
function legacyOpsUrl(raw){
 const url=new URL(raw);
 if(url.pathname==='/fa/app/admin/'||url.pathname==='/en/account/admin/')
  url.searchParams.set('ops_view','classic');
 return url.href;
}
test.use({serviceWorkers:'block'});
function project(data){
 const php=process.env.OPERATIONS_PHP_BINARY||'php';
 const code="define('BERTINA_API_BOOTSTRAPPED',true);require getcwd().'/api/operations-reporting.php';$registry=json_decode(file_get_contents(getcwd().'/api/internal/operations-registry.json'),true);$snapshot=json_decode(stream_get_contents(STDIN),true);$snapshot['reporting']=operationsReporting($snapshot,$registry);echo json_encode($snapshot,JSON_THROW_ON_ERROR);";
 return JSON.parse(execFileSync(php,['-r',code],{cwd:process.cwd(),encoding:'utf8',input:JSON.stringify(data)}));
}
function fixture(){
 const at=Math.floor(Date.now()/1000);
 const wrap=r=>({...r,measuredProgress:null,status:'not_started',closed:false,openDependencies:r.dependencies,openWork:Object.values(r.gates),currentBlocker:null,verifiedGates:Object.entries(r.gates).map(([id,label])=>({id,label,state:'unknown',evidence:null}))});
 const reports=registry.reports.map(wrap),dashboard=wrap(registry.dashboard);
 return project({ok:true,schema:'operations-live-v1',version:'4.4.1',releaseSha:'a'.repeat(40),publishedAt:at-60,checkedAt:at,reports,dashboard,sourceSections:registry.sourceSections,summary:{total:36,verified:0,measuredCoverage:0,measuredProgress:null},history:[]});
}
async function authorized(page,{data=fixture(),expiry=600,delay=0}={}){
 await page.route('**/api/admin/operations**',async route=>{
  if(new URL(route.request().url()).pathname.endsWith('/session'))return route.fulfill({json:{ok:true,mfaRequired:false,csrfToken:'c'.repeat(64),mfaExpiresIn:expiry}});
  if(delay)await new Promise(resolve=>setTimeout(resolve,delay));return route.fulfill({json:data});
 });
}
async function exported(page,format){
 const event=page.waitForEvent('download');await page.locator('#ops-reporting').getByRole('button',{name:new RegExp('(?:Download|دریافت) '+format.toUpperCase()+'$')}).click();
 const file=await event;return {file,body:fs.readFileSync(await file.path(),'utf8')};
}
async function noOverflow(page){expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);}
for(const [lang,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']])test(lang+' evidence matrix and risk-ranked executor backlog stay truthful',async({page})=>{
 const data=fixture();
 data.summary.gateCoverage=Object.fromEntries(['code','tests','production','evidence'].map(id=>[id,{pass:0,fail:0,blocked:0,stale:0,unknown:36}]));
 data.summary.gateCoverage.tests={pass:1,fail:2,blocked:3,stale:4,unknown:26};
 await page.setViewportSize({width:320,height:900});await authorized(page,{data});await page.goto(legacyOpsUrl(base+route));
 const matrix=page.locator('details.ops-evidence-matrix'),triage=page.locator('details.ops-executor-backlog');
 await expect(matrix.locator('summary')).toContainText(lang==='fa'?'۱۴۴':'144');
 await matrix.locator('summary').click();await expect(matrix.locator('article.ops-gate')).toHaveCount(4);
 await expect(matrix.locator('article.ops-gate').nth(1)).toContainText(lang==='fa'?'نامشخص: 26':'Unknown: 26');
 await expect(triage.locator('summary')).toContainText('45');
 await triage.locator('summary').click();
 await expect(triage.locator('section.ops-backlog-group')).toHaveCount(3);
 await expect(triage.locator('section.ops-backlog-group').nth(0).locator('li')).toHaveCount(2);
 await expect(triage.locator('section.ops-backlog-group').nth(1).locator('li')).toHaveCount(8);
 await expect(triage.locator('section.ops-backlog-group').nth(2).locator('li')).toHaveCount(35);
 await triage.getByRole('button',{name:/ENG-01\.ACT-001/}).click();
 await expect(page.locator('#ops-report-level')).toHaveValue('action');
 await expect(page.locator('#ops-report-action-picker')).toHaveValue('ENG-01.ACT-001');
 await expect(page.locator('#ops-reporting')).toContainText(lang==='fa'?'اجرا هنوز فعال نشده است':'Execution is not enabled');
 await noOverflow(page);
});
for(const [language,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']])test(language+' critical dependency path uses server evidence and opens the source report',async({page})=>{
 const data=fixture();
 await page.setViewportSize({width:320,height:900});
 await authorized(page,{data});await page.goto(legacyOpsUrl(base+route));
 const pathPanel=page.locator('details.ops-critical-path');
 await expect(pathPanel.locator('summary')).toContainText(language==='fa'?'۳۶':'36');
 await pathPanel.locator('summary').click();
 await expect(pathPanel.locator('li')).toHaveCount(data.reporting.criticalPath.items.length);
 await expect(pathPanel).toContainText(String(data.reporting.criticalPath.waitingOnDependencies));
 const item=data.reporting.criticalPath.items[0];
 await pathPanel.locator('li').first().locator('button').click();
 await expect(page.locator('#ops-detail')).toBeVisible();
 await expect(page.locator('#ops-detail')).toContainText(item.id);
 await noOverflow(page);
});
function parseCsv(text){const rows=[];let row=[],field='',quote=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quote&&text[i+1]==='"'){field+='"';i++;}else quote=!quote;}else if(ch===','&&!quote){row.push(field);field='';}else if(ch==='\n'&&!quote){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=ch;}if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}return rows;}
for(const [lang,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']])test(lang+' canonical navigation and four report levels stay usable on 320/390/430px',async({page})=>{
 const data=fixture(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await authorized(page,{data});
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:900});await page.goto(legacyOpsUrl(base+route));await expect(page.locator('#ops-reporting nav button')).toHaveCount(13);await expect(page.locator('#ops-engine option')).toHaveCount(14);
  await expect(page.locator('#ops-report-level')).toHaveValue('executive');await expect(page.locator('#ops-reporting .ops-engine-aggregate article')).toHaveCount(13);await noOverflow(page);
  const engine=data.reporting.engines.find(e=>e.id==='ENG-05');await page.locator('#ops-reporting nav button').filter({hasText:engine.id+' · '}).click();await expect(page.locator('#ops-report-level')).toHaveValue('engine');await expect(page.locator('#ops-report-records li')).toHaveCount(engine.reportIds.length);
  await page.locator('#ops-report-level').selectOption('action');await expect(page.locator('#ops-report-action-picker').locator('option')).toHaveCount(registry.actions.length);
  await expect(page.locator('details.ops-action-contract')).toHaveCount(1);
  await expect(page.locator('details.ops-action-contract')).not.toHaveAttribute('open');
  await page.locator('details.ops-action-contract summary').click();
  await expect(page.locator('details.ops-action-contract')).toContainText(lang==='en'?'Required inputs':'ورودی‌های مجاز');
  await noOverflow(page);
  await page.locator('#ops-report-level').selectOption('master');await expect(page.locator('#ops-report-records li')).toHaveCount(36);await noOverflow(page);
  await page.locator('#ops-engine').selectOption('ENG-05');await expect(page.locator('#ops-cards article')).toHaveCount(engine.reportIds.filter(id=>id!=='ADM-01').length);
 }
 expect(errors).toEqual([]);
});
test('Master JSON counts each legacy report once and excludes account/raw audit data',async({page})=>{
 const data=fixture();data.history=[{section_id:'OP-01',gate_id:'tests',result:'pass',test_name:'public fixture check',source_url:'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions',checked_at:data.checkedAt,expires_at:data.checkedAt+60,actor_id:'REGRESSION_PRIVATE_SENTINEL',details:{customerEmail:'REGRESSION_PRIVATE_SENTINEL'},details_json:'REGRESSION_PRIVATE_SENTINEL'}];
 await authorized(page,{data});await page.goto(legacyOpsUrl(base+'/en/account/admin/'));await page.locator('#ops-report-level').selectOption('master');const output=await exported(page,'json'),json=JSON.parse(output.body);
 expect(json.reports).toHaveLength(36);expect(new Set(json.reports.map(r=>r.reportId)).size).toBe(36);expect(json.reports.some(r=>r.reportId==='ADM-01')).toBe(false);
 for(const r of json.reports)expect(r.responsibleEngine).toBe(registry.reportOwners[r.reportId]);expect(json.metrics.measuredCompletion).toBeNull();expect(json.metrics.verificationCoverage).toBe(0);expect(json.metrics.commercialReadiness.status).toBe('unverified');
 expect(output.body).not.toContain('REGRESSION_PRIVATE_SENTINEL');expect(output.body).not.toContain('actor_id');expect(output.body).not.toContain('details_json');expect(output.body).not.toContain('csrfToken');
});
test('Engine and action JSON preserve exact scope and granular actions remain unknown despite completed related gates',async({page})=>{
 const data=fixture(),record=data.reports.find(r=>r.id==='OP-01');record.measuredProgress=99;record.status='blocked';record.verifiedGates=record.verifiedGates.map(g=>({...g,state:'pass',evidence:{test_name:'Scoped legacy fixture check',source_url:'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions',checked_at:data.checkedAt,expires_at:data.checkedAt+60}}));
 data.reporting=project(data).reporting;
 const action=data.reporting.actionReports.find(a=>a.scoringScope==='unverified_acceptance'&&a.legacyReportIds.includes(record.id));expect(action).toBeTruthy();
 await authorized(page,{data});await page.goto(legacyOpsUrl(base+'/en/account/admin/'));await page.locator('#ops-reporting nav button').filter({hasText:'ENG-12 · '}).click();let output=JSON.parse((await exported(page,'json')).body);
 expect(output.reports.map(r=>r.reportId).sort()).toEqual(data.reporting.engines.find(e=>e.id==='ENG-12').reportIds.slice().sort());expect(output.reports.some(r=>r.reportId==='ADM-01')).toBe(true);
 await page.locator('#ops-report-level').selectOption('action');await page.locator('#ops-report-action-picker').selectOption(action.id);await expect(page.locator('#ops-reporting')).toContainText('Action completion: Unknown');
 output=JSON.parse((await exported(page,'json')).body);expect(output.selectedAction.id).toBe(action.id);expect(output.metrics.actionCompletion).toBeNull();expect(output.reports.map(r=>r.reportId).sort()).toEqual(action.legacyReportIds.slice().sort());expect(output.reports[0].measuredCompletion).toBe(99);
});
test('CSV neutralizes spreadsheet formulas, escapes quotes/newlines and action exports retain the permanent identity',async({page})=>{
 const data=fixture(),name=' =HYPERLINK("https://example.invalid","x")\nsecond line';data.reports[0].title=name;
 await authorized(page,{data});await page.goto(legacyOpsUrl(base+'/en/account/admin/'));await page.locator('#ops-report-level').selectOption('master');const csv=(await exported(page,'csv')).body,rows=parseCsv(csv.replace(/^\ufeff/,'')),nameIndex=rows[0].indexOf('name');
 expect(rows).toHaveLength(37);expect(rows[1][nameIndex]).toBe("'"+name);
 const action=data.reporting.actionReports.find(a=>a.scoringScope==='unverified_acceptance'&&a.legacyReportIds.includes('OP-01'));await page.locator('#ops-report-level').selectOption('action');await page.locator('#ops-report-action-picker').selectOption(action.id);
 expect((await exported(page,'txt')).body).toContain(action.id);expect((await exported(page,'csv')).body).toContain(action.id);
});
test('MFA expiry clears every copied privileged report, queue and status value',async({page})=>{
 await authorized(page,{expiry:8});await page.goto(legacyOpsUrl(base+'/fa/app/admin/'));await expect(page.locator('#ops-reporting nav button')).toHaveCount(13,{timeout:6000});await expect(page.locator('#ops-workspace')).toBeHidden({timeout:12000});
 await expect(page.locator('#ops-reporting')).toBeEmpty();await expect(page.locator('#ops-queue')).toBeEmpty();await expect(page.locator('#ops-cards')).toBeEmpty();await expect(page.locator('#ops-detail')).toBeEmpty();await expect(page.locator('#ops-sources')).toBeEmpty();
 for(const id of ['ops-total','ops-verified','ops-coverage','ops-admin-score','ops-release','ops-checked'])expect((await page.locator('#'+id).textContent()).trim()).not.toMatch(/95|aaaaaaaa|36/);
});
test('A delayed authorized snapshot cannot start a fresh MFA window after the session deadline',async({page})=>{
 await authorized(page,{expiry:1,delay:1400});const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/operations');await page.goto(legacyOpsUrl(base+'/en/account/admin/'));await (await response).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.locator('#ops-workspace')).toBeHidden();await expect(page.locator('#ops-cards')).toBeEmpty();await expect(page.locator('#ops-reporting nav button')).toHaveCount(0);
});
test('server-revoked MFA during a delayed refresh clears private copies and blocks stale data',async({page})=>{
 const data=fixture();let snapshots=0,release,refreshSettled=false,revoked=false;
 const gate=new Promise(resolve=>{release=resolve;});
 await page.route('**/api/admin/operations**',async route=>{
  if(new URL(route.request().url()).pathname.endsWith('/session'))
   return route.fulfill({json:{ok:true,mfaRequired:revoked,csrfToken:'c'.repeat(64),
      mfaExpiresIn:revoked?0:600}});
  snapshots++;
  if(snapshots>1){
   await gate;
   try{await route.fulfill({json:data})}
   catch(error){if(!(await page.locator('#ops-workspace').isHidden()))throw error;}
   finally{refreshSettled=true;}
   return;
  }
  return route.fulfill({json:data});
 });
 await page.goto(legacyOpsUrl(base+'/en/account/admin/'));
 await expect(page.locator('#ops-workspace')).toBeVisible();
 await page.locator('#ops-refresh-data').click();
 await expect.poll(()=>snapshots).toBeGreaterThanOrEqual(2);
 // Switching away alone MUST NOT log out; actual server revocation must.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('#ops-workspace')).toBeVisible();
 revoked=true;
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;});
 await expect(page.locator('#ops-workspace')).toBeHidden();
 release();await expect.poll(()=>refreshSettled,{timeout:10000}).toBe(true);
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.locator('#ops-workspace')).toBeHidden();
 await expect(page.locator('#ops-reporting')).toBeEmpty();
});

test('All 12 operational engines expose A/B/C views without claiming a worker or persistent learning exists',async({page})=>{
 const data=fixture(),methods=[];page.on('request',request=>{if(request.url().includes('/api/admin/operations'))methods.push(request.method());});await authorized(page,{data});await page.setViewportSize({width:320,height:900});await page.goto(legacyOpsUrl(base+'/en/account/admin/'));
 expect(data.reporting.awoseDomainViews).toHaveLength(36);
 for(const engine of data.reporting.engines.filter(e=>e.kind==='operational')){
  await page.locator('#ops-reporting nav button').filter({hasText:engine.id+' · '}).click();
  for(const type of ['A','B','C']){
   await page.locator('#ops-reporting').getByRole('button',{name:new RegExp('^'+type+':')}).click();
   await expect(page.locator('#ops-reporting h4').filter({hasText:'AWOSE.'+engine.id+'.'+type})).toHaveCount(1);
   if(type==='B')await expect(page.locator('#ops-reporting')).toContainText('Durable job execution: not implemented');
   if(type==='C')await expect(page.locator('#ops-reporting')).toContainText('Persisted experience and learning: not implemented');
   await noOverflow(page);
  }
 }
 await page.locator('#ops-reporting nav button').filter({hasText:'ENG-05 · '}).click();await page.locator('#ops-reporting').getByRole('button',{name:/^C:/}).click();
 const output=JSON.parse((await exported(page,'json')).body);expect(output.awoseDomainView.id).toBe('AWOSE.ENG-05.C');expect(output.awoseDomainView.experienceMemory.status).toBe('not_implemented');expect(output.awoseDomainView.experienceMemory.verifiedExperiences).toBeNull();expect(output.awoseDomainView.experienceMemory.automationPromotions).toBeNull();expect(methods.every(method=>method==='GET')).toBe(true);
});

test('Existing 7 collectors execute as MFA-scoped observations with server history, without creating a new dashboard',async({page})=>{
 const data=fixture(),runs=[],requests=[];
 await authorized(page,{data});
 await page.route('**/api/admin/operations/action-runs',async route=>{
  const r=route.request();
  if(r.method()==='GET')return route.fulfill({json:{ok:true,schema:'operations-readonly-action-history-v1',runs}});
  requests.push({headers:r.headers(),body:r.postDataJSON()});
  const actionId=r.postDataJSON().actionId;
  const run={runId:'a'.repeat(64),actionId,releaseSha:data.releaseSha,status:'succeeded',
   createdAt:data.checkedAt,finishedAt:data.checkedAt,result:{status:'observed',expectedSignalCount:1,freshSignalCount:1,signalIds:['current_release']}};
  runs.unshift(run);return route.fulfill({json:{ok:true,run}});
 });
 await page.goto(legacyOpsUrl(base+'/en/account/admin/'));
 await expect(page.locator('#ops-workspace')).toBeVisible();
 await page.locator('#ops-report-level').selectOption('action');
 await page.locator('#ops-report-action-picker').selectOption('ENG-11.ACT-009');
 await expect(page.locator('#ops-reporting').getByRole('button',{name:'Run observation and record result'})).toBeVisible();
 await expect(page.locator('#ops-reporting')).toContainText('Existing collector: read-only');
 await page.locator('#ops-reporting').getByRole('button',{name:'Run observation and record result'}).click();
 await expect(page.locator('#ops-reporting')).toContainText('Observation completed');
 expect(requests).toHaveLength(1);
 expect(requests[0].body.actionId).toBe('ENG-11.ACT-009');
 expect(requests[0].body.requestKey).toMatch(/^[a-f0-9]{32}$/);
 expect(requests[0].headers['x-csrf-token']).toBe('c'.repeat(64));
 const output=JSON.parse((await exported(page,'json')).body);
 expect(output.selectedAction.id).toBe('ENG-11.ACT-009');
 expect(output.recentActionRuns).toHaveLength(1);
 expect(output.recentActionRuns[0].status).toBe('succeeded');
 await page.locator('#ops-report-action-picker').selectOption('ENG-05.ACT-002');
 await expect(page.locator('#ops-reporting').getByRole('button',{name:'Run observation and record result'})).toHaveCount(0);
 await expect(page.locator('#ops-reporting')).toContainText('This Action has no authorized executor yet');
 expect(requests).toHaveLength(1);
});

test('FA/EN owner can inspect real source-scoped GitHub audit evidence without running a workflow',async({page})=>{
 const data=fixture();
 const example={actionId:'ENG-01.ACT-001',workflow:'bertina-master-seo.yml',labelFa:'ممیزی جامع سئو',labelEn:'Master SEO audit',
    status:'observed',runs:[{url:'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38275309821',
    status:'completed',conclusion:'success',sourceSha:'b'.repeat(40),event:'push',createdAt:'2026-10-12T16:10:00Z'}]};
 let calls=0;
 await authorized(page,{data});
 await page.route('**/api/admin/operations/github-audits',async route=>{calls++;
   expect(route.request().method()).toBe('GET');
   return route.fulfill({json:{ok:true,schema:'operations-github-audits-v1',
     summary:{observableWorkflows:1,registeredAllowlistedWorkflows:4},
     audits:[example],limitation:'read-only data, not an Action acceptance or deployment'}});});
 await page.setViewportSize({width:320,height:900});
 await page.goto(legacyOpsUrl(base+'/fa/app/admin/'));
 await expect(page.locator('details.ops-github-audits')).toHaveCount(1);
 await expect(page.locator('details.ops-github-audits')).not.toHaveAttribute('open');
 expect(calls).toBe(0);
 await page.locator('details.ops-github-audits summary').click();
 await page.locator('details.ops-github-audits').getByRole('button',{name:'دریافت آخرین وضعیت رسمی GitHub'}).click();
 await expect(page.locator('details.ops-github-audits')).toContainText('ممیزی جامع سئو');
 await expect(page.locator('details.ops-github-audits')).toContainText('success');
 await expect(page.locator('details.ops-github-audits')).toContainText('bbbbbbbbbbbb');
 const link=page.locator('details.ops-github-audits a');
 await expect(link).toHaveAttribute('href','https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38275309821');
 expect(calls).toBe(1);
 const output=JSON.parse((await exported(page,'json')).body);
 expect(output.githubAuditObservation.summary.observableWorkflows).toBe(1);
 const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 await page.goto(legacyOpsUrl(base+'/en/account/admin/'));
 await expect(page.locator('details.ops-github-audits summary')).toContainText('GitHub');
 await expect(page.locator('details.ops-github-audits')).not.toHaveAttribute('open');
 expect(calls).toBe(1);
});


for(const [language,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']])test(language+' OP-02 branch governance stays read-only and never certifies OP-36',async({page})=>{
 const data=fixture();await authorized(page,{data});
 await page.route('**/api/admin/operations/github-audits',route=>route.fulfill({json:{
   ok:true,schema:'operations-github-audits-v1',summary:{observableWorkflows:0,registeredAllowlistedWorkflows:4},
   audits:[],governance:{schema:'operations-github-governance-v1',
    canonicalBranch:'migration/bertina-linux6',defaultBranch:'migration/bertina-linux6',
    defaultMatchesCanonical:true,canonicalBranchProtected:false,op02Certified:false,
    op36RollbackVerified:false,status:'branch_unprotected'}
 }}));
 await page.setViewportSize({width:320,height:900});await page.goto(legacyOpsUrl(base+route));
 const github=page.locator('details.ops-github-audits');
 await github.locator('summary').click();
 await github.getByRole('button',{name:language==='fa'?'دریافت آخرین وضعیت رسمی GitHub':'Fetch verified GitHub workflow status'}).click();
 const policy=github.locator('.ops-branch-governance');
 await expect(policy).toContainText('OP-02');await expect(policy).toContainText('OP-36');
 await expect(policy).toContainText('migration/bertina-linux6');
 await expect(policy).toContainText(language==='fa'?'تأییدنشده':'unverified');
 await expect(policy.locator('a')).toHaveAttribute('href','https://github.com/drrezazadeh65/drjavadrezazadeh.com/settings/branches');
 await noOverflow(page);
});


test('OP-36 displays official isolated-recovery CI without claiming a production restore',async({page})=>{
 const data=fixture();await authorized(page,{data});
 const url='https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38459475465';
 await page.route('**/api/admin/operations/github-audits',route=>route.fulfill({json:{
   ok:true,schema:'operations-github-audits-v1',
   summary:{observableWorkflows:0,registeredAllowlistedWorkflows:4},
   audits:[],governance:{schema:'operations-github-governance-v1',
     canonicalBranch:'migration/bertina-linux6',defaultBranch:'migration/bertina-linux6',
     defaultMatchesCanonical:true,canonicalBranchProtected:false,
     restoreReadiness:{scope:'isolated_recovery_tooling_ci',status:'isolated_ci_pass',
       isolatedCiPassed:true,productionRestoreVerified:false,rollbackVerified:false,
       sourceSha:'a'.repeat(40),createdAt:'2026-10-13T18:10:00Z',url}}}}));
 await page.setViewportSize({width:320,height:900});await page.goto(legacyOpsUrl(base+'/fa/app/admin/'));
 const gh=page.locator('details.ops-github-audits');await gh.locator('summary').click();
 await gh.getByRole('button',{name:'دریافت آخرین وضعیت رسمی GitHub'}).click();
 const panel=gh.locator('.ops-branch-governance');
 await expect(panel).toContainText('OP-36');
 await expect(panel).toContainText('بازیابی واقعی تأییدنشده');
 await expect(panel.locator('a').filter({hasText:'مشاهدهٔ گزارش آزمون بازیابی'})).toHaveAttribute('href',url);
 await noOverflow(page);
});


test('OP-36 correlates server release with official deploy and post-release CI without claiming rollback',async({page})=>{
 const data=fixture();await authorized(page,{data});
 const deployUrl='https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38459966600';
 const acceptanceUrl='https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/38460316374';
 await page.route('**/api/admin/operations/github-audits',route=>route.fulfill({json:{
  ok:true,schema:'operations-github-audits-v1',
  summary:{observableWorkflows:0,registeredAllowlistedWorkflows:4},audits:[],
  governance:{schema:'operations-github-governance-v1',
   canonicalBranch:'migration/bertina-linux6',defaultBranch:'migration/bertina-linux6',
   canonicalBranchProtected:false,defaultMatchesCanonical:true,
   releaseTrace:{schema:'operations-github-release-trace-v1',status:'release_ci_accepted',
    releaseSha:'a'.repeat(40),releaseAcceptedByCi:true,rollbackVerified:false,backupRestoreVerified:false,
    deploy:{url:deployUrl,status:'completed',conclusion:'success',createdAt:'2026-10-13T20:04:55Z'},
    acceptance:{url:acceptanceUrl,status:'completed',conclusion:'success',createdAt:'2026-10-13T20:07:30Z'}}}
 }}));
 await page.setViewportSize({width:320,height:900});await page.goto(legacyOpsUrl(base+'/en/account/admin/'));
 const gh=page.locator('details.ops-github-audits');await gh.locator('summary').click();
 await gh.getByRole('button',{name:'Fetch verified GitHub workflow status'}).click();
 const panel=gh.locator('.ops-branch-governance');
 await expect(panel).toContainText('Same-release deployment and independent acceptance passed');
 await expect(panel).toContainText('not evidence of production rollback');
 await expect(panel.getByRole('link',{name:'GitHub deploy run'})).toHaveAttribute('href',deployUrl);
 await expect(panel.getByRole('link',{name:'Independent acceptance run'})).toHaveAttribute('href',acceptanceUrl);
 await noOverflow(page);
});


test('Collection settings expose 13 engine switches, eight cached providers and owner refresh',async({page})=>{
 const data=fixture();await authorized(page,{data});
 const rows=[...Array.from({length:13},(_,i)=>({
    id:'ENG-'+String(i+1).padStart(2,'0'),type:'engine',engineId:'ENG-'+String(i+1).padStart(2,'0'),
    enabled:true,connected:i===0,cadence:'daily',clockMinutes:240,cacheState:'not_implemented'
 })),...['audit:bertina-master-seo.yml','audit:external-link-monitor.yml',
 'audit:http-compression-diagnostic.yml','audit:full-route-responsive-certification.yml',
 'governance:repository','governance:branches','governance:restore_ci','governance:release_runs']
  .map(id=>({id,type:'source',engineId:'ENG-11',enabled:true,connected:true,
   cadence:'daily',clockMinutes:240,cacheState:'missing'}))];
 const schedule={ok:true,schema:'operations-collection-controls-v1',canManage:true,timezone:'Asia/Tehran',
  scheduler:'external_bertina_cron_required',rows,sourceStates:{}};
 let saved=0,refreshed=0;
 await page.route('**/api/admin/operations/collection-settings',route=>{
  if(route.request().method()==='POST'){saved++;return route.fulfill({json:schedule});}
  return route.fulfill({json:schedule});
 });
 await page.route('**/api/admin/operations/github-audits/refresh',route=>{
  refreshed++;expect(route.request().postDataJSON()).toEqual({scope:'all'});
  return route.fulfill({json:{ok:true,refresh:{attempted:8,saved:8},
   auditSnapshot:{ok:true,schema:'operations-github-audits-v1',
    summary:{observableWorkflows:0,registeredAllowlistedWorkflows:4},audits:[],
    collection:schedule}}});
 });
 await page.setViewportSize({width:320,height:900});await page.goto(legacyOpsUrl(base+'/fa/app/admin/'));
 await page.locator('details.ops-github-audits summary').click();
 await page.locator('details.ops-collection-settings summary').click();
 await page.getByRole('button',{name:'نمایش تنظیمات و آخرین وضعیت'}).click();
 const controls=page.locator('.ops-collector-item');await expect(controls).toHaveCount(21);
 await controls.first().getByRole('button',{name:'ذخیره'}).click();expect(saved).toBe(1);
 await page.locator('[data-ops-fetch-all]').click();
 await expect.poll(()=>refreshed,{timeout:8000,message:'Owner refresh must issue exactly one authorized request'}).toBe(1);
 await noOverflow(page);
});

test('Audit-only dispatch requires owner confirmation and reports accepted request without invented run outcome',async({page})=>{
 const data=fixture(),posted=[];
 await authorized(page,{data});
 await page.route('**/api/admin/operations/github-audits',route=>route.fulfill({json:{
  ok:true,schema:'operations-github-audits-v1',
  summary:{observableWorkflows:0,registeredAllowlistedWorkflows:4,dispatchReady:true,canReconcile:true},
  audits:[{actionId:'ENG-01.ACT-001',workflow:'bertina-master-seo.yml',
   labelFa:'ممیزی جامع سئو',labelEn:'Master SEO audit',status:'provider_unavailable',runs:[]}],
  ownerSubmissions:[]}}));
 await page.route('**/api/admin/operations/github-audits/dispatch',route=>{
  posted.push({method:route.request().method(),body:route.request().postDataJSON(),headers:route.request().headers()});
  return route.fulfill({json:{ok:true,schema:'operations-gh-audit-dispatch-v1',
    run:{runId:'a'.repeat(64),status:'running',result:{dispatchState:'accepted_run_unconfirmed'}}}});
 });
 let reconcileCalls=0;
 await page.route('**/api/admin/operations/github-audits/reconcile',route=>{
  reconcileCalls++;expect(route.request().method()).toBe('POST');
  expect(route.request().postDataJSON()).toEqual({});
  expect(route.request().headers()['x-csrf-token']).toBe('c'.repeat(64));
  return route.fulfill({json:{ok:true,schema:'operations-gh-audit-reconcile-v1',
   reconciliation:{recorded:1,examined:1},
   auditSnapshot:{ok:true,
    summary:{observableWorkflows:1,registeredAllowlistedWorkflows:4,dispatchReady:true,canReconcile:true},
    audits:[],ownerSubmissions:[{actionId:'ENG-01.ACT-001',
      requestRunId:'a'.repeat(64),dispatchState:'accepted_run_unconfirmed',
      status:'github_observed',github:{runId:12345,status:'completed',conclusion:'success',
       sourceSha:'b'.repeat(40),url:'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/12345'}}]},
   runs:[{runId:'a'.repeat(64),actionId:'ENG-01.ACT-001',status:'succeeded',createdAt:data.checkedAt,
      result:{kind:'github_ci_audit',dispatchState:'accepted_run_unconfirmed',githubRunId:12345,verifiedByProvider:true}}]}});}
 );
 await page.goto(legacyOpsUrl(base+'/en/account/admin/'));
 await page.locator('details.ops-github-audits summary').click();
 await page.locator('details.ops-github-audits').getByRole('button',{name:'Fetch verified GitHub workflow status'}).click();
 await expect(page.locator('details.ops-github-audits').getByRole('button',{name:'Request audit-only workflow'})).toHaveCount(1);
 // Explicit refusal must not dispatch or record a request.
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('details.ops-github-audits').getByRole('button',{name:'Request audit-only workflow'}).click();
 expect(posted).toHaveLength(0);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('details.ops-github-audits').getByRole('button',{name:'Request audit-only workflow'}).click();
 await expect(page.locator('details.ops-github-audits')).toContainText('awaiting_external_run_correlation');
 expect(posted).toHaveLength(1);
 expect(posted[0].method).toBe('POST');
 expect(posted[0].body.actionId).toBe('ENG-01.ACT-001');
 expect(posted[0].body.approval).toBe('APPROVE_READONLY_AUDIT');
 expect(posted[0].body.requestKey).toMatch(/^[a-f0-9]{32}$/);
 expect(posted[0].headers['x-csrf-token']).toBe('c'.repeat(64));
 await expect(page.locator('details.ops-github-audits')).not.toContainText('GitHub run ID confirmed');
 await page.locator('details.ops-github-audits').getByRole('button',{name:'Verify and record provider run result'}).click();
 await expect(page.locator('details.ops-github-audits')).toContainText('github_observed');
 await expect(page.locator('details.ops-github-audits a').last()).toHaveAttribute('href','https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/12345');
 expect(reconcileCalls).toBe(1);
});


for(const [language,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 test(language+' source-observation labels never certify Cron from due dates alone',async({page})=>{
  const now=Math.floor(Date.now()/1000);
  const data=fixture();await authorized(page,{data});
  const ids=['audit:bertina-master-seo.yml','audit:external-link-monitor.yml',
    'audit:http-compression-diagnostic.yml','audit:full-route-responsive-certification.yml',
    'governance:repository','governance:branches','governance:restore_ci','governance:release_runs'];
  const rows=[...Array.from({length:13},(_,i)=>({
    id:'ENG-'+String(i+1).padStart(2,'0'),type:'engine',engineId:'ENG-'+String(i+1).padStart(2,'0'),
    enabled:true,connected:false,cadence:'manual',clockMinutes:210,
    executionEvidence:'not_applicable',scheduleEvidence:'engine_switch_only'
  })),...ids.map(id=>({
    id,type:'source',engineId:'ENG-11',enabled:true,connected:true,
    cadence:'daily',clockMinutes:210,nextDue:now+3600,
    cacheState:'missing',executionEvidence:'never_observed',scheduleEvidence:'scheduled_unverified'
  }))];
  const first=rows[13];first.cacheState='stale';first.scheduleEvidence='due_unverified';first.nextDue=now-3600;
  const successful=rows[17];successful.cacheState='fresh';
  successful.executionEvidence='attempt_recorded';
  successful.lastAttempt={result:'succeeded',attemptedAt:now-180};
  const failed=rows[18];failed.cacheState='stale';
  failed.executionEvidence='last_attempt_failed';failed.scheduleEvidence='due_unverified';
  failed.nextDue=now-1500;failed.lastAttempt={result:'failed',attemptedAt:now-120};
  const unknown=rows[19];unknown.executionEvidence='journal_unavailable';
  const schedule={ok:true,schema:'operations-collection-controls-v1',
    scheduler:'external_bertina_cron_required',timezone:'Asia/Tehran',
    attemptJournalStatus:'available',canManage:false,rows,sourceStates:{},
    unmappedPolicies:{status:'available',count:1,ids:['http_access_log']}};
  await page.route('**/api/admin/operations/collection-settings',r=>r.fulfill({json:schedule}));
  await page.setViewportSize({width:360,height:900});
  await page.goto(legacyOpsUrl(base+route));
  await page.locator('details.ops-github-audits summary').click();
  await page.locator('details.ops-collection-settings summary').click();
  await page.locator('details.ops-collection-settings').getByRole('button',{
    name:language==='fa'?'نمایش تنظیمات و آخرین وضعیت':'Load controls and current status'
  }).click();
  const summary=page.locator('[data-ops-collector-summary]');
  await expect(summary).toContainText(language==='fa'?'کش منقضی: 2':'Expired cache: 2');
  await expect(page.locator('[data-ops-unmapped-policies]')).toContainText('http_access_log');
  await expect(summary).toContainText(language==='fa'
    ?'موعد گذشته، اجرای Cron تأییدنشده: 2':'Due, host Cron unverified: 2');
  const source=page.locator('[data-collector-scope="audit:bertina-master-seo.yml"]');
  await expect(source.locator('[data-execution-evidence="never_observed"]')).toBeVisible();
  await expect(source.locator('[data-schedule-evidence="due_unverified"]')).toBeVisible();
  const recorded=page.locator('[data-collector-scope="governance:repository"]');
  await expect(recorded.locator('[data-execution-evidence="attempt_recorded"]')).toBeVisible();
  const bad=page.locator('[data-collector-scope="governance:branches"]');
  await expect(bad.locator('[data-execution-evidence="last_attempt_failed"]')).toBeVisible();
  const noJournal=page.locator('[data-collector-scope="governance:restore_ci"]');
  await expect(noJournal.locator('[data-execution-evidence="journal_unavailable"]')).toBeVisible();
  await expect(page.locator('.ops-collector-item')).toHaveCount(21);
  await noOverflow(page);
 });
}


for(const [lang,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 test(lang+' mother database health is manually loaded and diagnostic cleanup owner-confirmed',async({page})=>{
  const data=fixture();let scans=0,configured=0,previews=0,purges=0;
  await authorized(page,{data});
  const sample={ok:true,schema:'operations-database-health-v1',asOf:Math.floor(Date.now()/1000),
   mode:'manual_readonly',connection:'available',hostCronVerified:null,
   automaticRepairEnabled:false,automaticCleanupEnabled:false,
   settings:{available:true,monitoringEnabled:false,errorLoggingEnabled:false,
     cadence:'manual',clockMinutes:210,retentionDays:90},
   checks:[{id:'connection',state:'observed'},{id:'required_tables',state:'observed',count:0},
     {id:'storage_engine',state:'attention',count:1}],
   inventory:{tableCount:40,operationsTableCount:26,missingOperationsTables:[],
     largestOperationsTables:[{table:'operations_evidence',estimatedRows:235,
       dataBytes:65536,indexBytes:32768}]},
   errors:{status:'available',rows:[{category:'schema',component:'operations_route',
     sqlstateClass:'42',driverCode:'1064',firstAt:1700000000,
     lastAt:1700000020,occurrences:2}]}};
  await page.route('**/api/admin/operations/database-health',route=>{
    scans++;return route.fulfill({json:sample});
  });
  await page.route('**/api/admin/operations/database-health/settings',route=>{
    configured++;
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers()['x-csrf-token']).toBe('c'.repeat(64));
    const body=route.request().postDataJSON();
    expect(body.monitoringEnabled).toBe(false);
    expect(body.cadence).toBe('manual');
    return route.fulfill({json:{ok:true,settings:sample.settings}});
  });
  await page.route('**/api/admin/operations/database-health/purge-preview',route=>{
    previews++;return route.fulfill({json:{ok:true,eligibleCount:1,previewOnly:true,
      maximumDeletion:100,moreMayRemain:false}});
  });
  await page.route('**/api/admin/operations/database-health/purge-expired',route=>{
    purges++;
    expect(route.request().postDataJSON().confirmation).toBe('DELETE EXPIRED DATABASE LOGS');
    return route.fulfill({json:{ok:true,deleted:1,moreMayRemain:false}});
  });
  await page.setViewportSize({width:360,height:900});
  await page.goto(legacyOpsUrl(base+route));
  const panel=page.locator('#ops-database-health');
  await panel.locator('summary').first().click();
  await expect(panel).toContainText(lang==='fa'?'بررسی سلامت تنها':'Health is checked only');
  expect(scans).toBe(0);
  await panel.locator('[data-db-health-scan]').click();
  await expect(panel.locator('[data-db-health-summary]')).toContainText(
    lang==='fa'?'جدول‌های عملیاتی: 26':'Operations tables: 26');
  await expect(panel.locator('[data-db-health-errors]')).toContainText('Redacted error journal: 1'.replace(
    'Redacted error journal: ',lang==='fa'?'دفتر خطاهای ناشناس‌سازی‌شده: ':'Redacted error journal: '));
  const controls=panel.locator('details.ops-db-health-controls');
  await controls.locator('summary').click();
  await expect(controls.locator('input[type=checkbox]').first()).not.toBeChecked();
  await expect(controls.locator('input[type=checkbox]').nth(1)).not.toBeChecked();
  await controls.locator('[data-db-health-save]').click();
  await expect.poll(()=>configured).toBe(1);
  await controls.locator('summary').click();
  await page.evaluate(()=>{window.confirm=()=>true;});
  await controls.locator('[data-db-health-purge-preview]').click();
  await expect.poll(()=>purges).toBe(1);
  expect(previews).toBe(1);
  await expect.poll(()=>scans).toBe(3);
  await noOverflow(page);
 });
}


test('owner-controlled collection master toggle never triggers a fetch until separately requested',async({page})=>{
 const data=fixture();await authorized(page,{data});
 const source='governance:repository',engine='ENG-11';
 let masterWrites=0,manualFetches=0;
 const rows=[
  {id:engine,type:'engine',engineId:engine,connected:true,enabled:true,
   cadence:'daily',clockMinutes:210,scheduleEvidence:'engine_switch_only'},
  {id:source,type:'source',engineId:engine,connected:true,enabled:true,
   cadence:'daily',clockMinutes:210,cacheState:'missing',lastAttempt:null,
   executionEvidence:'never_observed',scheduleEvidence:'due_unverified'}
 ];
 let enabled=false;
 const settings=()=>({ok:true,schema:'operations-collection-controls-v1',canManage:true,
  timezone:'Asia/Tehran',scheduler:'external_bertina_cron_required',
  automaticCollection:{enabled,installedCronVerified:null,policy:'owner_opt_in_fail_closed'},
  attemptJournalStatus:'available',rows,sourceStates:{},
  unmappedPolicies:{status:'available',count:0,ids:[]}});
 await page.route('**/api/admin/operations/collection-settings',r=>r.fulfill({json:settings()}));
 await page.route('**/api/admin/operations/collection-automatic',r=>{
  masterWrites++;
  expect(r.request().method()).toBe('POST');
  expect(r.request().headers()['x-csrf-token']).toBe('c'.repeat(64));
  expect(r.request().postDataJSON()).toEqual({
   enabled:true,confirmation:'ENABLE SCHEDULED COLLECTION'
  });
  enabled=true;return r.fulfill({json:settings()});
 });
 await page.route('**/api/admin/operations/github-audits/refresh',r=>{
  manualFetches++;
  expect(r.request().postDataJSON()).toEqual({scope:source});
  return r.fulfill({json:{
   ok:true,refresh:{status:'updated',attempted:1,saved:1},
   auditSnapshot:{ok:true,schema:'operations-github-audits-v1',
    summary:{observableWorkflows:0,registeredAllowlistedWorkflows:4},audits:[],
    collection:settings()}
  }});
 });
 await page.setViewportSize({width:360,height:900});
 await page.goto(legacyOpsUrl(base+'/fa/app/admin/'));
 await page.locator('details.ops-github-audits summary').click();
 await page.locator('details.ops-collection-settings summary').click();
 await page.getByRole('button',{name:'نمایش تنظیمات و آخرین وضعیت'}).click();
 const panel=page.locator('details.ops-collection-settings');
 await expect(panel.locator('[data-ops-collector-master-status="off"]')).toBeVisible();
 await page.evaluate(()=>{window.confirm=()=>true;});
 await panel.locator('[data-ops-collector-master-toggle]').click();
 await expect(panel.locator('[data-ops-collector-master-status="on"]')).toBeVisible();
 expect(masterWrites).toBe(1);
 expect(manualFetches).toBe(0);
 await panel.locator('[data-ops-fetch-scope="governance:repository"]').click();
 await expect.poll(()=>manualFetches).toBe(1);
 await noOverflow(page);
});
