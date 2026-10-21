const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
for(const locale of ['fa','en']){
 for(const width of [320,390,430,768,1280]){
  test(locale+' 15 premium homepage campaigns at '+width+'px remain readable, navigable and contained',async({page},testInfo)=>{
   await page.setViewportSize({width,height:850});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/'+locale+'/',{waitUntil:'domcontentloaded'});
   const widget=page.locator('.jr-campaigns');
   await expect(widget).toBeVisible();
   await expect(widget.locator('[data-jr-promo-key]')).toHaveCount(15);
   await expect(widget.locator('img[loading="lazy"]')).toHaveCount(15);
   await expect(widget.locator('[data-jr-promo-group]')).toHaveCount(3);
   await expect(widget.locator('[data-jr-promo-step]')).toHaveCount(6);
   const measured=await page.evaluate(()=>{
    const box=document.querySelector('.jr-campaigns').getBoundingClientRect();
    return {
     viewport:innerWidth,
     left:box.left,
     right:box.right,
     overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth,
     direction:getComputedStyle(document.querySelector('.jr-campaigns')).direction,
     alignment:getComputedStyle(document.querySelector('.jr-campaigns')).textAlign,
    };
   });
   expect(measured.left,'safe outer gutter').toBeGreaterThanOrEqual(12);
   expect(measured.right,'safe outer gutter').toBeLessThanOrEqual(width-12);
   expect(measured.overflow,'no horizontal body scroll').toBeLessThanOrEqual(1);
   expect(measured.direction).toBe(locale==='fa'?'rtl':'ltr');
   expect(measured.alignment).toBe(locale==='fa'?'start':'start');
   for(const group of await widget.locator('[data-jr-promo-group]').all()){
    const rail=group.locator('[data-jr-promo-rail]');
    const dimensions=await rail.evaluate(el=>({sw:el.scrollWidth,cw:el.clientWidth}));
    expect(dimensions.sw).toBeGreaterThan(dimensions.cw);
    const buttons=group.locator('[data-jr-promo-step]');
    await expect(buttons).toHaveCount(2);
    await expect(buttons.nth(1)).toBeVisible();
   }
   if(width===390){
    const first=widget.locator('[data-jr-promo-group]').first();
    const rail=first.locator('[data-jr-promo-rail]');
    const before=await rail.evaluate(el=>el.scrollLeft);
    await first.locator('[data-jr-promo-step="1"]').click();
    await expect.poll(()=>rail.evaluate(el=>el.scrollLeft)).not.toBe(before);
    await page.screenshot({path:testInfo.outputPath('home-campaigns-'+locale+'-390.png'),fullPage:true,animations:'disabled'});
   }
   expect(errors).toEqual([]);
  });
 }
 test(locale+' featured banner and all campaigns remain accessible with scripts disabled',async({browser})=>{
  const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const page=await ctx.newPage();
  await page.goto(origin+'/'+locale+'/',{waitUntil:'domcontentloaded'});
  const section=page.locator('.jr-campaigns');
  await expect(section.locator('a[href]')).toHaveCount(15);
  await expect(section.locator('[data-jr-promo-step]:visible')).toHaveCount(0);
  await expect(section.locator('.jr-campaign-feature')).toBeVisible();
  await expect(section.locator('.jr-campaign-card').first()).toBeVisible();
  await ctx.close();
 });
}
