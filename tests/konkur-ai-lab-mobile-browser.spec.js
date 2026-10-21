const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
async function visit(page,width){
  await page.setViewportSize({width,height:844});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  const unexpectedWrites=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))unexpectedWrites.push(r.method()+' '+r.url())});
  const response=await page.goto(origin+'/fa/konkur-ai-lab/',{waitUntil:'domcontentloaded'});
  expect(response?.status()).toBe(200);
  await expect(page.locator('#subjects .row')).toHaveCount(1);
  return {pageErrors,unexpectedWrites};
}
for(const width of [320,375,390,430,768,1024]){
  test('research-only Konkur lab functions at '+width+'px without overflow',async({page})=>{
    const {pageErrors,unexpectedWrites}=await visit(page,width);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow,noarchive');
    await page.locator('#rank').fill('۱۲۳۴');
    await page.locator('#sn1').fill('ریاضی');
    await page.locator('#sp1').fill('۷۵');
    await page.locator('#go').click();
    await expect(page.locator('#result')).toContainText('ساختار کارنامه بررسی شد');
    await expect(page.locator('#result')).toContainText('هیچ درصد قبولی محاسبه نشده است');
    await expect(page.locator('#result')).toContainText('تأیید رسمی ندارد');
    const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const dimensions=await page.locator('#go').boundingBox();
    expect(dimensions?.height).toBeGreaterThanOrEqual(44);
    expect(pageErrors).toEqual([]);
    expect(unexpectedWrites).toEqual([]);
  });
}
test('maximum six subjects, privacy, invalid input, reset and re-entry',async({page})=>{
  const {pageErrors,unexpectedWrites}=await visit(page,390);
  const add=page.locator('#add');
  for(let i=1;i<6;i++)await add.click();
  await expect(page.locator('#subjects .row')).toHaveCount(6);
  await expect(add).toBeDisabled();
  await page.locator('#rank').fill('-۱');
  await page.locator('#go').click();
  await expect(page.locator('#errsum')).toBeVisible();
  await expect(page.locator('#rank')).toHaveAttribute('aria-invalid','true');
  await page.locator('button[type="reset"]').click();
  await expect(page.locator('#subjects .row')).toHaveCount(1);
  await expect(page.locator('#result')).toBeEmpty();
  await expect(add).toBeEnabled();
  await page.locator('#year').fill('۱۴۰۵');
  await page.locator('#rank').fill('۱۵۰۰');
  await page.locator('#go').click();
  await expect(page.locator('#result')).toContainText('هنوز داده رشته‌محل تأییدشده');
  expect(pageErrors).toEqual([]);
  expect(unexpectedWrites).toEqual([]);
});

test('local percentage calculator respects configured negative marking at 320px',async({page})=>{
 const {pageErrors,unexpectedWrites}=await visit(page,320);
 await page.locator('#pc-correct').fill('۲۰');
 await page.locator('#pc-incorrect').fill('۵');
 await page.locator('#pc-unanswered').fill('۵');
 await page.locator('#pc-calculate').click();
 await expect(page.locator('#pc-result')).toContainText('۶۱٫۱۱');
 await expect(page.locator('#pc-result')).toContainText('تراز، رتبه یا احتمال قبولی نیست');
 await page.locator('#pc-negative').fill('۰');
 await page.locator('#pc-calculate').click();
 await expect(page.locator('#pc-result')).toContainText('۶۶٫۶۷');
 await page.locator('#pc-correct').fill('-۱');
 await page.locator('#pc-calculate').click();
 await expect(page.locator('#pc-result')).toContainText('اطلاعات قابل محاسبه نیست');
 const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
 expect(overflow).toBeLessThanOrEqual(1);
 expect(pageErrors).toEqual([]);
 expect(unexpectedWrites).toEqual([]);
});
