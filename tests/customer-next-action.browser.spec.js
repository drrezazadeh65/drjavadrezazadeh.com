const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';

for(const [lang,route,ordersPath] of [
 ['fa','/fa/customer-dashboard/','/fa/app/account/orders/'],
 ['en','/en/account/','/en/account/orders/']
]){
 for(const [scenario,historyCode,orders,expected] of [
  ['empty',200,[],/first service|خدمت مناسب/],
  ['pending',200,[{id:'00000000-0000-4000-8000-000000000001',state:'pending',paymentVerified:false,items:[]}],/awaiting payment verification|تأیید پرداخت سفارش/],
  ['provider-matched',200,[{id:'00000000-0000-4000-8000-000000000002',state:'paid',paymentVerified:true,items:[]}],/provider-verified order|تأیید درگاه/],
  ['paid-without-proof',200,[{id:'00000000-0000-4000-8000-000000000003',state:'paid',paymentVerified:false,items:[]}],/awaiting payment verification|تأیید پرداخت سفارش/],
  ['forbidden',403,[],/requires verification|نیازمند تأیید/],
  ['unavailable',503,[],/temporarily unavailable|موقتاً در دسترس نیست/]
 ]){
  test(lang+' account next action '+scenario+' uses no writes or invented payments',async({page})=>{
   await page.setViewportSize({width:390,height:844});
   const writes=[],errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',request=>{
    if(request.method()==='POST')writes.push(new URL(request.url()).pathname);
   });
   await page.route('**/api/**',async request=>{
    const pathname=new URL(request.request().url()).pathname;
    if(pathname==='/api/auth/health')return request.fulfill({json:{ok:true,ready:true}});
    if(pathname==='/api/auth/me')return request.fulfill({json:{ok:true,user:{email:'sample@example.invalid'}}});
    if(pathname==='/api/commerce/health')return request.fulfill({json:{ok:true,checkout:false,capabilities:{services:false}}});
    if(pathname==='/api/commerce/history')return request.fulfill({status:historyCode,json:{ok:historyCode===200,orders}});
    return request.fulfill({status:404,json:{ok:false}});
   });
   await page.goto(origin+route,{waitUntil:'domcontentloaded'});
   await expect(page.locator('[data-home-heading]')).toHaveText(expected);
   const action=page.locator('[data-home-action]');
   await expect(action).toHaveAttribute('href',scenario==='empty'?'/'+lang+'/services/':
       scenario==='forbidden'?'/'+lang+'/login/':ordersPath);
   await expect(page.locator('[data-home-copy]')).not.toContainText('case-');
   expect(writes).toEqual([]);
   expect(errors).toEqual([]);
  });
 }
 test(lang+' next action guest never loads history',async({page})=>{
  const histories=[];
  await page.route('**/api/**',async request=>{
   const pathname=new URL(request.request().url()).pathname;
   if(pathname==='/api/commerce/history')histories.push(pathname);
   if(pathname==='/api/auth/health')return request.fulfill({json:{ok:true,ready:true}});
   if(pathname==='/api/auth/me')return request.fulfill({status:401,json:{ok:false}});
   // The independent sponsorship ledger establishes guest status first.
   // Its 401 must not trigger a redundant owned-order lookup.
   if(pathname==='/api/student-support/my-contributions')return request.fulfill({status:401,json:{ok:false}});
   if(pathname==='/api/commerce/health')return request.fulfill({json:{ok:true,checkout:false,capabilities:{services:false}}});
   return request.fulfill({status:404,json:{ok:false}});
  });
  await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-home-action]')).toHaveAttribute('href','/'+lang+'/login/');
  expect(histories).toEqual([]);
 });
}
