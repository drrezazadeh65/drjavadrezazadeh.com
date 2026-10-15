const {test,expect}=require('@playwright/test');
const registry=require('../api/internal/operations-registry.json');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const schema={
 ok:true,schema:'scientific-structural-preflight-v1',
 readOnly:true,adminMfaRequired:true,inspection:'TABLE_AND_COLUMN_PROJECTIONS_ONLY',
 personalRowsRead:false,realProductionCertified:false,operationalWriteApproved:false,
 modules:{
  consent_guardian:{columnProjectionReady:true,requiredTables:4,incompatibleTables:[]},
  assessment:{columnProjectionReady:false,requiredTables:8,incompatibleTables:['eco_score_runs']},
  bahar:{columnProjectionReady:false,requiredTables:5,incompatibleTables:['eco_bahar_reviews']}
 }
};
function fixture(){
 const wrap=r=>({...r,measuredProgress:null,status:'not_started',closed:false,
   openDependencies:r.dependencies,openWork:Object.values(r.gates),
   currentBlocker:null,verifiedGates:Object.entries(r.gates).map(([id,label])=>({
     id,label,state:'unknown',evidence:null
   }))});
 return {ok:true,schema:'operations-live-v1',version:'4.4.1',releaseSha:'a'.repeat(40),
  checkedAt:Math.floor(Date.now()/1000),reports:registry.reports.map(wrap),
  dashboard:wrap(registry.dashboard),sourceSections:registry.sourceSections,
  summary:{total:36,verified:0,measuredCoverage:0,measuredProgress:null},history:[]};
}
async function loginFixture(page){
 await page.route('**/api/admin/operations**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path.endsWith('/session'))
    return route.fulfill({json:{ok:true,mfaRequired:false,
      csrfToken:'c'.repeat(64),mfaExpiresIn:600}});
  return route.fulfill({json:fixture()});
 });
}
for(const [lang,path] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 test(lang+' scientific DB panel only loads when MFA workspace is open',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await loginFixture(page);
  let calls=0;
  await page.route('**/api/admin/operations/scientific/schema-readiness',route=>{
   calls++;
   return route.fulfill({json:schema});
  });
  await page.goto(base+path);
  await expect(page.locator('#ops-workspace')).toBeVisible();
  const panel=page.locator('#ops-scientific-schema');
  await expect(panel).toBeVisible();
  expect(calls).toBe(0);
  await panel.locator('summary').click();
  await expect(panel.locator('[data-scientific-schema-results] .ops-card')).toHaveCount(3);
  expect(calls).toBe(1);
  const output=await panel.locator('[data-scientific-schema-results]').innerText();
  expect(output).toContain('eco_score_runs');
  expect(output).not.toContain('SENTINEL_PRIVATE_LEARNER');
  await panel.locator('[data-scientific-schema-refresh]').click();
  await expect.poll(()=>calls).toBe(2);
  await expect(panel.locator('[data-scientific-schema-results] .ops-card')).toHaveCount(3);
  await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=true;});
  await expect(panel).toHaveCount(1);
  await expect(panel).not.toHaveAttribute('open');
  await expect(panel.locator('[data-scientific-schema-results] .ops-card')).toHaveCount(0);
 });
}
test('MFA denial never shows stale scientific schema readiness',async({page})=>{
 await loginFixture(page);
 await page.route('**/api/admin/operations/scientific/schema-readiness',
   route=>route.fulfill({status:403,json:{ok:false,error:'admin_mfa_required'}}));
 await page.goto(base+'/en/account/admin/');
 await expect(page.locator('#ops-workspace')).toBeVisible();
 const panel=page.locator('#ops-scientific-schema');
 await panel.locator('summary').click();
 await expect(panel.locator('[data-scientific-schema-status]')).toContainText('expired');
 await expect(panel.locator('[data-scientific-schema-results] .ops-card')).toHaveCount(0);
});
test('Untrusted status or malformed table names never render as a success',async({page})=>{
 await loginFixture(page);
 await page.route('**/api/admin/operations/scientific/schema-readiness',
   route=>route.fulfill({json:{
    ...schema,realProductionCertified:true,
    modules:{...schema.modules,assessment:{
     columnProjectionReady:true,requiredTables:8,
     incompatibleTables:['eco_<img onerror=alert(1)>']
    }}
   }}));
 await page.goto(base+'/fa/app/admin/');
 await expect(page.locator('#ops-workspace')).toBeVisible();
 const panel=page.locator('#ops-scientific-schema');
 await panel.locator('summary').click();
 await expect(panel.locator('[data-scientific-schema-results] .ops-card')).toHaveCount(0);
 await expect(panel.locator('[data-scientific-schema-status]')).toContainText('در دسترس نیست');
 await expect(page.locator('img[src="x"]')).toHaveCount(0);
});
