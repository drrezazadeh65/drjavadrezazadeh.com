const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const pages=[
 ['FA Golden Talent methodology','/fa/golden-talent/ravesh-shenasi/'],
 ['EN Golden Talent methodology','/en/golden-talent/methodology/'],
 ['FA RCAS','/fa/assessments/golden-talent/start/'],
 ['EN RCAS','/en/golden-talent/assessment/'],
 ['FA BAHAR','/fa/app/student/bahar/'],
 ['EN BAHAR','/en/golden-talent/dashboard/bahar/'],
 ['FA admin','/fa/app/admin/'],
 ['EN admin','/en/account/admin/'],
 ['FA unified customer dashboard','/fa/customer-dashboard/']
];
for(const [name,path] of pages){
 test(name+' reuses the Persian mother mark and frozen luxury science palette',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const response=await page.goto(base+path);
  expect(response.status()).toBe(200);
  const mark=page.locator('img[src="/assets/images/persian-brand-symbol.png"]').first();
  await expect(mark).toBeAttached();
  const image=await mark.evaluate(el=>({loaded:el.complete,width:el.naturalWidth}));
  expect(image.loaded&&image.width>0).toBe(true);
  const token=await page.evaluate(()=>{
    const style=getComputedStyle(document.body);
    return {gold:style.getPropertyValue('--jr-sc-gold').trim(),
      ivory:style.getPropertyValue('--jr-sc-ivory').trim()};
  });
  expect(token.gold).toBe('#d4af37');
  expect(token.ivory).toBe('#f8f5e9');
  expect(await page.locator('link[href*="jr-scientific-experience-v1.css"]').count()).toBe(1);
 });
}
for(const [name,path,bahar,rcas] of [
 ['fa','/fa/golden-talent/ravesh-shenasi/','/fa/app/student/bahar/','/fa/assessments/golden-talent/start/'],
 ['en','/en/golden-talent/methodology/','/en/golden-talent/dashboard/bahar/','/en/golden-talent/assessment/']
]){
 test(name+' public methodology states scientific limitations and links to real free activities',async({page})=>{
  await page.goto(base+path);
  const region=page.locator('#scientific-readiness');
  await expect(region).toBeVisible();
  await expect(region).toContainText('PREVALIDATION');
  await expect(region.locator('.jr-sci-stage')).toHaveCount(3);
  const links=region.locator('a[href]');
  const hrefs=await links.evaluateAll(as=>as.map(a=>a.getAttribute('href')));
  expect(hrefs).toContain(bahar+'#baharWorkingPlan');
  expect(hrefs).toContain(rcas);
  for(const link of [bahar,rcas]){
    const response=await page.request.get(base+link);
    expect(response.status()).toBe(200);
  }
 });
}
test('client scientific cards remain informational, never personal assessment records',async({page})=>{
 await page.goto(base+'/fa/customer-dashboard/');
 const cards=page.locator('[data-scientific-pathway="preview"] .jr-sci-stage');
 await expect(cards).toHaveCount(3);
 const section=page.locator('[data-scientific-pathway="preview"]');
 await expect(section).toContainText('PREVALIDATION');
 await expect(section).not.toContainText('95%');
 const links=await section.locator('a').evaluateAll(as=>as.map(a=>a.getAttribute('href')));
 for(const path of links){
   const response=await page.request.get(base+path);
   expect(response.status()).toBe(200);
 }
});
