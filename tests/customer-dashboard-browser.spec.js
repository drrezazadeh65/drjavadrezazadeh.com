const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';

for(const [lang,route] of [['fa','/fa/customer-dashboard/'],['en','/en/account/']]){
  for(const state of ['guest','signed','unavailable']){
    test(lang+' dashboard '+state+' initializes navigation and catalogue without live payment',async({page})=>{
      await page.setViewportSize({width:320,height:800});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      let current=state;
      await page.route('**/api/**',async route=>{
        const path=new URL(route.request().url()).pathname;
        let status=200,data;
        if(path==='/api/auth/health')data={ok:true,ready:current!=='unavailable'};
        else if(path==='/api/auth/me'){
          status=current==='signed'?200:401;
          data=status===200?{ok:true,user:{email:'fixture@example.test'}}:{ok:false};
        }else if(path==='/api/commerce/health')data={ok:true,checkout:false,capabilities:{services:false,books:false,vip:false}};
        else data={ok:false};
        await route.fulfill({status,json:data});
      });
      await page.goto(base+route);
      await expect(page.locator('[data-service-catalog-count]').first()).toContainText(lang==='fa'?'۲۱':'21');
      const cards=page.locator('.cd-service-card');
      if(lang==='fa'){
        await expect(cards).toHaveCount(21);
        await expect(cards.first()).toHaveAttribute('data-purchase-ready','false');
      }
      const privateLinks=page.locator('[data-private-route]');
      expect(await privateLinks.count()).toBeGreaterThan(0);
      if(state==='signed'){
        await expect(page.locator('[data-account-email]')).toHaveText('fixture@example.test');
        await expect(privateLinks.first()).toHaveAttribute('data-access','authenticated');
        if(lang==='fa')await expect(cards.first().locator('.cd-service-buy')).toHaveAttribute('href',/^\/fa\/services\/checkout\//);
        current='guest';
        await page.evaluate(()=>dispatchEvent(new Event('online')));
        await expect(privateLinks.first()).toHaveAttribute('data-access','signin-required');
        await expect(page.locator('[data-account-email]')).not.toHaveText('fixture@example.test');
        await expect(page.locator('html')).not.toHaveAttribute('data-customer-authenticated','true');
      }
      if(current!=='signed'){
        await expect(privateLinks.first()).toHaveAttribute('href','/'+lang+'/login/');
        if(lang==='fa')await expect(cards.first().locator('.cd-service-buy')).toHaveAttribute('href','/'+lang+'/login/');
      }
      if(lang==='fa'){
        await page.locator('[data-dashboard-service-search]').fill('no-matching-service');
        await expect(cards).toHaveCount(0);
        await page.locator('[data-dashboard-service-search]').fill('');
        await expect(cards).toHaveCount(21);
      }
      const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);
    });
  }
}
