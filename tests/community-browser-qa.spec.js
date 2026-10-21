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
  return respond(route,200,{ok:true,schema:'community-comments-v1',page:article,comments:[{id:'sample-1',body,rating:4,createdAt:1700000000,replies:[{id:'reply-1',body:'<script>alert(2)</script> پاسخ علمی',createdAt:1700000001}]}],count:1});
 });
 await page.goto(base+article,{waitUntil:'domcontentloaded'});
 const host=page.locator('[data-jr-community]');
 await expect(host).toBeVisible();
 await expect(host.locator('.jr-community-body')).toHaveText(body);
 await expect(host.locator('.jr-community-body img')).toHaveCount(0);
 await host.locator('.jr-community-comment>summary').click();
 await expect(host.locator('.jr-community-official-body')).toHaveText('<script>alert(2)</script> پاسخ علمی');
 await expect(host.locator('.jr-community-official-reply script')).toHaveCount(0);
 await expect(host.locator('a[href="/fa/login/"]')).toBeVisible();
 await expect(host.locator('form')).toBeHidden();
 const dims=await page.evaluate(()=>({body:document.body.scrollWidth,html:document.documentElement.scrollWidth,viewport:innerWidth}));
 expect(Math.max(dims.body,dims.html)).toBeLessThanOrEqual(dims.viewport+1);
 await expect(host.locator('.jr-community-mark')).toHaveAttribute('src','/favicon.svg');
 await expect(host.locator('.jr-community-rating-summary')).toBeHidden();
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
 await page.locator('.jr-community-compose>summary').click();
 await expect(form).toBeVisible();
 await form.locator('input[name="rating"][value="5"]').check();
 await form.locator('textarea[name="body"]').fill('نظر پژوهشی خود را با بررسی انتقادی و احترام ثبت می‌کنم.');
 await form.locator('input[name="consent"]').check();
 await form.locator('button[type="submit"]').click();
 await expect(form.locator('.jr-community-form-status')).toContainText('برای بررسی مدیر ثبت شد');
 expect(submitted).toMatchObject({page:article,rating:5,consentToPublication:true,website:''});
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
 await page.locator('.jr-community-admin-item>summary').click();
 await page.getByRole('button',{name:'تأیید و انتشار'}).click();
 await expect.poll(()=>approved?.decision).toBe('approved');
 expect(approved.id).toBe('11111111-1111-4111-8111-111111111111');
 await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=true;});
 await expect(page.locator('.jr-community-admin-item')).toHaveCount(0);
});

test('admin can page older comments, write an unpublished official draft, and browse revision controls',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const comment='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const reply='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 let calls=[],created=false,published=false;
 await page.route('**/api/community/**',route=>{
  const url=route.request().url(),method=route.request().method();
  if(url.endsWith('/csrf'))return respond(route,200,{ok:true,csrfToken:'d'.repeat(64)});
  if(method==='POST'){
   const data=route.request().postDataJSON();calls.push(data);
   if(data.action==='create'){created=true;return respond(route,201,{ok:true,id:reply,state:'draft',revision:1});}
   if(data.action==='publish'){published=true;return respond(route,200,{ok:true,id:reply,state:'published',revision:2});}
   return respond(route,200,{ok:true,state:data.decision||'draft'});
  }
  if(url.includes('/admin/replies')){
   return respond(route,200,{ok:true,schema:'community-admin-replies-v1',items:created?[{
    id:reply,commentId:comment,body:'A documented scholarly response',state:published?'published':'draft',revision:published?2:1,createdAt:1700000001,updatedAt:1700000001
   }]:[]});
  }
  if(url.includes('/admin/revisions'))return respond(route,200,{ok:true,items:[{revision:1,event:'created',state:'draft',body:'A documented scholarly response',createdAt:1700000001}]});
  if(url.includes('state=approved')){
   const older=url.includes('beforeCreatedAt=');
   return respond(route,200,{ok:true,schema:'community-moderation-v2',state:'approved',
    items:older?[]:[{id:comment,page:article,body:'A reader question',state:'approved',rating:null,createdAt:1700000000}],
    nextCursor:older?null:{createdAt:1700000000,id:comment}});
  }
  return respond(route,200,{ok:true,schema:'community-moderation-v2',state:'pending',items:[],nextCursor:null});
 });
 await page.goto(base+'/fa/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{const w=document.createElement('div');w.id='ops-workspace';w.hidden=true;document.body.append(w)});
 await page.addStyleTag({url:base+'/assets/css/operations-community-moderation.css'});
 await page.addScriptTag({url:base+'/assets/js/operations-community-moderation.js'});
 await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=false});
 await page.locator('.jr-community-admin-state').selectOption('approved');
 await expect(page.locator('.jr-community-admin-item')).toHaveCount(1);
 await page.locator('.jr-community-admin-item>summary').click();
 await page.locator('.jr-community-admin-replies-panel>summary').click();
 await page.locator('textarea[name="officialReply"]').fill('A documented scholarly response');
 await page.getByRole('button',{name:'ذخیره پیش‌نویس پاسخ'}).click();
 await expect.poll(()=>created).toBe(true);
 await expect(page.locator('.jr-community-admin-reply')).toHaveCount(1);
 await expect(page.locator('.jr-community-admin-reply')).toContainText('draft');
 await page.getByRole('button',{name:'انتشار پاسخ رسمی'}).click();
 await expect.poll(()=>published).toBe(true);
 await page.locator('.jr-community-admin-more').click();
 await expect.poll(()=>calls.some(item=>item.action==='create')).toBe(true);
 await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=true});
 await expect(page.locator('.jr-community-admin-item')).toHaveCount(0);
});


test('MFA workspace relocks before CSRF returns; stale approval must not POST',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const comment='11111111-1111-4111-8111-111111111111';
 let releaseCsrf=null,posts=0,csrfCompleted=false;
 await page.route('**/api/community/**',async route=>{
  const url=route.request().url();
  if(url.endsWith('/csrf')){
   await new Promise(resolve=>{releaseCsrf=resolve;});
   csrfCompleted=true;
   return respond(route,200,{ok:true,csrfToken:'f'.repeat(64)});
  }
  if(route.request().method()==='POST'){
   posts++;
   return respond(route,200,{ok:true,state:'approved'});
  }
  return respond(route,200,{ok:true,schema:'community-moderation-v2',state:'pending',
   items:[{id:comment,page:article,body:'A safe pending research comment',rating:null,state:'pending',createdAt:1700000000}],
   nextCursor:null,canErase:false});
 });
 await page.goto(base+'/fa/',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{
  const w=document.createElement('div');w.id='ops-workspace';w.hidden=true;document.body.append(w);
 });
 await page.addScriptTag({url:base+'/assets/js/operations-community-moderation.js'});
 await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=false;});
 await expect(page.locator('.jr-community-admin-item')).toHaveCount(1);
 await page.locator('.jr-community-admin-item>summary').click();
 const csrfRequest=page.waitForRequest(r=>r.url().endsWith('/api/community/csrf'));
 await page.getByRole('button',{name:'تأیید و انتشار'}).click();
 await csrfRequest;
 await expect.poll(()=>typeof releaseCsrf).toBe('function');
 await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=true;});
 releaseCsrf();
 await expect.poll(()=>csrfCompleted).toBe(true);
 await expect(page.locator('.jr-community-admin-item')).toHaveCount(0);
 // Flush the request microtasks; any attempted POST would be observable.
 await page.waitForTimeout(50);
 expect(posts).toBe(0);
});


test('only server-approved stars appear in the academic mean and empty/untrusted aggregate is hidden',async({page})=>{
 await page.route('**/api/community/**',route=>{
  if(route.request().url().includes('/csrf'))return respond(route,401,{ok:false,error:'unauthorized'});
  return respond(route,200,{ok:true,schema:'community-comments-v1',page:article,
   comments:[{id:'approved-1',body:'A moderated comment',rating:5,createdAt:1700000000}],
   count:1,ratingSummary:{count:4,mean:4.3}});
 });
 await page.goto(base+article,{waitUntil:'domcontentloaded'});
 const summary=page.locator('.jr-community-rating-summary');
 await expect(summary).toBeVisible();
 await expect(summary).toContainText('۴');
 await expect(summary).toContainText('۴٫۳');
 expect(await page.locator('script[type="application/ld+json"]').evaluateAll(nodes=>nodes.every(node=>!node.textContent.includes('aggregateRating')))).toBe(true);
});


for(const [lang,path] of [
 ['fa','/fa/services/academic_editing/'],
 ['en','/en/services/academic_editing/']
]){
 test(lang+' bilingual public service questions remain unrated, moderated and privacy-safe',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  let sent=null;
  await page.route('**/api/community/**',route=>{
   const url=route.request().url();
   if(url.includes('/csrf'))return respond(route,200,{ok:true,csrfToken:'e'.repeat(64)});
   if(route.request().method()==='POST'){
    sent=route.request().postDataJSON();
    return respond(route,202,{ok:true,state:'pending',moderatedBeforePublication:true});
   }
   return respond(route,200,{ok:true,schema:'community-comments-v1',page:path,
     comments:[],count:0,ratingSummary:{count:0,mean:null}});
  });
  await page.goto(base+path,{waitUntil:'domcontentloaded'});
  // The production bundle adds these assets to the 21 explicitly catalogued
  // public service descriptions; local static source pages are not mutated.
  await page.addStyleTag({url:base+'/assets/css/community-comments.css'});
  await page.addScriptTag({url:base+'/assets/js/community-comments.js'});
  const host=page.locator('[data-jr-community]');
  await expect(host).toBeVisible();
  await expect(host.locator('.jr-community-rating')).toHaveCount(0);
  await expect(host.locator('.jr-community-rating-summary')).toBeHidden();
  await host.locator('.jr-community-compose>summary').click();
  const form=host.locator('form');
  await expect(form).toBeVisible();
  if(lang==='en'){
   await expect(host.locator('h2')).toContainText('Questions about this service');
   await expect(form.locator('button[type="submit"]')).toHaveText('Submit question for moderation');
  }else{
   await expect(host.locator('h2')).toContainText('پرسش درباره این خدمت');
  }
  await form.locator('textarea[name="body"]').fill(lang==='fa'?
   'آیا برای این خدمت، پیش از ثبت سفارش جلسه مشاوره اولیه وجود دارد؟':
   'Is an initial consultation available before requesting this academic service?');
  await form.locator('input[name="consent"]').check();
  await form.locator('button[type="submit"]').click();
  await expect.poll(()=>sent).not.toBeNull();
  expect(sent).toMatchObject({page:path,rating:null,website:'',consentToPublication:true});
  await expect(host.locator('.jr-community-comment')).toHaveCount(0);
  expect(Math.max(await page.evaluate(()=>document.documentElement.scrollWidth),0)).toBeLessThanOrEqual(392);
 });
}
