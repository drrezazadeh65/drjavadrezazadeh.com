const {test,expect}=require('@playwright/test');
const registry=require('../api/internal/operations-registry.json');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
function fixture(){
 const wrap=r=>({...r,measuredProgress:null,status:'not_started',closed:false,openDependencies:r.dependencies,openWork:Object.values(r.gates),currentBlocker:null,verifiedGates:Object.entries(r.gates).map(([id,label])=>({id,label,state:'unknown',evidence:null}))});
 return {ok:true,schema:'operations-live-v1',version:'4.4.1',releaseSha:'a'.repeat(40),checkedAt:Math.floor(Date.now()/1000),reports:registry.reports.map(wrap),dashboard:wrap(registry.dashboard),sourceSections:registry.sourceSections,summary:{total:36,verified:0,measuredCoverage:0,measuredProgress:null},history:[]};
}
async function authorized(page,{data=fixture(),expiry=600,mfa=false}={}){
 let verified=!mfa;
 await page.route('**/api/admin/operations**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path.endsWith('/session'))return route.fulfill({json:{ok:true,mfaRequired:!verified,csrfToken:'c'.repeat(64),mfaExpiresIn:expiry}});
  if(path.endsWith('/mfa')){expect(request.method()).toBe('POST');expect(request.headers()['x-csrf-token']).toBe('c'.repeat(64));expect(request.postDataJSON()).toEqual({code:'123456'});verified=true;return route.fulfill({json:{ok:true,mfaVerified:true}});}
  return route.fulfill({json:data});
 });
}
for(const [lang,path] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']])for(const width of [320,390,430,1440]){
 test(lang+' operations at '+width+'px show server facts and filters',async({page})=>{
  await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(String(e)));await authorized(page);await page.goto(base+path);
  await expect(page.locator('#ops-workspace')).toBeVisible();await expect(page.locator('#ops-cards article')).toHaveCount(36);
  await expect(page.locator('#ops-verified')).toHaveText('0');await expect(page.locator('#ops-coverage')).toHaveText('0/36');
  await expect(page.locator('#ops-refresh-data')).toBeVisible();await page.locator('#ops-search').fill('OP-03');await expect(page.locator('#ops-cards article')).toHaveCount(1);
  await page.locator('#ops-cards button').click();await expect(page.locator('#ops-detail')).toBeVisible();await expect(page.locator('#ops-detail .ops-gate')).toHaveCount(4);
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);expect(overflow).toBeLessThanOrEqual(1);expect(errors).toEqual([]);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 });
}
for(const [code,status] of [['unauthorized',401],['admin_forbidden',403],['operations_schema_unavailable',503]])test(code+' keeps privileged workspace empty',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('role','SUPER_ADMIN'));
 await page.route('**/api/admin/operations**',route=>route.fulfill({status,json:{ok:false,error:code}}));await page.goto(base+'/fa/app/admin/');
 await expect(page.locator('#ops-workspace')).toBeHidden();await expect(page.locator('#ops-cards article')).toHaveCount(0);await expect(page.locator('#ops-notice')).toHaveClass(/ops-error/);
});
test('MFA code uses session CSRF and unlocks only after server confirmation',async({page})=>{
 await authorized(page,{mfa:true});await page.goto(base+'/fa/app/admin/');await expect(page.locator('#ops-mfa-form')).toBeVisible();await expect(page.locator('#ops-workspace')).toBeHidden();
 await page.locator('#ops-mfa-code').fill('123456');await page.locator('#ops-mfa-form button').click();await expect(page.locator('#ops-workspace')).toBeVisible();await expect(page.locator('#ops-mfa-code')).toHaveValue('');
});
test('Expired MFA clears previously loaded reports',async({page})=>{
 await authorized(page,{expiry:1});await page.goto(base+'/fa/app/admin/');await expect(page.locator('#ops-workspace')).toBeVisible();await expect(page.locator('#ops-workspace')).toBeHidden({timeout:4000});await expect(page.locator('#ops-cards article')).toHaveCount(0);
});
test('Written reports use current evidence and render untrusted strings as text',async({page})=>{
 const data=fixture();data.reports[0].titleFa='<img src=x onerror=alert(1)>';await authorized(page,{data});await page.goto(base+'/fa/app/admin/');await expect(page.locator('#ops-cards article')).toHaveCount(36);await expect(page.locator('#ops-cards img')).toHaveCount(0);
 const download=page.waitForEvent('download');await page.locator('#ops-report').click();expect((await download).suggestedFilename()).toBe('operations-all.txt');
 await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement.tagName)).not.toBe('BODY');
});
