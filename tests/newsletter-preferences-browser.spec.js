const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:4173';
test.use({serviceWorkers:'block'});
const csrf='a'.repeat(64);
for(const [lang,path] of [['fa','/fa/customer-dashboard/'],['en','/en/account/']]){
 test(lang+' newsletter opt-in and full topic withdrawal are authenticated, explicit and usable',async({page})=>{
  const sent=[];
  await page.route('**/api/newsletter/health',route=>route.fulfill({json:{ok:true,service:'verified-account-newsletter',ready:true,deliveryVerified:false}}));
  await page.route('**/api/newsletter/preferences',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:{
    ok:true,schema:'newsletter-preferences-v1',topics:['ARTICLES','BOOKS','EVENTS','SERVICES','GOLDEN_TALENT','JHELA'],
    selected:['ARTICLES'],consentVersion:'newsletter-v1',emailVerified:true,deliveryActive:false,csrfToken:csrf}});
   sent.push({body:route.request().postDataJSON(),csrf:route.request().headers()['x-jr-newsletter-csrf']});
   return route.fulfill({json:{ok:true,schema:'newsletter-preferences-v1',selected:sent.at(-1).body.topics,
      changedTopics:1,subscribedEmailDeliveryVerified:false}});
  });
  await page.goto(base+path,{waitUntil:'domcontentloaded'});
  await page.locator('a[data-section="account"]').first().click();
  const panel=page.locator('[data-jr-newsletter]');
  await expect(panel).toBeVisible({timeout:12000});
  await expect(panel).toContainText(lang==='fa'?'خبرنامه':'newsletter');
  await expect(panel).toContainText(lang==='fa'?'هنوز در این سرور تأیید نشده':'not yet verified');
  await panel.locator('input[value="ARTICLES"]').uncheck();
  await panel.locator('.jr-newsletter-save').click();
  await expect.poll(()=>sent.length).toBe(1);
  expect(sent[0].body.topics).toEqual([]);
  expect(sent[0].body.consentGiven).toBe(false);
  expect(sent[0].csrf).toBe(csrf);
  await panel.locator('input[value="JHELA"]').check();
  await panel.locator('.jr-newsletter-check input').nth(0).check();
  await panel.locator('.jr-newsletter-check input').nth(1).check();
  await panel.locator('.jr-newsletter-save').click();
  await expect.poll(()=>sent.length).toBe(2);
  expect(sent[1].body.topics).toEqual(['JHELA']);
  expect(sent[1].body.locale).toBe(lang);
  expect(sent[1].body.consentGiven).toBe(true);
  expect(sent[1].body.adultConfirmed).toBe(true);
  expect(sent[1].csrf).toBe(csrf);
 });
}
test('No verified database means newsletter is not shown as an inactive public product',async({page})=>{
 await page.route('**/api/newsletter/health',route=>route.fulfill({json:{ok:true,ready:false,deliveryVerified:false}}));
 await page.goto(base+'/en/account/',{waitUntil:'domcontentloaded'});
 await page.locator('a[data-section="account"]').first().click();
 await expect(page.locator('[data-jr-newsletter]')).toBeHidden();
 await expect(page.locator('[data-jr-newsletter] button')).toHaveCount(0);
});
test('A guest or unverified account gets no newsletter settings or preselected marketing consent',async({page})=>{
 await page.route('**/api/newsletter/health',route=>route.fulfill({json:{ok:true,ready:true}}));
 await page.route('**/api/newsletter/preferences',route=>route.fulfill({status:401,json:{ok:false,error:'verified_account_required'}}));
 await page.goto(base+'/fa/customer-dashboard/',{waitUntil:'domcontentloaded'});
 await page.locator('a[data-section="account"]').first().click();
 await expect(page.locator('[data-jr-newsletter]')).toBeHidden();
});
