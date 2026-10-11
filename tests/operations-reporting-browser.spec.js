const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const registry=require(path.resolve(process.cwd(),'api/internal/operations-registry.json'));
const base=(process.env.OPERATIONS_BROWSER_BASE||'http://127.0.0.1:4173').replace(/\/$/,'');
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
function parseCsv(text){const rows=[];let row=[],field='',quote=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quote&&text[i+1]==='"'){field+='"';i++;}else quote=!quote;}else if(ch===','&&!quote){row.push(field);field='';}else if(ch==='\n'&&!quote){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}else field+=ch;}if(field||row.length){row.push(field.replace(/\r$/,''));rows.push(row);}return rows;}
for(const [lang,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']])test(lang+' canonical navigation and four report levels stay usable on 320/390/430px',async({page})=>{
 const data=fixture(),errors=[];page.on('pageerror',e=>errors.push(String(e)));await authorized(page,{data});
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:900});await page.goto(base+route);await expect(page.locator('#ops-reporting nav button')).toHaveCount(13);await expect(page.locator('#ops-engine option')).toHaveCount(14);
  await expect(page.locator('#ops-report-level')).toHaveValue('executive');await expect(page.locator('#ops-reporting .ops-engine-aggregate article')).toHaveCount(13);await noOverflow(page);
  const engine=data.reporting.engines.find(e=>e.id==='ENG-05');await page.locator('#ops-reporting nav button').filter({hasText:engine.id+' · '}).click();await expect(page.locator('#ops-report-level')).toHaveValue('engine');await expect(page.locator('#ops-reporting .ops-queue li')).toHaveCount(engine.reportIds.length);
  await page.locator('#ops-report-level').selectOption('action');await expect(page.locator('#ops-reporting select').nth(1).locator('option')).toHaveCount(registry.actions.length);await noOverflow(page);
  await page.locator('#ops-report-level').selectOption('master');await expect(page.locator('#ops-reporting .ops-queue li')).toHaveCount(36);await noOverflow(page);
  await page.locator('#ops-engine').selectOption('ENG-05');await expect(page.locator('#ops-cards article')).toHaveCount(engine.reportIds.filter(id=>id!=='ADM-01').length);
 }
 expect(errors).toEqual([]);
});
test('Master JSON counts each legacy report once and excludes account/raw audit data',async({page})=>{
 const data=fixture();data.history=[{section_id:'OP-01',gate_id:'tests',result:'pass',test_name:'public fixture check',source_url:'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions',checked_at:data.checkedAt,expires_at:data.checkedAt+60,actor_id:'REGRESSION_PRIVATE_SENTINEL',details:{customerEmail:'REGRESSION_PRIVATE_SENTINEL'},details_json:'REGRESSION_PRIVATE_SENTINEL'}];
 await authorized(page,{data});await page.goto(base+'/en/account/admin/');await page.locator('#ops-report-level').selectOption('master');const output=await exported(page,'json'),json=JSON.parse(output.body);
 expect(json.reports).toHaveLength(36);expect(new Set(json.reports.map(r=>r.reportId)).size).toBe(36);expect(json.reports.some(r=>r.reportId==='ADM-01')).toBe(false);
 for(const r of json.reports)expect(r.responsibleEngine).toBe(registry.reportOwners[r.reportId]);expect(json.metrics.measuredCompletion).toBeNull();expect(json.metrics.verificationCoverage).toBe(0);expect(json.metrics.commercialReadiness.status).toBe('unverified');
 expect(output.body).not.toContain('REGRESSION_PRIVATE_SENTINEL');expect(output.body).not.toContain('actor_id');expect(output.body).not.toContain('details_json');expect(output.body).not.toContain('csrfToken');
});
test('Engine and action JSON preserve exact scope and granular actions remain unknown despite completed related gates',async({page})=>{
 const data=fixture(),record=data.reports.find(r=>r.id==='OP-01');record.measuredProgress=99;record.status='blocked';record.verifiedGates=record.verifiedGates.map(g=>({...g,state:'pass',evidence:{test_name:'Scoped legacy fixture check',source_url:'https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions',checked_at:data.checkedAt,expires_at:data.checkedAt+60}}));
 data.reporting=project(data).reporting;
 const action=data.reporting.actionReports.find(a=>a.scoringScope==='unverified_acceptance'&&a.legacyReportIds.includes(record.id));expect(action).toBeTruthy();
 await authorized(page,{data});await page.goto(base+'/en/account/admin/');await page.locator('#ops-reporting nav button').filter({hasText:'ENG-12 · '}).click();let output=JSON.parse((await exported(page,'json')).body);
 expect(output.reports.map(r=>r.reportId).sort()).toEqual(data.reporting.engines.find(e=>e.id==='ENG-12').reportIds.slice().sort());expect(output.reports.some(r=>r.reportId==='ADM-01')).toBe(true);
 await page.locator('#ops-report-level').selectOption('action');await page.locator('#ops-reporting select').nth(1).selectOption(action.id);await expect(page.locator('#ops-reporting')).toContainText('Action completion: Unknown');
 output=JSON.parse((await exported(page,'json')).body);expect(output.selectedAction.id).toBe(action.id);expect(output.metrics.actionCompletion).toBeNull();expect(output.reports.map(r=>r.reportId).sort()).toEqual(action.legacyReportIds.slice().sort());expect(output.reports[0].measuredCompletion).toBe(99);
});
test('CSV neutralizes spreadsheet formulas, escapes quotes/newlines and action exports retain the permanent identity',async({page})=>{
 const data=fixture(),name=' =HYPERLINK("https://example.invalid","x")\nsecond line';data.reports[0].title=name;
 await authorized(page,{data});await page.goto(base+'/en/account/admin/');await page.locator('#ops-report-level').selectOption('master');const csv=(await exported(page,'csv')).body,rows=parseCsv(csv.replace(/^\ufeff/,'')),nameIndex=rows[0].indexOf('name');
 expect(rows).toHaveLength(37);expect(rows[1][nameIndex]).toBe("'"+name);
 const action=data.reporting.actionReports.find(a=>a.scoringScope==='unverified_acceptance'&&a.legacyReportIds.includes('OP-01'));await page.locator('#ops-report-level').selectOption('action');await page.locator('#ops-reporting select').nth(1).selectOption(action.id);
 expect((await exported(page,'txt')).body).toContain(action.id);expect((await exported(page,'csv')).body).toContain(action.id);
});
test('MFA expiry clears every copied privileged report, queue and status value',async({page})=>{
 await authorized(page,{expiry:1});await page.goto(base+'/fa/app/admin/');await expect(page.locator('#ops-reporting nav button')).toHaveCount(13);await expect(page.locator('#ops-workspace')).toBeHidden({timeout:3000});
 await expect(page.locator('#ops-reporting')).toBeEmpty();await expect(page.locator('#ops-queue')).toBeEmpty();await expect(page.locator('#ops-cards')).toBeEmpty();await expect(page.locator('#ops-detail')).toBeEmpty();await expect(page.locator('#ops-sources')).toBeEmpty();
 for(const id of ['ops-total','ops-verified','ops-coverage','ops-admin-score','ops-release','ops-checked'])expect((await page.locator('#'+id).textContent()).trim()).not.toMatch(/95|aaaaaaaa|36/);
});
test('A delayed authorized snapshot cannot start a fresh MFA window after the session deadline',async({page})=>{
 await authorized(page,{expiry:1,delay:1400});const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/operations');await page.goto(base+'/en/account/admin/');await (await response).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.locator('#ops-workspace')).toBeHidden();await expect(page.locator('#ops-cards')).toBeEmpty();await expect(page.locator('#ops-reporting nav button')).toHaveCount(0);
});
test('Locking while a refresh is pending invalidates its response instead of reopening copied reports',async({page})=>{
 const data=fixture();let snapshots=0,release;const gate=new Promise(resolve=>{release=resolve});
 await page.route('**/api/admin/operations**',async route=>{if(new URL(route.request().url()).pathname.endsWith('/session'))return route.fulfill({json:{ok:true,mfaRequired:false,csrfToken:'c'.repeat(64),mfaExpiresIn:600}});snapshots++;if(snapshots>1)await gate;return route.fulfill({json:data});});
 await page.goto(base+'/en/account/admin/');await expect(page.locator('#ops-workspace')).toBeVisible();await page.locator('#ops-refresh-data').click();await expect.poll(()=>snapshots).toBe(2);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});});await expect(page.locator('#ops-workspace')).toBeHidden();
 const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin/operations');release();await (await response).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.locator('#ops-workspace')).toBeHidden();await expect(page.locator('#ops-reporting')).toBeEmpty();
});

test('All 12 operational engines expose A/B/C views without claiming a worker or persistent learning exists',async({page})=>{
 const data=fixture(),methods=[];page.on('request',request=>{if(request.url().includes('/api/admin/operations'))methods.push(request.method());});await authorized(page,{data});await page.setViewportSize({width:320,height:900});await page.goto(base+'/en/account/admin/');
 expect(data.reporting.awoseDomainViews).toHaveLength(36);
 for(const engine of data.reporting.engines.filter(e=>e.kind==='operational')){
  await page.locator('#ops-reporting nav button').filter({hasText:engine.id+' · '}).click();
  for(const type of ['A','B','C']){
   await page.locator('#ops-reporting').getByRole('button',{name:new RegExp('^'+type+':')}).click();
   await expect(page.locator('#ops-reporting h4')).toContainText('AWOSE.'+engine.id+'.'+type);
   if(type==='B')await expect(page.locator('#ops-reporting')).toContainText('Durable job execution: not implemented');
   if(type==='C')await expect(page.locator('#ops-reporting')).toContainText('Persisted experience and learning: not implemented');
   await noOverflow(page);
  }
 }
 await page.locator('#ops-reporting nav button').filter({hasText:'ENG-05 · '}).click();await page.locator('#ops-reporting').getByRole('button',{name:/^C:/}).click();
 const output=JSON.parse((await exported(page,'json')).body);expect(output.awoseDomainView.id).toBe('AWOSE.ENG-05.C');expect(output.awoseDomainView.experienceMemory.status).toBe('not_implemented');expect(output.awoseDomainView.experienceMemory.verifiedExperiences).toBeNull();expect(output.awoseDomainView.experienceMemory.automationPromotions).toBeNull();expect(methods.every(method=>method==='GET')).toBe(true);
});
