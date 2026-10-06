const {test,expect}=require('@playwright/test');

const base='http://127.0.0.1:4173';
const viewports=[
  ['mobile-320',320,800],
  ['mobile-360',360,800],
  ['mobile-390',390,844],
  ['mobile-430',430,932],
  ['desktop-1280',1280,800],
  ['desktop-1366',1366,768],
  ['desktop-1440',1440,900],
  ['desktop-1600',1600,900],
  ['desktop-1920',1920,1080]
];
const coreRoutes=['/','/fa/','/en/','/fa/rahnamaha/','/fa/rahnamaha/moghayese-reshteha-ba-matris-tasmim/','/en/publications/'];

for(const [label,width,height] of viewports){
  test(label+' core public layout',async({page})=>{
    await page.setViewportSize({width,height});
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    for(const route of coreRoutes){
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      await expect(page.locator('h1')).toHaveCount(1);
      const overflow=await page.evaluate(()=>({
        viewport:window.innerWidth,
        html:document.documentElement.scrollWidth,
        body:document.body.scrollWidth
      }));
      expect(Math.max(overflow.html,overflow.body),route+' horizontal overflow at '+label).toBeLessThanOrEqual(overflow.viewport+1);
      const main=page.locator('main').first();
      await expect(main).toBeVisible();
      const skip=page.locator('a.skip, a.skip-link').first();
      if(await skip.count()) await expect(skip).toHaveAttribute('href',/^#/);
    }
    expect(errors,'uncaught page errors at '+label).toEqual([]);
  });
}

test('Persian public search v2 works without private leakage',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/fa/jostojo/',{waitUntil:'networkidle'});
  const input=page.locator('[data-site-search] input[type="search"]');
  await expect(input).toBeVisible();
  await input.fill('استعداد');
  await page.waitForTimeout(250);
  const results=page.locator('[data-search-results] a');
  await expect(results.first()).toBeVisible();
  const hrefs=await results.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')||''));
  for(const href of hrefs){
    expect(href).not.toMatch(/(?:login|register|account|assessment|checkout|darkhast-moshavere|request-consultation)/i);
  }
  await page.locator('[data-search-clear]').click();
  await expect(input).toHaveValue('');
});

test('keyboard focus reaches primary public navigation',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/en/',{waitUntil:'domcontentloaded'});
  await page.keyboard.press('Tab');
  const focused=await page.evaluate(()=>({
    tag:document.activeElement?.tagName,
    href:document.activeElement?.getAttribute?.('href')||'',
    text:(document.activeElement?.textContent||'').trim().slice(0,80)
  }));
  expect(focused.tag).toBe('A');
  expect(focused.href).toMatch(/^#/);
});

for(const [route,name] of [['/fa/','fa-home'],['/en/','en-home'],['/fa/rahnamaha/moghayese-reshteha-ba-matris-tasmim/','fa-guide']]){
  test('visual evidence '+name,async({page})=>{
    for(const [label,width,height] of [['mobile-390',390,844],['desktop-1440',1440,900]]){
      await page.setViewportSize({width,height});
      await page.goto(base+route,{waitUntil:'networkidle'});
      await page.screenshot({path:'test-results/screenshots/'+name+'-'+label+'.png',fullPage:true});
    }
  });
}
