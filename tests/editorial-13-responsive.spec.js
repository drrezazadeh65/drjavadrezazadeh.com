const {test,expect}=require('@playwright/test');

test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const slugs=[
 'academic-research-editing-services-2026',
 'ai-search-and-scientific-content-2026',
 'bookstore-books-and-student-support-2026',
 'customer-dashboard-one-account-2026',
 'ecosystem-education-research-2026',
 'educational-guidance-evidence-based-2026',
 'golden-talent-developmental-framework-2026',
 'how-to-use-educational-services-2026',
 'humanability-language-assessment-framework-2026',
 'international-research-collaboration-2026',
 'professional-services-public-guide-2026',
 'support-talented-students-opportunity-2026',
 'teacher-schools-professional-learning-2026'
];
const outerWidth=async(page)=>page.evaluate(()=>({
 viewport:innerWidth,
 html:document.documentElement.scrollWidth,
 body:document.body.scrollWidth
}));
test('thirteen academic articles preserve mobile reading and contextual commerce links',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const slug of slugs){
  const response=await page.goto(base+'/fa/akhbar/'+slug+'/',{waitUntil:'domcontentloaded'});
  expect(response?.status(),slug).toBe(200);
  await expect(page.locator('h1')).toHaveCount(1);
  const side=page.locator('.launch-service-sidebar');
  await expect(side).toHaveCount(1);
  await expect(side.locator('section')).toHaveCount(3);
  await expect(side.locator('.launch-offer')).toHaveCount(1);
  await expect(side.locator('.launch-shop-unit')).toHaveCount(1);
  await expect(side.locator('.launch-related-reading')).toHaveCount(1);
  const links=await side.locator('a').evaluateAll(els=>els.map(e=>e.getAttribute('href')));
  expect(links.length,slug).toBeGreaterThanOrEqual(5);
  expect(links.every(x=>x&&x.startsWith('/fa/')),slug).toBe(true);
  expect(links.includes('/fa/akhbar/'+slug+'/'),slug).toBe(false);
  const sizes=await outerWidth(page);
  expect(Math.max(sizes.html,sizes.body),slug+' horizontal scrolling').toBeLessThanOrEqual(sizes.viewport+2);
  const locations=await page.evaluate(()=>{
   const reading=document.querySelector('.launch-article-main').getBoundingClientRect();
   const rail=document.querySelector('.launch-service-sidebar').getBoundingClientRect();
   return {readingBottom:reading.bottom,railTop:rail.top};
  });
  expect(locations.railTop,slug+' mobile rail must follow article text').toBeGreaterThanOrEqual(locations.readingBottom-3);
  const hero=await page.locator('.launch-hero-image img').evaluate(el=>({complete:el.complete,naturalWidth:el.naturalWidth,src:el.getAttribute('src')}));
  expect(hero.src,slug).toMatch(/\.webp$/);
  if(!hero.complete) await page.locator('.launch-hero-image img').evaluate(el=>el.decode());
  const imageDimensions=await page.locator('.launch-hero-image img').evaluate(el=>({naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,declaredWidth:Number(el.getAttribute('width')),declaredHeight:Number(el.getAttribute('height'))}));
  expect(imageDimensions.naturalWidth,slug+' failed image loading').toBeGreaterThanOrEqual(900);
  expect(imageDimensions.naturalWidth,slug+' width mismatch').toBe(imageDimensions.declaredWidth);
  expect(imageDimensions.naturalHeight,slug+' height mismatch').toBe(imageDimensions.declaredHeight);
 }
});
test('desktop keeps article first, offers discoverable, and news headings balanced',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 for(const slug of ['humanability-language-assessment-framework-2026','golden-talent-developmental-framework-2026','international-research-collaboration-2026']){
  await page.goto(base+'/fa/akhbar/'+slug+'/',{waitUntil:'domcontentloaded'});
  const pos=await page.evaluate(()=>{
   const r=document.querySelector('.launch-article-main').getBoundingClientRect();
   const s=document.querySelector('.launch-service-sidebar').getBoundingClientRect();
   return {readingLeft:r.left,railRight:s.right,sidePosition:getComputedStyle(document.querySelector('.launch-service-sidebar')).position};
  });
  expect(pos.railRight,slug+' RTL sidebar should be on left').toBeLessThanOrEqual(pos.readingLeft+6);
  expect(pos.sidePosition).toBe('sticky');
 }
 await page.goto(base+'/fa/akhbar/',{waitUntil:'domcontentloaded'});
 const newsCards=page.locator('.launch-news-collection .launch-news-grid .news-card');
 const newsCardCount=await newsCards.count();
 expect(newsCardCount).toBeGreaterThanOrEqual(13);
 await expect(newsCards.locator('h3')).toHaveCount(newsCardCount);
 await expect(page.locator('.launch-market-links a')).toHaveCount(3);
 const headings=await page.locator('.launch-news-grid .news-card h3').evaluateAll(nodes=>nodes.map(el=>parseFloat(getComputedStyle(el).fontSize)));
 expect(Math.max(...headings)).toBeLessThanOrEqual(26);
 const sizes=await outerWidth(page);
 expect(Math.max(sizes.html,sizes.body)).toBeLessThanOrEqual(sizes.viewport+2);
});
test('narrow 320px layout leaves navigation and academic commerce readable',async({page})=>{
 await page.setViewportSize({width:320,height:740});
 for(const route of ['/fa/akhbar/','/fa/akhbar/humanability-language-assessment-framework-2026/','/fa/akhbar/professional-services-public-guide-2026/']){
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  const sizes=await outerWidth(page);
  expect(Math.max(sizes.html,sizes.body),route).toBeLessThanOrEqual(sizes.viewport+2);
  await expect(page.locator('main')).toBeVisible();
 }
});
