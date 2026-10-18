const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';

for(const [language,route] of [
 ['fa','/fa/entekhab-reshteh/'],
 ['en','/en/student-guidance/']
]){
 test(language+' study-path studio recomputes visible results, rejects incomplete input and protects privacy',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const response=await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const studio=page.locator('[data-choice-studio]');
  await expect(studio.locator('form')).toBeVisible();
  await expect(studio.locator('.jr-cs-weight')).toHaveCount(5);
  await expect(studio.locator('.jr-cs-path')).toHaveCount(2);
  await expect(studio.locator('.jr-cs-metric')).toHaveCount(0);
  const cards=studio.locator('.jr-cs-path');
  await cards.nth(0).locator('input[type="text"]').fill('Path A');
  await cards.nth(1).locator('input[type="text"]').fill('Path B');
  for(let c=0;c<2;c++){
   const selects=cards.nth(c).locator('select');
   await expect(selects).toHaveCount(5);
   for(let k=0;k<5;k++)await selects.nth(k).selectOption(c===0?'4':'2');
  }
  await expect(studio.locator('.jr-cs-metric')).toHaveCount(2);
  const initial=await studio.locator('.jr-cs-metric b').first().innerText();
  await cards.nth(0).locator('select').first().selectOption('5');
  await studio.locator('input[type="range"]').first().evaluate(el=>{
    el.value='5';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  const revised=await studio.locator('.jr-cs-metric b').first().innerText();
  expect(revised).not.toBe(initial);
  // Duplicated names must never produce a mathematically misleading ranking.
  await cards.nth(1).locator('input[type="text"]').fill('Path A');
  await expect(studio.locator('.jr-cs-metrics')).toBeHidden();
  await cards.nth(1).locator('input[type="text"]').fill('Path B');
  await expect(studio.locator('.jr-cs-metrics')).toBeVisible();
  // A required active criterion with unknown fit must suppress comparison.
  await cards.nth(0).locator('select').nth(1).selectOption('');
  await expect(studio.locator('.jr-cs-metrics')).toBeHidden();
  await cards.nth(0).locator('select').nth(1).selectOption('4');
  await expect(studio.locator('.jr-cs-metrics')).toBeVisible();
  for(const width of [320,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:850});
   const geometry=await studio.evaluate(el=>({
    client:el.clientWidth,scroll:el.scrollWidth
   }));
   expect(geometry.scroll,'choice studio horizontal overflow at '+width).toBeLessThanOrEqual(geometry.client+2);
  }
  await studio.locator('.jr-cs-reset').click();
  await expect(cards.nth(0).locator('input[type="text"]')).toHaveValue('');
  await expect(studio.locator('.jr-cs-metrics')).toBeHidden();
  // The worksheet deliberately has no cross-visit persistence.
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-choice-studio] input[type="text"]').first()).toHaveValue('');
 });
}
