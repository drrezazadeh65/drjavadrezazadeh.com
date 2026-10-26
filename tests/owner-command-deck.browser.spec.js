import {test,expect} from '@playwright/test';

const base='http://127.0.0.1:4173';
for(const [language,route] of [
 ['fa','/fa/app/admin/'],
 ['en','/en/account/admin/']
]){
 test(language+' owner dashboard: initially MFA-gated, then compact command deck offers meaningful tabs',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.route('**/api/admin/operations**',route=>
   route.fulfill({status:401,contentType:'application/json',
    body:JSON.stringify({ok:false,error:'unauthorized'})}));
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  const workspace=page.locator('#ops-workspace');
  await expect(workspace).toBeHidden();
  await expect(page.locator('#ops-auth')).toBeVisible();
  await expect(page.locator('#ops-notice')).not.toBeEmpty();
  await expect(page.locator('#ops-command-deck')).toBeHidden();
  // Presentation-only fixture; never unlocks the actual API or sends credentials.
  await page.evaluate(()=>{
   const panel=document.getElementById('ops-workspace');
   document.getElementById('ops-auth').hidden=true;
   panel.hidden=false;
   panel.dispatchEvent(new Event('jr:operations-ready'));
  });
  await expect(page.locator('#ops-command-deck')).toBeVisible();
  await expect(page.locator('main.ops')).toHaveClass(/ops-console-layout/);
  // Real computed styles, not decorative HTML markers: the premium
  // command console must retain its layered background and contrast.
  const visual=await page.locator('#ops-command-deck').evaluate(el=>{
   const style=getComputedStyle(el);
   const crest=getComputedStyle(el.querySelector('.ops-command-crest'));
   return {background:style.backgroundImage,crest:crest.color,
     radius:parseFloat(style.borderTopLeftRadius)};
  });
  expect(visual.background).toMatch(/(?:linear|radial)-gradient/);
  expect(visual.crest).not.toBe('rgba(0, 0, 0, 0)');
  expect(visual.radius).toBeGreaterThanOrEqual(12);
  const buttons=page.locator('#ops-command-deck .ops-command-tab');
  await expect(buttons).toHaveCount(10);
  await page.locator('button[data-ops-zone="seo"]').click();
  await expect(page.locator('button[data-ops-zone="seo"]')).toHaveAttribute('aria-pressed','true');
  const modules=page.locator('#ops-command-deck .ops-command-module');
  await expect(modules.first()).toBeVisible();
  await page.locator('button[data-ops-zone="planning"]').click();
  await expect(page.locator('.ops-command-plan-board')).toBeVisible();
  await expect(page.locator('.ops-command-plan-board')).toContainText(
    language==='fa'?'کارهای باز':'recorded open work');
  await page.locator('button[data-ops-zone="overview"]').click();
  await expect(page.locator('.ops-command-engine-matrix')).toBeVisible();
  await expect(page.locator('.ops-command-signal')).toHaveAttribute('data-signal',/unknown|fresh|error|stale|offline/);
  // An explicit relock must discard any cached data and compact privileged UI.
  await page.evaluate(()=>{
   const panel=document.getElementById('ops-workspace');
   panel.dispatchEvent(new Event('jr:operations-locked'));
   panel.hidden=true;
   document.getElementById('ops-auth').hidden=false;
  });
  await expect(workspace).toBeHidden();
  await expect(page.locator('main.ops')).not.toHaveClass(/ops-console-layout/);
 });
 test(language+' owner mobile workspace remains single-column and navigation stays reachable',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('**/api/admin/operations**',route=>
   route.fulfill({status:401,contentType:'application/json',
    body:JSON.stringify({ok:false,error:'unauthorized'})}));
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('#ops-auth')).toBeVisible();
  await expect(page.locator('#ops-notice')).not.toBeEmpty();
  await page.evaluate(()=>{
   document.getElementById('ops-auth').hidden=true;
   const panel=document.getElementById('ops-workspace');
   panel.hidden=false;panel.dispatchEvent(new Event('jr:operations-ready'));
  });
  await expect(page.locator('#ops-command-deck .ops-command-tab').first()).toBeVisible();
  await expect(page.locator('#ops-command-deck .ops-command-overview')).toBeVisible();
  const width=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(392);
 });
}
