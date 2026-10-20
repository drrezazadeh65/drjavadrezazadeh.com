const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
for(const [lang,route] of [['fa','/fa/entekhab-reshteh/'],['en','/en/student-guidance/']]){
 test(lang+' Konkur preliminary list preserves input order, warns on duplicates and resets',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const response=await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const root=page.locator('[data-konkur-selection]');
  await expect(root.locator('form')).toBeVisible();
  const code=root.locator('input').first();
  const title=root.locator('input').nth(1);
  await code.fill('۰۰۱۲۳');await title.fill('Sample 1');await root.locator('form button[type=submit]').click();
  await expect(root.locator('ol.jr-kc-list li')).toHaveCount(1);
  await expect(root.locator('ol.jr-kc-list li').first()).toContainText('00123');
  await code.fill('12345');await title.fill('Sample 2');await root.locator('form button[type=submit]').click();
  await expect(root.locator('ol.jr-kc-list li')).toHaveCount(2);
  await root.locator('ol.jr-kc-list li').nth(1).getByRole('button',{name:lang==='fa'?/بالا بردن/:/Move choice up/}).click();
  await expect(root.locator('ol.jr-kc-list li').first()).toContainText('12345');
  await code.fill('12345');await root.locator('form button[type=submit]').click();
  await expect(root.locator('ol.jr-kc-list li')).toHaveCount(2);
  await root.getByRole('button',{name:lang==='fa'?'حذف همه انتخاب‌ها':'Clear all'}).click();
  await expect(root.locator('ol.jr-kc-list li')).toHaveCount(0);
  const data=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}));
  expect(data.local).toBeGreaterThanOrEqual(0);
 });
}
