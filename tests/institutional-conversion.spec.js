const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});

for(const scenario of [
  {lang:'fa',url:'/fa/hamkari-sazmani/',intake:'/fa/darkhast-moshavere/',primary:'vip:institutional-advisory'},
  {lang:'en',url:'/en/invite/',intake:'/en/request-consultation/',primary:'vip:institutional-advisory'}
]){
  for(const width of [320,1440]){
    test('institutional enquiry remains locally composed and useful at '+scenario.lang+' '+width+'px',async({page})=>{
      await page.setViewportSize({width,height:900});
      let unsolicitedPosts=0;
      await page.route('**/api/growth/**',route=>{
        if(route.request().method()==='POST')unsolicitedPosts++;
        return route.fulfill({status:503,json:{ok:false,error:'not_active'}});
      });
      await page.goto('http://127.0.0.1:4173'+scenario.url,{waitUntil:'domcontentloaded'});
      const root=page.locator('[data-institutional-brief-builder]');
      await expect(root).toBeVisible();
      const box=await root.boundingBox();
      expect(box.width).toBeLessThanOrEqual(width+1);
      const form=root.locator('[data-ib-form]');
      await form.locator('[name="format"]').selectOption('advisory');
      await form.locator('[name="goal"]').fill('We need a context-sensitive strategy for strengthening professional learning in our institution.');
      await form.locator('button[type="submit"]').click();
      await expect(root.locator('[data-ib-result]')).toBeVisible();
      await expect(root.locator('[data-ib-preview]')).toHaveValue(/context-sensitive strategy/);
      const email=await root.locator('[data-ib-email]').getAttribute('href');
      expect(email).toMatch(/^mailto:dr\.rezazadeh65@gmail\.com\?subject=/);
      expect(decodeURIComponent(email)).toContain('context-sensitive strategy');
      await expect(root.locator('[data-ib-account]')).toHaveAttribute('href',
        scenario.intake+'?service='+encodeURIComponent(scenario.primary));
      expect(page.url()).not.toContain('context-sensitive');
      expect(unsolicitedPosts).toBe(0);
      await form.locator('[name="format"]').selectOption('keynote');
      await expect(root.locator('[data-ib-result]')).toBeHidden();
      await form.locator('button[type="submit"]').click();
      await expect(root.locator('[data-ib-account]')).toHaveAttribute('href',scenario.intake);
    });
  }
}

test('verified lead intake carries only a known catalogue SKU, never consent or checkout',async({page})=>{
  await page.route('**/assets/data/service-catalog.json',route=>route.fulfill({json:{services:[{
    id:'talent_initial',title_fa:'استعدادیابی تخصصی اولیه',sellable:true,
    price:1000000
  }]}}));
  await page.route('**/assets/data/vip-catalog.json',route=>route.fulfill({json:{services:[{
    id:'institutional-advisory',title_fa:'مشاوره راهبردی سازمانی',
    sellable:true,checkout_enabled:true,price:90000000
  }]}}));
  for(const [url,expected] of [
    ['/fa/darkhast-moshavere/?service=talent_initial','service:talent_initial'],
    ['/en/request-consultation/?service=vip%3Ainstitutional-advisory','vip:institutional-advisory']
  ]){
    await page.goto('http://127.0.0.1:4173'+url,{waitUntil:'domcontentloaded'});
    const form=page.locator('[data-stage14-consent-lead]');
    await expect(form.locator('select[name="serviceId"]')).toHaveValue(expected);
    await expect(form.locator('input[name="consentGiven"]')).not.toBeChecked();
    await expect(form.locator('button[type="submit"]')).toBeEnabled();
  }
});
