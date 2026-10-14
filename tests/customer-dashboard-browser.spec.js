const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';

for(const [lang,route] of [['fa','/fa/customer-dashboard/'],['en','/en/account/']]){
  for(const state of ['guest','signed','unavailable']){
    test(lang+' dashboard '+state+' initializes navigation and catalogue without live payment',async({page})=>{
      await page.setViewportSize({width:320,height:800});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      let current=state;
      await page.route('**/api/**',async route=>{
        const path=new URL(route.request().url()).pathname;
        let status=200,data;
        if(path==='/api/auth/health')data={ok:true,ready:current!=='unavailable'};
        else if(path==='/api/auth/me'){
          status=current==='signed'?200:401;
          data=status===200?{ok:true,user:{email:'fixture@example.test'}}:{ok:false};
        }else if(path==='/api/commerce/health')data={ok:true,checkout:false,capabilities:{services:false,books:false,vip:false}};
        else data={ok:false};
        await route.fulfill({status,json:data});
      });
      await page.goto(base+route);
      await expect(page.locator('[data-service-catalog-count]').first()).toContainText(lang==='fa'?'۲۱':'21');
      const cards=page.locator('.cd-service-card');
      if(lang==='fa'){
        await expect(cards).toHaveCount(21);
        await expect(cards.first()).toHaveAttribute('data-purchase-ready','false');
      }
      const privateLinks=page.locator('[data-private-route]');
      expect(await privateLinks.count()).toBeGreaterThan(0);
      if(state==='signed'){
        await expect(page.locator('[data-account-email]')).toHaveText('fixture@example.test');
        await expect(privateLinks.first()).toHaveAttribute('data-access','authenticated');
        if(lang==='fa')await expect(cards.first().locator('.cd-service-buy')).toHaveAttribute('href',/^\/fa\/services\/checkout\//);
        current='guest';
        await page.evaluate(()=>dispatchEvent(new Event('online')));
        await expect(privateLinks.first()).toHaveAttribute('data-access','signin-required');
        await expect(page.locator('[data-account-email]')).not.toHaveText('fixture@example.test');
        await expect(page.locator('html')).not.toHaveAttribute('data-customer-authenticated','true');
      }
      if(current!=='signed'){
        await expect(privateLinks.first()).toHaveAttribute('href','/'+lang+'/login/');
        if(lang==='fa')await expect(cards.first().locator('.cd-service-buy')).toHaveAttribute('href','/'+lang+'/login/');
      }
      if(lang==='fa'){
        // The dashboard has exclusive panels: open the ecosystem before searching its catalogue.
        await page.locator('.cd-mobile-dock a[data-section="ecosystem"]').click();
        await expect(page.locator('[data-dashboard-service-search]')).toBeVisible();
        await page.locator('[data-dashboard-service-search]').fill('no-matching-service');
        await expect(cards).toHaveCount(0);
        await page.locator('[data-dashboard-service-search]').fill('');
        await expect(cards).toHaveCount(21);
      }
      const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
    });
  }
}


test('English dashboard uses a safe, unambiguous Latin font stack on desktop and mobile',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:850});
  await page.goto(base+'/en/account/',{waitUntil:'domcontentloaded'});
  const details=await page.evaluate(()=>{
    const fontOf=el=>getComputedStyle(el).fontFamily;
    const heading=document.querySelector('#overview h1');
    return {body:fontOf(document.body),heading:fontOf(heading),
      label:heading?.textContent||'',brand:document.querySelector('.cd-brand-copy strong')?.textContent||'',
      stylesheet:[...document.querySelectorAll('link[rel="stylesheet"]')].map(x=>x.href)};
  });
  expect(details.body.startsWith('"Segoe UI"')||details.body.startsWith('Segoe UI')).toBe(true);
  expect(details.heading).not.toMatch(/(^|,)\\s*Inter\\s*(,|$)/);
  expect(details.label).toMatch(/[A-Za-z]/);
  expect(details.brand).toMatch(/Rezazadeh/);
  expect(details.stylesheet.some(x=>x.includes('customer-dashboard-v1.css?v=20261014-consultations-v5'))).toBe(true);
 }
 expect(errors).toEqual([]);
});


for(const [lang,route] of [['fa','/fa/customer-dashboard/'],['en','/en/account/']]){
 test(lang+' verified buyer privately chooses phone, online voice or video without auto-booking',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const orderId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  let historyHits=0,fulfilmentHits=0;const submissions=[];
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/**',async intercepted=>{
    const request=intercepted.request(),url=new URL(request.url());
    const p=url.pathname;
    if(p==='/api/auth/health')return intercepted.fulfill({json:{ok:true,ready:true}});
    if(p==='/api/auth/me')return intercepted.fulfill({json:{ok:true,user:{email:'buyer@example.invalid'}}});
    if(p==='/api/commerce/health')return intercepted.fulfill({json:{ok:true,checkout:true,capabilities:{services:true,books:true,vip:true}}});
    if(p==='/api/commerce/history'){
      historyHits++;expect(request.method()).toBe('GET');
      return intercepted.fulfill({json:{ok:true,orders:[{
        id:orderId,paymentVerified:true,
        items:[{sku:'service:academic_consult_60',quantity:1}]
      }]}});
    }
    if(p==='/api/commerce/fulfilment'){
      fulfilmentHits++;expect(url.searchParams.get('order')).toBe(orderId);
      return intercepted.fulfill({json:{ok:true,paymentRecord:'provider_verified_not_bank_settlement',
        serviceCases:[{sku:'service:academic_consult_60',status:'scheduling',
          bookingStart:null,bookingEnd:null,deliveryMode:null,meetingCity:null,
          customerChoiceEnabled:true,allowedDeliveryModes:['PHONE','VOICE','VIDEO']}],parcel:null}});
    }
    if(p==='/api/commerce/consultation-preference'){
      expect(request.method()).toBe('POST');
      expect(request.headers()['content-type']).toContain('application/json');
      submissions.push(request.postDataJSON());
      return intercepted.fulfill({json:{ok:true,schema:'commerce-consultation-choice-v1',
        preference:{appointmentConfirmed:false,customerSelected:true,customerNotified:false}}});
    }
    return intercepted.fulfill({status:404,json:{ok:false}});
  });
  await page.goto(base+route+'#consultations');
  const panel=page.locator('#consultations');
  await expect(panel).toBeVisible();
  await expect(panel.locator('[data-consultation-appointments]')).toHaveCount(1);
  expect(historyHits).toBe(0);
  await panel.locator('[data-consultation-check]').click();
  await expect(panel.locator('.appointment-private-list li')).toHaveCount(1);
  expect(historyHits).toBe(1);
  expect(fulfilmentHits).toBe(1);
  const choice=panel.locator('.appointment-preference');
  await expect(choice).toBeVisible();
  const selected=choice.locator('select').first();
  await expect(selected.locator('option')).toHaveCount(3);
  await expect(selected.locator('option[value="IN_PERSON"]')).toHaveCount(0);
  await selected.selectOption('VOICE');
  await choice.locator('button').click();
  await expect.poll(()=>submissions.length).toBe(1);
  expect(submissions[0]).toEqual({orderId,sku:'service:academic_consult_60',mode:'VOICE',city:null});
  await expect(choice).toContainText(lang==='fa'?'هماهنگی زمان':'consultant must still confirm');
  await expect(panel).not.toContainText('bank settlement verified');
  const inputFont=await selected.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(inputFont).toBeGreaterThanOrEqual(16);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
  expect(await page.evaluate(()=>Math.max(
    document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth))
    .toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
 });

 test(lang+' buyer can view confirmed server booking and is never offered a second booking button',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const from=new Date(Date.now()+48*3600_000).toISOString().slice(0,19).replace('T',' ');
  const to=new Date(Date.now()+49*3600_000).toISOString().slice(0,19).replace('T',' ');
  let writes=0;
  await page.route('**/api/**',intercepted=>{
    const p=new URL(intercepted.request().url()).pathname;
    if(p==='/api/auth/health')return intercepted.fulfill({json:{ok:true,ready:true}});
    if(p==='/api/auth/me')return intercepted.fulfill({json:{ok:true,user:{email:'buyer@example.invalid'}}});
    if(p==='/api/commerce/health')return intercepted.fulfill({json:{ok:true,checkout:true,capabilities:{services:true,books:true,vip:true}}});
    if(p==='/api/commerce/history')return intercepted.fulfill({json:{ok:true,orders:[{
      id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',paymentVerified:true,
      items:[{sku:'service:academic_consult_60'}]
    }]}});
    if(p==='/api/commerce/fulfilment')return intercepted.fulfill({json:{
      ok:true,paymentRecord:'provider_verified_not_bank_settlement',serviceCases:[{
        sku:'service:academic_consult_60',status:'booked',
        bookingStart:from,bookingEnd:to,deliveryMode:'PHONE',meetingCity:null,
        customerChoiceEnabled:false,allowedDeliveryModes:['PHONE','VIDEO']
      }],parcel:null
    }});
    if(intercepted.request().method()==='POST')writes++;
    return intercepted.fulfill({status:404,json:{ok:false}});
  });
  await page.goto(base+route+'#consultations');
  const section=page.locator('#consultations');
  await section.locator('[data-consultation-check]').click();
  await expect(section.locator('.appointment-private-list li')).toHaveCount(1);
  await expect(section.locator('.appointment-private-list li')).toContainText(
    lang==='fa'?'نوبت توسط مدیر ثبت شده':'Booked by consultant');
  await expect(section.locator('.appointment-private-list li')).toContainText(
    lang==='fa'?'تلفنی':'Telephone');
  await expect(section.locator('.appointment-private-list li')).toContainText(
    lang==='fa'?'شروع':'Start');
  await expect(section.locator('.appointment-preference')).toHaveCount(0);
  expect(writes).toBe(0);
 });

 test(lang+' unsigned buyer cannot see or save another customer appointment',async({page})=>{
  let details=0;
  await page.route('**/api/**',intercepted=>{
    const path=new URL(intercepted.request().url()).pathname;
    if(path==='/api/auth/health')return intercepted.fulfill({json:{ok:true,ready:true}});
    if(path==='/api/auth/me')return intercepted.fulfill({status:401,json:{ok:false}});
    if(path==='/api/commerce/health')return intercepted.fulfill({json:{ok:true,checkout:false,capabilities:{}}});
    if(path==='/api/commerce/history')return intercepted.fulfill({status:401,json:{ok:false}});
    if(path==='/api/commerce/fulfilment'||path==='/api/commerce/consultation-preference')details++;
    return intercepted.fulfill({status:404,json:{ok:false}});
  });
  await page.goto(base+route+'#consultations');
  const section=page.locator('#consultations');
  await section.locator('[data-consultation-check]').click();
  await expect(section.locator('[data-consultation-results]')).toContainText(
    lang==='fa'?'ایمیل آن تأیید شده':'verified account');
  await expect(section.locator('.appointment-private-list')).toHaveCount(0);
  expect(details).toBe(0);
 });
}


for(const [locale,account,intake] of [
  ['fa','/fa/customer-dashboard/','/fa/darkhast-moshavere/'],
  ['en','/en/account/','/en/request-consultation/']
]){
 test(locale+' uses same verified hour from dashboard through intake, without auto-booking',async({page})=>{
   await page.setViewportSize({width:390,height:844});
   let readCount=0;
   const data={ok:true,schema:'consultation-week-v1',timezone:'Asia/Tehran',
     slotMinutes:60,maxPublishedDailyHours:4,customerReservationEnabled:false,
     externalCalendarConfirmed:false,days:Array.from({length:7},(_,i)=>({
       date:new Date(Date.UTC(2030,0,1+i)).toISOString().slice(0,10),
       totalSlots:i===0?2:0,remainingSlots:i===0?1:0,
       slots:i===0?[
         {startUtc:'2030-01-01 07:00:00',endUtc:'2030-01-01 08:00:00',status:'AVAILABLE'},
         {startUtc:'2030-01-01 08:00:00',endUtc:'2030-01-01 09:00:00',status:'FULL'}
       ]:[]
     }))};
   await page.route('**/api/commerce/consultation-week',route=>{
     expect(route.request().method()).toBe('GET');
     readCount++;
     return route.fulfill({json:data});
   });
   await page.route('**/api/auth/**',route=>{
     const url=new URL(route.request().url()).pathname;
     if(url.endsWith('/health'))return route.fulfill({json:{ok:true,ready:false}});
     return route.fulfill({status:401,json:{ok:false}});
   });
   await page.goto(base+account+'#consultations',{waitUntil:'domcontentloaded'});
   const ownerWeek=page.locator('#consultations [data-consultation-week]');
   await expect(ownerWeek).toHaveCount(1);
   await expect(ownerWeek.locator('.cw-day')).toHaveCount(7);
   await expect(ownerWeek.locator('.cw-free')).toHaveCount(1);
   await expect(ownerWeek.locator('.cw-full')).toHaveCount(1);
   await expect(ownerWeek.locator('.cw-full')).toBeDisabled();
   await ownerWeek.locator('.cw-free').click();
   await expect(page).toHaveURL(new RegExp(intake.replaceAll('/','\\/')+'\\?slot='));
   await expect(page.locator('[data-consultation-week] .cw-free')).toHaveCount(1);
   const form=page.locator('form[data-consultation-composer]');
   await expect(form.locator('input[name="preferred_slot"]')).toHaveValue('2030-01-01 07:00:00');
   await form.locator('select[name="service"]').selectOption({index:1});
   await form.locator('input[name="context"]').fill('A study decision');
   await form.locator('textarea[name="question"]').fill('Which route is appropriate?');
   await form.locator('button[type="submit"]').click();
   await expect(form.locator('[data-composer-draft]')).toHaveValue(/Asia\/Tehran/);
   await expect(form.locator('[data-composer-status]')).toContainText(
     locale==='fa'?'هنوز ارسال نشده':'has not been sent');
   expect(readCount).toBeGreaterThanOrEqual(2);
 });
}
