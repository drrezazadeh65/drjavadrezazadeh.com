const {test,expect}=require('@playwright/test');
const opRegistry=require('../api/internal/operations-registry.json');
const freeRegistry=require('../platform/free-resources-registry.json');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
// Retain genuine access to the historical admin panels through the owner's
// MFA-protected full-tools view; modern tabs are separately certified.
const fullTools=url=>{
 const parsed=new URL(url);
 if(['/fa/app/admin/','/en/account/admin/'].includes(parsed.pathname))
  parsed.searchParams.set('ops_view','classic');
 return parsed.href;
};
function fixture(){
 const wrap=r=>({...r,measuredProgress:null,status:'not_started',closed:false,openDependencies:r.dependencies,
  openWork:Object.values(r.gates),currentBlocker:null,verifiedGates:Object.entries(r.gates).map(([id,label])=>({id,label,state:'unknown',evidence:null}))});
 return {ok:true,schema:'operations-live-v1',version:'4.4.1',releaseSha:'a'.repeat(40),
  checkedAt:Math.floor(Date.now()/1000),reports:opRegistry.reports.map(wrap),dashboard:wrap(opRegistry.dashboard),
  sourceSections:opRegistry.sourceSections,summary:{total:36,verified:0,measuredCoverage:0,measuredProgress:null},history:[]};
}
for(const [lang,path] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 for(const width of [320,390,1440]){
  test(lang+' free-resource directory in authorized admin at '+width,async({page})=>{
   await page.setViewportSize({width,height:900});
   let externalCalls=0,catalogueCalls=0;
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.hostname!=='127.0.0.1')externalCalls++;
    if(!url.pathname.startsWith('/api/admin/operations'))return route.continue();
    if(url.pathname.endsWith('/session'))return route.fulfill({json:{ok:true,mfaRequired:false,csrfToken:'c'.repeat(64),mfaExpiresIn:600}});
    if(url.pathname.endsWith('/free-resources')){
     catalogueCalls++;
     return route.fulfill({json:{ok:true,schema:'operations-free-resources-v1',connectionStatus:'UNVERIFIED',verifiedExternalConnections:0,
      resources:freeRegistry.resources.map(r=>({id:r.id,name:r.name,url:r.official_url,category:r.category,ownerEngine:r.owner_engine,
       accessPath:r.access_path,purpose:r.purpose,connection:r.external_connection,automatedDataInUse:false}))}});
    }
    return route.fulfill({json:fixture()});
   });
   await page.goto(fullTools(base+path));
   await expect(page.locator('#ops-workspace')).toBeVisible();
   expect(catalogueCalls).toBe(0);
   await page.locator('#ops-free-resources summary').click();
   await expect(page.locator('#ops-resources-list article')).toHaveCount(30);
   expect(catalogueCalls).toBe(1);
   const phrase=lang==='fa'?'هیچ داده خارجی خودکاری':'No automated external data';
   await expect(page.locator('#ops-resources-status')).toContainText(phrase);
   await page.locator('#ops-resources-category').selectOption('SCHOLARLY');
   await expect(page.locator('#ops-resources-list article')).toHaveCount(10);
   await expect(page.locator('#ops-resources-list a[target="_blank"]')).toHaveCount(10);
   expect(externalCalls).toBe(0);
   expect(await page.evaluate(()=>localStorage.length)).toBe(0);
   const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
   expect(overflow).toBeLessThanOrEqual(1);
  });
 }
}
test('Unverified visitor cannot load private manager resources',async({page})=>{
 let requested=0;
 await page.route('**/api/admin/operations**',route=>{
  if(route.request().url().includes('/free-resources'))requested++;
  return route.fulfill({status:401,json:{ok:false,error:'unauthorized'}});
 });
 await page.goto(fullTools(base+'/fa/app/admin/'));
 await expect(page.locator('#ops-workspace')).toBeHidden();
 await expect(page.locator('#ops-free-resources')).toBeHidden();
 expect(requested).toBe(0);
});

test('scholarly observation is available only inside authenticated manager and cleared on lock',async({page})=>{
 const scholarly=require('../api/internal/free-scholar-observation.json');
 await page.route('**/api/admin/operations**',route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/session'))return route.fulfill({json:{ok:true,mfaRequired:false,csrfToken:'c'.repeat(64),mfaExpiresIn:600}});
  if(url.pathname.endsWith('/free-resources'))return route.fulfill({json:{ok:true,schema:'operations-free-resources-v1',verifiedExternalConnections:0,
   scholarlyObservation:{status:'observed',observedAt:scholarly.observedAt,metrics:{attempted:scholarly.records.length,metadataFound:scholarly.records.filter(x=>x.status==='metadata_found').length},records:scholarly.records},
   resources:freeRegistry.resources.map(r=>({id:r.id,name:r.name,url:r.official_url,category:r.category,ownerEngine:r.owner_engine,accessPath:r.access_path,purpose:r.purpose,connection:r.external_connection,automatedDataInUse:false}))}});
  return route.fulfill({json:fixture()});
 });
 await page.goto(fullTools(base+'/fa/app/admin/'));
 await expect(page.locator('#ops-scholar-observation')).toHaveCount(0);
 await page.locator('#ops-free-resources summary').click();
 await expect(page.locator('#ops-scholar-observation')).toContainText('Crossref');
 await expect(page.locator('#ops-scholar-observation')).toContainText('10.61838/kman.ijes.1413');
 await expect(page.locator('#ops-resources-list article')).toHaveCount(30);
 await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=true;});
 await expect(page.locator('#ops-scholar-observation')).toHaveCount(0);
 await expect(page.locator('#ops-resources-list article')).toHaveCount(0);
});

test('quota-limited mobile observation never fabricates a PageSpeed score',async({page})=>{
 await page.route('**/api/admin/operations**',route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname.endsWith('/session'))return route.fulfill({json:{ok:true,mfaRequired:false,csrfToken:'c'.repeat(64),mfaExpiresIn:600}});
  if(pathname.endsWith('/free-resources'))return route.fulfill({json:{ok:true,schema:'operations-free-resources-v1',verifiedExternalConnections:0,
    performanceObservation:{status:'provider_unavailable',observedAt:'2026-10-12T09:09:12Z',
      measuredPages:0,attemptedPages:2,results:[
       {url:'https://drjavadrezazadeh.com/fa/',status:'unavailable',labPerformanceScore:null,reason:'http-429'},
       {url:'https://drjavadrezazadeh.com/en/',status:'unavailable',labPerformanceScore:null,reason:'http-429'}]},
    resources:freeRegistry.resources.map(r=>({id:r.id,name:r.name,url:r.official_url,category:r.category,ownerEngine:r.owner_engine,accessPath:r.access_path,purpose:r.purpose,connection:r.external_connection,automatedDataInUse:false}))}});
  return route.fulfill({json:fixture()});
 });
 await page.goto(fullTools(base+'/en/account/admin/'));
 await page.locator('#ops-free-resources summary').click();
 await expect(page.locator('#ops-performance-observation')).toContainText('http-429');
 await expect(page.locator('#ops-performance-observation')).toContainText('No score');
 await expect(page.locator('#ops-resources-list article')).toHaveCount(30);
 await page.locator('#ops-free-resources summary').click();
 await expect(page.locator('#ops-performance-observation')).toHaveCount(0);
});

test('local lab categories are distinctly labelled and do not imply live speed',async({page})=>{
 const snapshot=require('../api/internal/free-local-lighthouse-observation.json');
 await page.route('**/api/admin/operations**',route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/session'))return route.fulfill({json:{ok:true,mfaRequired:false,csrfToken:'c'.repeat(64),mfaExpiresIn:600}});
  if(url.pathname.endsWith('/free-resources'))return route.fulfill({json:{ok:true,schema:'operations-free-resources-v1',
   verifiedExternalConnections:0,
   localLighthouseObservation:{status:'observed',observedAt:snapshot.observedAt,measuredPages:2,
    results:snapshot.records.map(rec=>({route:rec.route,status:'observed',localLabScore:rec.score.performance,
     categoryScores:rec.score,labMetrics:rec.lab,reason:null}))},
   resources:freeRegistry.resources.map(r=>({id:r.id,name:r.name,url:r.official_url,category:r.category,
    ownerEngine:r.owner_engine,accessPath:r.access_path,purpose:r.purpose,connection:r.external_connection,automatedDataInUse:false}))}});
  return route.fulfill({json:fixture()});
 });
 await page.goto(fullTools(base+'/en/account/admin/'));
 await page.locator('#ops-free-resources summary').click();
 await expect(page.locator('#ops-local-lighthouse-observation')).toContainText('Performance 98/100');
 await expect(page.locator('#ops-local-lighthouse-observation')).toContainText('Accessibility 100/100');
 await expect(page.locator('#ops-local-lighthouse-observation')).toContainText('LCP 1.73s');
 await expect(page.locator('#ops-local-lighthouse-observation')).toContainText('local static build');
 await page.evaluate(()=>document.getElementById('ops-workspace').hidden=true);
 await expect(page.locator('#ops-local-lighthouse-observation')).toHaveCount(0);
});

test('owner-supplied PageSpeed snapshots remain distinct from 429 and local CI with MFA cleanup',async({page})=>{
 const evidence=require('../api/internal/free-manual-pagespeed-observation.json');
 await page.route('**/api/admin/operations**',route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/session'))return route.fulfill({json:{ok:true,mfaRequired:false,csrfToken:'c'.repeat(64),mfaExpiresIn:600}});
  if(url.pathname.endsWith('/free-resources'))return route.fulfill({json:{ok:true,schema:'operations-free-resources-v1',verifiedExternalConnections:0,
   manualPagespeedObservation:{status:'owner_supplied',reportDate:evidence.runDate,
    records:evidence.records.map(x=>({device:x.device,labScores:x.labScores,agenticBrowsing:x.agenticBrowsing,realUserFieldData:x.realUserFieldData}))},
   resources:freeRegistry.resources.map(r=>({id:r.id,name:r.name,url:r.official_url,category:r.category,ownerEngine:r.owner_engine,accessPath:r.access_path,purpose:r.purpose,connection:r.external_connection,automatedDataInUse:false}))}});
  return route.fulfill({json:fixture()});
 });
 await page.goto(fullTools(base+'/fa/app/admin/'));
 await expect(page.locator('#ops-manual-pagespeed-observation')).toHaveCount(0);
 await page.locator('#ops-free-resources summary').click();
 const panel=page.locator('#ops-manual-pagespeed-observation');
 await expect(panel).toContainText('۹۹'.replace('۹۹','99'));
 await expect(panel).toContainText('100/100');
 await expect(panel).toContainText('96/100');
 await expect(panel).toContainText('داده کاربران واقعی: موجود نیست');
 await expect(panel).toContainText('Agentic Browsing 3/3');
 await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=true;});
 await expect(panel).toHaveCount(0);
});
