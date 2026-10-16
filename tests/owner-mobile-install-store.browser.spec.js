const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';

// No OS-native install-dialog claim: verify mobile CTA, fallback and installed
// state in a real browser with the exact production HTML/CSS/JS source.
for(const locale of ['fa','en']){
 for(const width of [320,390,430]){
  test(`${locale} ${width}px: persistent PWA install is sixth mobile dock action`,async({page})=>{
   await page.setViewportSize({width,height:850});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/'+locale+'/',{waitUntil:'domcontentloaded'});
   const dock=page.locator('.app-dock');
   const install=dock.locator('[data-jr-dock-install]');
   await expect(install).toBeVisible({timeout:12000});
   await expect(dock.locator('a[data-app-tab]')).toHaveCount(5);
   await expect(dock.locator(':scope > *')).toHaveCount(6);
   await expect(install).toHaveAttribute('aria-label',locale==='fa'?'نصب اپلیکیشن':'Install website app');
   const box=await install.boundingBox();
   expect(box).not.toBeNull();
   expect(box.width,'Minimum horizontal target').toBeGreaterThanOrEqual(40);
   expect(box.height,'WCAG touch target').toBeGreaterThanOrEqual(44);
   expect(box.x,'left edge').toBeGreaterThanOrEqual(-1);
   expect(box.x+box.width,'right edge').toBeLessThanOrEqual(width+1);
   const columns=await dock.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
   expect(columns).toBe(6);
   await install.click();
   const help=page.locator('[data-jr-install-help]');
   await expect(help).toBeVisible();
   await expect(help).toContainText(locale==='fa'?'منوی مرورگر':'browser menu');
   expect(await help.count()).toBe(1);
   const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
   expect(overflow).toBeLessThanOrEqual(1);
   expect(errors).toEqual([]);
  });
 }
 test(`${locale}: installed PWA hides install action, retains five main links`,async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>Object.defineProperty(navigator,'standalone',{configurable:true,value:true}));
  await page.goto(origin+'/'+locale+'/',{waitUntil:'domcontentloaded'});
  const dock=page.locator('.app-dock');
  await expect(dock.locator('a[data-app-tab]')).toHaveCount(5,{timeout:12000});
  await expect(dock.locator('[data-jr-dock-install]')).toHaveCount(0);
 });
}
for(const locale of ['fa','en']){
 for(const width of [320,390,430]){
  test(`${locale} ${width}px: authentic covers and no shop horizontal overflow`,async({page})=>{
   await page.setViewportSize({width,height:844});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/'+locale+'/shop/',{waitUntil:'domcontentloaded'});
   const cards=page.locator('[data-book-catalog] .book-product-card');
   await expect(cards.first()).toBeVisible({timeout:15000});
   await expect(cards).toHaveCount(3);
   const img=cards.first().locator('.book-cover img').first();
   await expect(img).toBeVisible();
   await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);
   const cover=await img.boundingBox();
   expect(cover.width).toBeGreaterThan(100);
   expect(cover.x).toBeGreaterThanOrEqual(-1);
   expect(cover.x+cover.width).toBeLessThanOrEqual(width+1);
   const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
   expect(overflow).toBeLessThanOrEqual(1);
   expect(errors).toEqual([]);
  });
 }
}
