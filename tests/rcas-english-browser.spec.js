const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
test('English RCAS has 28 items, 3 stages, seven evidence domains and no raw persistence',async({page})=>{
 const uploads=[];page.on('request',r=>{if(r.method()==='POST')uploads.push(r.url());});
 await page.goto(base+'/en/golden-talent/assessment/');
 const app=page.locator('#rcasEnForm');
 await expect(app.locator('#rcasEnCore .rcas-item')).toHaveCount(28);
 await expect(app.locator('#rcasEnRouting fieldset')).toHaveCount(7);
 await app.locator('[data-next="2"]').click();
 await expect(page.locator('#rcasEnStatus')).toContainText('educational stage');
 await app.locator('[name="edu"]').selectOption('University');
 await app.locator('[name="reason"][value="unclear"]').check();
 await app.locator('[name="mainQuestion"]').fill('How can I improve study strategies?');
 for(const select of await app.locator('#rcasEnAccess select').all())await select.selectOption('limited');
 await app.locator('[name="noEvidenceYet"]').check();
 await app.locator('[data-next="2"]').click();
 await expect(app.locator('.rcas-panel[data-step="2"]')).toBeVisible();
 await app.locator('[data-next="3"]').click();
 await expect(page.locator('#rcasEnStatus')).toContainText('Please answer A1');
 await app.locator('.rcas-item').evaluateAll(items=>items.forEach(x=>x.querySelector('input[value="UNKNOWN"]').click()));
 await app.locator('[data-next="3"]').click();
 await expect(app.locator('.rcas-panel[data-step="3"]')).toBeVisible();
 await app.locator('[name="priorityDomain"]').selectOption('D5');
 await app.locator('[name="priorityWhy"]').fill('a personal reason that is not stored');
 await app.locator('[data-show-route]').click();
 await expect(page.locator('#rcasEnStatus')).toContainText('domain A');
 await app.locator('#rcasEnRouting fieldset').evaluateAll(fields=>fields.forEach(x=>x.querySelector('input[value="insufficient"]').click()));
 await app.locator('[data-show-route]').click();
 await expect(page.locator('#rcasEnStatus')).toContainText('All 28 responses');
 await expect(app.locator('#rcasEnResult')).toBeHidden();
 expect(await page.evaluate(()=>sessionStorage.getItem('gt_rcas_state'))).toBeNull();
 await app.locator('.rcas-item').first().locator('input[value="3"]').evaluate(input=>input.click());
 await app.locator('[data-show-route]').click();
 await expect(page.locator('#rcasEnStatus')).toContainText('No domain has sufficient evidence');
 await app.locator('#rcasEnRouting fieldset').first().locator('input[value="compatible"]').evaluate(input=>input.click());
 await app.locator('[data-show-route]').click();
 await expect(app.locator('#rcasEnResult')).toBeVisible();
 await expect(app.locator('#rcasEnResult')).toContainText('D5');
 await expect(app.locator('#rcasEnResult')).toContainText('unvalidated translation pilot');
 const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('gt_rcas_state')));
 expect(stored).toMatchObject({completed:true,completedItemCount:28,route:'D5',
  routeBasis:'SELF_SELECTED_UNVALIDATED',rcasRevision:'start-en-pilot-1'});
 expect(JSON.stringify(stored)).not.toContain('personal reason');
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 expect(uploads).toEqual([]);
 await app.locator('[name="priorityWhy"]').fill('a revised reason');
 await expect(app.locator('#rcasEnResult')).toBeHidden();
 expect(await page.evaluate(()=>sessionStorage.getItem('gt_rcas_state'))).toBeNull();
});
for(const width of [320,360,390,430,768,1440]){
 test('English RCAS fits '+width+' pixel screens',async({page})=>{
  await page.setViewportSize({width,height:850});
  await page.goto(base+'/en/golden-talent/assessment/');
  const overflow=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('link[href*="jr-ecosystem-design-v2"]')).toHaveCount(1);
  await expect(page.locator('.rcas-panel[data-step="1"]')).toBeVisible();
 });
}

test('English dashboard supports the RCAS pilot summary',async({page})=>{
 await page.goto(base+'/en/golden-talent/dashboard/');
 await expect(page.locator('script[src*="rcas-dashboard-en-bridge.js"]')).toHaveCount(1);
 await expect(page.locator('[data-resource="student-dashboard"]')).toBeVisible();
 await expect(page.getByText('Your current-tab RCAS reflection')).toHaveCount(0);
});

test('English RCAS response controls retain accessible dimensions on desktop and mobile',async({page})=>{
 await page.goto(base+'/en/golden-talent/assessment/');
 const form=page.locator('#rcasEnForm');
 await form.locator('[name="edu"]').selectOption('University');
 await form.locator('[name="reason"][value="learn"]').check();
 await form.locator('[name="mainQuestion"]').fill('Which study practice should I review?');
 for(const select of await form.locator('#rcasEnAccess select').all())await select.selectOption('limited');
 await form.locator('[name="noEvidenceYet"]').check();
 await form.locator('[data-next="2"]').click();
 const first=form.locator('#rcasEnCore .rcas-item').first();
 await expect(first).toBeVisible();
 for(const [width,columns,minimumHeight] of [[1440,4,70],[390,2,76],[320,1,76]]){
  await page.setViewportSize({width,height:850});
  const data=await first.evaluate(item=>{
   const grid=item.querySelector('.rcas-scale');
   const span=grid.querySelector('label > span');
   const style=getComputedStyle(span);
   return {font:parseFloat(style.fontSize),height:span.getBoundingClientRect().height,
    lineHeight:parseFloat(style.lineHeight),
    columns:getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length,
    overflow:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth};
  });
  expect(data.font).toBeGreaterThanOrEqual(16);
  expect(data.height).toBeGreaterThanOrEqual(minimumHeight);
  expect(data.lineHeight).toBeGreaterThanOrEqual(27);
  expect(data.columns).toBe(columns);
  expect(data.overflow).toBeLessThanOrEqual(1);
 }
 await first.locator('input[type="radio"]').first().evaluate(el=>el.click());
 await expect(first.locator('input[type="radio"]').first()).toBeChecked();
 const selected=await first.locator('input[type="radio"]').first().evaluate(el=>getComputedStyle(el.nextElementSibling).borderTopWidth);
 expect(selected).toBe('2px');
});

test('English Golden Path never promotes a self-selected RCAS route into a verified result',async({page})=>{
 await page.goto(base+'/en/golden-talent/dashboard/golden-path/');
 const status=page.locator('[data-golden-path-session-status]');
 await expect(status).toContainText('No current-tab RCAS route');
 await page.evaluate(()=>sessionStorage.setItem('gt_rcas_state',JSON.stringify({
  completed:true,rcasRevision:'start-en-pilot-1',completedItemCount:28,
  p0Validated:true,routingEvidenceCompleted:true,
  routeBasis:'SELF_SELECTED_UNVALIDATED',route:'D5'
 })));
 await page.reload();
 await expect(status).toContainText('D5');
 await expect(status).toContainText('not a talent score');
 await page.evaluate(()=>sessionStorage.setItem('gt_rcas_state',JSON.stringify({
  completed:true,rcasRevision:'start-en-pilot-1',completedItemCount:28,
  p0Validated:true,routingEvidenceCompleted:true,
  routeBasis:'SELF_SELECTED_UNVALIDATED',route:'D9'
 })));
 await page.reload();
 await expect(status).toContainText('No current-tab RCAS route');
});
