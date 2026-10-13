const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const entries=[['fa','/fa/golden-talent/roles/parent/'],['en','/en/golden-talent/roles/parent/']];
for(const [locale,path] of entries){
 test('BAHAR '+locale+' guardian requires explicit action and safely shows coverage only',async({page})=>{
  let requests=0;
  await page.route('**/api/golden-talent/my-bahar-overview',async route=>{
   requests++;
   expect(route.request().method()).toBe('GET');
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,service:'golden-talent',schema:'bahar-guardian-overview-v1',
    scope:'verified_guardian_assessment_and_parent_visibility',
    rawEvidenceExposed:false,interpretationsExposed:false,
    learners:[
     {learnerAlias:'<img src=x onerror=alert(1)>',portfolioCount:2,weeklyCycleCount:3,humanReviewedCycleCount:1}
    ]
   })});
  });
  await page.goto(base+path);
  const result=page.locator('[data-bahar-guardian-result]');
  await expect(result).toBeEmpty();
  expect(requests).toBe(0,'No automatic request for private learner data');
  await page.locator('[data-bahar-guardian-check]').click();
  await expect(result).toContainText('2');
  await expect(result).toContainText('3');
  await expect(result).toContainText('1');
  await expect(result).toContainText('<img src=x onerror=alert(1)>');
  await expect(result.locator('img')).toHaveCount(0);
  expect(requests).toBe(1);
  await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:true});
   document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(result).toBeEmpty();
 });
 test('BAHAR '+locale+' rejects unauthenticated and unavailable lookups',async({page})=>{
  await page.route('**/api/golden-talent/my-bahar-overview',route=>
   route.fulfill({status:401,contentType:'application/json',body:'{"ok":false,"error":"unauthorized"}'}));
  await page.goto(base+path);
  await page.locator('[data-bahar-guardian-check]').click();
  const result=page.locator('[data-bahar-guardian-result]');
  await expect(result.locator('a[href$="/login/"]')).toHaveCount(1);
  await page.unroute('**/api/golden-talent/my-bahar-overview');
  await page.route('**/api/golden-talent/my-bahar-overview',route=>
   route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));
  await page.locator('[data-bahar-guardian-check]').click();
  await expect(result).toContainText(locale==='fa'?'موفق نبود':'unavailable');
  await expect(result.locator('ul')).toHaveCount(0);
 });
}
