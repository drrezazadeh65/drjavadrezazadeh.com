const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
for(const [lang,route] of [
 ['fa','/fa/app/student/bahar/'],
 ['en','/en/golden-talent/dashboard/bahar/']
]){
 test('BAHAR bilingual real browser, seven-day notes, evidence gaps and no storage · '+lang,async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const outgoing=[];const errors=[];
  page.on('request',r=>{if(r.method()!=='GET')outgoing.push(r.url());});
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-bahar-week-day]')).toHaveCount(7);
  await expect(page.locator('[data-bahar-plan-form] textarea[name="goal"]')).toBeVisible();
  await page.locator('[data-bahar-plan-form] textarea[name="goal"]').fill('A low-stakes learning goal');
  await page.locator('[data-bahar-plan-form] textarea[name="week-1-tried"]').fill('Tried a practice task');
  await page.locator('[data-bahar-plan-form] button[type="submit"]').click();
  await expect(page.locator('[data-bahar-plan-result]')).toBeVisible();
  await expect(page.locator('[data-bahar-review-gaps]')).toBeVisible();
  const text=await page.locator('[data-bahar-review-gaps]').innerText();
  expect(text.length).toBeGreaterThan(80);
  const overflow=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-window.innerWidth);
  expect(overflow,route+' horizontal overflow').toBeLessThanOrEqual(1);
  expect(errors,route+' JS page exceptions').toEqual([]);
  expect(outgoing,route+' must not upload anonymous worksheet entries').toEqual([]);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-bahar-plan-form] textarea[name="goal"]')).toHaveValue('');
  await expect(page.locator('[data-bahar-plan-result]')).toBeHidden();
 });
}
test('English Golden Talent evidence mapper cautions against single-source certainty',async({page})=>{
 await page.goto(base+'/en/golden-talent/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-gt-evidence-form] textarea[name="question"]').fill('What helps me learn?');
 await page.locator('[data-gt-evidence-form] button[type="submit"]').click();
 await expect(page.locator('[data-gt-evidence-summary]')).toBeVisible();
 await expect(page.locator('.jr-gt-summary-warning').first()).toBeVisible();
 await expect(page.locator('[data-gt-evidence-summary]')).toContainText(/source|evidence|observation/i);
});
for(const [lang,route] of [
 ['fa','/fa/shop/authors/mehrab-mirkarimi/'],
 ['en','/en/shop/authors/mehrab-mirkarimi/']
]){
 test('Mirkarimi bilingual checkout fails closed without a bank-ready offer · '+lang,async({page})=>{
  const posted=[];
  await page.route('**/api/publishing/offer',r=>r.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({ok:true,available:false,checkoutEnabled:false,
    sku:'digital:tefl-ma-exams-1370-1405',priceToman:1000000})
  }));
  page.on('request',r=>{if(r.method()==='POST')posted.push(r.url());});
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#jp-checkout-state')).toBeVisible();
  await expect(page.locator('#jp-digital-checkout-form')).toBeHidden();
  await expect(page.locator('#jp-pay-now')).toBeDisabled();
  expect(posted).toEqual([]);
 });
 test('Mirkarimi bilingual checkout enables only verified SKU and prevents uncertain double charge · '+lang,async({page})=>{
  let orders=0;
  await page.route('**/api/publishing/offer',r=>r.fulfill({
   status:200,contentType:'application/json',
   body:JSON.stringify({ok:true,available:true,checkoutEnabled:true,
    sku:'digital:tefl-ma-exams-1370-1405',priceToman:1000000})
  }));
  await page.route('**/api/commerce/create',async r=>{
   orders++;
   await r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'unknown'})});
  });
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#jp-digital-checkout-form')).toBeVisible();
  await expect(page.locator('#jp-pay-now')).toBeEnabled();
  await page.locator('#jp-buyer-name').fill('Quality Audit Buyer');
  await page.locator('#jp-buyer-email').fill('audit@example.invalid');
  await page.locator('#jp-pay-now').click();
  await expect(page.locator('#jp-pay-now')).toBeDisabled();
  await expect(page.locator('#jp-checkout-state')).toContainText(lang==='en'?'uncertain':'نامشخص');
  expect(orders).toBe(1);
 });
}
