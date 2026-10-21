const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
for(const [lang,path] of [['fa','/fa/entekhab-reshteh/'],['en','/en/student-guidance/']]){
test(lang+' provider-specific self-reported 1406 mock trends stay on page and preserve existing Studio',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url());});
 const response=await page.goto('http://127.0.0.1:4173'+path,{waitUntil:'domcontentloaded'});
 expect(response.status()).toBe(200);
 const root=page.locator('[data-konkur-mock-practice]');
 await expect(root.locator('form')).toBeVisible();
 await expect(page.locator('[data-choice-studio] .jr-cs-weight')).toHaveCount(5);
 const form=root.locator('form'),provider=form.locator('select').first(),group=form.locator('select').nth(1),inputs=form.locator('input');
 await provider.selectOption('GHALAMCHI');await group.selectOption('HUMANITIES');
 await inputs.nth(0).fill('1405/08/01');await inputs.nth(1).fill('۶۰۰۰');
 await inputs.nth(2).fill('1200');await inputs.nth(3).fill('ادبیات');
 await inputs.nth(4).fill('۶۵');await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(1);
 await expect(root.locator('.jr-km-item')).toContainText(new Intl.NumberFormat(lang==='fa'?'fa-IR':'en-US').format(6000));
 await inputs.nth(0).fill('1405/08/15');await inputs.nth(1).fill('6200');
 await inputs.nth(2).fill('1100');await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(2);
 await expect(root.locator('.jr-km-trend')).toContainText(new Intl.NumberFormat(lang==='fa'?'fa-IR':'en-US').format(200));
 await provider.selectOption('GAJ');await inputs.nth(0).fill('1405/08/29');
 await inputs.nth(1).fill('7000');await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(3);
 await expect(root.locator('.jr-km-trend')).not.toContainText('+1000');
 await root.locator('.jr-km-controls button').last().click();
 await expect(root.locator('.jr-km-item')).toHaveCount(0);
 expect(writes).toEqual([]);
});
}


test('provider directory includes additional research-labelled options in both locales',async({page})=>{
 await page.goto('http://127.0.0.1:4173/fa/entekhab-reshteh/',{waitUntil:'domcontentloaded'});
 const select=page.locator('[data-konkur-mock-practice] form select').first();
 for(const code of ['GHALAMCHI','GAJ','GOZINE2','MAZ','SANJESH_MOCK','VALEH','MOBTAKERAN','AYANDESAZAN','SCHOOL_LOCAL','OTHER'])
   await expect(select.locator('option[value="'+code+'"]')).toHaveCount(1);
 await select.selectOption('GOZINE2');
 await expect(select).toHaveValue('GOZINE2');
 await expect(page.locator('[data-konkur-mock-practice] form select').nth(3)).toHaveValue('UNSPECIFIED');
});


test('unknown local issuer cannot generate spurious score trends and grade cohorts remain separate',async({page})=>{
 await page.goto('http://127.0.0.1:4173/en/student-guidance/',{waitUntil:'domcontentloaded'});
 const root=page.locator('[data-konkur-mock-practice]'),form=root.locator('form');
 const provider=form.locator('select').nth(0),group=form.locator('select').nth(1),grade=form.locator('select').nth(2);
 const inputs=form.locator('input');
 await provider.selectOption('SCHOOL_LOCAL');await group.selectOption('MATHEMATICS');await grade.selectOption('11');
 await inputs.nth(0).fill('1405/07/01');await inputs.nth(1).fill('5500');
 await form.locator('button[type=submit]').click();
 await inputs.nth(0).fill('1405/07/15');await inputs.nth(1).fill('7300');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(2);
 await expect(root.locator('.jr-km-trend')).not.toContainText('1800');
 await provider.selectOption('GOZINE2');await grade.selectOption('10');
 await inputs.nth(0).fill('1405/08/01');await inputs.nth(1).fill('6300');
 await form.locator('button[type=submit]').click();
 await grade.selectOption('11');
 await inputs.nth(0).fill('1405/08/15');await inputs.nth(1).fill('7200');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-trend')).not.toContainText('900');
});

test('multiple subject percentages belong to a single mock exam and reject duplicate/invalid subject rows',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const writes=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))writes.push(r.method()+' '+r.url());});
 await page.goto('http://127.0.0.1:4173/fa/entekhab-reshteh/',{waitUntil:'domcontentloaded'});
 const root=page.locator('[data-konkur-mock-practice]'),form=root.locator('form');
 await form.locator('select').nth(0).selectOption('GHALAMCHI');
 await form.locator('select').nth(1).selectOption('EXPERIMENTAL_SCIENCES');
 const inputs=form.locator('input');
 await inputs.nth(0).fill('1405/09/01');
 await inputs.nth(3).fill('زیست');
 await inputs.nth(4).fill('75');
 await form.locator('.jr-km-add-subject').click();
 const extra=form.locator('.jr-km-extra-row');
 await expect(extra).toHaveCount(1);
 await extra.locator('.jr-km-extra-name').fill('شیمی');
 await extra.locator('.jr-km-extra-percent').fill('۶۵');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(1);
 await expect(root.locator('.jr-km-item')).toContainText('زیست');
 await expect(root.locator('.jr-km-item')).toContainText('شیمی');
 await expect(extra).toHaveCount(0);
 await inputs.nth(0).fill('1405/09/15');
 await inputs.nth(3).fill('زیست');
 await inputs.nth(4).fill('80');
 await form.locator('.jr-km-add-subject').click();
 await extra.locator('.jr-km-extra-name').fill('زیست');
 await extra.locator('.jr-km-extra-percent').fill('35');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(1);
 await extra.locator('.jr-km-extra-name').fill('فیزیک');
 await extra.locator('.jr-km-extra-percent').fill('۱۰۵');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(1);
 expect(writes).toEqual([]);
});

test('bounded negative-marking percentages remain local to the mock notebook',async({page})=>{
 const writes=[];page.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))writes.push(request.method());});
 await page.goto('http://127.0.0.1:4173/en/student-guidance/',{waitUntil:'domcontentloaded'});
 const root=page.locator('[data-konkur-mock-practice]'),form=root.locator('form'),inputs=form.locator('input');
 await form.locator('select').nth(0).selectOption('MAZ');
 await form.locator('select').nth(1).selectOption('MATHEMATICS');
 await inputs.nth(0).fill('1405/09/01');
 await inputs.nth(3).fill('Mathematics');
 await inputs.nth(4).fill('-12.5');
 await form.locator('.jr-km-add-subject').click();
 await form.locator('.jr-km-extra-name').fill('Physics');
 await form.locator('.jr-km-extra-percent').fill('−۳۳٫۳۴');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(1);
 await expect(root.locator('.jr-km-item')).toContainText('Mathematics');
 await expect(root.locator('.jr-km-item')).toContainText('Physics');
 await expect(root.locator('.jr-km-item')).toContainText('-12.5%');
 await inputs.nth(0).fill('1405/09/15');
 await inputs.nth(3).fill('Mathematics');
 await inputs.nth(4).fill('-33.35');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(1);
 expect(writes).toEqual([]);
});

test('subject-level descriptive changes require the same mock provider, group, grade and year',async({page})=>{
 await page.goto('http://127.0.0.1:4173/en/student-guidance/',{waitUntil:'domcontentloaded'});
 const root=page.locator('[data-konkur-mock-practice]'),form=root.locator('form');
 const provider=form.locator('select').nth(0),group=form.locator('select').nth(1),grade=form.locator('select').nth(2);
 const inputs=form.locator('input');
 await provider.selectOption('MAZ');await group.selectOption('HUMANITIES');await grade.selectOption('12');
 await inputs.nth(0).fill('1405/07/01');await inputs.nth(3).fill('Literature');await inputs.nth(4).fill('50');
 await form.locator('button[type=submit]').click();
 await inputs.nth(0).fill('1405/07/15');await inputs.nth(3).fill('Literature');await inputs.nth(4).fill('70');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-subject-trend')).toContainText('Literature');
 await expect(root.locator('.jr-km-subject-trend')).toContainText('+20');
 await expect(root.locator('.jr-km-trend')).toContainText('not proof of learning growth');
 await provider.selectOption('GAJ');
 await inputs.nth(0).fill('1405/08/01');await inputs.nth(3).fill('Literature');await inputs.nth(4).fill('90');
 await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-subject-trend')).toHaveCount(0);
});
