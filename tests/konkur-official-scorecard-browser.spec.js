const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
for(const [lang,route] of [['fa','/fa/entekhab-reshteh/'],['en','/en/student-guidance/']]){
 test(lang+' manual official scorecard is isolated from mock exam notebook and local-only',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const writes=[];
  page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url());});
  const response=await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const box=page.locator('[data-konkur-official-scorecard]');
  const f=box.locator('form');
  await expect(f).toBeVisible();
  await expect(page.locator('[data-choice-studio] .jr-cs-weight')).toHaveCount(5);
  await expect(page.locator('[data-konkur-mock-practice] form')).toBeVisible();
  await f.locator('select[name=group]').selectOption('HUMANITIES');
  await f.locator('input[name=rankQuota]').fill('۱۲۳۴');
  await f.locator('input[name=rankCountry]').fill('٢٣٤٥');
  await f.locator('input[name=grade11]').fill('۱۸٫۵');
  await f.locator('select[name=eligibilityDeclaration]').selectOption('SELF_REPORTED_YES');
  await f.locator('button[type=submit]').click();
  await expect(box.locator('.jr-ks-result')).toBeVisible();
  await expect(box.locator('.jr-ks-result')).toContainText('1234');
  await expect(box.locator('.jr-ks-result')).toContainText('2345');
  await expect(box.locator('.jr-ks-result')).toContainText('18.5');
  await f.locator('input[name=grade11]').fill('۲۳');
  await f.locator('button[type=submit]').click();
  await expect(box.locator('.jr-ks-result')).toBeHidden();
  await f.locator('button[type=reset]').click();
  await expect(f.locator('input[name=rankQuota]')).toHaveValue('');
  await expect(box.locator('.jr-ks-result')).toBeHidden();
  expect(writes).toEqual([]);
 });
}
