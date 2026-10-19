const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const paths={
 fa:{golden:'/fa/golden-talent/',rcas:'/fa/assessments/golden-talent/start/',bahar:'/fa/app/student/bahar/'},
 en:{golden:'/en/golden-talent/',rcas:'/en/golden-talent/assessment/',bahar:'/en/golden-talent/dashboard/bahar/'}
};
for(const [lang,urls] of Object.entries(paths)){
 test(lang+' scientific pathway links the real free pages without moving evidence text',async({page})=>{
  let submitted=[];
  page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))submitted.push(r.url());});
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+urls.golden);
  const nav=page.locator('[data-science-continuity]');
  await expect(nav).toBeVisible();
  await expect(nav.locator('li')).toHaveCount(3);
  const input=page.locator('[data-gt-evidence-form] textarea[name="question"]');
  await input.fill('Privacy-safe unshared example, not a stored record');
  await nav.locator('a[href="'+urls.rcas+'"]').click();
  await expect(page).toHaveURL(base+urls.rcas);
  const rcasMain=lang==='fa'?page.locator('textarea[name="mainQuestion"]'):page.locator('textarea[name="mainQuestion"]');
  await expect(rcasMain).toHaveValue('');
  await page.locator('[data-science-continuity] a[href="'+urls.bahar+'#baharWorkingPlan"]').click();
  await expect(page).toHaveURL(base+urls.bahar+'#baharWorkingPlan');
  await expect(page.locator('[data-bahar-formative]')).toBeVisible();
  await expect(page.locator('[data-bahar-formative] textarea[name="goal"]')).toHaveValue('');
  expect(await page.evaluate(()=>location.search)).toBe('');
  expect(submitted).toEqual([]);
 });

 test(lang+' BAHAR seven-day diary creates a printable review without uploading or scoring',async({page})=>{
  const submitted=[],errors=[];
  page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))submitted.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+urls.bahar);
  const root=page.locator('[data-bahar-formative]');
  await expect(root.locator('[data-bahar-week-day]')).toHaveCount(7);
  const dailyCount=root.locator('[data-bahar-week-count]');
  await expect(dailyCount).toContainText(lang==='fa'?'۰ / ۷':'0 / 7');
  const goal=lang==='fa'?'تقویت پایش یادگیری':'Improve evidence-based learning habits';
  await root.locator('textarea[name="goal"]').fill(goal);
  const day1=root.locator('[data-bahar-week-day]').first();
  await day1.locator('[data-bahar-week-tried]').fill('A short retrieval-practice task');
  await day1.locator('[data-bahar-week-observed]').fill('<img src=x onerror=alert(1)> Was able to recall one definition');
  await day1.locator('[data-bahar-week-uncertain]').fill('Only one occasion, independent check needed');
  await expect(dailyCount).toContainText(lang==='fa'?'۱ / ۷':'1 / 7');
  await root.locator('button[type="submit"]').click();
  const report=root.locator('[data-bahar-plan-result]');
  await expect(report).toBeVisible();
  await expect(report).toContainText(goal);
  await expect(report).toContainText('A short retrieval-practice task');
  await expect(report).toContainText('Only one occasion');
  await expect(report).toContainText(lang==='fa'?'روزهای خالی':'Missing days');
  await expect(report.locator('img')).toHaveCount(0);
  await expect(root.locator('[data-bahar-print]')).toBeVisible();
  await page.evaluate(()=>{window.__printCount=0;window.print=()=>{window.__printCount++;};});
  await root.locator('[data-bahar-print]').click();
  expect(await page.evaluate(()=>window.__printCount)).toBe(1);
  await expect(root.locator('[data-bahar-week-day]')).toHaveCount(7);
  // Editing a day invalidates a previously generated report.
  await root.locator('[data-bahar-week-day]').nth(1).locator('[data-bahar-week-observed]').fill('Second day recorded');
  await expect(report).toBeHidden();
  await expect(root.locator('[data-bahar-print]')).toBeHidden();
  await root.locator('button[type="submit"]').click();
  await expect(report).toContainText('Second day recorded');
  await expect(dailyCount).toContainText(lang==='fa'?'۲ / ۷':'2 / 7');
  await root.locator('[data-bahar-clear]').click();
  await expect(dailyCount).toContainText(lang==='fa'?'۰ / ۷':'0 / 7');
  await expect(root.locator('[data-bahar-week-tried]').first()).toHaveValue('');
  await expect(root.locator('[data-bahar-week-observed]').first()).toHaveValue('');
  await expect(report).toBeHidden();
  await expect(root.locator('[data-bahar-print]')).toBeHidden();
  expect(submitted).toEqual([]);
  expect(errors).toEqual([]);
 });

 test(lang+' BAHAR stays within its own mobile width and drops entries on reload',async({page})=>{
  await page.setViewportSize({width:320,height:720});
  await page.goto(base+urls.bahar);
  const root=page.locator('[data-bahar-formative]');
  const input=root.locator('[data-bahar-week-day]').first().locator('textarea').first();
  await expect(input).toHaveAttribute('maxlength','240');
  await input.fill('One temporary learning note');
  for(const width of [320,360,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:830});
   const dims=await root.locator('[data-bahar-weekly]').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
   expect(dims.scroll,'diary horizontal overflow at '+width).toBeLessThanOrEqual(dims.client+3);
  }
  await page.reload();
  await expect(page.locator('[data-bahar-week-count]')).toContainText(lang==='fa'?'۰ / ۷':'0 / 7');
  await expect(page.locator('[data-bahar-week-day] textarea').first()).toHaveValue('');
  await expect(page.locator('[data-bahar-plan-result]')).toBeHidden();
 });
}
