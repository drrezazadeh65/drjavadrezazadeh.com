const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
for(const [lang,path] of [['fa','/fa/support-talented-students/'],['en','/en/support-talented-students/']]){
 test(lang+' donations never offer checkout when health fails',async({page})=>{
  let posts=0;
  await page.route('**/api/donations/**',route=>{
   if(route.request().method()==='POST')posts++;
   return route.fulfill({status:503,json:{ok:false,error:'unavailable'}});
  });
  await page.goto(base+path+'#contribute');
  const form=page.locator('[data-support-form]');
  await expect(form.locator('[type="submit"]')).toBeDisabled();
  await expect(page.locator('[data-support-status]')).toContainText(lang==='fa'?'در دسترس نیست':'unavailable');
  await form.locator('[data-support-amount="200000"]').click();
  await expect(form.locator('[type="submit"]')).toBeDisabled();
  expect(posts).toBe(0);
 });
 test(lang+' donation form verifies value and prevents duplicate unsafe retry',async({page})=>{
  let posts=0;
  await page.route('**/api/donations/health',route=>route.fulfill({json:{
   ok:true,service:'donations',checkout:true,currency:'IRT',minToman:1000,maxToman:10000000
  }}));
  await page.route('**/api/donations/create',route=>{
   posts++;
   return route.fulfill({status:503,json:{ok:false,error:'gateway_unavailable'}});
  });
  await page.goto(base+path+'#contribute');
  const form=page.locator('[data-support-form]');
  await expect(form.locator('[type="submit"]')).toBeEnabled();
  await form.locator('[name="amountToman"]').fill('10000001');
  await expect(form.locator('[type="submit"]')).toBeDisabled();
  await form.locator('[data-support-amount="200000"]').click();
  await expect(form.locator('[name="amountToman"]')).toHaveValue('200000');
  await expect(form.locator('[type="submit"]')).toBeEnabled();
  await form.locator('[type="submit"]').click();
  await expect(page.locator('[data-support-status]')).toContainText(lang==='fa'?'دوباره ثبت نکنید':'Do not resubmit');
  await expect(form.locator('[type="submit"]')).toBeDisabled();
  expect(posts).toBe(1);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 });
}
test('English support links are localised and do not contain dead public privacy path',async({page})=>{
 await page.goto(base+'/en/support-talented-students/');
 await expect(page.locator('a[href="/en/account/#student-support"]')).toHaveCount(1);
 await expect(page.locator('a[href="/en/golden-talent/student/"]')).toHaveCount(2);
 await expect(page.locator('a[href="/fa/danesh-amoozan/"]')).toHaveCount(0);
 await expect(page.locator('a[href="/en/account/privacy/"]')).toHaveCount(1);
 await expect(page.locator('a[href="/en/privacy/"]')).toHaveCount(0);
});
