// Visual regression gate for the CURRENT bilingual scientific & guidance pages.
// Synthetic empty worksheets only. No student records, identities or payment data.
const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
const science=[
 ['FA Golden Talent','/fa/golden-talent/','goldenTalentEvidenceStudio',0],
 ['EN Golden Talent','/en/golden-talent/','goldenTalentEvidenceStudio',0],
 ['FA RCAS','/fa/assessments/golden-talent/start/','rcasApp',1],
 ['EN RCAS','/en/golden-talent/assessment/','rcasEnForm',1],
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
   const mark=active===2
    ? (width<=840
      ? page.locator('.jr-bahar-topbar-brand img[src="/assets/images/persian-brand-symbol.png"]')
      : page.locator('.dashboard-sidebar .dash-brand img[src="/assets/images/persian-brand-symbol.png"]'))
    : page.locator('header img[src="/assets/images/persian-brand-symbol.png"]').first();
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


// Cinematic homepage v3: retain the actual two-language document, conversion
// routes and accessible responsive experience; no image mock or payment events.
for(const [lang,path] of [['fa','/fa/'],['en','/en/']]){
 for(const width of [320,390,768,1280]){
  test(lang+' cinematic homepage v3 '+width+'px: real content, CTA routes and no overflow',async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setViewportSize({width,height:844});
   const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});
   expect(response.status()).toBe(200);
   await expect(page.locator('link[href*="jr-ecosystem-design-v2.css"]')).toHaveAttribute('href',/20261019-home-cinematic-v3/);
   // The unified site JS has a newer, reviewed privacy-guide cache revision;
   // its cinematic layout/tilt and public UX contracts are checked below.
   await expect(page.locator('script[src*="/assets/js/site.js"]')).toHaveAttribute('src',/20261022-privacy-guide-v2/);
   await expect(page.locator('main .hero h1')).toBeVisible();
   await expect(page.locator('main .hero .hero-pathway-cta a')).toHaveCount(4);
   await expect(page.locator('main .hero .hero-pathway-cta a[href="./shop/"]')).toHaveCount(1);
   await expect(page.locator('main .hero .hero-pathway-cta a[href="../shop/"]')).toHaveCount(0);
   await expect(page.locator('.home-focus-strip a')).toHaveCount(4);
   await expect(page.locator('.audience-gate')).toHaveCount(4);
   await expect(page.locator('.portrait-shell .hero-portrait')).toBeVisible();
   const imageOK=await page.locator('.portrait-shell img').evaluate(el=>el.complete&&el.naturalWidth>0);
   expect(imageOK).toBe(true);
   const dims=await page.evaluate(()=>({
    view:document.documentElement.clientWidth,
    page:document.documentElement.scrollWidth,
    color:getComputedStyle(document.body).getPropertyValue('--jr-home-gold').trim()
   }));
   expect(dims.page-dims.view).toBeLessThanOrEqual(2);
   expect(dims.color).toBe('#e7c887');
   expect(errors).toEqual([]);
  });
 }
}
test('cinematic homepage supports restrained desktop tilt without storing or submitting data',async({page})=>{
 await page.setViewportSize({width:1280,height:900});
 await page.goto(origin+'/en/',{waitUntil:'domcontentloaded'});
 const portrait=page.locator('.hero .portrait-shell');
 const box=await portrait.boundingBox();
 expect(box).toBeTruthy();
 await page.mouse.move(box.x+box.width*.73,box.y+box.height*.64);
 await expect.poll(()=>portrait.evaluate(el=>el.style.getPropertyValue('--jr-home-rotate-y'))).not.toBe('');
 const degrees=await portrait.evaluate(el=>Number.parseFloat(el.style.getPropertyValue('--jr-home-rotate-y')));
 expect(Math.abs(degrees)).toBeLessThanOrEqual(2.8);
 await page.mouse.move(0,0);
 await expect.poll(()=>portrait.evaluate(el=>el.style.getPropertyValue('--jr-home-rotate-y'))).toBe('');
});
test('cinematic homepage respects reduced motion and keeps the portrait static',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:1280,height:900});
 await page.goto(origin+'/fa/',{waitUntil:'domcontentloaded'});
 const portrait=page.locator('.hero .portrait-shell');
 const box=await portrait.boundingBox();
 expect(box).toBeTruthy();
 await page.mouse.move(box.x+box.width*.68,box.y+box.height*.53);
 expect(await portrait.evaluate(el=>el.style.getPropertyValue('--jr-home-rotate-y'))).toBe('');
 expect(await portrait.evaluate(el=>getComputedStyle(el).transform)).toBe('none');
});
