const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const start='/fa/assessments/golden-talent/start/';
test('RCAS Start requires all 28 items, preserves privacy and routes without scoring',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(base+start);
  await page.locator('[data-next="2"]').click();
  await expect(page.locator('#rcasCore .rcas-item')).toHaveCount(28);
  await expect(page.locator('#rcasCoreStatus')).toContainText('0 از ۲۸');
  await page.locator('[data-next="3"]').click();
  await expect(page.locator('.rcas-panel[data-step="2"]')).toHaveClass(/active/);
  await expect(page.locator('#rcasCoreStatus')).toContainText('۲۸ گزاره');
  for(const fieldset of await page.locator('#rcasCore .rcas-item').all()){
    await fieldset.locator('input[type="radio"]').first().check();
  }
  await expect(page.locator('#rcasCoreStatus')).toContainText('28 از ۲۸');
  await page.locator('[data-next="3"]').click();
  await expect(page.locator('.rcas-panel[data-step="3"]')).toHaveClass(/active/);
  await page.locator('#priorityDomain').selectOption('D5');
  const userText='<img src=x onerror=alert(1)> &#39; an actual learner statement';
  await page.locator('#priorityWhy').fill(userText);
  await page.locator('#showRoute').click();
  await expect(page.locator('#rcasResult')).toContainText('D5');
  await expect(page.locator('#rcasResult .rcas-user-note span')).toHaveText(userText);
  await expect(page.locator('#rcasResult img')).toHaveCount(0);
  await expect(page.locator('#rcasResult a[href="/fa/shop/golden-talent/#professional-services"]')).toHaveCount(1);
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('gt_rcas_state')));
  expect(stored).toMatchObject({
    completed:true,rcasRevision:'start-1.1',completedItemCount:28,
    route:'D5',routeBasis:'SELF_SELECTED_UNVALIDATED'
  });
  expect(JSON.stringify(stored)).not.toContain(userText);
  expect(JSON.stringify(stored)).not.toContain('answers');
  expect(errors).toEqual([]);
  await page.locator('#clearRcasSummary').click();
  expect(await page.evaluate(()=>sessionStorage.getItem('gt_rcas_state'))).toBe(null);
  await expect(page.locator('#rcasResult')).toBeHidden();
});
test('RCAS Start cannot generate routing or completion without domain selection',async({page})=>{
  await page.goto(base+start);
  await page.locator('[data-next="2"]').click();
  for(const fieldset of await page.locator('#rcasCore .rcas-item').all()){
    await fieldset.locator('input[type="radio"]').last().check(); // NA counts as answered, not zero
  }
  await page.locator('[data-next="3"]').click();
  await page.locator('#showRoute').click();
  await expect(page.locator('#rcasResult')).toContainText('D1 تا D6');
  expect(await page.evaluate(()=>sessionStorage.getItem('gt_rcas_state'))).toBe(null);
});
