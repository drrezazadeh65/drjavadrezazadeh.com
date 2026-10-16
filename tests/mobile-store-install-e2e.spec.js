const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';

for(const locale of ['fa','en']){
 for(const width of [320,390,430]){
  test(locale+' '+width+'px: actual mobile dock, official book covers and public version',async({page})=>{
   await page.setViewportSize({width,height:844});
   const errors=[];page.on('pageerror',err=>errors.push(String(err)));
   await page.goto(base+'/'+locale+'/shop/',{waitUntil:'domcontentloaded'});
   const install=page.locator('.app-dock [data-jr-dock-install]');
   await expect(install).toBeVisible({timeout:12000});
   await expect(page.locator('.app-dock a[data-app-tab]')).toHaveCount(5);
   await expect(page.locator('[data-jr-public-version]')).toHaveAttribute('data-jr-public-version','5.1.0',{timeout:12000});
   await expect(page.locator('footer')).not.toContainText(/(?:Technical build ID|شناسه نسخه فنی|jr-site-bertina)/);
   const cards=page.locator('[data-book-catalog] .book-product-card');
   await expect(cards).toHaveCount(3,{timeout:12000});
   await expect(cards.locator('.book-cover img')).toHaveCount(3);
   const names=await cards.locator('h2').allTextContents();
   expect(names.map(x=>x.trim())).toEqual(['سپیدی','تاریکی','بن‌بست']);
   for(const img of await cards.locator('.book-cover img').all()){
    await expect(img).toHaveAttribute('src',/\/assets\/images\/books\//);
    await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0),
      {timeout:12000,message:'official cover must decode'}).toBe(true);
   }
   const dock=await page.locator('.app-dock').boundingBox();
   expect(dock).not.toBeNull();
   expect(dock.x).toBeGreaterThanOrEqual(-1);
   expect(dock.x+dock.width).toBeLessThanOrEqual(width+1);
   expect(dock.y+dock.height).toBeLessThanOrEqual(844+1);
   const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
   expect(overflow,'unexpected '+locale+' horizontal overflow').toBeLessThanOrEqual(1);
   await install.click();
   await expect(page.locator('[data-jr-install-help]')).toBeVisible();
   await expect(page.locator('[data-jr-install-help]')).toContainText(locale==='fa'?'مرورگر':'browser');
   await expect(page.locator('.app-dock a[data-app-tab]')).toHaveCount(5);
   expect(errors).toEqual([]);
  });
 }
 test(locale+' 390px: real book detail gallery and truthful imprint status',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/'+locale+'/shop/book/?id=roshanaei',{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-book-detail] h1')).toContainText('سپیدی');
  await expect(page.locator('[data-book-detail] .book-detail-gallery img')).toHaveCount(2);
  await expect(page.locator('[data-book-detail] .book-meta')).toContainText(locale==='fa'?'هنوز تأیید نشده':'Not yet verified');
  await expect(page.locator('.app-dock [data-jr-dock-install]')).toBeVisible({timeout:12000});
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
 });
}
