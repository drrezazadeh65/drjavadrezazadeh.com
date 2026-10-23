const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';

for(const locale of ['fa','en']){
 for(const size of [320,390,430]){
  test(locale+' mobile native sheet search at '+size+'px',async({page})=>{
   await page.setViewportSize({width:size,height:844});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/'+locale+'/',{waitUntil:'domcontentloaded'});
   const dock=page.locator('.app-dock');
   await expect(dock.locator('a')).toHaveCount(4,{timeout:15000});
   // The reviewed homepage deliberately keeps four named, first-party native actions.
   await expect(dock.locator('[data-jr-dock-install]')).toHaveCount(0);
   await expect(dock.locator(':scope > *')).toHaveCount(4);
   const trigger=page.locator('.site-header [data-nav-toggle]:visible').first();
   await trigger.click();
   const sheet=page.locator('#mobile-app-menu');
   await expect(sheet).toBeVisible();
   await expect(sheet.locator('[data-jr-dock-install]')).toBeVisible();
   const input=sheet.locator('[data-jr-mobile-quick-find]');
   await expect(input).toBeVisible();
   await expect(input).toHaveAttribute('type','search');
   const cards=sheet.locator('.app-sheet-grid a:visible');
   const initial=await cards.count();
   expect(initial).toBeGreaterThan(12);
   await input.fill(locale==='fa'?'فروشگاه':'Bookstore');
   await expect.poll(()=>cards.count()).toBeGreaterThan(0);
   expect(await cards.count()).toBeLessThan(initial);
   await expect(sheet.locator('[data-jr-mobile-search-count]')).toContainText(
     locale==='fa'?'نتیجه:':'matching sections');
   await input.fill('no-match-qqq-2026');
   await expect(cards).toHaveCount(0);
   await expect(sheet.locator('[data-jr-mobile-empty]')).toBeVisible();
   await input.fill('');
   await expect(cards).toHaveCount(initial);
   await expect(sheet.locator('[data-jr-mobile-empty]')).toBeHidden();
   await page.keyboard.press('Escape');
   await expect(sheet).toBeHidden();
   await expect(dock).toBeVisible();
   const overflow=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
   expect(overflow).toBeLessThanOrEqual(1);
   expect(errors).toEqual([]);
  });
 }
 test(locale+' installed app retains four native tabs and offers explicit update check without forced refresh',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  await page.goto(origin+'/'+locale+'/',{waitUntil:'domcontentloaded'});
  const dock=page.locator('.app-dock');
  await expect(dock.locator('a')).toHaveCount(4,{timeout:15000});
  await expect(page.locator('[data-jr-dock-install]')).toHaveCount(0);
  await page.locator('.site-header [data-nav-toggle]:visible').first().click();
  const check=page.locator('[data-jr-app-update-check]');
  await expect(check).toBeVisible();
  await expect(check).toHaveJSProperty('disabled',false);
  let navigations=0;
  page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations++});
  await check.click();
  const status=page.locator('[data-jr-app-update-status]');
  await expect(status).not.toContainText(locale==='fa'?'در حال بررسی نسخه جدید':'Checking for updates');
  expect(navigations,'update check must never force a reload').toBe(0);
  await expect(dock.locator('a')).toHaveCount(5);
 });
}

test('PWA lifecycle retains installed launch registration, resume checks and explicit user-controlled refresh',()=>{
 const {readFileSync}=require('node:fs');
 const site=readFileSync('assets/js/site.js','utf8');
 const sw=readFileSync('sw.js','utf8');
 const notice=readFileSync('assets/js/pwa-release-notice.js','utf8');
 const shell=readFileSync('assets/js/mobile-app-v431.js','utf8');
 expect(site).toContain("navigator.serviceWorker.register(");
 expect(site).toContain("updateViaCache:'none'");
 expect(site).toContain('reg.update().catch(()=>{})');
 expect(sw).toContain("await self.skipWaiting()");
 expect(sw).toContain("await self.clients.claim()");
 expect(notice).toContain("window.jrPwaCheckForUpdates=checkForUpdates");
 expect(notice).toContain("navigator.serviceWorker.addEventListener('controllerchange'");
 expect(notice).toContain("document.addEventListener('visibilitychange'");
 expect(notice).toContain("window.confirm(");
 expect(notice).toContain("location.reload()");
 expect(shell).toContain("data-jr-mobile-quick-find");
 expect(shell).toContain("data-jr-app-update-check");
 expect(shell).not.toContain("localStorage.setItem('jr-mobile-search");
});
