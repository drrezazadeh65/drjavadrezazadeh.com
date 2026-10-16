const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const editions=[['fa','/fa/app/student/bahar/'],['en','/en/golden-talent/dashboard/bahar/']];
for(const [lang,url] of editions){
  test(lang+' BAHAR free action sheet works without uploading answers',async({page})=>{
    const posts=[];
    page.on('request',r=>{if(r.method()!=='GET'&&r.method()!=='HEAD')posts.push(r.url());});
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+url);
    const root=page.locator('[data-bahar-formative]');
    await expect(root).toBeVisible();
    await expect(root.locator('[data-bahar-plan-result]')).toBeHidden();
    const goal=lang==='fa'?'بهبود نظم مطالعه هفتگی':'Improve my weekly learning routine';
    await root.locator('textarea[name="goal"]').fill(goal);
    await root.locator('textarea[name="action"]').fill(lang==='fa'?'سه بار مرور کوتاه':'Three short review sessions');
    await root.locator('[data-bahar-add-evidence]').click();
    await expect(root.locator('[data-bahar-evidence-entry]')).toHaveCount(1);
    await root.locator('[data-bahar-evidence-entry] input').fill('Practice journal');
    await root.locator('[data-bahar-evidence-entry] textarea').fill('Two sessions completed');
    await root.locator('button[type="submit"]').click();
    const result=root.locator('[data-bahar-plan-result]');
    await expect(result).toBeVisible();
    await expect(result).toContainText(goal);
    await expect(result).toContainText('Two sessions completed');
    await expect(root.locator('[data-bahar-copy]')).toBeVisible();
    expect(posts).toEqual([]);
    await page.reload();
    await expect(page.locator('textarea[name="goal"]')).toHaveValue('');
    await expect(page.locator('[data-bahar-plan-result]')).toBeHidden();
  });
  test(lang+' BAHAR privacy reset and hostile-text display',async({page})=>{
    await page.goto(base+url);
    const form=page.locator('[data-bahar-formative]');
    await form.locator('textarea[name="goal"]').fill('<img src=x onerror=alert(1)> educational sample');
    await form.locator('button[type="submit"]').click();
    await expect(form.locator('[data-bahar-plan-result]')).toContainText('<img src=x onerror=alert(1)>');
    await expect(form.locator('[data-bahar-plan-result] img')).toHaveCount(0);
    await form.locator('[data-bahar-clear]').click();
    await expect(form.locator('textarea[name="goal"]')).toHaveValue('');
    await expect(form.locator('[data-bahar-plan-result]')).toBeHidden();
    await expect(form.locator('[data-bahar-copy]')).toBeHidden();
  });
  test(lang+' BAHAR mobile evidence limit and layout',async({page})=>{
    await page.setViewportSize({width:360,height:780});
    await page.goto(base+url);
    const root=page.locator('[data-bahar-formative]');
    for(let i=0;i<5;i++)await root.locator('[data-bahar-add-evidence]').click();
    await expect(root.locator('[data-bahar-evidence-entry]')).toHaveCount(5);
    await expect(root.locator('[data-bahar-add-evidence]')).toBeDisabled();
    await root.locator('[data-bahar-remove-evidence]').first().click();
    await expect(root.locator('[data-bahar-evidence-entry]')).toHaveCount(4);
    await expect(root.locator('[data-bahar-add-evidence]')).toBeEnabled();
    await expect(root.locator('textarea[name="goal"]')).toHaveAttribute('maxlength','480');
  });
}
