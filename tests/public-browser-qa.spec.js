const {test,expect}=require('@playwright/test');

test.use({serviceWorkers:'block'});

async function stableOverflow(page){
  let last;
  for(let attempt=0;attempt<4;attempt++){
    try{
      return await page.evaluate(()=>({
        viewport:window.innerWidth,
        html:document.documentElement.scrollWidth,
        body:document.body.scrollWidth
      }));
    }catch(error){
      last=error;
      if(!/Execution context was destroyed|navigation/i.test(String(error))||attempt===3) throw error;
      await page.waitForLoadState('domcontentloaded').catch(()=>{});
      await page.waitForTimeout(120);
    }
  }
  throw last;
}

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
      await page.waitForTimeout(120);
      await expect(page.locator('h1')).toHaveCount(1);
      const overflow=await stableOverflow(page);
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
  await page.goto(base+'/fa/jostojo/',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(120);
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
  await page.waitForTimeout(120);
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
      await page.goto(base+route,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(120);
      await page.screenshot({path:'test-results/screenshots/'+name+'-'+label+'.png',fullPage:true});
    }
  });
}


test('homepage exposes visible account access in both languages',async({page})=>{
  for(const route of ['/fa/','/en/']){
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    const strip=page.locator('.home-account-strip');
    await expect(strip).toBeVisible();
    await expect(strip.locator('a[href="./login/"]')).toBeVisible();
    await expect(strip.locator('a[href="./register/"]')).toBeVisible();
    const overflow=await stableOverflow(page);
    expect(Math.max(overflow.html,overflow.body),route+' auth strip horizontal overflow').toBeLessThanOrEqual(overflow.viewport+1);
  }
});

for (const route of ['/fa/darkhast-moshavere/', '/en/request-consultation/']) {
  test('consultation draft stays local and invalidates edits: '+route, async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    const form=page.locator('[data-consultation-composer]');
    await expect(form.locator('fieldset')).toBeVisible();
    const outgoing=[];
    page.on('request', request=>{if(request.method()!=='GET') outgoing.push(request.url());});
    await form.locator('[name="service"]').selectOption({index:1});
    await form.locator('[name="context"]').fill('Student / دانش‌آموز');
    await form.locator('[name="question"]').fill('Compare A & B? <script>test</script>');
    await form.locator('button[type="submit"]').click();
    const preview=form.locator('[data-composer-preview]');
    await expect(preview).toBeVisible();
    const href=await form.locator('[data-composer-email]').getAttribute('href');
    const url=new URL(href);
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('dr.rezazadeh65@gmail.com');
    expect(url.searchParams.get('body')).toContain('Compare A & B? <script>test</script>');
    await form.locator('[name="question"]').fill('Revised question');
    await expect(preview).toBeHidden();
    await expect(form.locator('[data-composer-draft]')).toHaveValue('');
    await form.locator('button[type="submit"]').click();
    expect(await form.locator('[data-composer-draft]').inputValue()).toContain('Revised question');
    await form.locator('button[type="reset"]').click();
    await expect(preview).toBeHidden();
    await expect(form.locator('[name="question"]')).toHaveValue('');
    expect(outgoing).toEqual([]);
    const overflow=await stableOverflow(page);
    expect(Math.max(overflow.html,overflow.body)).toBeLessThanOrEqual(overflow.viewport+1);
  });
}
