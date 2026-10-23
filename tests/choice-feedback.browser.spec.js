const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
for(const [locale,route] of [['fa','/fa/entekhab-reshteh/'],['en','/en/student-guidance/']]){
 test(locale+' study-path tabs offer seven real groupings with keyboard and do not invent scores',async({page})=>{
  const writes=[],errors=[];
  page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.url());});
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:390,height:844});
  const response=await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const studio=page.locator('[data-choice-studio]');
  await expect(studio).toHaveAttribute('data-choice-feedback','ready');
  const tabs=studio.getByRole('tab');
  await expect(tabs).toHaveCount(7);
  await expect(tabs.first()).toHaveAttribute('aria-selected','true');
  const feedback=studio.locator('.jr-cs-interpreted-result');
  await expect(feedback).toBeHidden();
  const open=locale==='fa'?'زبان':'Languages';
  await tabs.filter({hasText:open}).click();
  await expect(tabs.filter({hasText:open})).toHaveAttribute('aria-selected','true');
  const group=studio.getByRole('tabpanel');
  await expect(group).toContainText(locale==='fa'?'آموزش زبان انگلیسی':'English language teaching');
  await tabs.filter({hasText:open}).focus();
  await page.keyboard.press('End');
  await expect(tabs.last()).toHaveAttribute('aria-selected','true');
  await page.keyboard.press('Home');
  await expect(tabs.first()).toHaveAttribute('aria-selected','true');
  const choices=studio.locator('.jr-cs-example');
  await expect(choices).toHaveCount(4);
  await choices.nth(0).locator('button').first().click();
  const names=studio.locator('.jr-cs-path input[type="text"]');
  await expect(names.first()).not.toHaveValue('');
  await expect(feedback).toBeHidden();
  // Second pathway comes from another tab, not a forced same-group pair.
  await tabs.nth(2).click();
  await studio.locator('.jr-cs-example').nth(1).locator('button').nth(1).click();
  await expect(names.nth(1)).not.toHaveValue('');
  const action=studio.locator('.jr-cs-show-result');
  await action.click();
  await expect(feedback).toBeHidden();
  await expect(studio.locator('.jr-cs-live')).toContainText(locale==='fa'?'معیار':'criterion');
  const cards=studio.locator('.jr-cs-path');
  for(let c=0;c<2;c++)
   for(let n=0;n<5;n++)await cards.nth(c).locator('select').nth(n).selectOption(c===0?'4':'2');
  await action.click();
  await expect(feedback).toBeVisible();
  await expect(action).toHaveAttribute('aria-expanded','true');
  await expect(feedback.locator('.jr-cs-report-index')).toHaveCount(2);
  await expect(feedback.locator('.jr-cs-report-evidence > ul > li')).toHaveCount(5);
  await expect(feedback.locator('.jr-cs-report-priorities li')).toHaveCount(2);
  await expect(feedback.locator('.jr-cs-report-priorities')).toContainText(locale==='fa'?'اولویت بررسی':'Priority check');
  await expect(feedback.locator('.jr-cs-report-next li')).toHaveCount(4);
  await expect(feedback).toContainText(locale==='fa'?'محدودیت علمی':'Scientific limitation');
  await expect(feedback.locator('.jr-cs-report-links a')).toHaveCount(3);
  await expect(feedback.locator('.jr-cs-report-links a').last()).toHaveAttribute('href',locale==='fa'?'/fa/darkhast-moshavere/':'/en/request-consultation/');
  const print=studio.locator('.jr-cs-report-print');
  await expect(print).toBeVisible();
  await page.evaluate(()=>{window.__printTimes=0;window.print=()=>{window.__printTimes++}});
  await print.click();
  expect(await page.evaluate(()=>window.__printTimes)).toBe(1);
  // A changed rating invalidates previously generated guidance.
  await cards.first().locator('select').first().selectOption('5');
  await expect(feedback).toBeHidden();
  await expect(print).toBeHidden();
  await action.click();
  await expect(feedback).toBeVisible();
  await studio.locator('.jr-cs-reset').click();
  await expect(feedback).toBeHidden();
  await expect(names.first()).toHaveValue('');
  await expect(action).toHaveAttribute('aria-expanded','false');
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
 });
 test(locale+' choice guidance tabs and report fit mobile-to-desktop without persistent answers',async({page})=>{
  await page.setViewportSize({width:320,height:780});
  await page.goto(origin+route);
  const studio=page.locator('[data-choice-studio]');
  for(const width of [320,360,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:850});
   const dims=await studio.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
   expect(dims.scroll,'tab studio overflow at '+width).toBeLessThanOrEqual(dims.client+3);
   const height=await studio.getByRole('tab').first().evaluate(el=>el.getBoundingClientRect().height);
   expect(height,'tabs should remain usable touch targets').toBeGreaterThanOrEqual(44);
  }
  const names=studio.locator('.jr-cs-path input[type="text"]');
  await names.first().fill('One temporary answer');
  await page.reload();
  await expect(page.locator('[data-choice-studio] .jr-cs-path input[type="text"]').first()).toHaveValue('');
  await expect(page.locator('.jr-cs-interpreted-result')).toBeHidden();
 });
}