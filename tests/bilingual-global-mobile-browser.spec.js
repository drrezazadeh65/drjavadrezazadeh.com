// JR Bilingual Mobile/RTL/LTR acceptance — read-only public fixture.
// Seven owner-requested breakpoints; no privileged accounts or payment flows.
const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
const widths=[320,360,390,430,768,1024,1440];
const routes=[
 ['fa','/fa/','homepage'],['en','/en/','homepage'],
 ['fa','/fa/login/','login'],['en','/en/login/','login'],
 ['fa','/fa/shop/','store'],['en','/en/shop/','store'],
 ['fa','/journal/fa/','journal'],['en','/journal/','journal']
];
for(const [lang,route,category] of routes){
 for(const width of widths){
  test(lang+' '+category+' '+width+'px global direction, no horizontal page overflow, accessible primary content',async({page})=>{
   await page.setViewportSize({width,height:850});
   const response=await page.goto(origin+route,{waitUntil:'domcontentloaded'});
   expect(response?.status(),route).toBe(200);
   await expect(page.locator('html')).toHaveAttribute('lang',lang);
   const main=page.locator('main').first();
   await expect(main).toBeVisible();
   const state=await page.evaluate(()=>{
    const main=document.querySelector('main');
    const cs=getComputedStyle(main);
    const body=getComputedStyle(document.body);
    const root=getComputedStyle(document.documentElement);
    const box=main.getBoundingClientRect();
    return {
      pageWidth:document.documentElement.clientWidth,
      scrollWidth:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth),
      direction:cs.direction,
      rootDirection:root.direction,
      bodyDirection:body.direction,
      left:box.left,
      right:box.right
    };
   });
   expect(state.scrollWidth-state.pageWidth,'document must not horizontally scroll').toBeLessThanOrEqual(2);
   expect(state.direction,'main text reading order').toBe(lang==='fa'?'rtl':'ltr');
   expect(state.rootDirection,'document reading order').toBe(lang==='fa'?'rtl':'ltr');
   expect(state.left,'content inside viewport').toBeGreaterThanOrEqual(-2);
   expect(state.right,'content inside viewport').toBeLessThanOrEqual(width+2);
   await expect(page.locator('a.skip, a[href^="#main"], a[href^="#main-content"]').first()).toHaveCount(1);
  });
 }
}

for(const [lang,route] of [['fa','/fa/login/'],['en','/en/login/']]){
 test(lang+' mobile sign-in fields respect safe text margins and keyboard focus',async({page})=>{
  await page.setViewportSize({width:320,height:760});
  await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  const fields=page.locator('main input:visible');
  expect(await fields.count()).toBeGreaterThan(0);
  const first=fields.first();
  await first.focus();
  expect(await first.evaluate(el=>document.activeElement===el)).toBe(true);
  const rect=await first.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect.x).toBeGreaterThanOrEqual(6);
  expect(rect.x+rect.width).toBeLessThanOrEqual(314);
 });
}
