const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';

// Source assertions are not enough: measure the actual bilingual DOM.
for(const locale of ['fa','en']){
 for(const width of [320,390,430]){
  test(locale+' cinema storefront and installed-app dock at '+width+'px',async({page})=>{
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.setViewportSize({width,height:844});
   await page.goto(base+'/'+locale+'/shop/',{waitUntil:'domcontentloaded'});
   const hero=page.locator('.book-store-hero');
   const picture=hero.locator(locale==='fa'?'.cinema-hero-picture':'.bookstore-hero-art');
   const copy=hero.locator(locale==='fa'?'.cinema-hero-copy':':scope > div:first-child');
   const nav=hero.locator(locale==='fa'?'.cinema-hero-nav':'.bookstore-hero-stage .store-nav');
   await expect(hero).toBeVisible();
   await expect(picture).toBeVisible();
   await expect(copy).toBeVisible();
   await expect(nav).toBeVisible();
   // Image-first: approved artwork appears before editorial copy and sales actions.
   const [pb,cb,nb]=await Promise.all([picture.boundingBox(),copy.boundingBox(),nav.boundingBox()]);
   expect(pb).not.toBeNull();expect(cb).not.toBeNull();expect(nb).not.toBeNull();
   if(locale==='fa'){
     expect(pb.y+pb.height,'FA approved image before copy').toBeLessThanOrEqual(cb.y+2);
     expect(cb.y+cb.height,'FA copy before actions').toBeLessThanOrEqual(nb.y+2);
   }else{
     expect(pb.y+pb.height,'EN approved image before actions').toBeLessThanOrEqual(nb.y+2);
     expect(nb.y+nb.height,'EN stage navigation precedes explanatory copy').toBeLessThanOrEqual(cb.y+2);
   }
   const cover=page.locator('.book-store-grid .book-product-card .book-cover img');
   await expect(cover).toHaveCount(3,{timeout:10000});
   for(const image of await cover.all()){
     await expect(image).toBeVisible();
     await expect.poll(()=>image.evaluate(el=>el.complete&&el.naturalWidth>0),
       {timeout:12000,message:'official cover must load'}).toBe(true);
   }
   const dock=page.locator('.app-dock');
   await expect(dock.locator('a')).toHaveCount(5);
   await expect(dock.locator(':scope > *')).toHaveCount(5);
   await page.locator('.site-header [data-nav-toggle]:visible').first().click();
   const install=page.locator('#mobile-app-menu [data-jr-dock-install]');
   await expect(install).toBeVisible({timeout:10000});
   const targetSize=await install.evaluate(el=>{const b=el.getBoundingClientRect();return {width:b.width,height:b.height}});
   expect(targetSize.width,'mobile install target width').toBeGreaterThanOrEqual(44);
   expect(targetSize.height,'mobile install target height').toBeGreaterThanOrEqual(44);
   const overflow=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
   expect(overflow,'mobile horizontal overflow').toBeLessThanOrEqual(1);
   await install.click();
   const help=page.locator('[data-jr-install-help]');
   await expect(help).toBeVisible();
   await expect(help).toContainText(locale==='fa'?'مرورگر':'browser');
   expect(errors,'uncaught JS errors').toEqual([]);
  });
 }
}

test('installed PWA mode removes redundant install control but preserves five dock routes',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.addInitScript(()=>{
   const native=window.matchMedia.bind(window);
   window.matchMedia=query=>query==='(display-mode: standalone)'
    ? {matches:true,media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}
    : native(query);
 });
 await page.goto(base+'/fa/shop/',{waitUntil:'domcontentloaded'});
 const dock=page.locator('.app-dock');
 await expect(dock).toBeVisible();
 await expect(dock.locator('a')).toHaveCount(5);
 await expect(page.locator('[data-jr-dock-install]')).toHaveCount(0);
});

test('product versions are public-friendly and do not leak the service-worker fingerprint',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/fa/shop/',{waitUntil:'domcontentloaded'});
 const legal=page.locator('[data-jr-footer-legal]');
 await expect(legal).toBeAttached({timeout:10000});
 await expect(legal.locator('[data-jr-public-version]')).toHaveText('نسخه وب‌سایت: ۵.۱.۰');
 await expect(legal).not.toContainText('شناسه نسخه فنی');
 await expect(legal).not.toContainText('jr-site-bertina-');
});


for(const locale of ['fa','en']){
 test(locale+' authentic book detail gallery and bibliographic gate at 390px',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/'+locale+'/shop/book/?id=roshanaei',{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-book-detail] h1')).toContainText('سپیدی');
  const images=page.locator('[data-book-detail] .book-detail-gallery img');
  await expect(images).toHaveCount(2,{timeout:12000});
  for(const cover of await images.all()){
    await expect(cover).toHaveAttribute('src',/\/assets\/images\/books\//);
    await expect.poll(()=>cover.evaluate(el=>el.complete&&el.naturalWidth>0),
      {timeout:12000,message:'original book cover must decode'}).toBe(true);
  }
  // Verified original imprint data now replaces the earlier placeholder.
  const meta=page.locator('[data-book-detail] .book-meta');
  await expect(meta).toContainText('9786229465141');
  await expect(meta).toContainText(locale==='fa'?'نشر دارما':'Darma Publishing');
  await expect(meta).toContainText(locale==='fa'?'۱۴۰۴':'1404');
  await expect(meta).not.toContainText(locale==='fa'?'هنوز تأیید نشده':'Not yet verified');
  await expect(page.locator('.app-dock a[data-app-tab]')).toHaveCount(5,{timeout:12000});
  await expect(page.locator('#mobile-app-menu [data-jr-dock-install]')).toHaveCount(1);
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
  expect(overflow,'book detail mobile overflow').toBeLessThanOrEqual(1);
 });
}


test('mobile shell cannot bootstrap twice when direct and shared loaders coexist',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/fa/shop/book/?id=roshanaei',{waitUntil:'domcontentloaded'});
 const dock=page.locator('.app-dock');
 await expect(dock).toBeVisible({timeout:10000});
 const before=await dock.elementHandle();
 expect(before).not.toBeNull();
 await page.addScriptTag({url:'/assets/js/mobile-app-v431.js?v=deliberate-duplicate-load'});
 await expect(dock).toHaveCount(1);
 await expect(page.locator('#mobile-app-menu')).toHaveCount(1);
 await expect(page.locator('[data-jr-dock-install]')).toHaveCount(1);
 const same=await before.evaluate(el=>el===document.querySelector('.app-dock'));
 expect(same,'duplicate loader must not replace installed dock, links or focus').toBe(true);
 await expect(page.locator('.app-dock a[data-app-tab]')).toHaveCount(5);
 await expect(page.locator('html')).toHaveAttribute('data-jr-mobile-app-shell-initialized','1');
});


for(const locale of ['fa','en']){
 test(locale+' verified book-card bibliographies and distinct publication versus printing year',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173/'+locale+'/shop/',{waitUntil:'domcontentloaded'});
  const cards=page.locator('[data-book-catalog] .book-product-card');
  await expect(cards).toHaveCount(5,{timeout:12000}); // 3 poetry, 1 collectible set, 1 digital
  const years=locale==='fa'?['۱۴۰۴','۱۴۰۱','۱۳۹۹']:['1404','1401','1399'];
  const isbns=['9786229465141','9786229636275','9786229636237'];
  for(let i=0;i<3;i++){
   const metadata=cards.nth(i).locator('dl.book-catalog-imprint');
   await expect(metadata).toBeVisible();
   await expect(metadata.locator('div')).toHaveCount(4);
   await expect(metadata).toContainText(locale==='fa'?'نشر دارما':'Darma Publishing');
   await expect(metadata).toContainText(isbns[i]);
   await expect(metadata).toContainText(years[i]);
  }
  const tariki=cards.nth(1).locator('dl.book-catalog-imprint');
  await expect(tariki.locator('div').nth(1)).toContainText(locale==='fa'?'۱۴۰۱':'1401');
  await expect(tariki.locator('div').nth(2)).toContainText(locale==='fa'?'۱۴۰۴':'1404');
  const width=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
  expect(width,'No sideways scroll from ISBN and year metadata').toBeLessThanOrEqual(1);
 });
}
