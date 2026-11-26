const {test,expect}=require('@playwright/test');const base=process.env.SITE_BASE_URL||'http://127.0.0.1:4173';test.use({serviceWorkers:'block'});for(const l of ['fa','en','ar'])test('JREI interaction '+l,async({page})=>{await page.goto(base+'/'+l+'/jrei/');await expect(page.locator('.jx-scene')).toBeVisible();await expect(page.locator('[data-jx-domain]')).toHaveCount(30);await expect(page.locator('[data-jx-toolbar]')).toBeVisible();await page.locator('[data-jx-filter="1"]').click();await expect(page.locator('[data-jx-domain]:visible')).toHaveCount(5);await page.locator('[data-jx-search]').fill('zzzzzzzzzzz');await expect(page.locator('[data-jx-domain]:visible')).toHaveCount(0);await page.locator('[data-jx-search]').fill('');await page.locator('[data-jx-filter="-1"]').click();await expect(page.locator('[data-jx-domain]:visible')).toHaveCount(30);for(const width of [280,390,768,1440,1920]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);}await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.jx-scene').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');await page.goto(base+'/'+l+'/jrei/order/#agents');await expect(page.locator('#agents')).toBeVisible();await expect(page.locator('[data-jx-search]')).toBeVisible();await page.goto(base+'/'+l+'/jrei-academic/');await expect(page.locator('.jx-nav')).toBeVisible();await expect(page.locator('.notice')).toBeVisible();});
for(const l of ['fa','en','ar'])test('scenario studio and honest labels '+l,async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/'+l+'/jrei/');
 const studio=page.locator('[data-jx-studio]');
 await expect(studio.locator('.jx-case')).toHaveCount(5);
 await expect(studio.locator('.jx-case[open]')).toHaveCount(1);
 await studio.locator('.jx-case summary').nth(1).click();
 await expect(studio.locator('.jx-case[open]')).toHaveCount(1);
 await expect(studio.locator('.jx-case').nth(1).locator('.jx-pipeline li')).toHaveCount(3);
 await expect(studio.locator('.jx-case').nth(1).locator('.jx-case-link')).toHaveAttribute('href','/'+l+'/jrei/catalog/research/');
 await expect(studio.locator('.jx-studio-disclaimer')).toBeVisible();
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await studio.locator('.jx-case[open] .jx-case-content').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 for(const route of ['jrei-academic/','forge/','jrei/seo/']){
  await page.goto(base+'/'+l+'/'+route);
  await expect(page.locator('[data-jx-studio] .jx-case')).toHaveCount(1);
  await expect(page.locator('.notice')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 }
 await page.goto(base+'/'+l+'/jrei/catalog/research/');
 await expect(page.locator('body')).toHaveAttribute('data-jx-theme','domain-1');
});
