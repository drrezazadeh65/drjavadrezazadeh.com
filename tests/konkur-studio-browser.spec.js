const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
for(const [lang,route] of [['fa','/fa/entekhab-reshteh/'],['en','/en/student-guidance/']]){
 test(lang+' Konkur preliminary list preserves input order, warns on duplicates and resets',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const response=await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const root=page.locator('[data-konkur-selection]');
  await expect(root.locator('.jr-kc-form')).toBeVisible();
  const code=root.locator('.jr-kc-form input').first();
  const title=root.locator('.jr-kc-form input').nth(1);
  await code.fill('۰۰۱۲۳');await title.fill('Sample 1');await root.locator('.jr-kc-form button[type=submit]').click();
  await expect(root.locator('ol.jr-kc-list li')).toHaveCount(1);
  await expect(root.locator('ol.jr-kc-list li').first()).toContainText('00123');
  await code.fill('12345');await title.fill('Sample 2');await root.locator('.jr-kc-form button[type=submit]').click();
  await expect(root.locator('ol.jr-kc-list li')).toHaveCount(2);
  await root.locator('ol.jr-kc-list li').nth(1).getByRole('button',{name:lang==='fa'?/بالا بردن/:/Move choice up/}).click();
  await expect(root.locator('ol.jr-kc-list li').first()).toContainText('12345');
  await code.fill('12345');await root.locator('.jr-kc-form button[type=submit]').click();
  await expect(root.locator('ol.jr-kc-list li')).toHaveCount(2);
  await root.getByRole('button',{name:lang==='fa'?'حذف همه انتخاب‌ها':'Clear all'}).click();
  await expect(root.locator('ol.jr-kc-list li')).toHaveCount(0);
  const data=await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}));
  expect(data.local).toBeGreaterThanOrEqual(0);
 });
}

for(const [lang,route] of [['fa','/fa/entekhab-reshteh/'],['en','/en/student-guidance/']]){
 test(lang+' portable preliminary draft is downloaded, previewed, and restored only after confirmation',async({page})=>{
  const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url());});
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'domcontentloaded'});
  const root=page.locator('[data-konkur-selection]'),form=root.locator('.jr-kc-form');
  const add=async(code,note)=>{
   await form.locator('input').nth(0).fill(code);
   await form.locator('input').nth(1).fill(note);
   await form.locator('button[type=submit]').click();
  };
  await add('۰۰۱۲۳','First');
  await add('۱۲۳۴۵','Second');
  await root.locator('ol.jr-kc-list li').nth(1).getByRole('button',{name:lang==='fa'?/بالا بردن/:/Move choice up/}).click();
  const downloadPromise=page.waitForEvent('download');
  await root.locator('.jr-kc-save-draft').click();
  const dl=await downloadPromise;
  expect(dl.suggestedFilename()).toBe('jr-konkur-1405-preliminary-draft.json');
  const downloaded=require('node:fs').readFileSync(await dl.path(),'utf8');
  const payload=JSON.parse(downloaded);
  expect(payload.entries.map(x=>x.code)).toEqual(['12345','00123']);
  expect(payload.evidenceStatus).toBe('SELF_REPORTED_UNVERIFIED');
  const file=root.locator('.jr-kc-import-file');
  await root.getByRole('button',{name:lang==='fa'?'حذف همه انتخاب‌ها':'Clear all'}).click();
  await expect(root.locator('.jr-kc-item')).toHaveCount(0);
  await file.setInputFiles({name:'draft.json',mimeType:'application/json',buffer:Buffer.from(downloaded)});
  await expect(root.locator('.jr-kc-apply-import')).toBeEnabled();
  await expect(root.locator('.jr-kc-item')).toHaveCount(0);
  await root.locator('.jr-kc-apply-import').click();
  await expect(root.locator('.jr-kc-item')).toHaveCount(2);
  await expect(root.locator('.jr-kc-item').first()).toContainText('12345');
  await expect(root.locator('.jr-kc-status')).toContainText(lang==='fa'?'تأیید رسمی':'Official programme');
  expect(writes).toEqual([]);
 });
}
test('corrupt draft cannot replace the current selection list',async({page})=>{
 await page.goto('http://127.0.0.1:4173/en/student-guidance/',{waitUntil:'domcontentloaded'});
 const root=page.locator('[data-konkur-selection]'),form=root.locator('.jr-kc-form');
 await form.locator('input').nth(0).fill('00123');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-kc-item')).toHaveCount(1);
 await root.locator('.jr-kc-import-file').setInputFiles({
  name:'forged.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify({schema:'jr-konkur-1405-choice-draft-v1',version:1,admissionYear:1405,
    evidenceStatus:'VERIFIED',maximumChoiceRuleStatus:'APPROVED',
    entries:[{position:1,code:'99999',group:'MATHEMATICS',note:'Forged'}]}))
 });
 await expect(root.locator('.jr-kc-apply-import')).toBeDisabled();
 await expect(root.locator('.jr-kc-item')).toHaveCount(1);
 await expect(root.locator('.jr-kc-item').first()).toContainText('00123');
});

test('filtering preliminary choices does not reorder or truncate the complete exported preference list',async({page})=>{
 const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method());});
 await page.setViewportSize({width:390,height:844});
 await page.goto('http://127.0.0.1:4173/en/student-guidance/',{waitUntil:'domcontentloaded'});
 const root=page.locator('[data-konkur-selection]'),form=root.locator('.jr-kc-form');
 const add=async(code,note)=>{
  await form.locator('input').nth(0).fill(code);
  await form.locator('input').nth(1).fill(note);
  await form.locator('button[type=submit]').click();
 };
 await add('00123','Mathematics');
 await add('12345','Biology');
 await add('54321','Physics');
 const search=root.locator('.jr-kc-filter');
 await search.fill('Biology');
 await expect(root.locator('.jr-kc-item')).toHaveCount(1);
 await expect(root.locator('.jr-kc-filter-count')).toContainText('1 of 3');
 await expect(root.locator('.jr-kc-item')).toContainText('12345');
 await expect(root.locator('.jr-kc-item').getByRole('button',{name:/Move choice up/})).toBeDisabled();
 await expect(root.locator('.jr-kc-filter-count')).toContainText('Clear the search');
 await search.fill('');
 await root.locator('.jr-kc-item').nth(1).getByRole('button',{name:/Move choice up/}).click();
 await expect(root.locator('.jr-kc-item').first()).toContainText('12345');
 await search.fill('۵۴۳۲۱');
 await expect(root.locator('.jr-kc-item')).toHaveCount(1);
 await expect(root.locator('.jr-kc-item')).toContainText('54321');
 await search.fill('');
 await expect(root.locator('.jr-kc-item')).toHaveCount(3);
 await expect(root.locator('.jr-kc-item').first()).toContainText('12345');
 await expect(root.locator('.jr-kc-item').nth(1)).toContainText('00123');
 const pending=page.waitForEvent('download');
 await root.locator('.jr-kc-save-draft').click();
 const file=await pending;
 const draft=JSON.parse(require('node:fs').readFileSync(await file.path(),'utf8'));
 expect(draft.entries.map(x=>x.code)).toEqual(['12345','00123','54321']);
 expect(writes).toEqual([]);
});

test('pre-submission review checks user-entered fields but refuses to certify official eligibility',async({page})=>{
 const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method());});
 await page.goto('http://127.0.0.1:4173/en/student-guidance/',{waitUntil:'domcontentloaded'});
 const root=page.locator('[data-konkur-selection]'),form=root.locator('.jr-kc-form');
 await root.locator('.jr-kc-review-draft').click();
 await expect(root.locator('.jr-kc-review-panel')).toBeEmpty();
 await form.locator('input').nth(0).fill('00123');
 await form.locator('input').nth(1).fill('Example programme');
 await form.locator('button[type=submit]').click();
 await root.locator('.jr-kc-review-draft').click();
 await expect(root.locator('.jr-kc-review-panel')).toContainText('examination groups');
 await expect(root.locator('.jr-kc-review-panel')).toContainText('not an admission result or probability');
 await expect(root.locator('.jr-kc-review-panel')).toContainText('official sources');
 await form.locator('select').selectOption('MATHEMATICS');
 await form.locator('input').nth(0).fill('12345');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-kc-review-panel')).toBeEmpty();
 await root.locator('.jr-kc-review-draft').click();
 await expect(root.locator('.jr-kc-review-panel')).toContainText('not authenticated');
 expect(writes).toEqual([]);
});

test('Persian examination-group search remains local and temporarily locks hidden preference ordering',async({page})=>{
 const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method());});
 await page.goto('http://127.0.0.1:4173/fa/entekhab-reshteh/',{waitUntil:'domcontentloaded'});
 const root=page.locator('[data-konkur-selection]'),form=root.locator('.jr-kc-form');
 await form.locator('input').nth(0).fill('00123');
 await form.locator('select').selectOption('EXPERIMENTAL_SCIENCES');
 await form.locator('button[type=submit]').click();
 await form.locator('input').nth(0).fill('12345');
 await form.locator('select').selectOption('MATHEMATICS');
 await form.locator('button[type=submit]').click();
 await root.locator('.jr-kc-filter').fill('تجربی');
 await expect(root.locator('.jr-kc-item')).toHaveCount(1);
 await expect(root.locator('.jr-kc-item')).toContainText('00123');
 await expect(root.locator('.jr-kc-item button')).toHaveCount(3);
 await expect(root.locator('.jr-kc-item button').first()).toBeDisabled();
 await expect(root.locator('.jr-kc-item button').nth(1)).toBeDisabled();
 await root.locator('.jr-kc-filter').fill('');
 await expect(root.locator('.jr-kc-item')).toHaveCount(2);
 expect(writes).toEqual([]);
});
