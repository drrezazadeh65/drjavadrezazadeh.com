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
    await expect(calendar.locator('.cw-day').first().locator('.cw-count')).toContainText(scenario.lang==='fa'?'1':'1 appointment');
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
