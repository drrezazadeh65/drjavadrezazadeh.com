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
  await expect.poll(()=>page.evaluate(()=>Boolean(history.state?.jrMobileMenu))).toBe(false);
  await trigger.click();
  await expect(sheet).toBeVisible();
  await sheet.locator('[data-nav-close]').click();
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect.poll(()=>page.evaluate(()=>Boolean(history.state?.jrMobileMenu))).toBe(false);
  await trigger.click();
  await expect(sheet).toBeVisible();
  expect(await page.evaluate(()=>history.state?.jrMobileMenu)).toBe(true);
  await page.goBack({waitUntil:'domcontentloaded'});
  await expect(sheet).toBeHidden();
  expect(errors).toEqual([]);
 });
}

for(const locale of ['fa','en']){
 test(locale+' desktop dropdowns are mutually exclusive and dismissible',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4173/'+locale+'/');
  const groups=page.locator('.site-header .home-nav-group');
  await expect(groups).toHaveCount(2);
  await groups.nth(0).locator('summary').click();
  await expect(groups.nth(0)).toHaveAttribute('open','');
  await groups.nth(1).locator('summary').click();
  await expect(groups.nth(1)).toHaveAttribute('open','');
  await expect(groups.nth(0)).not.toHaveAttribute('open','');
  await page.keyboard.press('Escape');
  await expect(groups.nth(1)).not.toHaveAttribute('open','');
  await expect(groups.nth(1).locator('summary')).toBeFocused();
  await groups.nth(0).locator('summary').click();
  await page.locator('main').click({position:{x:10,y:10}});
  await expect(groups.nth(0)).not.toHaveAttribute('open','');
  expect(errors).toEqual([]);
 });
}

for(const locale of ['fa','en']){
 test(locale+' mobile menu link navigates without returning to previous page',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/'+locale+'/');
  await page.locator('.site-header [data-nav-toggle]').click();
  const link=page.locator('#mobile-app-menu a[href]').first();
  const destination=await link.evaluate(a=>new URL(a.href,location.href).pathname);
  await link.click();
  await expect.poll(()=>new URL(page.url()).pathname).toBe(destination);
  await expect(page.locator('#mobile-app-menu')).toBeHidden();
 });
}
