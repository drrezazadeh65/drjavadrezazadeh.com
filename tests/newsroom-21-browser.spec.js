const {test,expect}=require('@playwright/test');
// Source-only acceptance against the sanitized Bertina bundle at 127.0.0.1.
// No production URL, account, mailer, crawler, model, or database is contacted.
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const locations=[
 {lang:'fa',route:'/fa/akhbar/',dir:'rtl'},
 {lang:'en',route:'/en/news-insights/',dir:'ltr'}
];
const viewports=[
 {name:'mobile',width:390,height:844},
 {name:'desktop',width:1440,height:900}
];
for(const site of locations)for(const viewport of viewports){
 test(site.lang+' '+viewport.name+' has the genuine 21-desk luxury newsroom',async({page},testInfo)=>{
   await page.setViewportSize(viewport);
   await page.goto(base+site.route,{waitUntil:'domcontentloaded'});
   const news=page.locator('.jrn21[data-jrn21]');
   await expect(news).toBeVisible();
   await expect(page.locator('html')).toHaveAttribute('dir',site.dir);
   await expect(news.locator('h1')).toHaveCount(1);
   await expect(news.locator('[data-jrn21-section]')).toHaveCount(21);
   await expect(news.locator('.jrn21-cover')).toBeVisible();
   await expect(news.locator('.jrn21-taxonomy-card')).toHaveCount(7);
   await expect(news.locator('[data-jrn21-section="18"] [data-ni-archive-search]')).toHaveCount(1);
   await expect(news.locator('[data-jrn21-section="19"]')).toBeVisible();
   const style=await news.evaluate(node=>{
     const cover=node.querySelector('.jrn21-cover');
     const masthead=node.querySelector('.jrn21-masthead');
     return {
       background:getComputedStyle(cover).backgroundImage,
       masthead:getComputedStyle(masthead).backgroundColor,
       ink:getComputedStyle(node).color,
       width:node.getBoundingClientRect().width,
       viewport:document.documentElement.clientWidth,
       bodyScroll:document.documentElement.scrollWidth
     };
   });
   expect(style.background).not.toBe('none');
   expect(style.masthead).not.toBe('rgba(0, 0, 0, 0)');
   expect(style.width).toBeLessThanOrEqual(style.viewport+2);
   expect(style.bodyScroll).toBeLessThanOrEqual(viewport.width+3);
   const firstDesk=news.locator('.jrn21-taxonomy-card').first();
   await firstDesk.locator('summary').click();
   await expect(firstDesk).toHaveAttribute('open','');
   await expect(firstDesk.locator('[data-jrn21-category]')).not.toHaveCount(0);
   const missing=await news.locator('[data-jrn21-section]').evaluateAll(
     sections=>sections.filter(s=>!s.querySelector('h2')||!s.id).map(s=>s.getAttribute('data-jrn21-section'))
   );
   expect(missing).toEqual([]);
   // Capture the actual first-screen masthead after exercising the category,
   // not the scroll position Playwright selected for the summary control.
   await firstDesk.locator('summary').click();
   await page.evaluate(()=>{
     document.documentElement.style.scrollBehavior='auto';
     document.body.style.scrollBehavior='auto';
     window.scrollTo(0,0);
   });
   const shot=testInfo.outputPath('jrei-news-'+site.lang+'-'+viewport.name+'.png');
   await page.screenshot({path:shot,fullPage:false,animations:'disabled'});
   await testInfo.attach('newsroom-'+site.lang+'-'+viewport.name,{
     path:shot,contentType:'image/png'
   });
 });
}
