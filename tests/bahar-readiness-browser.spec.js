const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const readyData={
 ok:true,service:'golden-talent',
 baharContinuity:'NOT_LIVE',
 baharReadiness:{
  bertinaMysqlSchemaColumnsAvailable:true,
  weeklyCycleAndEvidenceApiActive:false,
  consentScopedPortfolioAccessActive:false,
  professionalReviewApiActive:false,
  longitudinalTrendValidated:false,
  requiresHumanReview:true
 }
};
for(const [lang,path] of [
 ['fa','/fa/app/student/bahar/'],
 ['en','/en/golden-talent/dashboard/bahar/']
]){
 test('BAHAR '+lang+' shows genuine schema and disabled private capabilities',async({page})=>{
  let method=null;
  await page.route('**/api/golden-talent/health',async route=>{
   method=route.request().method();
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(readyData)});
  });
  await page.goto(base+path);
  await expect(page.locator('[data-bahar-health]')).toBeVisible();
  await expect(page.locator('[data-bahar-result]')).toBeEmpty();
  await page.locator('[data-bahar-check]').click();
  const result=page.locator('[data-bahar-result]');
  await expect(result.locator('dd')).toHaveCount(5);
  await expect(result).toContainText(lang==='fa'?'هنوز تأیید نشده':'Not verified');
  await expect(result).toContainText(lang==='fa'?'هنوز نیازمند آزمون پذیرش':'acceptance testing');
  expect(method).toBe('GET');
  await page.evaluate(()=>Object.defineProperty(document,'hidden',{value:true,configurable:true}));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect(result).toBeEmpty();
 });
}
test('BAHAR fails closed if health API is unavailable',async({page})=>{
 await page.route('**/api/golden-talent/health',route=>route.fulfill({status:503,contentType:'application/json',body:'{"ok":false}'}));
 await page.goto(base+'/fa/app/student/bahar/');
 await page.locator('[data-bahar-check]').click();
 await expect(page.locator('[data-bahar-result]')).toContainText('قابل تأیید نیست');
 await expect(page.locator('[data-bahar-result] dd')).toHaveCount(0);
});
