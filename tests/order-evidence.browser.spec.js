const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
const paid='11111111-1111-4111-8111-111111111111';
const waiting='22222222-2222-4222-8222-222222222222';
const sku='service:academic_consult_60';
const order=(id,state,verified)=>({
 id,state,paymentVerified:verified,amountToman:2400000,currency:'IRT',
 createdAt:'2026-10-19 06:12:00',
 items:[{sku,title:'Academic consultation',quantity:1,subtotalToman:2400000}]
});
const routes=[
 ['fa','/fa/app/account/orders/','canonical'],
 ['en','/en/account/orders/','canonical'],
 ['en','/en/app/account/orders/','alternate']
];

for(const [lang,route,variant] of routes){
 for(const scenario of ['booked','owner-attested','parcel-delivered','foreign-case','reconciliation']){
  test(lang+' '+variant+' private evidence: '+scenario+' stays tied to authenticated provider and owned SKU',async({page})=>{
   const errors=[],writes=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{
    if(r.method()==='POST')writes.push(new URL(r.url()).pathname);
    if(new URL(r.url()).pathname.startsWith('/api/commerce/'))requests.push(new URL(r.url()).pathname);
   });
   await page.setViewportSize({width:390,height:844});
   await page.route('**/api/**',r=>{
    const path=new URL(r.request().url()).pathname;
    if(path==='/api/commerce/history')return r.fulfill({json:{
      ok:true,limit:50,orders:[order(paid,'paid',true),order(waiting,'pending',false)]
    }});
    if(path==='/api/commerce/fulfilment'){
     const record={sku:scenario==='foreign-case'?'service:not_mine':sku,
      status:scenario==='owner-attested'?'delivered':'booked',
      bookingStart:'2026-11-01 12:00:00',bookingEnd:'2026-11-01 13:00:00'};
     return r.fulfill({json:{ok:true,paymentRecord:scenario==='reconciliation'?
       'requires_reconciliation':'provider_verified_not_bank_settlement',
       privateServiceFilesReady:false,
       serviceCases:scenario==='parcel-delivered'?[]:[record],
       parcel:scenario==='parcel-delivered'?{state:'delivered',carrier:'Example Carrier'}:null}});
    }
    return r.fulfill({status:404,json:{ok:false}});
   });
   await page.goto(origin+route,{waitUntil:'domcontentloaded'});
   const summary=page.locator('.appointment-summary');
   await expect(summary).toHaveAttribute('data-evidence-source','owner-scoped-history');
   const values=summary.locator('article b');
   const local=(n)=>new Intl.NumberFormat(lang==='fa'?'fa-IR':'en-US').format(n);
   await expect(values.nth(0)).toHaveText(local(2));
   await expect(values.nth(1)).toHaveText(local(1));
   await expect(values.nth(2)).toHaveText(local(1));
   await expect(values.nth(3)).toHaveText('—');
   const cards=page.locator('.case-section .appointment-card.empty article.appointment-card');
   await expect(cards).toHaveCount(2);
   const first=cards.first(),second=cards.nth(1);
   await expect(first.locator('.jr-order-evidence-step')).toHaveCount(4);
   await expect(second.locator('.jr-order-evidence-step')).toHaveCount(4);
   await expect(first.locator('.jr-order-evidence-step').nth(1)).toHaveAttribute('data-evidence-state','recorded');
   await expect(second.locator('.jr-order-evidence-step').nth(1)).toHaveAttribute('data-evidence-state','review');
   await expect(second.locator('[data-order-track]')).toHaveCount(0);
   const track=first.locator('button[data-order-track]');
   await expect(track).toHaveAttribute('aria-expanded','false');
   const detail=first.locator('.jr-order-detail');
   await expect(detail).toBeHidden();
   await track.focus();await page.keyboard.press('Enter');
   await expect(track).toHaveAttribute('aria-expanded','true');
   await expect(detail).toBeVisible();
   const third=first.locator('.jr-order-evidence-step').nth(2);
   const expected=scenario==='foreign-case'?'unknown':scenario==='reconciliation'?'review':'recorded';
   await expect(third).toHaveAttribute('data-evidence-state',expected);
   await expect(first.locator('.jr-order-evidence-step').nth(3)).toHaveAttribute('data-evidence-state','unknown');
   await track.click();
   await expect(detail).toBeHidden();
   await expect(track).toHaveAttribute('aria-expanded','false');
   for(const width of [320,390,430,768,1024,1440]){
    await page.setViewportSize({width,height:840});
    const geometry=await first.locator('.jr-order-evidence').evaluate(el=>({
     width:el.clientWidth,scroll:el.scrollWidth,grid:getComputedStyle(el.querySelector('ol')).gridTemplateColumns
    }));
    expect(geometry.scroll,'evidence overflow at '+width).toBeLessThanOrEqual(geometry.width+2);
   }
   expect(requests.filter(p=>p==='/api/commerce/fulfilment')).toHaveLength(1);
   expect(writes).toEqual([]);
   expect(errors).toEqual([]);
  });
 }
 test(lang+' '+variant+' guest cannot populate private evidence or show fake counts',async({page})=>{
  const details=[];
  await page.route('**/api/**',r=>{
   const path=new URL(r.request().url()).pathname;
   if(path==='/api/commerce/fulfilment')details.push(path);
   return r.fulfill({status:401,json:{ok:false,error:'unauthorized'}});
  });
  await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  const values=page.locator('.appointment-summary article b');
  await expect(values).toHaveCount(4);
  for(let i=0;i<4;i++)await expect(values.nth(i)).toHaveText('—');
  await expect(page.locator('.jr-order-evidence')).toHaveCount(0);
  await expect(page.locator('.case-section .appointment-card.empty')).toContainText(
    lang==='en'?'Sign in':'وارد حساب');
  expect(details).toEqual([]);
 });
 test(lang+' '+variant+' empty authorised history reports zero recent records without inventing payment',async({page})=>{
  await page.route('**/api/**',r=>r.fulfill({json:{ok:true,limit:50,orders:[]}}));
  await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  const local=new Intl.NumberFormat(lang==='fa'?'fa-IR':'en-US').format(0);
  const values=page.locator('.appointment-summary article b');
  for(let i=0;i<3;i++)await expect(values.nth(i)).toHaveText(local);
  await expect(values.nth(3)).toHaveText('—');
  await expect(page.locator('.jr-order-evidence')).toHaveCount(0);
 });
}
