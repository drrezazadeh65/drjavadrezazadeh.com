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

for(const [language,home,destination] of [
 ['fa','/fa/','/fa/entekhab-reshteh/#jr-choice-studio-fa-title'],
 ['en','/en/','/en/student-guidance/#jr-choice-studio-en-title']
]){
 test(language+' homepage uses editorial discovery to open the real studio',async({page})=>{
  await page.setViewportSize({width:320,height:740});
  const response=await page.goto(origin+home,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const section=page.locator('.jr-choice-discovery');
  await expect(section).toBeVisible();
  const dimensions=await section.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client+2);
  await expect(section.locator('ol>li')).toHaveCount(4);
  const cta=section.locator('a.jr-cd-action');
  await expect(cta).toHaveAttribute('href','./'+destination.slice(home.length));
  await cta.click();
  await expect(page).toHaveURL(origin+destination);
  await expect(page.locator('[data-choice-studio] form')).toBeVisible();
 });
}


for(const [language,route] of [
 ['fa','/fa/entekhab-reshteh/'],
 ['en','/en/student-guidance/']
]){
 test(language+' Choice Studio v4 preserves preference mathematics through accessible reorder',async({page})=>{
  const errors=[],writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.method()!=='GET'&&request.method()!=='HEAD')writes.push(request.url());});
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  const studio=page.locator('[data-choice-studio]');
  await expect(studio).toHaveClass(/jr-cs-v4/);
  const ids=()=>studio.locator('.jr-cs-weight').evaluateAll(items=>items.map(x=>x.dataset.factorId));
  expect(await ids()).toEqual(['interest','requirements','finances','location','flexibility']);
  const weights=studio.locator('.jr-cs-weight input[type="range"]');
  await weights.first().evaluate(input=>{
   input.value='5';input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  const cards=studio.locator('.jr-cs-path');
  await cards.nth(0).locator('input[type=text]').fill('Course Alpha');
  await cards.nth(1).locator('input[type=text]').fill('Course Beta');
  for(let i=0;i<5;i++){
   await cards.nth(0).locator('select').nth(i).selectOption(i===0?'5':'1');
   await cards.nth(1).locator('select').nth(i).selectOption('3');
  }
  const before=await studio.locator('.jr-cs-metric b').allInnerTexts();
  await studio.locator('.jr-cs-weight').first().locator('.jr-cs-move-down').click();
  expect(await ids()).toEqual(['requirements','interest','finances','location','flexibility']);
  const after=await studio.locator('.jr-cs-metric b').allInnerTexts();
  expect(after).toEqual(before,'visual ordering must never change the original weighting');
  const feedback=studio.locator('.jr-cs-interpreted-result');
  await studio.locator('.jr-cs-show-result').click();
  await expect(feedback).toBeVisible();
  await expect(feedback.locator('.jr-cs-report-evidence li').first()).toContainText(language==='fa'?'علاقه':'Interest');
  await expect(feedback.locator('.jr-cs-report-evidence li').first()).toContainText(language==='fa'?'۵':'5');
  const handle=studio.locator('.jr-cs-weight').nth(1).locator('.jr-cs-drag-handle');
  await handle.focus();await page.keyboard.press('ArrowDown');
  expect(await ids()).toEqual(['requirements','finances','interest','location','flexibility']);
  // Reordering does not modify preferences; the descriptive report stays valid.
  await expect(feedback).toBeVisible();
  await expect(feedback.locator('.jr-cs-report-index b').first()).toBeVisible();
  const overflow=await studio.evaluate(element=>element.scrollWidth-element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  expect(writes).toEqual([]);expect(errors).toEqual([]);
 });
 test(language+' Choice Studio v4 opt-in remembers weights alone, resets sensitive responses',async({page})=>{
  await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  const studio=page.locator('[data-choice-studio]');
  const persist=studio.locator('.jr-cs-persist-label input');
  await expect(persist).not.toBeChecked();
  await studio.locator('.jr-cs-path input[type=text]').first().fill('Private pathway information');
  await studio.locator('.jr-cs-weight').first().locator('input[type=range]').evaluate(el=>{
   el.value='5';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  // No storage is permitted before a distinct, active opt-in.
  expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('jr-choice-weights-v4-')))).toEqual([]);
  await persist.check();
  let stored=await page.evaluate(()=>Object.entries(sessionStorage)
   .filter(([key])=>key.startsWith('jr-choice-weights-v4-')));
  expect(stored).toHaveLength(1);
  expect(stored[0][1]).not.toContain('Private pathway information');
  const snapshot=JSON.parse(stored[0][1]);
  expect(snapshot).toEqual({version:4,weights:[5,3,3,3,3],
   order:['interest','requirements','finances','location','flexibility']});
  await page.reload({waitUntil:'domcontentloaded'});
  const refreshed=page.locator('[data-choice-studio]');
  await expect(refreshed.locator('.jr-cs-persist-label input')).toBeChecked();
  await expect(refreshed.locator('.jr-cs-weight').first().locator('input[type=range]')).toHaveValue('5');
  await expect(refreshed.locator('.jr-cs-path input[type=text]').first()).toHaveValue('');
  await expect(refreshed.locator('.jr-cs-path select').first()).toHaveValue('');
  await expect(refreshed.locator('.jr-cs-interpreted-result')).toBeHidden();
  await refreshed.locator('.jr-cs-reset').click();
  await expect(refreshed.locator('.jr-cs-persist-label input')).not.toBeChecked();
  expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('jr-choice-weights-v4-')))).toEqual([]);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('.jr-cs-weight').first().locator('input[type=range]')).toHaveValue('3');
 });
}
