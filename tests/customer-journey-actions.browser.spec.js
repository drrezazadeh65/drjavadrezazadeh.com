const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';

for(const [lang,route,privateOrders,privateReports,query] of [
 ['fa','/fa/customer-dashboard/','/fa/app/account/orders/','/fa/app/account/reports/','سفارش'],
 ['en','/en/account/','/en/account/orders/','/en/account/reports/','Orders']
]){
 for(const state of ['guest','signed']){
  test(lang+' '+state+' customer journey filters and links preserve real access boundaries',async({page})=>{
   await page.setViewportSize({width:390,height:844});
   const errors=[],writes=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('request',r=>{if(r.method()==='POST')writes.push(new URL(r.url()).pathname)});
   await page.route('**/api/**',async intercepted=>{
    const p=new URL(intercepted.request().url()).pathname;
    if(p==='/api/auth/health')return intercepted.fulfill({json:{ok:true,ready:true}});
    if(p==='/api/auth/me')return intercepted.fulfill({
      status:state==='signed'?200:401,
      json:state==='signed'?{ok:true,user:{email:'customer@example.invalid'}}:{ok:false}
    });
    if(p==='/api/commerce/health')return intercepted.fulfill({
      json:{ok:true,checkout:false,capabilities:{services:false,books:false,vip:false}}
    });
    return intercepted.fulfill({status:404,json:{ok:false}});
   });
   const response=await page.goto(origin+route,{waitUntil:'domcontentloaded'});
   expect(response.status()).toBe(200);
   const command=page.locator('#command-center');
   await expect(command).toBeVisible();
   const cards=command.locator('[data-command-item]');
   await expect(cards).toHaveCount(13);
   await expect(command.locator('[data-command-path]')).toHaveCount(4);
   const search=command.locator('[data-dashboard-command-search]');
   for(const group of ['learning','shopping','sponsorship']){
    const button=command.locator('[data-command-path="'+group+'"]');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed','true');
    const expected=await cards.evaluateAll((elements,groupName)=>
      elements.filter(el=>el.dataset.commandGroup.split(/\s+/).includes(groupName)).length,group);
    const shown=await cards.evaluateAll(elements=>
      elements.filter(el=>!el.hidden).length);
    expect(shown,'active '+group+' shortcuts').toBe(expected);
    const message=await command.locator('[data-command-path-note]').innerText();
    if(lang==='en')expect(message).toMatch(/selected|access|verification/i);
    else expect(message).toMatch(/انتخاب شد/);
   }
   await command.locator('[data-command-path="shopping"]').click();
   await search.fill(query);
   const visibleSearchCards=await cards.evaluateAll(elements=>elements.filter(el=>!el.hidden).length);
   expect(visibleSearchCards).toBeGreaterThan(0);
   await search.fill('unmatched-journey-keyword-123');
   await expect(command.locator('[data-command-empty]')).toBeVisible();
   await search.fill('');
   await command.locator('[data-command-path="all"]').click();
   expect(await cards.evaluateAll(elements=>elements.filter(el=>!el.hidden).length)).toBe(13);

   // Open the user-visible service journey. The existing tab navigation is authoritative.
   await page.goto(origin+route+'#journey',{waitUntil:'domcontentloaded'});
   const journey=page.locator('#journey');
   await expect(journey).toBeVisible();
   const actions=journey.locator('[data-journey-step]');
   await expect(actions).toHaveCount(5);
   const order=actions.nth(1),report=actions.nth(3);
   await expect(order).toHaveAttribute('data-private-href',privateOrders);
   await expect(report).toHaveAttribute('data-private-href',privateReports);
   await expect(order).toHaveAttribute('href',state==='signed'?privateOrders:'/'+lang+'/login/');
   await expect(report).toHaveAttribute('href',state==='signed'?privateReports:'/'+lang+'/login/');
   await expect(actions.nth(0)).toHaveAttribute('href','/'+lang+'/services/');
   await actions.nth(2).click();
   await expect(page.locator('#consultations')).toBeVisible();
   await expect(journey).toBeHidden();
   await expect(page).toHaveURL(/#consultations$/);
   await page.goto(origin+route+'#journey',{waitUntil:'domcontentloaded'});
   await actions.nth(4).click();
   await expect(page.locator('#progress')).toBeVisible();
   await expect(page).toHaveURL(/#progress$/);

   // The five-stage feature is a navigation guide; it never performs payments/bookings.
   expect(writes).toEqual([]);
   expect(errors).toEqual([]);
  });
 }
 test(lang+' mobile journey CTAs have readable tap targets without page overflow',async({page})=>{
  await page.route('**/api/**',route=>route.fulfill({status:401,json:{ok:false}}));
  for(const width of [320,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:850});
   await page.goto(origin+route+'#journey',{waitUntil:'domcontentloaded'});
   const section=page.locator('#journey');
   await expect(section).toBeVisible();
   const actions=section.locator('.cd-journey-action');
   await expect(actions).toHaveCount(5);
   const heights=await actions.evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().height));
   expect(heights.every(x=>x>=44),'journey accessible tap targets at '+width).toBe(true);
   const overflow=await page.evaluate(()=>Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-innerWidth);
   expect(overflow,'page horizontal overflow at '+width).toBeLessThanOrEqual(1);
  }
 });
}
