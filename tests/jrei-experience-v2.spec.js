const {test,expect}=require('@playwright/test');const base=process.env.SITE_BASE_URL||'http://127.0.0.1:4173';test.use({serviceWorkers:'block'});for(const l of ['fa','en','ar'])test('JREI interaction '+l,async({page})=>{await page.goto(base+'/'+l+'/jrei/');await expect(page.locator('.jx-scene')).toBeVisible();await expect(page.locator('[data-jx-domain]')).toHaveCount(30);await expect(page.locator('[data-jx-toolbar]')).toBeVisible();await page.locator('[data-jx-filter="1"]').click();await expect(page.locator('[data-jx-domain]:visible')).toHaveCount(5);await page.locator('[data-jx-search]').fill('zzzzzzzzzzz');await expect(page.locator('[data-jx-domain]:visible')).toHaveCount(0);await page.locator('[data-jx-search]').fill('');await page.locator('[data-jx-filter="-1"]').click();await expect(page.locator('[data-jx-domain]:visible')).toHaveCount(30);for(const width of [280,390,768,1440,1920]){await page.setViewportSize({width,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);}await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.jx-scene').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');await page.goto(base+'/'+l+'/jrei/order/#agents');await expect(page.locator('#agents')).toBeVisible();await expect(page.locator('[data-jx-search]')).toBeVisible();await page.goto(base+'/'+l+'/jrei-academic/');await expect(page.locator('.jx-nav')).toBeVisible();await expect(page.locator('.notice')).toBeVisible();});
for(const l of ['fa','en','ar'])test('scenario studio and honest labels '+l,async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/'+l+'/jrei/');
 const studio=page.locator('[data-jx-studio]');
 await expect(studio.locator('.jx-case')).toHaveCount(5);
 await expect(studio.locator('.jx-case[open]')).toHaveCount(1);
 await studio.locator('.jx-case summary').nth(1).click();
 await expect(studio.locator('.jx-case[open]')).toHaveCount(1);
 await expect(studio.locator('.jx-case').nth(1).locator('.jx-pipeline li')).toHaveCount(3);
 await expect(studio.locator('.jx-case').nth(1).locator('.jx-case-link')).toHaveAttribute('href','/'+l+'/jrei/catalog/research/');
 await expect(studio.locator('.jx-studio-disclaimer')).toBeVisible();
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await studio.locator('.jx-case[open] .jx-case-content').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 for(const route of ['jrei-academic/','forge/','jrei/seo/']){
  await page.goto(base+'/'+l+'/'+route);
  await expect(page.locator('[data-jx-studio] .jx-case')).toHaveCount(1);
  await expect(page.locator('.notice')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 }
 await page.goto(base+'/'+l+'/jrei/catalog/research/');
 await expect(page.locator('body')).toHaveAttribute('data-jx-theme','domain-1');
});

for(const l of ['fa','en','ar'])test('floating controls remain separated and restore after closing '+l,async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/assistant/v1/capabilities',route=>route.fulfill({json:{schema:'jr.jrei.assistant-capability.v1',live:false}}));
 await page.goto(base+'/'+l+'/jrei/');
 const launch=page.locator('.jr-assistant-launcher'),wa=page.locator('.jr-wa-float'),panel=page.locator('.jr-assistant-panel');
 await expect(launch).toBeVisible();await expect(wa).toBeVisible();
 const a=await launch.boundingBox(),b=await wa.boundingBox();expect(a.x+a.width<=b.x||b.x+b.width<=a.x).toBeTruthy();
 await launch.click();await expect(panel).toBeVisible();await expect(wa).toBeHidden();
 if(l==='ar'){await expect(panel).toHaveAttribute('aria-label','JREI | دليل الموقع');await panel.locator('textarea').fill('أسعار');await panel.locator('textarea').press('Enter');await expect(panel.locator('.jr-assistant-links a[href="http://127.0.0.1:4173/ar/jrei/pricing/"],.jr-assistant-links a[href$="/ar/jrei/pricing/"]')).toBeVisible();}
 await panel.locator('.jr-assistant-close').click();await expect(panel).toBeHidden();await expect(wa).toBeVisible();
});

test('legal page uses the wide shell without sacrificing reading measure',async({page})=>{
 for(const width of [390,1500,3840,7680]){
  await page.setViewportSize({width,height:width>=3840?2160:844});
  await page.goto(base+'/terms/',{waitUntil:'load'});
  const result=await page.locator('.article-shell').evaluate(el=>({shell:el.getBoundingClientRect().width,viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth}));
  expect(result.overflow).toBeLessThanOrEqual(1);
  if(width>=1500)expect(result.shell).toBeGreaterThanOrEqual(width*.8);
 }
});

for(const l of ['fa','en','ar'])test('private browser proposal, accessibility and visual evidence '+l,async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/'+l+'/jrei/');
 const demo=page.locator('[data-jx-demo]');
 await expect(demo).toBeVisible();
 await expect(demo.locator('[data-jx-output]')).toBeHidden();
 await demo.locator('[data-jx-demo-choice="0"]').selectOption('research');
 await demo.locator('[data-jx-demo-choice="1"]').selectOption('1');
 await demo.locator('[data-jx-demo-choice="2"]').selectOption('2');
 await demo.locator('[data-jx-run]').click();
 await expect(demo.locator('[data-jx-output]')).toBeVisible();
 for(let i=0;i<3;i++)await expect(demo.locator('[data-jx-answer="'+i+'"]')).toHaveText(await demo.locator('[data-jx-demo-choice="'+i+'"] option:checked').textContent());
 await expect(demo.locator('[data-jx-enquiry]')).toHaveAttribute('href','/'+l+'/jrei/order/#research');
 for(let i=0;i<3;i++)await expect(demo.locator('[data-jx-rule-output="'+i+'"]')).toHaveText(await demo.locator('[data-jx-demo-choice="'+i+'"] option:checked').getAttribute('data-jx-rule'));
 const originalRule=await demo.locator('[data-jx-rule-output="0"]').textContent();
 await demo.locator('[data-jx-demo-choice="0"]').selectOption('coding');await demo.locator('[data-jx-run]').click();
 expect(await demo.locator('[data-jx-rule-output="0"]').textContent()).not.toBe(originalRule);
 await expect(demo.locator('[data-jx-enquiry]')).toHaveAttribute('href','/'+l+'/jrei/order/#coding');
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const result=await page.evaluate(async()=>{const r=await axe.run({include:[['.jx-demo'],['.jx-evidence'],['.jx-buyer'],['.hero'],['aside.jr-related-links']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));});
 await testInfo.attach('component-accessibility',{body:JSON.stringify(result),contentType:'application/json'});
 expect(result.filter(v=>v.impact==='critical'||v.impact==='serious')).toEqual([]);
 await page.screenshot({path:testInfo.outputPath(l+'-mobile.png')});
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:testInfo.outputPath(l+'-mobile-hero.png')});
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:testInfo.outputPath(l+'-desktop.png')});
});

test('Obsidian Champagne visual identity uses local Persian typography across the JREI routes',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 for(const route of ['fa/jrei/','fa/jrei/catalog/research/','fa/jrei/pricing/','fa/jrei-academic/','fa/forge/','fa/jrei/seo/','ar/jrei/']){
  await page.goto(base+'/'+route);
  const styles=await page.locator('h1').evaluate(async e=>{await document.fonts.ready;return {family:getComputedStyle(e).fontFamily,loaded:document.fonts.check('700 20px "JREI Persian"','هوش مصنوعی'),signal:getComputedStyle(document.body).getPropertyValue('--jx-signal').trim(),overflow:document.documentElement.scrollWidth-innerWidth}});
  expect(styles.family).toContain('JREI Persian');expect(styles.loaded).toBeTruthy();expect(styles.signal).toMatch(/^#[0-9a-f]{6}$/i);
  expect(styles.overflow).toBeLessThanOrEqual(1);
 }
});
