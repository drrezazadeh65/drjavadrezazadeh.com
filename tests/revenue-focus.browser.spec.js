const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
const prices={manuscript_diagnostic:12000000,academic_editing:15000000,reviewer_response:15000000};
const expected=Object.keys(prices);
for(const locale of ['en','fa']){
 for(const status of ['ready','unavailable','unknown']){
  test(locale+' research offer checkout readiness '+status+' is truthful and responsive',async({page})=>{
   await page.setViewportSize({width:390,height:844});
   let paymentWrites=0;
   page.on('request',r=>{if(r.method()==='POST'&&/\/api\/commerce\//.test(r.url()))paymentWrites++});
   await page.route('**/api/commerce/health',r=>{
    if(status==='unknown')return r.fulfill({status:503,json:{ok:false}});
    return r.fulfill({json:{ok:true,checkout:status==='ready',capabilities:{services:status==='ready'}}});
   });
   const response=await page.goto(origin+'/'+locale+'/services/',{waitUntil:'domcontentloaded'});
   expect(response.status()).toBe(200);
   const focus=page.locator('[data-jr-revenue-focus]');
   await expect(focus).toBeVisible();
   const cards=focus.locator('[data-jr-revenue-sku]');
   await expect(cards).toHaveCount(3);
   for(const [i,id] of expected.entries()){
    const card=cards.nth(i);
    await expect(card).toHaveAttribute('data-jr-revenue-sku','service:'+id);
    const buy=card.locator('.jr-revenue-buy');
    await expect(buy).toHaveAttribute('href','/'+locale+'/services/checkout/?service='+id);
    await expect(card.locator('.jr-revenue-details')).toHaveAttribute('href','/'+locale+'/services/'+id+'/');
    const displayed=locale==='fa'?new Intl.NumberFormat('fa-IR').format(prices[id]):new Intl.NumberFormat('en-US').format(prices[id]);
    await expect(card.locator('.jr-revenue-price')).toContainText(displayed);
   }
   const health=focus.locator('[data-jr-payment-readiness]');
   await expect(health).toHaveAttribute('data-state',status);
   if(status==='ready')await expect(health).toContainText(locale==='en'?'currently enabled':'فعال است');
   else if(status==='unavailable')await expect(health).toContainText(locale==='en'?'not currently confirmed':'تأیید نشده است');
   else await expect(health).toContainText(locale==='en'?'could not be confirmed':'قابل تأیید نیست');
   for(const width of [320,390,430,768,1024,1440]){
    await page.setViewportSize({width,height:850});
    const dims=await focus.evaluate(node=>({client:node.clientWidth,scroll:node.scrollWidth}));
    expect(dims.scroll,'offer section overflows '+width).toBeLessThanOrEqual(dims.client+3);
    const actions=await focus.locator('.jr-revenue-buy').evaluateAll(links=>
      links.map(a=>({height:a.getBoundingClientRect().height,focusable:a.tabIndex>=0})));
    expect(actions.every(a=>a.height>=44&&a.focusable),'touch target at '+width).toBe(true);
   }
   expect(paymentWrites).toBe(0);
  });
 }
}
