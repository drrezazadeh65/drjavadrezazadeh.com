const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
for(const [lang,urls] of Object.entries({
 fa:{home:'/fa/golden-talent/',rcas:'/fa/assessments/golden-talent/start/',bahar:'/fa/app/student/bahar/',dashboard:'/fa/app/student/',plans:'/fa/shop/golden-talent/'},
 en:{home:'/en/golden-talent/',rcas:'/en/golden-talent/assessment/',bahar:'/en/golden-talent/dashboard/bahar/',dashboard:'/en/golden-talent/dashboard/',plans:'/en/golden-talent/plans/'}
})){
 for(const route of ['home','rcas','bahar']){
  test(lang+' '+route+' navigation is visible, keyboard-accessible, non-writing and correctly routed',async({page})=>{
   const errors=[],posted=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))posted.push(r.url());});
   await page.setViewportSize({width:390,height:844});
   const response=await page.goto(origin+urls[route],{waitUntil:'domcontentloaded'});
   expect(response.status()).toBe(200);
   const trigger=page.locator('.jr-sc-nav-trigger');
   await expect(trigger).toBeVisible();
   await trigger.click();
   await expect(trigger).toHaveAttribute('aria-expanded','true');
   const dialog=page.getByRole('dialog',{name:/Golden Talent|امکانات/});
   await expect(dialog).toBeVisible();
   await expect(dialog.locator('.jr-sc-nav a')).toHaveCount(12);
   await expect(dialog.locator('a[href^="'+urls.dashboard+'"]')).toHaveCount(1);
   await expect(dialog.locator('a[href^="'+urls.rcas+'"]')).toHaveCount(1);
   await expect(dialog.locator('a[href^="'+urls.bahar+'"]')).toHaveCount(1);
   await expect(dialog.locator('a[href^="'+urls.plans+'"]')).toHaveCount(1);
   await expect(dialog.locator('a[data-access="paid"]')).toHaveCount(6);
   const initial=await dialog.locator('button').first().evaluate(el=>el===document.activeElement);
   expect(initial).toBe(true);
   await page.keyboard.press('Escape');
   await expect(dialog).toBeHidden();
   await expect(trigger).toBeFocused();
   await page.setViewportSize({width:1280,height:900});
   if(route==='home')await expect(trigger).toBeVisible();
   else await expect(page.locator('.dashboard-sidebar .jr-sc-nav,.jr-sc-nav-new-sidebar .jr-sc-nav')).toBeVisible();
   const width=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(width).toBeLessThanOrEqual(2);
   expect(posted).toEqual([]);
   expect(errors).toEqual([]);
  });
 }
}
