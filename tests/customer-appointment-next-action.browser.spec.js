const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
const orderId='bb4cf34d-41ab-4316-a356-c4edab672ff1';
const service='service:academic_consult_60';

for(const [lang,route,appointmentsPath] of [
 ['fa','/fa/customer-dashboard/','/fa/app/account/appointments/'],
 ['en','/en/account/','/en/account/appointments/']
]){
 for(const scenario of ['choice','booked','unverified','foreign-case']){
  test(lang+' verified appointment next action '+scenario+' does not infer payment or booking',async({page})=>{
   await page.setViewportSize({width:390,height:844});
   const posts=[],errors=[],reads=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('request',request=>{const path=new URL(request.url()).pathname;
    if(request.method()==='POST')posts.push(path);
    if(path.startsWith('/api/commerce/'))reads.push(path);
   });
   await page.route('**/api/**',request=>{
    const path=new URL(request.request().url()).pathname;
    if(path==='/api/auth/health')return request.fulfill({json:{ok:true,ready:true}});
    if(path==='/api/auth/me')return request.fulfill({json:{ok:true,user:{email:'test@example.invalid'}}});
    if(path==='/api/commerce/health')return request.fulfill({json:{ok:true,checkout:false,capabilities:{services:false}}});
    if(path==='/api/commerce/history')return request.fulfill({json:{ok:true,limit:50,orders:[
     {id:orderId,state:'paid',paymentVerified:true,items:[{sku:service,quantity:1}]}
    ]}});
    if(path==='/api/commerce/fulfilment'){
     const record={
      sku:scenario==='foreign-case'?'service:another_service':service,
      status:scenario==='booked'?'booked':'scheduling',
      customerChoiceEnabled:scenario!=='booked',
      allowedDeliveryModes:['VIDEO','PHONE'],
      bookingStart:scenario==='booked'?'2026-11-01 12:00:00':null,
      bookingEnd:scenario==='booked'?'2026-11-01 13:00:00':null
     };
     return request.fulfill({json:{ok:true,
      paymentRecord:scenario==='unverified'?'requires_reconciliation':'provider_verified_not_bank_settlement',
      serviceCases:[record]}});
    }
    return request.fulfill({status:404,json:{ok:false}});
   });
   await page.goto(origin+route,{waitUntil:'domcontentloaded'});
   const heading=page.locator('[data-home-heading]'),action=page.locator('[data-home-action]');
   if(scenario==='choice'){
    await expect(heading).toHaveText(lang==='en'?/preferred consultation format/:/روش پیشنهادی مشاوره/);
    await expect(action).toHaveAttribute('href',appointmentsPath);
   }else if(scenario==='booked'){
    await expect(heading).toHaveText(lang==='en'?/recorded appointment/:/نوبت ثبت‌شده/);
    await expect(action).toHaveAttribute('href',appointmentsPath);
   }else{
    await expect(heading).toHaveText(lang==='en'?/provider-verified order/:/تأیید درگاه/);
    await expect(action).toHaveAttribute('href',lang==='en'?'/en/account/orders/':'/fa/app/account/orders/');
   }
   await expect(page.locator('[data-home-copy]')).not.toContainText(orderId);
   expect(reads.some(path=>path.startsWith('/api/commerce/fulfilment'))).toBe(true);
   expect(posts).toEqual([]);
   expect(errors).toEqual([]);
  });
 }
 test(lang+' guest overview never looks up orders or appointments',async({page})=>{
  const commerceRequests=[];
  await page.route('**/api/**',request=>{
   const path=new URL(request.request().url()).pathname;
   if(path==='/api/auth/health')return request.fulfill({json:{ok:true,ready:true}});
   if(path==='/api/auth/me')return request.fulfill({status:401,json:{ok:false}});
   // The independent sponsorship ledger establishes guest status first.
   // Its 401 must not trigger a redundant owned-order lookup.
   if(path==='/api/student-support/my-contributions')return request.fulfill({status:401,json:{ok:false}});
   if(path==='/api/commerce/health')return request.fulfill({json:{ok:true,checkout:false,capabilities:{services:false}}});
   if(path.includes('/commerce/history')||path.includes('/commerce/fulfilment'))commerceRequests.push(path);
   return request.fulfill({status:401,json:{ok:false}});
  });
  await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-home-action]')).toHaveAttribute('href','/'+lang+'/login/');
  expect(commerceRequests).toEqual([]);
 });
}