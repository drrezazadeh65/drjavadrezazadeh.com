const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
for(const [locale,url] of [['fa','/fa/entekhab-reshteh/'],['en','/en/student-guidance/']]){
 test(locale+' official explorer accepts only reviewed source-page records, never claims candidate admission',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  let mode='pending';const requests=[];
  await page.route('**/api/konkur/programmes?*',async route=>{
   const req=route.request(),url=new URL(req.url());requests.push({method:req.method(),url:req.url()});
   const base={ok:true,year:1405,eligibilityAssessment:'NOT_PERFORMED',admissionProbabilityEnabled:false,officialApplicationSubmitted:false,page:1,limit:20,records:[]};
   const records=[{year:1405,programmeCode:'00123',programme:'SYNTHETIC—not real',university:'SYNTHETIC institution',city:'Fixture',sourceDocument:'SYNTHETIC_DOCUMENT',sourceRevision:1,sourcePdfPage:12,eligibilityStatus:'NOT_ASSESSED',officialRegistration:false}];
   const answer=mode==='pending'?{...base,status:'OFFICIAL_CATALOGUE_NOT_READY',sourceVerification:'PENDING'}:
    mode==='forged'?{...base,status:'NO_SOURCE_APPROVED_RECORDS',sourceVerification:'PENDING',records}:
    {...base,status:'SOURCE_REVIEWED_CATALOGUE',sourceVerification:'HUMAN_REVIEWED',records};
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(answer)});
  });
  await page.goto('http://127.0.0.1:4173'+url,{waitUntil:'domcontentloaded'});
  const block=page.locator('[data-konkur-selection] .jr-kc-official-explorer');
  await expect(block).toBeVisible();
  await block.locator('form').evaluate(f=>f.requestSubmit());
  await expect(block.locator('.jr-kc-catalogue-results li')).toHaveCount(0);
  await expect(block.locator('.jr-kc-catalogue-status')).toContainText(locale==='fa'?'هنوز':'unavailable');
  mode='forged';await block.locator('form').evaluate(f=>f.requestSubmit());
  await expect(block.locator('.jr-kc-catalogue-results li')).toHaveCount(0);
  mode='reviewed';await block.locator('form').evaluate(f=>f.requestSubmit());
  await expect(block.locator('.jr-kc-catalogue-results li')).toHaveCount(1);
  await expect(block.locator('.jr-kc-catalogue-results li')).toContainText('SYNTHETIC_DOCUMENT');
  await expect(block.locator('.jr-kc-catalogue-results li')).toContainText('12');
  await block.locator('.jr-kc-catalogue-results li button').click();
  await expect(page.locator('[data-konkur-selection] .jr-kc-form input').first()).toHaveValue('00123');
  await expect(page.locator('[data-konkur-selection] .jr-kc-list li')).toHaveCount(0);
  expect(requests.length).toBe(3);
  for(const r of requests){expect(r.method).toBe('GET');expect(new URL(r.url).searchParams.get('year')).toBe('1405');}
 });
}
