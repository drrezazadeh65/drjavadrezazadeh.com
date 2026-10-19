const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const ORIGIN='http://127.0.0.1:4173';

for(const viewport of [
 {width:390,height:844,name:'mobile'},
 {width:768,height:1024,name:'tablet'},
 {width:1440,height:900,name:'desktop'}
]){
 test('v5.2 bilingual gateway '+viewport.name+' is legible, routed and has no sideways overflow',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width:viewport.width,height:viewport.height});
  const response=await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const sheet=page.locator('link[href*="gateway-premium-v52.css"]');
  await expect(sheet).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('Rezazadeh');
  await expect(page.locator('#language-entry')).toBeVisible();
  await expect(page.locator('[data-language-choice="en"]')).toBeVisible();
  await expect(page.locator('[data-language-choice="fa"]')).toBeVisible();
  const fa=page.locator('[data-language-choice="fa"]');
  await expect(fa).toHaveAttribute('href','./fa/');
  await expect(page.locator('[data-language-choice="en"]')).toHaveAttribute('href','./en/');
  await expect(page.locator('.gateway-panels article')).toHaveCount(3);
  await expect(page.locator('.gateway-panel-link')).toHaveCount(3);
  await expect(page.locator('.gateway-panel-link').nth(0)).toHaveAttribute('href','./en/research/');
  await expect(page.locator('.gateway-panel-link').nth(1)).toHaveAttribute('href','./en/golden-talent/');
  await expect(page.locator('.gateway-panel-link').nth(2)).toHaveAttribute('href','./en/services/');
  const measured=await page.evaluate(()=>{
    const root=document.documentElement;
    const h=document.querySelector('h1');
    const image=document.querySelector('.hero-portrait');
    const cta=document.querySelector('.gateway-actions .button');
    const style=getComputedStyle(cta);
    return {
      overflow:root.scrollWidth-root.clientWidth,
      titleFont:parseFloat(getComputedStyle(h).fontSize),
      ctaHeight:parseFloat(style.height),
      ctaColor:style.color,
      ctaVisible:cta.getBoundingClientRect().width>0,
      imagePresent:!!image?.getAttribute('src'),
      premiumSheet:[...document.styleSheets].some(s=>s.href?.includes('gateway-premium-v52.css'))
    };
  });
  expect(measured.overflow).toBeLessThanOrEqual(2);
  expect(measured.ctaHeight).toBeGreaterThanOrEqual(44);
  expect(measured.titleFont).toBeGreaterThanOrEqual(40);
  expect(measured.ctaVisible).toBe(true);
  expect(measured.imagePresent).toBe(true);
  expect(measured.premiumSheet).toBe(true);
  await expect(page.locator('.gateway-quote [lang="fa"]')).toBeVisible();
  await expect(page.locator('.gateway-quote [lang="en"]')).toBeVisible();
  expect(errors).toEqual([]);
 });
}

test('gateway keyboard skip link and language action retain visible focus',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
 await page.keyboard.press('Tab');
 await expect(page.locator('a.skip')).toBeFocused();
 const skipCSS=await page.locator('a.skip').evaluate(el=>getComputedStyle(el).transform);
 expect(skipCSS).toBe('none');
 const en=page.locator('[data-language-choice="en"]');
 await en.focus();
 await expect(en).toBeFocused();
 const visual=await en.evaluate(el=>({outline:getComputedStyle(el).outlineStyle}));
 expect(visual.outline).not.toBe('none');
});

test('gateway respects reduced motion without hiding navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(ORIGIN+'/',{waitUntil:'domcontentloaded'});
 const result=await page.locator('.gateway-actions .button.primary').evaluate(el=>({
   transition:getComputedStyle(el).transitionDuration,
   transform:getComputedStyle(el).transform
 }));
 expect(result.transition.split(',').every(x=>x.trim()==='0s')).toBe(true);
 await expect(page.locator('[data-language-choice="fa"]')).toBeVisible();
});
