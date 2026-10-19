const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
for(const [lang,route] of [['fa','/fa/golden-talent/'],['en','/en/golden-talent/']]){
 test(lang+' Golden Talent really builds an evidence map without uploading entries',async({page})=>{
  const uploads=[];
  page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))uploads.push(r.url());});
  await page.goto(base+route);
  const root=page.locator('[data-gt-evidence-studio]');
  await expect(root).toBeVisible();
  await root.locator('textarea[name="question"]').fill(lang==='fa'?'چگونه فرصت تجربه یادگیری را افزایش دهیم؟':'How might learning opportunity be improved?');
  await root.locator('textarea[name="alternatives"]').fill('Missing context may explain the observation');
  await root.locator('textarea[name="action"]').fill('Try one reversible learning task');
  await root.locator('[data-gt-evidence-add]').click();
  await root.locator('[data-gt-evidence-item] select').selectOption('TEACHER');
  await root.locator('[data-gt-evidence-item] textarea[name^="observation-"]').fill('Consistent effort in two practice sessions');
  await root.locator('[data-gt-evidence-item] textarea[name^="limit-"]').fill('Only two occasions');
  await root.locator('button[type="submit"]').click();
  const summary=root.locator('[data-gt-evidence-summary]');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Consistent effort in two practice sessions');
  await expect(summary).toContainText('Only two occasions');
  await expect(summary).toContainText('Missing context may explain the observation');
  await expect(root.locator('[data-gt-evidence-print]')).toBeVisible();
  await expect(root.locator('[data-gt-evidence-copy]')).toBeVisible();
  expect(uploads).toEqual([]);
  await page.reload();
  await expect(page.locator('textarea[name="question"]')).toHaveValue('');
  await expect(page.locator('[data-gt-evidence-summary]')).toBeHidden();
 });
 test(lang+' evidence studio is safe against HTML injection and supports complete reset',async({page})=>{
  await page.goto(base+route);
  const form=page.locator('[data-gt-evidence-studio]');
  await form.locator('textarea[name="question"]').fill('<img src=x onerror=alert(1)>');
  await form.locator('button[type="submit"]').click();
  await expect(form.locator('[data-gt-evidence-summary]')).toContainText('<img src=x onerror=alert(1)>');
  await expect(form.locator('[data-gt-evidence-summary] img')).toHaveCount(0);
  await form.locator('[data-gt-evidence-add]').click();
  await expect(form.locator('[data-gt-evidence-item]')).toHaveCount(1);
  await form.locator('[data-gt-evidence-clear]').click();
  await expect(form.locator('[data-gt-evidence-item]')).toHaveCount(0);
  await expect(form.locator('textarea[name="question"]')).toHaveValue('');
  await expect(form.locator('[data-gt-evidence-summary]')).toBeHidden();
  await expect(form.locator('[data-gt-evidence-print]')).toBeHidden();
 });
 test(lang+' mobile evidence source limit, missing-data warning and approved identity',async({page})=>{
  await page.setViewportSize({width:360,height:780});
  await page.goto(base+route);
  const form=page.locator('[data-gt-evidence-studio]');
  const mark=page.locator('header img[src="/assets/images/persian-brand-symbol.png"]');
  await expect(mark).toBeAttached();
  await form.locator('textarea[name="question"]').fill('Small educational question');
  await form.locator('button[type="submit"]').click();
  const summary=form.locator('[data-gt-evidence-summary]');
  await expect(summary).toBeVisible();
  await expect(summary.locator('.jr-gt-summary-warning').first()).toBeVisible();
  await expect(summary.locator('.jr-gt-summary-warning').first()).toContainText(lang==='fa'?'منبع مستقل':'independent source');
  for(let i=0;i<6;i++)await form.locator('[data-gt-evidence-add]').click();
  await expect(form.locator('[data-gt-evidence-item]')).toHaveCount(6);
  await expect(form.locator('[data-gt-evidence-add]')).toBeDisabled();
  await form.locator('[data-gt-evidence-remove]').first().click();
  await expect(form.locator('[data-gt-evidence-item]')).toHaveCount(5);
  await expect(form.locator('[data-gt-evidence-add]')).toBeEnabled();
  await expect(form.locator('textarea[name="question"]')).toHaveAttribute('maxlength','350');
 });
 test(lang+' meaningful prompts and accurate stage claim remain visible',async({page})=>{
  await page.goto(base+route);
  await expect(page.locator('[data-gt-evidence-studio] .jr-sci-eyebrow')).toBeVisible();
  await expect(page.locator('link[href*="jr-scientific-experience-v1.css"]')).toHaveCount(1);
  await expect(page.locator('script[src*="golden-talent-evidence-studio-v1.js"]')).toHaveCount(1);
  const source=await page.request.get(base+'/assets/js/golden-talent-evidence-studio-v1.js');
  expect(source.status()).toBe(200);
 });
 test(lang+' duplicate-source entries do not count as independent evidence',async({page})=>{
  await page.goto(base+route);
  const root=page.locator('[data-gt-evidence-studio]');
  await root.locator('textarea[name="question"]').fill('What can the available observations justify?');
  await root.locator('textarea[name="alternatives"]').fill('There may be contextual alternatives.');
  for(let i=0;i<2;i++){
   await root.locator('[data-gt-evidence-add]').click();
   const row=root.locator('[data-gt-evidence-item]').nth(i);
   await row.locator('select').selectOption('TEACHER');
   await row.locator('textarea[name^="observation-"]').fill('An observed learning activity '+i);
  }
  await root.locator('button[type="submit"]').click();
  const warnings=root.locator('[data-gt-evidence-summary] .jr-gt-summary-warning');
  const phrase=lang==='fa'?'دو نوع منبع مستقل':'two independent source types';
  await expect(warnings.first()).toContainText(phrase);
  // Changing the provenance category is a distinct descriptive source type,
  // not a psychometric validation or proof of independent human observers.
  await root.locator('[data-gt-evidence-item]').nth(1).locator('select').selectOption('PARENT');
  await root.locator('button[type="submit"]').click();
  await expect(root.locator('[data-gt-evidence-summary]')).not.toContainText(phrase);
 });

}
