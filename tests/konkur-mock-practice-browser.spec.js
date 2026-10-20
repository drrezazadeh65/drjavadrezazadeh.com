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
 await expect(root.locator('.jr-km-item')).toContainText('6000');
 await inputs.nth(0).fill('1405/08/15');await inputs.nth(1).fill('6200');
 await inputs.nth(2).fill('1100');await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(2);
 await expect(root.locator('.jr-km-trend')).toContainText('200');
 await provider.selectOption('GAJ');await inputs.nth(0).fill('1405/08/29');
 await inputs.nth(1).fill('7000');await form.locator('button[type=submit]').click();
 await expect(root.locator('.jr-km-item')).toHaveCount(3);
 await expect(root.locator('.jr-km-trend')).not.toContainText('+1000');
 await root.locator('.jr-km-controls button').last().click();
 await expect(root.locator('.jr-km-item')).toHaveCount(0);
 expect(writes).toEqual([]);
});
}
