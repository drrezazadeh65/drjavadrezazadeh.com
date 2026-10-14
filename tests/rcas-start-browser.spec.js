const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const start='/fa/assessments/golden-talent/start/';
const sourceState=()=>sessionStorage.getItem('gt_rcas_state');

async function completeP0(page,{withoutEvidence=false}={}){
  await page.locator('[name="edu"]').selectOption({label:'متوسطه اول'});
  await page.locator('[name="reason"][value="unclear"]').check();
  await page.locator('textarea[name="mainQuestion"]').fill('برای هشت هفته آینده چه شواهدی جمع کنم؟');
  for(const access of await page.locator('#rcasAccess select').all())
    await access.selectOption({label:'در دسترس'});
  if(withoutEvidence)
    await page.locator('input[name="noEvidenceYet"]').check();
  else
    await page.locator('textarea[name="evidence1"]').fill('هفته گذشته یک مسئله درسی را با تلاش خود حل کردم.');
}
async function answerCore(page,{skipLast=false,allUnknown=false}={}){
  await page.locator('#rcasCore .rcas-item').evaluateAll((items,options)=>{
    items.forEach((item,index)=>{
      if(options.skipLast&&index===items.length-1)return;
      const inputs=item.querySelectorAll('input[type="radio"]');
      (options.allUnknown?inputs[inputs.length-1]:inputs[0]).click();
    });
  },{skipLast,allUnknown});
}
async function answerRouting(page,{noEvidence=false}={}){
  await page.locator('#rcasRouting fieldset').evaluateAll((rows,noEvidence)=>{
    for(const row of rows){
      const inputs=row.querySelectorAll('input[type="radio"]');
      (noEvidence?inputs[inputs.length-1]:inputs[0]).click();
    }
  },noEvidence);
}

test('RCAS rejects completely blank P0, prevents hidden-step bypass and requires Core 28 and R1 evidence',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(base+start);
  await expect(page.locator('.rcas-panel[data-step="1"]')).toHaveClass(/active/);
  await expect(page.locator('#rcasProgressBar')).toHaveCSS('width','0px');
  await page.locator('[data-next="2"]').click();
  await expect(page.locator('.rcas-panel[data-step="1"]')).toHaveClass(/active/);
  await expect(page.locator('#rcasP0Status')).toContainText('P0 هنوز کامل نیست');
  await page.evaluate(()=>document.querySelector('[data-next="3"]').click());
  await expect(page.locator('.rcas-panel[data-step="1"]')).toHaveClass(/active/);
  expect(await page.evaluate(sourceState)).toBeNull();
  await completeP0(page);
  await page.locator('[data-next="2"]').click();
  await expect(page.locator('#rcasCore .rcas-item')).toHaveCount(28);
  await expect(page.locator('#rcasCoreStatus')).toContainText('0 از ۲۸');
  await page.locator('[data-next="3"]').click();
  await expect(page.locator('.rcas-panel[data-step="2"]')).toHaveClass(/active/);
  await expect(page.locator('#rcasCoreStatus')).toContainText('۲۸ گزاره');
  await answerCore(page,{skipLast:true});
  await expect(page.locator('#rcasCoreStatus')).toContainText('27 از ۲۸');
  await page.locator('[data-next="3"]').click();
  await expect(page.locator('.rcas-panel[data-step="2"]')).toHaveClass(/active/);
  await page.locator('#rcasCore .rcas-item').last().evaluate(item=>
    item.querySelector('input[value="UNKNOWN"]').click());
  await expect(page.locator('#rcasCoreStatus')).toContainText('28 از ۲۸');
  await page.locator('[data-next="3"]').click();
  await expect(page.locator('.rcas-panel[data-step="3"]')).toHaveClass(/active/);
  // Merely choosing a domain and writing a reason must not bypass R1.
  await page.locator('#priorityDomain').selectOption('D5');
  const userText='<img src=x onerror=alert(1)> &#39; an actual learner statement';
  await page.locator('#priorityWhy').fill(userText);
  await page.locator('#showRoute').click();
  await expect(page.locator('#rcasResult')).toBeHidden();
  await expect(page.locator('#rcasRouteStatus')).toContainText('هر هفت حوزه');
  expect(await page.evaluate(sourceState)).toBeNull();
  await answerRouting(page);
  await page.locator('#showRoute').click();
  await expect(page.locator('#rcasResult')).toBeVisible();
  await expect(page.locator('#rcasResult')).toContainText('D5');
  await expect(page.locator('#rcasResult .rcas-user-note span')).toHaveText(userText);
  await expect(page.locator('#rcasResult img')).toHaveCount(0);
  await expect(page.locator('#rcasResult a[href="/fa/shop/golden-talent/#professional-services"]')).toHaveCount(1);
  const stored=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('gt_rcas_state')));
  expect(stored).toMatchObject({
    completed:true,rcasRevision:'start-1.2',completedItemCount:28,
    p0Validated:true,routingEvidenceCompleted:true,meaningfulCoreEvidence:true,
    route:'D5',routeBasis:'SELF_SELECTED_UNVALIDATED'
  });
  expect(JSON.stringify(stored)).not.toContain(userText);
  expect(JSON.stringify(stored)).not.toContain('answers');
  expect(errors).toEqual([]);
  // Editing any completed answer removes stale dashboard completion.
  await page.locator('#priorityWhy').fill('دلیل جدید من برای انتخاب این حوزه');
  await expect(page.locator('#rcasResult')).toBeHidden();
  expect(await page.evaluate(sourceState)).toBeNull();
  await page.locator('#showRoute').click();
  await expect(page.locator('#rcasResult')).toBeVisible();
  await page.locator('#clearRcasSummary').click();
  expect(await page.evaluate(sourceState)).toBeNull();
  await expect(page.locator('#rcasResult')).toBeHidden();
});

test('RCAS cannot issue a route when all 28 answers are UNKNOWN, despite selected D1–D6',async({page})=>{
  await page.goto(base+start);
  await completeP0(page,{withoutEvidence:true}); // Honest no-evidence statement is allowed.
  await page.locator('[data-next="2"]').click();
  await answerCore(page,{allUnknown:true});
  await page.locator('[data-next="3"]').click();
  await answerRouting(page);
  await page.locator('#priorityDomain').selectOption('D2');
  await page.locator('#priorityWhy').fill('هنوز شواهد کافی ندارم؛ می‌خواهم بررسی کنم');
  await page.locator('#showRoute').click();
  await expect(page.locator('#rcasResult')).toBeHidden();
  await expect(page.locator('#rcasRouteStatus')).toContainText('۲۸ پاسخ');
  expect(await page.evaluate(sourceState)).toBeNull();
});

test('RCAS rejects R1 without evidence and never restores stale completed state on a blank visit',async({page})=>{
  await page.goto(base+start);
  await page.evaluate(()=>sessionStorage.setItem('gt_rcas_state',JSON.stringify({
    completed:true,rcasRevision:'start-1.2',completedItemCount:28,route:'D5',
    p0Validated:true,routingEvidenceCompleted:true,meaningfulCoreEvidence:true,
    routeBasis:'SELF_SELECTED_UNVALIDATED'
  })));
  await page.reload();
  expect(await page.evaluate(sourceState)).toBeNull();
  await completeP0(page);
  await page.locator('[data-next="2"]').click();
  await answerCore(page);
  await page.locator('[data-next="3"]').click();
  await answerRouting(page,{noEvidence:true});
  await page.locator('#priorityDomain').selectOption('D5');
  await page.locator('#priorityWhy').fill('می‌خواهم در این حوزه اطلاعات بیشتری پیدا کنم');
  await page.locator('#showRoute').click();
  await expect(page.locator('#rcasResult')).toBeHidden();
  await expect(page.locator('#rcasRouteStatus')).toContainText('شاهد کافی');
  expect(await page.evaluate(sourceState)).toBeNull();
});

test('RCAS blocks an otherwise completed P0 when the learner omits access/context responses',async({page})=>{
  await page.goto(base+start);
  await page.locator('[name="edu"]').selectOption({label:'متوسطه اول'});
  await page.locator('[name="reason"][value="unclear"]').check();
  await page.locator('textarea[name="mainQuestion"]').fill('سؤال اصلی من چیست؟');
  await page.locator('input[name="noEvidenceYet"]').check();
  await page.locator('[data-next="2"]').click();
  await expect(page.locator('.rcas-panel[data-step="1"]')).toHaveClass(/active/);
  await expect(page.locator('#rcasP0Status')).toContainText('هشت مورد دسترسی');
});
