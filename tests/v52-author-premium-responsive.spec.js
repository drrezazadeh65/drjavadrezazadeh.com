/* Playwright evidence for the actual bilingual author-page redesign.
 * Runs locally against checked-out source, never assumes it is live on Bertina.
 */
import {test,expect} from '@playwright/test';
const ORIGIN='http://127.0.0.1:4173';
for(const locale of ['fa','en']){
 for(const width of [320,390,430,768,1024,1440]){
  test(`v5.2 ${locale} author branded responsive page at ${width}px`,async({browser})=>{
   const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1});
   const page=await context.newPage();
   const response=await page.goto(ORIGIN+'/'+locale+'/shop/authors/mehrab-mirkarimi/',{waitUntil:'domcontentloaded'});
   expect(response?.status()).toBe(200);
   const body=page.locator('body.jp-pub-v52');
   await expect(body).toBeVisible();
   await expect(page.locator('.jp-breadcrumb')).toBeVisible();
   await expect(page.locator('.jp-section-index')).toBeVisible();
   const image=page.locator('.jp-cover-feature img').first();
   await expect(image).toBeVisible();
   await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth>0)).toBeTruthy();
   const visual=await page.evaluate(()=>({
     docWidth:document.documentElement.scrollWidth,
     viewport:innerWidth,
     dark:getComputedStyle(document.body).backgroundColor,
     css:!![...document.styleSheets].some(sheet=>sheet.href?.includes('jr-author-premium-v52.css')),
     heroChildren:(document.querySelector('.jp-hero-grid,.jp-en-hero .jp-container')?.children.length)||0
   }));
   expect(visual.docWidth).toBeLessThanOrEqual(visual.viewport+2);
   expect(visual.css).toBe(true);
   expect(visual.heroChildren).toBeGreaterThanOrEqual(2);
   if(width<=700)await expect(page.locator('.jp-app-dock')).toBeVisible();
   else await expect(page.locator('.jp-app-dock')).toBeHidden();
   await context.close();
  });
 }
}
test('v5.2 Persian product does not expose payment without rights and live readiness',async({page})=>{
 await page.goto(ORIGIN+'/fa/shop/authors/mehrab-mirkarimi/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#jp-digital-checkout-form')).toBeHidden();
 await expect(page.locator('.jp-section-index a[href="#purchase"]')).toHaveCount(1);
 await expect(page.locator('a[href$=".pdf"]')).toHaveCount(0);
});
