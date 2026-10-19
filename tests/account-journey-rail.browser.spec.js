const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
const pages=[
 {lang:'fa',kind:'orders',url:'/fa/app/account/orders/'},
 {lang:'fa',kind:'appointments',url:'/fa/app/account/appointments/'},
 {lang:'fa',kind:'reports',url:'/fa/app/account/reports/'},
 {lang:'en',kind:'orders',url:'/en/account/orders/'},
 {lang:'en',kind:'appointments',url:'/en/account/appointments/'},
 {lang:'en',kind:'reports',url:'/en/account/reports/'}
];
for(const p of pages){
 test(p.lang+' '+p.kind+' private journey rail navigates real destinations at mobile widths',async({page})=>{
  await page.setViewportSize({width:390,height:840});
  const response=await page.goto(origin+p.url,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const nav=page.locator('[data-jr-account-journey]');
  await expect(nav).toBeVisible();
  const links=nav.locator('a[data-jr-route-link]');
  await expect(links).toHaveCount(5);
  await expect(nav.locator('a[aria-current="page"]')).toHaveAttribute('data-jr-route-link',p.kind);
  const paths=await links.evaluateAll(nodes=>nodes.map(x=>new URL(x.href).pathname));
  expect(paths).toContain(p.lang==='fa'?'/fa/customer-dashboard/':'/en/account/');
  expect(paths).toContain('/'+p.lang+'/services/');
  expect(paths).toContain('/'+p.lang+(p.lang==='fa'?'/app/account/':'/account/')+'orders/');
  expect(paths).toContain('/'+p.lang+(p.lang==='fa'?'/app/account/':'/account/')+'appointments/');
  expect(paths).toContain('/'+p.lang+(p.lang==='fa'?'/app/account/':'/account/')+'reports/');
  for(const width of [320,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:840});
   const geom=await nav.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,
     rowClient:el.querySelector('.jr-route-links').clientWidth,
     rowScroll:el.querySelector('.jr-route-links').scrollWidth
   }));
   expect(geom.scroll,'rail outer bounds at '+width).toBeLessThanOrEqual(geom.client+2);
   expect(geom.rowScroll,'navigation remains scrollable or fully visible at '+width).toBeGreaterThanOrEqual(geom.rowClient);
   const targets=await links.evaluateAll(nodes=>nodes.map(x=>({
    height:x.getBoundingClientRect().height,focusable:x.tabIndex>=0
   })));
   expect(targets.every(x=>x.height>=44&&x.focusable),'touch/keyboard targets '+width).toBe(true);
  }
  await page.setViewportSize({width:390,height:840});
  await nav.locator('[data-jr-route-link="dashboard"]').click();
  await expect(page).toHaveURL(origin+(p.lang==='fa'?'/fa/customer-dashboard/':'/en/account/'));
  await expect(page.locator('body.customer-dashboard')).toBeAttached();
 });
}
