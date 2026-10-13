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
