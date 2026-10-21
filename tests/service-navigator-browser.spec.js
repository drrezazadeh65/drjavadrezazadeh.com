const {test,expect}=require('@playwright/test');
const catalog=require('../assets/data/service-catalog.json');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const groups={
 student:{
  planning:['academic_consult_60','student_parent_90','transcript_analysis'],
  exam:['konkur_consult_60','konkur_month'],
  major:['field_selection_standard','field_selection_comprehensive'],
  talent:['talent_initial','golden_talent_comprehensive','golden_talent_premium']
 },
 researcher:{
  manuscript:['manuscript_diagnostic','academic_editing','reviewer_response'],
  research:['research_consult_60','manuscript_diagnostic'],
  publishing:['journal_strategy','manuscript_diagnostic','reviewer_response'],
  career:['academic_cv','academic_interview_90']
 },
 teacher:{
  practice:['teacher_consult_60','teacher_dev_90'],
  growth:['teacher_dev_90','teacher_consult_60']
 },
 institution:{
  strategy:['organization_consult_90','specialist_workshop_120'],
  workshop:['specialist_workshop_120','organization_consult_90']
 }
};
for(const [locale,url] of [['fa','/fa/khadamat/'],['en','/en/services/']]){
 test(locale+' service navigator routes every audience choice to existing approved services',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const response=await page.goto(base+url,{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const studio=page.locator('[data-jr-service-navigator]');
  await expect(studio.locator('.jr-sn-controls select')).toHaveCount(2);
  await expect(studio.locator('.jr-sn-results')).toBeVisible();
  const audience=studio.locator('select[name=audience]');
  const goal=studio.locator('select[name=goal]');
  await expect(goal).toBeDisabled();
  await expect(studio.locator('.jr-sn-cards')).toBeHidden();
  const seen=new Set();
  for(const [role,objectives] of Object.entries(groups)){
   await audience.selectOption(role);
   await expect(goal).toBeEnabled();
   for(const [need,expected] of Object.entries(objectives)){
    await goal.selectOption(need);
    const cards=studio.locator('.jr-sn-card');
    await expect(cards).toHaveCount(expected.length);
    const links=await cards.locator('a.jr-sn-link').evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname));
    expect(links).toEqual(expected.map(id=>'/'+locale+'/services/'+id+'/'));
    for(const id of expected)seen.add(id);
    const amounts=await cards.locator('.jr-sn-price strong').allTextContents();
    expect(amounts.every(a=>/[0-9۰-۹]/.test(a))).toBe(true);
    await expect(studio.locator('.jr-sn-notice')).toBeVisible();
   }
  }
  expect([...seen].sort()).toEqual(catalog.services.filter(s=>s.sellable===true).map(s=>s.id).sort());
  // Existing public service directories remain available and are not replaced.
  if(locale==='fa')await expect(page.locator('[data-service-pricing]')).toBeAttached();
  else await expect(page.locator('[data-jr-en-service-atlas] .cards a')).toHaveCount(21);
  for(const width of [320,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:850});
   const sizes=await studio.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
   expect(sizes.scroll,'navigator width at '+width).toBeLessThanOrEqual(sizes.client+2);
  }
  await studio.locator('.jr-sn-reset').click();
  await expect(audience).toHaveValue('');
  await expect(goal).toBeDisabled();
  await expect(studio.locator('.jr-sn-cards')).toBeHidden();
 });
 test(locale+' service navigator fails closed when catalogue is unavailable',async({page})=>{
  await page.route('**/assets/data/service-catalog.json',route=>route.fulfill({status:503,body:'Service Unavailable'}));
  await page.goto(base+url,{waitUntil:'domcontentloaded'});
  const studio=page.locator('[data-jr-service-navigator]');
  await expect(studio.locator('select[name=audience]')).toBeDisabled();
  await expect(studio.locator('.jr-sn-cards')).toBeHidden();
  await expect(studio.locator('.jr-sn-status')).toContainText(
   locale==='fa'?'کاتالوگ خدمات در حال حاضر قابل تأیید نیست':'The current catalogue could not be verified'
  );
  if(locale==='en')await expect(page.locator('[data-jr-en-service-atlas] .cards a')).toHaveCount(21);
 });
}

test('English full-service atlas search and price sorting preserve 21 static canonical routes on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const response=await page.goto(base+'/en/services/',{waitUntil:'domcontentloaded'});
 expect(response.status()).toBe(200);
 const atlas=page.locator('[data-jr-en-service-atlas]');
 const links=atlas.locator('ul.cards>li a[href^="/en/services/"]');
 await expect(links).toHaveCount(21);
 const filter=atlas.locator('[data-jr-atlas-filter]');
 await expect(filter).toBeVisible();
 const search=filter.locator('input[type=search]');
 const sort=filter.locator('select');
 await search.fill('manuscript');
 const matches=atlas.locator('ul.cards>li:not([hidden])');
 await expect.poll(async()=>matches.count()).toBeGreaterThan(0);
 expect(await matches.count()).toBeLessThan(21);
 await expect(filter.locator('[role=status]')).toContainText('published services shown');
 await search.fill('');
 await sort.selectOption('asc');
 await expect(atlas.locator('ul.cards>li:not([hidden])')).toHaveCount(21);
 const got=await links.evaluateAll(nodes=>nodes.map(n=>new URL(n.href).pathname));
 const idToPrice=new Map(catalog.services.map(s=>[s.id,s.price]));
 const amounts=got.map(url=>idToPrice.get(url.match(/\/en\/services\/([a-z0-9_]+)\/$/)[1]));
 expect(amounts).toEqual([...amounts].sort((a,b)=>a-b));
 await filter.locator('button').click();
 await expect(sort).toHaveValue('default');
 await expect(search).toHaveValue('');
 await expect(links).toHaveCount(21);
 for(const width of [320,390,430,768,1024]){
  await page.setViewportSize({width,height:844});
  const dims=await atlas.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
  expect(dims.scroll,'English catalogue '+width+'px').toBeLessThanOrEqual(dims.client+2);
 }
});
test('English catalogue fails open to 21 indexable links when prices contradict the authoritative catalogue',async({page})=>{
 await page.route('**/assets/data/service-catalog.json',async route=>{
  const incorrect=structuredClone(catalog);
  incorrect.services[0].price+=1;
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(incorrect)});
 });
 await page.goto(base+'/en/services/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('[data-jr-en-service-atlas] ul.cards a')).toHaveCount(21);
 await expect(page.locator('[data-jr-atlas-filter]')).toHaveCount(0);
});
