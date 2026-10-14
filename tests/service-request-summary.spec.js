const {test,expect}=require('@playwright/test');

test('service intent keeps the selected offer and makes scope, outcome, and price visible before email',async({page})=>{
  await page.route('**/assets/data/service-catalog.json',route=>route.fulfill({
    contentType:'application/json',
    body:JSON.stringify({services:[{
      id:'manuscript_diagnostic',
      title_fa:'بازبینی تشخیصی مقاله تا ۷۰۰۰ کلمه + گزارش',
      duration_minutes:null,
      price:12000000,
      sellable:true,
      fit_fa:'برای ارزیابی آمادگی مقاله پیش از ارسال.',
      outcome_fa:'گزارش اولویت‌های اصلاح و آمادگی ارسال.',
      boundary_fa:'پذیرش یا انتشار مقاله تضمین نمی‌شود.'
    }]})
  }));
  await page.goto('http://127.0.0.1:4173/fa/darkhast-moshavere/?service=manuscript_diagnostic',{waitUntil:'domcontentloaded'});
  const service=page.locator('form[data-consultation-composer] select[name="service"]');
  await expect(service).toHaveValue('بازبینی تشخیصی مقاله تا ۷۰۰۰ کلمه + گزارش');
  const summary=page.locator('[data-requested-service-details]');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('بازبینی تشخیصی مقاله تا ۷۰۰۰ کلمه + گزارش');
  await expect(summary).toContainText('۱۲٬۰۰۰٬۰۰۰ تومان');
  await expect(summary).toContainText('گزارش اولویت‌های اصلاح و آمادگی ارسال.');
  await expect(summary).toContainText('پذیرش یا انتشار مقاله تضمین نمی‌شود.');
  await expect(page.locator('[data-composer-email]')).toHaveAttribute('href','mailto:dr.rezazadeh65@gmail.com');
});

for(const scenario of [
  {lang:'fa',path:'/fa/darkhast-moshavere/',expected:'روش ترجیحی جلسه: آنلاین تصویری'},
  {lang:'en',path:'/en/request-consultation/',expected:'Preferred session format: Online video'}
]){
  test('consultation preference is included in reviewed email only ('+scenario.lang+')',async({page})=>{
    await page.goto('http://127.0.0.1:4173'+scenario.path,{waitUntil:'domcontentloaded'});
    const form=page.locator('form[data-consultation-composer]');
    const mode=form.locator('select[name="delivery_mode"]');
    await expect(mode).toBeVisible();
    await expect(mode.locator('option[value="IN_PERSON"]')).toHaveCount(0);
    await form.locator('select[name="service"]').selectOption({index:1});
    await form.locator('input[name="context"]').fill('An academic decision');
    await form.locator('textarea[name="question"]').fill('Which route should I consider?');
    await mode.selectOption('VIDEO');
    await form.locator('button[type="submit"]').click();
    const draft=form.locator('[data-composer-draft]');
    await expect(draft).toHaveValue(new RegExp(scenario.expected));
    const email=await form.locator('[data-composer-email]').getAttribute('href');
    expect(email).toMatch(/^mailto:dr\.rezazadeh65@gmail\.com\?subject=/);
    expect(decodeURIComponent(email)).toContain(scenario.expected);
    await expect(form.locator('[data-composer-status]')).toContainText(scenario.lang==='fa'?'هنوز ارسال نشده':'has not been sent');
    await mode.selectOption('PHONE');
    await expect(form.locator('[data-composer-preview]')).toBeHidden();
    await expect(form.locator('[data-composer-email]')).toHaveAttribute('href','mailto:dr.rezazadeh65@gmail.com');
    await form.locator('button[type="submit"]').click();
    await expect(draft).toHaveValue(scenario.lang==='fa'?/روش ترجیحی جلسه: تلفنی/:/Preferred session format: Telephone/);
     await mode.selectOption('VOICE');
     await form.locator('button[type="submit"]').click();
     await expect(draft).toHaveValue(scenario.lang==='fa'?/روش ترجیحی جلسه: تماس صوتی آنلاین/:/Preferred session format: Online voice call/);
  });
}

test('delayed catalogue prefill cannot overwrite the visitor choice or prepared email',async({page})=>{
  let releaseCatalogue,signalRequest;
  const holdCatalogue=new Promise(resolve=>{releaseCatalogue=resolve;});
  const requested=new Promise(resolve=>{signalRequest=resolve;});
  await page.route('**/assets/data/service-catalog.json',async route=>{
    signalRequest();
    await holdCatalogue;
    await route.fulfill({
      contentType:'application/json',
      body:JSON.stringify({services:[{
        id:'manuscript_diagnostic',title_fa:'بازبینی مقاله',
        price:12000000,sellable:true
      }]})
    });
  });
  await page.goto('http://127.0.0.1:4173/fa/darkhast-moshavere/?service=manuscript_diagnostic',{waitUntil:'domcontentloaded'});
  await requested;
  const form=page.locator('form[data-consultation-composer]');
  const service=form.locator('select[name="service"]');
  await service.selectOption({label:'مشاوره تحصیلی'});
  await form.locator('input[name="context"]').fill('تصمیم آموزشی');
  await form.locator('textarea[name="question"]').fill('از کجا شروع کنم؟');
  await form.locator('button[type="submit"]').click();
  await expect(form.locator('[data-composer-preview]')).toBeVisible();
  const responseReady=page.waitForResponse('**/assets/data/service-catalog.json');
  releaseCatalogue();
  await responseReady;
  await expect(service).toHaveValue('مشاوره تحصیلی');
  await expect(form.locator('[data-requested-service-details]')).toBeHidden();
  await expect(form.locator('[data-composer-draft]')).toHaveValue(/مشاوره تحصیلی/);
});


for (const scenario of [
  {lang:'fa',path:'/fa/darkhast-moshavere/',draftLabel:'زمان پیشنهادی'},
  {lang:'en',path:'/en/request-consultation/',draftLabel:'Preferred time'}
]){
  test('public consultation week uses verified open/full hours and drafts only ('+scenario.lang+')',async({page})=>{
    const day=offset=>new Date(Date.UTC(2030,0,1+offset)).toISOString().slice(0,10);
    const days=Array.from({length:7},(_,i)=>({
      date:day(i),totalSlots:i===0?2:i===1?1:0,
      remainingSlots:i===0?1:0,
      slots:i===0?[
        {startUtc:'2030-01-01 07:00:00',endUtc:'2030-01-01 08:00:00',status:'AVAILABLE'},
        {startUtc:'2030-01-01 08:00:00',endUtc:'2030-01-01 09:00:00',status:'FULL'}
      ]:i===1?[{startUtc:'2030-01-02 07:00:00',
        endUtc:'2030-01-02 08:00:00',status:'FULL'}]:[]
    }));
    let requests=0;
    await page.route('**/api/commerce/consultation-week',route=>{
      requests++;
      expect(route.request().method()).toBe('GET');
      return route.fulfill({json:{ok:true,schema:'consultation-week-v1',
        timezone:'Asia/Tehran',slotMinutes:60,maxPublishedDailyHours:4,
        customerReservationEnabled:false,externalCalendarConfirmed:false,days}});
    });
    await page.goto('http://127.0.0.1:4173'+scenario.path,{waitUntil:'domcontentloaded'});
    const calendar=page.locator('[data-consultation-week]');
    await expect(calendar.locator('.cw-day')).toHaveCount(7);
    await expect(calendar.locator('.cw-free')).toHaveCount(1);
    await expect(calendar.locator('.cw-full')).toHaveCount(2);
    await expect(calendar.locator('.cw-full').first()).toBeDisabled();
    await expect(calendar.locator('.cw-day').first().locator('.cw-count')).toContainText(scenario.lang==='fa'?'۱ جلسه':'1 appointment');
    const form=page.locator('form[data-consultation-composer]');
    await calendar.locator('.cw-free').first().click();
    await expect(form.locator('[name="preferred_slot"]')).toHaveValue('2030-01-01 07:00:00');
    await form.locator('select[name="service"]').selectOption({index:1});
    await form.locator('input[name="context"]').fill('A decision');
    await form.locator('textarea[name="question"]').fill('Which option should I consider?');
    await form.locator('button[type="submit"]').click();
    const draft=form.locator('[data-composer-draft]');
    await expect(draft).toHaveValue(new RegExp(scenario.draftLabel));
    await expect(draft).toHaveValue(/Asia\/Tehran/);
    await expect(form.locator('[data-composer-status]')).toContainText(
      scenario.lang==='fa'?'هنوز ارسال نشده':'has not been sent');
    expect(requests).toBe(1); // No hidden hold/payment/reservation request.
    await form.locator('button[type="reset"]').click();
    await expect(form.locator('[name="preferred_slot"]')).toHaveValue('');
    await expect(calendar.locator('.cw-slot[aria-pressed="true"]')).toHaveCount(0);
  });
}
test('consultation public calendar fails closed when server cannot verify capacity',async({page})=>{
  await page.route('**/api/commerce/consultation-week',route=>
    route.fulfill({status:503,json:{ok:false,error:'consultation_week_unavailable'}}));
  await page.goto('http://127.0.0.1:4173/fa/darkhast-moshavere/',{waitUntil:'domcontentloaded'});
  const calendar=page.locator('[data-consultation-week]');
  await expect(calendar.locator('.cw-free')).toHaveCount(0);
  await expect(calendar.locator('[data-consultation-week-state]')).toContainText('در دسترس نیست');
  await expect(page.locator('form[data-consultation-composer]')).toBeVisible();
});


// These are synthetic, same-origin public availability responses. No buyer,
// book stock, booking, payment, private order or external calendar is created.
for(const locale of ['fa','en']){
  test('consultation week reflects verified published hours and only requests slots ('+locale+')',async({page})=>{
    const first='2026-10-19',second='2026-10-20';
    const days=Array.from({length:7},(_,i)=>{
      const date=new Date(Date.UTC(2026,9,19+i)).toISOString().slice(0,10);
      let slots=[];
      if(i===0)slots=[
        {startUtc:first+' 12:30:00',endUtc:first+' 13:30:00',status:'AVAILABLE'},
        {startUtc:first+' 13:30:00',endUtc:first+' 14:30:00',status:'FULL'}
      ];
      if(i===1)slots=[{startUtc:second+' 12:30:00',
        endUtc:second+' 13:30:00',status:'AVAILABLE'}];
      return {date,slots,totalSlots:slots.length,
        remainingSlots:slots.filter(s=>s.status==='AVAILABLE').length};
    });
    await page.route('**/api/commerce/consultation-week',route=>route.fulfill({
      status:200,json:{ok:true,schema:'consultation-week-v1',timezone:'Asia/Tehran',
        slotMinutes:60,maxPublishedDailyHours:4,days,customerReservationEnabled:false,
        externalCalendarConfirmed:false}
    }));
    const path=locale==='fa'?'/fa/darkhast-moshavere/':'/en/request-consultation/';
    await page.setViewportSize({width:320,height:800});
    await page.goto('http://127.0.0.1:4173'+path);
    const calendar=page.locator('[data-consultation-week]');
    await expect(calendar.locator('.cw-day')).toHaveCount(7);
    await expect(calendar.locator('.cw-free')).toHaveCount(2);
    await expect(calendar.locator('.cw-full')).toHaveCount(1);
    await expect(calendar.locator('.cw-full')).toBeDisabled();
    await expect(calendar.locator('.cw-day').first()).toContainText(
      locale==='fa'?'۱ جلسه':'1 appointment');
    const selected=calendar.locator('.cw-free').first();
    await selected.click();
    const form=page.locator('form[data-consultation-composer]');
    await expect(form.locator('input[name="preferred_slot"]')).toHaveValue(first+' 12:30:00');
    await expect(selected).toHaveAttribute('aria-pressed','true');
    await form.locator('select[name="service"]').selectOption({index:1});
    await form.locator('input[name="context"]').fill('Parent');
    await form.locator('textarea[name="question"]').fill('How should we proceed?');
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[data-composer-draft]')).toHaveValue(
      locale==='fa'?/زمان پیشنهادی.*در انتظار بررسی ظرفیت/:/Preferred time.*subject to availability/);
    await expect(form.locator('[data-composer-status]')).toContainText(
      locale==='fa'?'هنوز ارسال نشده':'has not been sent');
    await expect(form.locator('[data-composer-draft]')).not.toContainText('booked');
    await form.locator('button[type="reset"]').click();
    await expect(form.locator('input[name="preferred_slot"]')).toHaveValue('');
    expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,
      document.body.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);
  });
}
test('unverified or missing week fails closed while enquiry remains available',async({page})=>{
  await page.route('**/api/commerce/consultation-week',route=>route.fulfill({
    status:503,json:{ok:false,error:'consultation_week_unavailable'}
  }));
  await page.goto('http://127.0.0.1:4173/fa/darkhast-moshavere/');
  await expect(page.locator('[data-consultation-week] .cw-free')).toHaveCount(0);
  await expect(page.locator('[data-consultation-week-state]')).toContainText('در دسترس نیست');
  const form=page.locator('form[data-consultation-composer]');
  await expect(form.locator('select[name="service"]')).toBeEnabled();
  await expect(form.locator('input[name="preferred_slot"]')).toHaveValue('');
});


 
// Bilingual account-based growth pathway. All HTTP responses below are synthetic
// fixtures: no real account, personal data, payment, appointment or lead is created.
for(const [lang,path] of [['fa','/fa/darkhast-moshavere/'],['en','/en/request-consultation/']]){
  test('consent-based verified-account lead journey ('+lang+')',async({page})=>{
    await page.setViewportSize({width:320,height:800});
    const submitted=[];
    await page.route('**/api/growth/leads',route=>{
      expect(route.request().method()).toBe('POST');
      const payload=route.request().postDataJSON();
      submitted.push(payload);
      expect(payload).toEqual({
        serviceId:'service:academic_consult_60',
        purpose:'CONSULTATION_CONTACT',
        consentGiven:true,
        consentVersion:'stage14-consultation-v1',
        marketingOptIn:false
      });
      return route.fulfill({status:201,json:{ok:true,leadId:'synthetic-1',state:'NEW',duplicate:false}});
    });
    await page.route('**/api/growth/leads/mine',route=>route.fulfill({
      status:200,json:{ok:true,requests:[
        {id:'synthetic-1',service_id:'service:academic_consult_60',state:'NEW'}
      ]}
    }));
    await page.route('**/api/growth/leads/withdraw',route=>{
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({leadId:'synthetic-1'});
      return route.fulfill({status:200,json:{ok:true,state:'WITHDRAWN'}});
    });
    await page.goto('http://127.0.0.1:4173'+path,{waitUntil:'domcontentloaded'});
    const form=page.locator('[data-stage14-consent-lead]');
    await expect(form).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/jr2-consultation/);
    const services=form.locator('select[name="serviceId"]');
    await expect(services).toBeEnabled();
    await services.selectOption('service:academic_consult_60');
    if(lang==='en')await expect(services.locator('option:checked')).toHaveText('Specialist educational consultation');
    await expect(form.locator('input[name="consentGiven"]')).not.toBeChecked();
    await form.locator('button[type="submit"]').click();
    expect(submitted).toHaveLength(0);
    await form.locator('input[name="consentGiven"]').check();
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[data-stage14-lead-status]')).toContainText(
      lang==='fa'?'سرور پذیرفته شد':'server received your consented enquiry'
    );
    expect(submitted).toHaveLength(1);
    await expect(form.locator('input[name="consentGiven"]')).not.toBeChecked();
    await form.locator('[data-stage14-lead-mine]').click();
    await expect(form.locator('[data-stage14-lead-list] li')).toHaveCount(1);
    await form.locator('[data-stage14-lead-list] button').click();
    await expect(form.locator('[data-stage14-lead-list]')).toContainText('WITHDRAWN');
    await expect(form.locator('[data-stage14-lead-list] button')).toHaveCount(0);
    const overflow=await page.evaluate(()=>
      Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
  test('unauthenticated verified-lead submission cannot be represented as received ('+lang+')',async({page})=>{
    await page.route('**/api/growth/leads',route=>route.fulfill({
      status:401,json:{ok:false,error:'verified_login_required'}
    }));
    await page.goto('http://127.0.0.1:4173'+path,{waitUntil:'domcontentloaded'});
    const form=page.locator('[data-stage14-consent-lead]');
    await expect(form.locator('select[name="serviceId"]')).toBeEnabled();
    await form.locator('select[name="serviceId"]').selectOption('service:academic_consult_60');
    await form.locator('input[name="consentGiven"]').check();
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[data-stage14-lead-status]')).toContainText(
      lang==='fa'?'ایمیل تأییدشده':'verified email account'
    );
    await expect(form.locator('[data-stage14-lead-status]')).not.toContainText(
      lang==='fa'?'سرور پذیرفته شد':'server received your consented enquiry'
    );
    await expect(form.locator('[data-stage14-lead-list] li')).toHaveCount(0);
    await expect(page.locator('a[href^="mailto:"]').first()).toHaveAttribute('href',/^mailto:/);
  });
}
