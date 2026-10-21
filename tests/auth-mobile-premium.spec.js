const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
const mobileWidths=[320,360,390,430,600,700];
for(const locale of ['fa','en']){
 for(const mode of ['login','register']){
  for(const width of mobileWidths){
   test(`${locale}/${mode} premium auth: actual mobile gutters, RTL/LTR, no overflow at ${width}px`,async({page},testInfo)=>{
    await page.setViewportSize({width,height:844});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${origin}/${locale}/${mode}/`,{waitUntil:'domcontentloaded'});
    const form=page.locator(`form[data-auth-form="${mode}"]`);
    const shell=page.locator('article.auth-shell');
    const hero=shell.locator(':scope > .article-hero');
    await expect(form).toBeVisible();
    await expect(hero).toBeVisible();
    const measured=await page.evaluate(()=>{
      const rect=(selector)=>{
       const node=document.querySelector(selector);
       if(!node)return null;
       const r=node.getBoundingClientRect();
       return {left:r.left,right:r.right,width:r.width,height:r.height};
      };
      return {
       vw:innerWidth,
       scroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
       article:rect('article.auth-shell'),
       hero:rect('article.auth-shell > .article-hero'),
       section:rect('article.auth-shell > section:not(.role-status-grid)'),
       input:rect('form.auth-form input'),
       form:rect('form.auth-form'),
       heroPadding:getComputedStyle(document.querySelector('article.auth-shell > .article-hero')).paddingLeft,
       sectionPadding:getComputedStyle(document.querySelector('article.auth-shell > section:not(.role-status-grid)')).paddingLeft,
       direction:getComputedStyle(document.body).direction,
      };
    });
    expect(measured.scroll,'no horizontal scrolling '+JSON.stringify(measured)).toBeLessThanOrEqual(1);
    for(const key of ['article','hero','section','input','form']){
     const r=measured[key];expect(r,key+' exists').not.toBeNull();
     expect(r.left,key+' left viewport gutter').toBeGreaterThanOrEqual(15);
     expect(r.right,key+' right viewport gutter').toBeLessThanOrEqual(width-15);
     expect(r.width,key+' width').toBeGreaterThan(0);
    }
    expect(parseFloat(measured.heroPadding),'hero internal padding').toBeGreaterThanOrEqual(18);
    expect(parseFloat(measured.sectionPadding),'form section internal padding').toBeGreaterThanOrEqual(18);
    expect(measured.direction).toBe(locale==='fa'?'rtl':'ltr');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,follow,noarchive');
    await expect(form.locator('input[type="password"]')).toHaveAttribute('autocomplete',mode==='login'?'current-password':'new-password');
    await expect(form.locator('[data-auth-live-control]').first()).toHaveCount(1);
    if(width===390){
     await page.screenshot({path:testInfo.outputPath(`auth-${locale}-${mode}-390.png`),fullPage:true,animations:'disabled'});
    }
    expect(errors).toEqual([]);
   });
  }
 }
}
