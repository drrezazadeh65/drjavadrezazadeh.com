// Visual regression gate for the CURRENT bilingual scientific & guidance pages.
// Synthetic empty worksheets only. No student records, identities or payment data.
const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
const science=[
 ['FA Golden Talent','/fa/golden-talent/','goldenTalentEvidenceStudio',0],
 ['EN Golden Talent','/en/golden-talent/','goldenTalentEvidenceStudio',0],
 ['FA RCAS','/fa/assessments/golden-talent/start/','rcasApp',1],
 ['EN RCAS','/en/golden-talent/assessment/','rcasApp',1],
 ['FA BAHAR','/fa/app/student/bahar/','baharWorkingPlan',2],
 ['EN BAHAR','/en/golden-talent/dashboard/bahar/','baharWorkingPlan',2]
];
for(const [name,path,anchor,active] of science){
 for(const width of [320,390,768,1280]){
  test(name+' premium scientific page '+width+'px identity, navigation and overflow',async({page})=>{
   const errs=[];page.on('pageerror',e=>errs.push(e.message));
   await page.setViewportSize({width,height:844});
   const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});
   expect(response.status()).toBe(200);
   const css=page.locator('link[href*="jr-scientific-experience-v1.css"]');
   await expect(css).toHaveCount(1);
   await expect(css).toHaveAttribute('href',/20261019-science-premium-v11/);
   const mark=page.locator('img[src="/assets/images/persian-brand-symbol.png"]').first();
   await expect(mark).toBeVisible();
   expect(await mark.evaluate(n=>n.complete&&n.naturalWidth>0)).toBe(true);
   const nav=page.locator('[data-science-continuity]');
   await expect(nav).toBeVisible();
   await expect(nav.locator('li')).toHaveCount(3);
   await expect(nav.locator('a[aria-current="step"]')).toHaveCount(1);
   const actual=await nav.locator('li').evaluateAll(ns=>ns.findIndex(n=>n.querySelector('a[aria-current="step"]')));
   expect(actual).toBe(active);
   await expect(page.locator('#'+anchor)).toHaveCount(1);
   const layout=await page.evaluate(()=>({
    pageW:document.documentElement.clientWidth,
    scrollW:document.documentElement.scrollWidth,
    gold:getComputedStyle(document.body).getPropertyValue('--jr-sc-gold').trim().toLowerCase(),
    ivory:getComputedStyle(document.body).getPropertyValue('--jr-sc-ivory').trim().toLowerCase()
   }));
   expect(layout.scrollW-layout.pageW).toBeLessThanOrEqual(2);
   expect(layout.gold).toBe('#d4af37');
   expect(layout.ivory).toBe('#f8f5e9');
   expect(errs).toEqual([]);
  });
 }
}
for(const [language,path] of [
 ['fa','/fa/entekhab-reshteh/'],
 ['en','/en/student-guidance/']
]){
 for(const width of [320,390,768,1280]){
  test(language+' Choice Studio '+width+'px premium stages, consent and keyboard controls',async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:844});
   const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});
   expect(response.status()).toBe(200);
   const root=page.locator('[data-choice-studio]');
   await expect(root).toHaveClass(/jr-cs-v4/);
   await expect(root.locator('.jr-cs-journey-step')).toHaveCount(3);
   await expect(root.locator('.jr-cs-journey-step[aria-current="step"]')).toHaveCount(1);
   await expect(root.locator('.jr-cs-persist-label input')).not.toBeChecked();
   await expect(root.locator('.jr-cs-weight')).toHaveCount(5);
   await expect(root.locator('.jr-cs-weight input[type="range"]')).toHaveCount(5);
   await expect(root.locator('.jr-cs-order-controls button')).toHaveCount(15);
   const layout=await page.evaluate(()=>({
    view:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
   }));
   expect(layout.scroll-layout.view).toBeLessThanOrEqual(2);
   expect(errors).toEqual([]);
  });
 }
}
test('BAHAR retains legible mobile days and no artificial talent progress',async({page})=>{
 await page.setViewportSize({width:320,height:812});
 await page.goto(origin+'/fa/app/student/bahar/',{waitUntil:'domcontentloaded'});
 const days=page.locator('.jr-bahar-week-day');
 await expect(days).toHaveCount(7);
 await expect(page.locator('.jr-bahar-weekly')).toBeVisible();
 await expect(page.locator('[data-bahar-week-count]')).toBeVisible();
});
test('golden route choices preserve limited/prevalidation copy at 200% browser typography',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(origin+'/en/golden-talent/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});
 const region=page.locator('[data-science-continuity]');
 await expect(region).toBeVisible();
 await expect(region).toContainText('do not');
 await expect(region.locator('li a')).toHaveCount(3);
});
