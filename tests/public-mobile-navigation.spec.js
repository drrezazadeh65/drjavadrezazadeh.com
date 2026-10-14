const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
for(const locale of ['fa','en']){
 test(locale+' mobile menu opens once and closes accessibly',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/'+locale+'/');
  const trigger=page.locator('.site-header [data-nav-toggle]');
  const sheet=page.locator('#mobile-app-menu');
  await expect(trigger).toBeVisible();
  await expect(sheet).toBeHidden();
  await trigger.click();
  await expect(sheet).toBeVisible();
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#mobile-app-menu [data-nav-close]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(sheet).toBeVisible();
  await page.goBack({waitUntil:'domcontentloaded'}).catch(()=>{});
  await expect(sheet).toBeHidden();
  expect(errors).toEqual([]);
 });
}
