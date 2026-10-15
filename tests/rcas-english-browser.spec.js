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
