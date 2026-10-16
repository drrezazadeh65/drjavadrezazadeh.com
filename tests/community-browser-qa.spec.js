const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
const article='/fa/akhbar/teacher-schools-professional-learning-2026/';
const respond=(route,status,body)=>route.fulfill({status,contentType:'application/json; charset=utf-8',body:JSON.stringify(body)});

test('disabled community endpoint never exposes a comment box',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/community/**',route=>respond(route,503,{ok:false,error:'community_unavailable'}));
 const queried=page.waitForRequest(r=>r.url().includes('/api/community/comments'));
 await page.goto(base+article,{waitUntil:'domcontentloaded'});
 await queried;
 await expect(page.locator('[data-jr-community]')).toHaveCount(0);
});

test('approved reader commentary renders as text, not executable markup, on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const body='<img src=x onerror=alert(1)> پژوهش مستند و خواندنی است.';
 await page.route('**/api/community/**',route=>{
  if(route.request().url().includes('/csrf'))return respond(route,401,{ok:false,error:'unauthorized'});
  return respond(route,200,{ok:true,schema:'community-comments-v1',page:article,comments:[{id:'sample-1',body,rating:4,createdAt:1700000000}],count:1});
 });
 await page.goto(base+article,{waitUntil:'domcontentloaded'});
 const host=page.locator('[data-jr-community]');
 await expect(host).toBeVisible();
 await expect(host.locator('.jr-community-body')).toHaveText(body);
 await expect(host.locator('.jr-community-body img')).toHaveCount(0);
 await expect(host.locator('a[href="/fa/login/"]')).toBeVisible();
 await expect(host.locator('form')).toBeHidden();
 const dims=await page.evaluate(()=>({body:document.body.scrollWidth,html:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(Math.max(dims.body,dims.html)).toBeLessThanOrEqual(dims.viewport+1);
 await expect(host.locator('.jr-community-mark')).toHaveAttribute('src','/favicon.svg');
});

test('verified reader chooses accessible stars and consents; server keeps the result pending',async({page})=>{
 await page.setViewportSize({width:430,height:932});
 let submitted=null;
 await page.route('**/api/community/**',route=>{
  const url=route.request().url();
  if(url.includes('/csrf'))return respond(route,200,{ok:true,csrfToken:'c'.repeat(64)});
  if(route.request().method()==='POST'){
   submitted=route.request().postDataJSON();
   return respond(route,202,{ok:true,state:'pending',moderatedBeforePublication:true});
  }
  return respond(route,200,{ok:true,schema:'community-comments-v1',page:article,comments:[],count:0});
 });
 await page.goto(base+article,{waitUntil:'domcontentloaded'});
 const form=page.locator('[data-jr-community] form');
 await expect(form).toBeVisible();
 await form.locator('input[name="rating"][value="5"]').check();
 await form.locator('textarea[name="body"]').fill('نظر پژوهشی خود را با بررسی انتقادی و احترام ثبت می‌کنم.');
 await form.locator('input[name="consent"]').check();
 await form.locator('button[type="submit"]').click();
 await expect(form.locator('.jr-community-form-status')).toContainText('برای بررسی مدیر ثبت شد');
 expect(submitted).toMatchObject({page:article,rating:5,consentToPublication:true});
 expect(submitted.body.length).toBeGreaterThanOrEqual(12);
 await expect(page.locator('.jr-community-comment')).toHaveCount(0);
});

test('moderator view remains hidden until workspace unlock; approval is confirmed by server',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 let approved=null;
 await page.route('**/api/community/**',route=>{
  if(route.request().url().endsWith('/csrf'))return respond(route,200,{ok:true,csrfToken:'c'.repeat(64)});
  if(route.request().method()==='POST'){
   approved=route.request().postDataJSON();
   return respond(route,200,{ok:true,state:approved.decision});
  }
  return respond(route,200,{ok:true,schema:'community-moderation-v1',pending:[{id:'11111111-1111-4111-8111-111111111111',page:article,body:'دیدگاه علمی در انتظار بررسی مدیر',rating:5,createdAt:1700000000}],approved:[]});
 });
 await page.goto(base+'/fa/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  const w=document.createElement('div');w.id='ops-workspace';w.hidden=true;document.body.append(w);
 });
 await page.addStyleTag({url:base+'/assets/css/operations-community-moderation.css'});
 await page.addScriptTag({url:base+'/assets/js/operations-community-moderation.js'});
 await expect(page.locator('#jr-community-admin')).toBeHidden();
 await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=false;});
 await expect(page.locator('.jr-community-admin-item')).toHaveCount(1);
 await expect(page.locator('.jr-community-admin-logo')).toHaveAttribute('src','/favicon.svg');
 await page.getByRole('button',{name:'تأیید و انتشار'}).click();
 await expect.poll(()=>approved?.decision).toBe('approved');
 expect(approved.id).toBe('11111111-1111-4111-8111-111111111111');
 await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=true;});
 await expect(page.locator('.jr-community-admin-item')).toHaveCount(0);
});
