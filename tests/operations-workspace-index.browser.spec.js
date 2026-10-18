const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';

for(const [lang,route,expectedCount,keyword] of [
 ['fa','/fa/app/admin/',13,'سفارش'],
 ['en','/en/account/admin/',12,'Revenue']
]){
 test(lang+' admin index remains locked and opens existing sections only in isolated authorised-layout fixture',async({page})=>{
  // Presentation-only fixture: isolate unrelated privileged runtime scripts,
  // and simulate workspace visibility AFTER asserting its default locked state.
  // Real authentication/MFA is independently exercised in operations-browser.spec.js.
  await page.route('**/assets/js/**',route=>{
   if(route.request().url().includes('/operations-workspace-index-v1.js'))return route.continue();
   return route.fulfill({status:200,contentType:'application/javascript',body:'/* isolated index component */'});
  });
  const postRequests=[];
  page.on('request',req=>{if(req.method()==='POST')postRequests.push(req.url())});
  await page.setViewportSize({width:390,height:844});
  const response=await page.goto(origin+route,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const workspace=page.locator('#ops-workspace');
  const nav=workspace.locator('[data-ops-workspace-index]');
  await expect(workspace).toBeHidden();
  await expect(nav).toBeHidden();
  await expect(page.locator('#ops-auth')).toBeVisible();

  // Test only the view lifecycle; the production access check is not bypassed.
  await workspace.evaluate(el=>{el.hidden=false});
  await expect(nav).toBeVisible();
  await expect(nav.locator('[data-ops-target]')).toHaveCount(expectedCount);
  const input=nav.locator('[data-ops-index-filter]');
  await input.fill(keyword);
  const results=nav.locator('[data-ops-target]');
  expect(await results.count()).toBeGreaterThan(0);
  const matching=await results.evaluateAll(elements=>elements.map(el=>el.getAttribute('data-ops-target')));
  expect(matching).toContain('ops-commerce');
  await input.fill('');
  await expect(nav.locator('[data-ops-target]')).toHaveCount(expectedCount);

  // Opening is a native disclosure; no sensitive operation button is clicked.
  const target=page.locator('#ops-commerce');
  await expect(target).not.toHaveAttribute('open','');
  await nav.locator('[data-ops-target="ops-commerce"]').click();
  await expect(target).toHaveAttribute('open','');
  await expect(nav).not.toHaveAttribute('open','');
  await expect(target.locator(':scope > summary')).toBeFocused();

  // The shortcut reopens navigation without changing role or operational state.
  await page.keyboard.press('/');
  await expect(nav).toHaveAttribute('open','');
  await expect(input).toBeFocused();
  await input.fill('unlikely-string-without-match');
  await expect(nav.locator('.ops-index-empty')).toBeVisible();
  await nav.locator('[data-ops-index-clear]').click();
  await expect(nav.locator('[data-ops-target]')).toHaveCount(expectedCount);

  for(const width of [320,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:900});
   const sizes=await nav.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
   expect(sizes.scroll,'admin index overflows at '+width).toBeLessThanOrEqual(sizes.client+2);
  }
  await workspace.evaluate(el=>{el.hidden=true});
  await expect(nav).toBeHidden();
  await expect(nav).not.toHaveAttribute('open','');
  expect(postRequests).toEqual([]);
 });
}
