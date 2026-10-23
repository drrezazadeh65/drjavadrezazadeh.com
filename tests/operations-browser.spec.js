const {test,expect}=require('@playwright/test');
const registry=require('../api/internal/operations-registry.json');
test.use({serviceWorkers:'block'});
const base='http://127.0.0.1:4173';
function fixture(){
 const wrap=r=>({...r,measuredProgress:null,status:'not_started',closed:false,openDependencies:r.dependencies,openWork:Object.values(r.gates),currentBlocker:null,verifiedGates:Object.entries(r.gates).map(([id,label])=>({id,label,state:'unknown',evidence:null}))});
 return {ok:true,schema:'operations-live-v1',version:'4.4.1',releaseSha:'a'.repeat(40),checkedAt:Math.floor(Date.now()/1000),reports:registry.reports.map(wrap),dashboard:wrap(registry.dashboard),sourceSections:registry.sourceSections,summary:{total:36,verified:0,measuredCoverage:0,measuredProgress:null},history:[]};
}
async function authorized(page,{data=fixture(),expiry=600,mfa=false}={}){
 let verified=!mfa;
 await page.route('**/api/admin/operations**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  if(path.endsWith('/session'))return route.fulfill({json:{ok:true,mfaRequired:!verified,csrfToken:'c'.repeat(64),mfaExpiresIn:expiry}});
  if(path.endsWith('/mfa')){expect(request.method()).toBe('POST');expect(request.headers()['x-csrf-token']).toBe('c'.repeat(64));expect(request.postDataJSON()).toEqual({code:'123456'});verified=true;return route.fulfill({json:{ok:true,mfaVerified:true}});}
  return route.fulfill({json:data});
 });
}
for(const [lang,path] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']])for(const width of [320,390,430,1440]){
 test(lang+' operations at '+width+'px show server facts and filters',async({page})=>{
  await page.setViewportSize({width,height:900});const errors=[];page.on('pageerror',e=>errors.push(String(e)));await authorized(page);await page.goto(base+path);
  await expect(page.locator('#ops-workspace')).toBeVisible();await expect(page.locator('#ops-cards article')).toHaveCount(36);
  await expect(page.locator('#ops-cards')).toBeHidden();
  await page.locator('#ops-section-toggle').click();await expect(page.locator('#ops-cards')).toBeVisible();
  await page.locator('#ops-section-toggle').click();await expect(page.locator('#ops-cards')).toBeHidden();
  await expect(page.locator('#ops-verified')).toHaveText('0');await expect(page.locator('#ops-coverage')).toHaveText('0/36');
  await expect(page.locator('#ops-refresh-data')).toBeVisible();await page.locator('#ops-search').fill('OP-03');await expect(page.locator('#ops-cards article')).toHaveCount(1);
  await page.locator('#ops-cards button').click();await expect(page.locator('#ops-detail')).toBeVisible();await expect(page.locator('#ops-detail .ops-gate')).toHaveCount(4);
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);expect(overflow).toBeLessThanOrEqual(1);expect(errors).toEqual([]);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 });
}
for(const [code,status] of [['unauthorized',401],['admin_forbidden',403],['operations_schema_unavailable',503]])test(code+' keeps privileged workspace empty',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('role','SUPER_ADMIN'));
 await page.route('**/api/admin/operations**',route=>route.fulfill({status,json:{ok:false,error:code}}));await page.goto(base+'/fa/app/admin/');
 await expect(page.locator('#ops-workspace')).toBeHidden();await expect(page.locator('#ops-cards article')).toHaveCount(0);await expect(page.locator('#ops-notice')).toHaveClass(/ops-error/);
});
test('MFA code uses session CSRF and unlocks only after server confirmation',async({page})=>{
 await authorized(page,{mfa:true});await page.goto(base+'/fa/app/admin/');await expect(page.locator('#ops-mfa-form')).toBeVisible();await expect(page.locator('#ops-workspace')).toBeHidden();
 await page.locator('#ops-mfa-code').fill('123456');await page.locator('#ops-mfa-form button').click();await expect(page.locator('#ops-workspace')).toBeVisible();await expect(page.locator('#ops-mfa-code')).toHaveValue('');
});
test('returning to an existing browser tab revalidates administrator access automatically',async({page})=>{
 await authorized(page);
 await page.goto(base+'/fa/app/admin/');
 await expect(page.locator('#ops-workspace')).toBeVisible();
 await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:true});
   document.dispatchEvent(new Event('visibilitychange'));
 });
 await expect(page.locator('#ops-workspace')).toBeHidden();
 await expect(page.locator('#ops-cards article')).toHaveCount(0);
 await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:false});
   document.dispatchEvent(new Event('visibilitychange'));
   delete document.hidden;
 });
 await expect(page.locator('#ops-workspace')).toBeVisible();
 await expect(page.locator('#ops-verified')).toHaveText('0');
 await expect(page.locator('#ops-mfa-form')).toBeHidden();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});

test('worker registration clearly distinguishes active submit from disabled worker state',async({page})=>{
 await authorized(page,{data:fixture()});
 await page.goto(base+'/fa/app/admin/');
 const nodes=page.locator('#ops-jrei-hybrid-nodes');
 await nodes.evaluate(el=>{el.open=true;el.dispatchEvent(new Event('toggle'));});
 // Owner snapshot depends on DB and must not be faked as live connectivity.
 await expect(page.locator('#ops-workspace')).toBeVisible();
 const file=await page.evaluate(async()=>await (await fetch('/assets/js/operations-jrei-hybrid-nodes-v1.js')).text());
 expect(file).toContain("save.type='submit'");
 expect(file).toContain("publicKey.dir='ltr'");
 expect(file).toContain('worker stays OFF');
});

test('Expired MFA clears previously loaded reports',async({page})=>{
 // One second can expire before a loaded CI browser paints the authenticated workspace.
 await authorized(page,{expiry:3});await page.goto(base+'/fa/app/admin/');await expect(page.locator('#ops-workspace')).toBeVisible();await expect(page.locator('#ops-workspace')).toBeHidden({timeout:5500});await expect(page.locator('#ops-cards article')).toHaveCount(0);
});
test('Written reports use current evidence and render untrusted strings as text',async({page})=>{
 const data=fixture();data.reports[0].titleFa='<img src=x onerror=alert(1)>';await authorized(page,{data});await page.goto(base+'/fa/app/admin/');await expect(page.locator('#ops-cards article')).toHaveCount(36);await expect(page.locator('#ops-cards img')).toHaveCount(0);
 const download=page.waitForEvent('download');await page.locator('#ops-report').click();expect((await download).suggestedFilename()).toBe('operations-all.txt');
 await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement.tagName)).not.toBe('BODY');
});
for(const [lang,path] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']])test(lang+' engine observations distinguish false, zero and stale from completion',async({page})=>{
 const data=fixture(),at=Math.floor(Date.now()/1000),record=data.reports.find(r=>r.id==='OP-07');
 record.signals=[{id:'gateway_configured',labelFa:'وجود کلید خصوصی درگاه',labelEn:'Private gateway key configured',value:false,source:'Bertina runtime',limitation:'Configuration does not prove payment.',checkedAt:at,expiresAt:at+60},{id:'captured',labelFa:'تعداد سفارش ثبت‌شده',labelEn:'Captured order count',value:0,source:'Bertina MySQL',limitation:'No real transaction certified.',checkedAt:at-600,expiresAt:at-1}];
 await page.setViewportSize({width:320,height:900});await authorized(page,{data});await page.goto(base+path);await page.locator('#ops-search').fill('OP-07');await page.locator('#ops-cards button').click();
 const signals=page.locator('#ops-detail .ops-signals');await expect(signals.locator('article')).toHaveCount(2);await expect(signals).toContainText(lang==='en'?'No':'خیر');await expect(signals).toContainText('0');await expect(signals).toContainText(lang==='en'?'Stale':'قدیمی');await expect(page.locator('#ops-admin-score')).toHaveText(lang==='en'?'Unknown':'نامشخص');
 expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:lang==='en'?'Download written report':'دریافت گزارش مکتوب',exact:true}).click();const download=await downloadEvent;const fs=require('node:fs');const text=fs.readFileSync(await download.path(),'utf8');expect(text).toContain(lang==='en'?'Private gateway key configured: No':'وجود کلید خصوصی درگاه: خیر');expect(text).toContain('Configuration does not prove payment.');
});


test('Bertina unified dashboard preserves all modules and makes path switching presentation-only',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/api/auth/health',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,ready:true,registrationReady:false,emailDeliveryVerified:false})}));
 await page.route('**/api/auth/me',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({ok:false,error:'unauthorized'})}));
 const response=await page.goto(base+'/fa/customer-dashboard/',{waitUntil:'domcontentloaded'});
 expect(response.status()).toBe(200);
 expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
 for(const id of ['overview','journey','command-center','student-support','ecosystem','academic-profile','progress','consultations','records','account']){
  await expect(page.locator('#'+id)).toHaveCount(1);
 }
 await expect(page.locator('[data-command-item]')).toHaveCount(13);
 await expect(page.locator('[data-command-path]')).toHaveCount(4);
 await page.locator('[data-command-path="sponsorship"]').click();
 await expect(page.locator('[data-command-path="sponsorship"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-command-item][href="#student-support"]')).toBeVisible();
 await expect(page.locator('[data-command-item][data-command-group="learning"]:visible')).toHaveCount(0);
 await expect(page.locator('#ecosystem')).toBeHidden();
 await expect(page.locator('[data-live-dot].ready')).toHaveCount(0);
 await page.locator('[data-command-path="all"]').click();
 await expect(page.locator('[data-command-item]:visible')).toHaveCount(13);
 await page.locator('[data-dashboard-more]').click();
 await expect(page.locator('[data-dashboard-sheet]')).toHaveClass(/is-open/);
 await page.locator('[data-dashboard-sheet] a[href="#command-center"]').click();
 await expect(page.locator('[data-dashboard-sheet]')).not.toHaveClass(/is-open/);
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});
  const widths=await page.evaluate(()=>[document.documentElement.scrollWidth,document.body.scrollWidth,innerWidth]);
  expect(Math.max(widths[0],widths[1]),'dashboard horizontal overflow at '+width).toBeLessThanOrEqual(widths[2]+1);
 }
});


test('dashboard navigation shows account summary first, exactly one workspace and supports mobile deep links',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/fa/customer-dashboard/',{waitUntil:'domcontentloaded'});
 const shown=()=>page.locator('[data-dashboard-panel]:visible').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.dashboardPanel))]);
 await expect(page.locator('.cd-statusbar')).toBeVisible();
 await expect(page.locator('#overview')).toBeVisible();
 await expect(page.locator('#command-center')).toBeVisible();
 await expect(page.locator('#student-support')).toBeHidden();
 await expect(page.locator('#academic-profile')).toBeHidden();
 expect(await shown()).toEqual(['overview']);
 const summaryPosition=await page.locator('.cd-statusbar').evaluate(el=>el.compareDocumentPosition(document.querySelector('#overview'))&Node.DOCUMENT_POSITION_FOLLOWING);
 expect(summaryPosition).toBeTruthy();
 await page.locator('.cd-mobile-dock a[href="#academic-profile"]').click();
 await expect(page.locator('#academic-profile')).toBeVisible();
 await expect(page.locator('.cd-statusbar')).toBeHidden();
 await expect(page.locator('#journey')).toBeHidden();
 expect(await shown()).toEqual(['academic-profile']);
 await page.locator('[data-dashboard-more]').click();
 await expect(page.locator('[data-dashboard-sheet]')).toHaveClass(/is-open/);
 await page.locator('[data-dashboard-sheet] a[href="#progress"]').click();
 await expect(page.locator('#progress')).toBeVisible();
 await expect(page.locator('#academic-profile')).toBeHidden();
 expect(await shown()).toEqual(['progress']);
 await page.goBack();
 await expect(page.locator('#academic-profile')).toBeVisible();
 await page.goto(base+'/fa/customer-dashboard/#service-market',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#ecosystem')).toBeVisible();
 await expect(page.locator('#service-market')).toBeVisible();
 await expect(page.locator('#student-support')).toBeHidden();
 expect(await shown()).toEqual(['ecosystem']);
 await page.goto(base+'/fa/customer-dashboard/#student-support',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#student-support')).toBeVisible();
 await expect(page.locator('#ecosystem')).toBeHidden();
 expect(await shown()).toEqual(['student-support']);
 await page.locator('[data-dashboard-more]').click();
 await expect(page.locator('[data-dashboard-sheet]')).toHaveClass(/is-open/);
 await page.locator('[data-dashboard-sheet] a[href="#command-center"]').click();
 await expect(page.locator('[data-dashboard-sheet]')).not.toHaveClass(/is-open/);
 await expect(page.locator('#command-center')).toBeVisible();
 expect(await shown()).toEqual(['overview']);
 for(const width of [320,390,768,1280]){
  await page.setViewportSize({width,height:860});
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
  expect(overflow,'horizontal overflow at '+width).toBeLessThanOrEqual(1);
 }
 await page.setViewportSize({width:1280,height:860});
 const fonts=await page.evaluate(()=>({
  nav:parseFloat(getComputedStyle(document.querySelector('.cd-nav a')).fontSize),
  description:parseFloat(getComputedStyle(document.querySelector('.cd-hero p:not(.cd-kicker)')).fontSize),
  card:parseFloat(getComputedStyle(document.querySelector('.cd-quick-card strong')).fontSize)
 }));
 expect(fonts.nav).toBeGreaterThanOrEqual(15);
 expect(fonts.description).toBeGreaterThanOrEqual(16);
 expect(fonts.card).toBeGreaterThanOrEqual(15);
 expect(errors).toEqual([]);
});


test('FA/EN account-first dashboard keeps every workspace and shows one at a time',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const states=async()=>page.locator('[data-dashboard-panel]:visible').evaluateAll(nodes=>[...new Set(nodes.map(n=>n.dataset.dashboardPanel))]);
 for(const [lang,route] of [['fa','/fa/customer-dashboard/'],['en','/en/account/']]){
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('.cd-statusbar')).toBeVisible();
  await expect(page.locator('.cd-home-priority')).toBeVisible();
  await expect(page.locator('[data-home-action]')).toHaveAttribute('href','/'+lang+'/login/');
  await expect(page.locator('#overview')).toBeVisible();
  expect(await states()).toEqual(['overview']);
  const order=await page.locator('.cd-statusbar').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#overview'))&Node.DOCUMENT_POSITION_FOLLOWING));
  expect(order).toBe(true);
  const sections=await page.locator('main [data-dashboard-panel][id]').evaluateAll(nodes=>nodes.map(n=>n.id));
  for(const required of ['journey','command-center','student-support','ecosystem','academic-profile','progress','consultations','records','account']){
   expect(sections,lang+' missing module '+required).toContain(required);
  }
  await page.locator('.cd-mobile-dock a[href="#student-support"]').click();
  await expect(page.locator('#student-support')).toBeVisible();
  await expect(page.locator('#overview')).toBeHidden();
  expect(await states()).toEqual(['student-support']);
  await page.locator('.cd-mobile-dock a[href="#ecosystem"]').click();
  await expect(page.locator('#ecosystem')).toBeVisible();
  expect(await states()).toEqual(['ecosystem']);
  await page.keyboard.press('/');
  await expect(page.locator('#command-center')).toBeVisible();
  await expect(page.locator('[data-dashboard-command-search]')).toBeFocused();
  expect(await states()).toEqual(['overview']);
  await page.goBack();
  await expect(page.locator('#ecosystem')).toBeVisible();
  for(const width of [320,390,768,1280]){
   await page.setViewportSize({width,height:850});
   const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
   expect(overflow,lang+' horizontal overflow at '+width).toBeLessThanOrEqual(1);
  }
 }
 expect(errors).toEqual([]);
});

test('authenticated accounts receive only a verified personal greeting in both languages',async({page})=>{
 await page.route('**/api/auth/health',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,ready:true})}));
 await page.route('**/api/auth/me',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,user:{email:'member@example.test'}})}));
 // A signed-in account with no owned purchases offers the genuine catalogue,
 // never an invented order or a legacy static primary action.
 await page.route('**/api/commerce/history',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,orders:[]})}));
 for(const [lang,route] of [['fa','/fa/customer-dashboard/'],['en','/en/account/']]){
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-account-email]')).toHaveText('member@example.test');
  await expect(page.locator('[data-home-action]')).toHaveAttribute('href','/'+lang+'/services/');
  await expect(page.locator('html')).toHaveAttribute('data-customer-authenticated','true');
  await expect(page.locator('#student-support')).toBeHidden();
  await expect(page.locator('[data-home-heading]')).not.toContainText(lang==='en'?'Sign in':'وارد حساب شوید');
 }
});

for(const [lang,path] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 test(lang+' Stage09 owner-only commerce cards stay private and mobile-safe',async({page})=>{
  const privateEmail='private-person@example.invalid';
  const payload={
   ok:true,schema:'operations-commerce-evidence-v1',available:true,
   providerBankSettlementVerified:null,physicalStockCountVerified:null,
   orders:{pendingRecords:3,paidStateRecords:2,failedRecords:0,totalRows:5,states:{pending:3,paid:2}},
   claims:{paidRowsRequiringIndependentProviderReconciliation:1},
   stock:{ledgerDiscrepancies:1,rowsWithoutReconciliationTimestamp:1,
     rows:[{sku:'book:roshanaei',availableRecorded:4,reservedRecorded:3,
       reservationUnitsHeld:2,ledgerDiscrepancy:true}]},
   notifications:{paidOrderRowsWithoutReceiptEmailTimestamp:2,
     outboxStates:{pending:2,failed:1,processing:0}},
   fulfilment:{serviceCaseStates:{awaiting_contact:2},parcelStates:{preparing:1},
     activeServiceCaseCount:1,queueTruncated:false,serviceActionQueue:[{
       orderId:'12345678-1111-4111-8111-111111111111',
       sku:'service:academic_consult_60',status:'awaiting_contact',
       providerClaimMatchesOrder:false
     }],
     activeParcelCount:1,parcelQueueLimit:50,parcelQueueTruncated:false,
     preparingOlderThan48Hours:1,inShippingOlderThan7Days:0,
     parcelActionQueue:[{
       orderId:'87654321-1111-4111-8111-111111111111',
       state:'preparing',updatedAt:'2026-10-10 12:00:00',
       orderPaidState:true,providerClaimMatchesOrder:true
     }]}
  };
  let hits=0;
  await page.setViewportSize({width:320,height:850});
  await authorized(page);
  await page.route('**/api/admin/operations/commerce',route=>{
   hits++;expect(route.request().method()).toBe('GET');
   return route.fulfill({json:payload});
  });
  await page.goto(base+path);
  await expect(page.locator('#ops-workspace')).toBeVisible();
  await expect(page.locator('#ops-commerce-results article')).toHaveCount(0);
  await page.locator('#ops-commerce > summary').click();
  await expect(page.locator('#ops-commerce-results article')).toHaveCount(15);
  await expect(page.locator('#ops-commerce-results details')).toHaveCount(2);
  await expect(page.locator('#ops-commerce-results details').first()).not.toHaveAttribute('open');
  await page.locator('#ops-commerce-results details summary').first().click();
  await page.locator('#ops-commerce-results details summary').nth(1).click();
  await expect(page.locator('#ops-commerce-results details li')).toHaveCount(2);
  await expect(page.locator('#ops-commerce-results details').first()).toContainText('87654321');
  await expect(page.locator('#ops-commerce-results details').nth(1)).toContainText('12345678');
  await expect(page.locator('#ops-commerce-results')).not.toContainText('private-person@example.invalid');
  await expect(page.locator('#ops-commerce-results')).toContainText('3');
  await expect(page.locator('#ops-commerce-results')).toContainText('book:roshanaei');
  expect(hits).toBe(1);
  await expect(page.locator('#ops-commerce-results')).not.toContainText(privateEmail);
  expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);
  await page.locator('#ops-commerce > summary').click();
  await expect(page.locator('#ops-commerce-results article')).toHaveCount(0);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 });
}
test('English owner commerce formats real ledger amounts without implying bank settlement',async({page})=>{
 await authorized(page);
 await page.route('**/api/admin/operations/commerce',route=>route.fulfill({json:{
  ok:true,schema:'operations-commerce-evidence-v1',available:true,
  orders:{pendingRecords:0,paidStateRecords:1,totalRows:1},
  claims:{paidRowsRequiringIndependentProviderReconciliation:0},
  stock:{ledgerDiscrepancies:0,rowsWithoutReconciliationTimestamp:0,rows:[]},
  notifications:{paidOrderRowsWithoutReceiptEmailTimestamp:0,outboxStates:{}},
  fulfilment:{serviceCaseStates:{},parcelStates:{},activeServiceCaseCount:0,
   activeParcelCount:0,preparingOlderThan48Hours:0,inShippingOlderThan7Days:0,
   serviceActionQueue:[],parcelActionQueue:[]},
  salesPipeline:{status:'INTERNAL_ORDER_LEDGER_ONLY',paidStateAmountToman:'1234567',
   providerClaimMatchedAmountToman:'1234567',paidStateAmountLast30DaysToman:'1234567',
   paidStateOrdersLast30Days:1,pendingOlderThan24Hours:0,pendingOlderThan7Days:0,
   createdOlderThan24Hours:0,refundRequestsAwaitingAction:0}
 }}));
 await page.goto(base+'/en/account/admin/');
 await page.locator('#ops-commerce > summary').click();
 const value=page.locator('#ops-commerce-results article').filter({hasText:'Paid-state order value'}).first().locator('.ops-number');
 await expect(value).toHaveText('1,234,567 toman');
 await expect(page.locator('#ops-commerce-results')).toContainText('not bank-settled revenue');
 await expect(page.locator('#ops-commerce-results')).not.toContainText('Verified bank settlement');
 await page.locator('#ops-commerce > summary').click();
 await expect(page.locator('#ops-commerce-results article')).toHaveCount(0);
});
test('MFA-protected commerce reports never manufacture zero when server refuses access',async({page})=>{
 await authorized(page);
 await page.route('**/api/admin/operations/commerce',route=>route.fulfill({
  status:403,json:{ok:false,error:'admin_mfa_required'}}));
 await page.goto(base+'/fa/app/admin/');
 await expect(page.locator('#ops-workspace')).toBeVisible();
 await page.locator('#ops-commerce > summary').click();
 await expect(page.locator('#ops-commerce-status')).toContainText('قابل دریافت نیست');
 await expect(page.locator('#ops-commerce-results article')).toHaveCount(0);
});

test('MFA expiry destroys service-order worklist references instead of merely hiding them',async({page})=>{
 const order='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
 await authorized(page,{expiry:3});
 await page.route('**/api/commerce/health',route=>route.fulfill({json:{
   ok:true,service:'commerce',checkout:false,requirements:{database:true},
   capabilities:{services:false,vip:false,books:false}
 }}));
 await page.route('**/api/admin/operations/commerce',route=>route.fulfill({json:{
   ok:true,schema:'operations-commerce-evidence-v1',available:true,
   orders:{states:{},pendingRecords:0,paidStateRecords:1,totalRows:1},
   claims:{paidRowsRequiringIndependentProviderReconciliation:0},
   stock:{rows:[],ledgerDiscrepancies:0,rowsWithoutReconciliationTimestamp:0},
   notifications:{outboxStates:{},paidOrderRowsWithoutReceiptEmailTimestamp:0},
   fulfilment:{serviceCaseStates:{awaiting_contact:1},parcelStates:{},
     activeServiceCaseCount:1,queueTruncated:false,
     serviceActionQueue:[{orderId:order,sku:'service:academic_consult_60',
       status:'awaiting_contact',providerClaimMatchesOrder:true}]}
 }}));
 await page.goto(base+'/fa/app/admin/');
 await expect(page.locator('#ops-workspace')).toBeVisible();
 await page.locator('#ops-commerce > summary').click();
 await expect(page.locator('#ops-commerce-results details')).toHaveCount(1);
 await page.locator('#ops-commerce-results details summary').click();
 await expect(page.locator('#ops-commerce-results')).toContainText(order.slice(0,8));
 const readiness=page.locator('#ops-commerce-status + section');
 await expect(readiness).toContainText('دریافت پرداخت');
 await expect(page.locator('#ops-workspace')).toBeHidden({timeout:7000});
 await expect(readiness).toBeEmpty();
 await expect(page.locator('#ops-commerce-status')).toBeEmpty();
 await expect(page.locator('#ops-commerce-results')).toBeEmpty();
 await expect(page.locator('#ops-commerce')).not.toHaveAttribute('open');
});

for(const [locale,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 for(const width of [320,1440])test(locale+' Stage 7 masterplan contains six development briefs and twelve delivery packages at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:900});await authorized(page);await page.goto(base+route);
  const panel=page.locator('#ops-stage7-blueprint');
  await expect(panel).toBeVisible();
  await expect(panel.locator('article.ops-card')).toHaveCount(6);
  await expect(panel.locator('details.ops-s7-brief')).toHaveCount(6);
  await expect(panel.locator('li[data-s7-package]')).toHaveCount(12);
  await panel.locator(':scope > summary').click();
  await panel.locator('details.ops-s7-brief').first().locator('summary').click();
  await expect(panel.locator('details.ops-s7-brief').first()).toContainText(locale==='fa'?'معیار پذیرش':'Acceptance criteria');
  await panel.locator('#ops-s7-delivery-briefs > summary').click();
  await panel.locator('[data-s7-package="S7-11"] summary').click();
  await expect(panel.locator('[data-s7-package="S7-11"]')).toContainText(locale==='fa'?'۱۴۴ معیار':'144 gates');
  const delta=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
  expect(delta).toBeLessThanOrEqual(1);
 });
}
test('Stage 7 development instructions stay within MFA-protected workspace',async({page})=>{
 await authorized(page,{mfa:true});await page.goto(base+'/fa/app/admin/');
 await expect(page.locator('#ops-stage7-blueprint')).toBeHidden();
});


for(const [lang,path] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 test(lang+' owner appointment calendar verifies buyer choice and protects booking mutation on mobile',async({page})=>{
  await page.setViewportSize({width:320,height:850});
  await authorized(page);
  const bookedStart=new Date(Date.now()+24*3600_000).toISOString().slice(0,19).replace('T',' ');
  const bookedEnd=new Date(Date.now()+26*3600_000).toISOString().slice(0,19).replace('T',' ');
  const allowedOrder='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const awaitingOrder='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const unseenEmail='confidential.client@example.invalid';
  const fixture={
   ok:true,schema:'operations-commerce-evidence-v1',available:true,
   orders:{pendingRecords:0,paidStateRecords:2,totalRows:2,states:{paid:2}},
   claims:{paidRowsRequiringIndependentProviderReconciliation:0},
   stock:{rows:[],ledgerDiscrepancies:0,rowsWithoutReconciliationTimestamp:0},
   notifications:{paidOrderRowsWithoutReceiptEmailTimestamp:0,outboxStates:{}},
   fulfilment:{
    customerPreferenceSchemaReady:true,
    serviceCaseStates:{scheduling:2,booked:1},parcelStates:{},
    activeServiceCaseCount:2,queueTruncated:false,
    activeParcelCount:0,preparingOlderThan48Hours:0,inShippingOlderThan7Days:0,
    parcelActionQueue:[],
    internalCalendar:{scope:'single_owner_internal_cases_only',timeZone:'UTC',
      totalUpcoming:1,limit:100,truncated:false,externalAvailabilityConfirmed:false,
      windows:[{startUtc:bookedStart,endUtc:bookedEnd,state:'booked'}]},
    serviceActionQueue:[
      {orderId:allowedOrder,sku:'service:academic_consult_60',status:'scheduling',
       orderPaidState:true,providerClaimMatchesOrder:true,deliveryMode:'VIDEO',
       meetingCity:null,customerPreferenceRecorded:true,bookingStart:null,bookingEnd:null},
      {orderId:awaitingOrder,sku:'service:academic_consult_60',status:'scheduling',
       orderPaidState:true,providerClaimMatchesOrder:true,deliveryMode:null,
       meetingCity:null,customerPreferenceRecorded:false,bookingStart:null,bookingEnd:null}
    ]
   }
  };
  let reads=0;
  await page.route('**/api/admin/operations/commerce',route=>{
    reads++;return route.fulfill({json:fixture});
  });
  const requests=[];
  await page.route('**/api/admin/operations/commerce/service-advance',route=>{
    const request=route.request();
    expect(request.method()).toBe('POST');
    expect(request.headers()['x-csrf-token']).toBe('c'.repeat(64));
    const data=request.postDataJSON();requests.push(data);
    expect(data).toMatchObject({
      orderId:allowedOrder,sku:'service:academic_consult_60',
      expectedState:'scheduling',nextState:'booked'
    });
    expect(Object.keys(data).sort()).toEqual(
      ['bookingEnd','bookingStart','expectedState','nextState','orderId','sku'].sort());
    expect(data.bookingStart).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(data.bookingEnd).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    return route.fulfill({json:{
      ok:true,schema:'commerce-service-transition-v1',
      change:{state:'booked',customerNotified:false,serviceDelivered:false}
    }});
  });
  await page.goto(base+path);
  await expect(page.locator('#ops-workspace')).toBeVisible();
  await page.locator('#ops-commerce > summary').click();
  const calendar=page.locator('#ops-commerce-results .ops-calendar');
  await expect(calendar).toHaveCount(1);
  await calendar.locator('summary').click();
  await expect(calendar).toContainText(lang==='fa'?'تقویم داخلی':'Internal confirmed');
  await expect(calendar.locator('.ops-queue li')).toHaveCount(1);
  const queue=page.locator('#ops-commerce-results .ops-service-queue');
  await expect(queue).toHaveCount(1);
  await queue.locator('summary').click();
  const cases=queue.locator('.ops-queue li');
  await expect(cases).toHaveCount(2);
  await expect(cases.first()).toContainText(lang==='fa'?'آنلاین تصویری':'Online video');
  await expect(cases.nth(1)).toContainText(lang==='fa'?'ثبت یا تأیید نشده':'absent or unverified');
  await expect(cases.nth(1).locator('button')).toHaveCount(0);
  await expect(cases.first().locator('button')).toHaveCount(1);
  await expect(queue).not.toContainText(unseenEmail);
  await expect(calendar).not.toContainText(allowedOrder);
  const input=cases.first().locator('input[type="datetime-local"]');
  await expect(input).toHaveCount(2);
  const size=await input.first().evaluate(n=>({
    width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height,
    font:parseFloat(getComputedStyle(n).fontSize)
  }));
  expect(size.height).toBeGreaterThanOrEqual(44);
  expect(size.font).toBeGreaterThanOrEqual(16);
  const local=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')].join('-')+'T'+
    [String(d.getHours()).padStart(2,'0'),String(d.getMinutes()).padStart(2,'0')].join(':');
  const startDate=new Date(Date.now()+72*3600_000);
  startDate.setSeconds(0,0);
  const endDate=new Date(startDate.getTime()+60*60_000);
  await input.nth(0).fill(local(startDate));await input.nth(1).fill(local(endDate));
  page.on('dialog',dialog=>dialog.accept());
  await cases.first().locator('button').click();
  await expect.poll(()=>requests.length).toBe(1);
  await expect.poll(()=>reads).toBeGreaterThanOrEqual(2);
  expect(requests[0].bookingStart).toBe(startDate.toISOString().slice(0,19).replace('T',' '));
  expect(requests[0].bookingEnd).toBe(endDate.toISOString().slice(0,19).replace('T',' '));
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
  expect(await page.evaluate(()=>
    Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth))
    .toBeLessThanOrEqual(1);
 });
}


test('owner-only capacity editor converts Tehran hours and submits after fresh MFA',async({page})=>{
 const payload={ok:true,schema:'operations-commerce-evidence-v1',available:true,
  orders:{states:{},pendingRecords:0,paidStateRecords:0,totalRows:0},
  claims:{paidRowsRequiringIndependentProviderReconciliation:0},
  stock:{rows:[],ledgerDiscrepancies:0,rowsWithoutReconciliationTimestamp:0},
  notifications:{outboxStates:{},paidOrderRowsWithoutReceiptEmailTimestamp:0},
  fulfilment:{serviceCaseStates:{},parcelStates:{},activeServiceCaseCount:0,
    activeParcelCount:0,serviceActionQueue:[],parcelActionQueue:[],
    internalAvailability:{schemaReady:true,scope:'single_owner_explicit_windows_only',
      timeZone:'UTC',openWindowCount:0,windows:[],truncated:false,
      externalAvailabilityConfirmed:false},
    internalCalendar:{totalUpcoming:0,windows:[],truncated:false}}};
 let submission=null;
 await authorized(page);
 await page.route('**/api/admin/operations/commerce',route=>route.fulfill({json:payload}));
 await page.route('**/api/admin/operations/commerce/availability',route=>{
   const req=route.request();
   expect(req.method()).toBe('POST');
   expect(req.headers()['x-csrf-token']).toBe('c'.repeat(64));
   submission=req.postDataJSON();
   return route.fulfill({json:{ok:true,schema:'commerce-consultation-capacity-v1',
     change:{state:'OPEN',appointmentConfirmed:false,customerNotified:false}}});
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/fa/app/admin/');
 await page.locator('#ops-commerce > summary').click();
 const editor=page.locator('#ops-commerce-results .ops-capacity');
 await expect(editor).toHaveCount(1);
 await editor.locator('summary').click();
 const startHour=editor.locator('input[type="time"]');
 const duration=editor.locator('select');
 await expect(startHour).toHaveValue('17:00');
 await expect(duration).toHaveValue('1');
 await expect(editor.locator('.ops-week-day')).toHaveCount(7);
 // Selecting a time does not publish a real owner calendar window.
 await editor.locator('[data-consultation-evening-preset="1700-1800"]').click();
 await expect(startHour).toHaveValue('17:00');
 await expect(duration).toHaveValue('1');
 expect(submission).toBeNull();
 await editor.locator('.ops-week-day button').first().click();
 await expect(editor.locator('input[type="date"]')).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
 expect(submission).toBeNull();
 await editor.locator('input[type="date"]').fill('2026-10-20');
 await editor.locator('input[type="time"]').fill('14:00');
 await editor.locator('select').selectOption('2');
 await editor.getByRole('button',{name:'انتشار این بازه'}).click();
 await expect.poll(()=>submission).not.toBeNull();
 expect(submission).toEqual({
   action:'open',windowId:null,startUtc:'2026-10-20 10:30:00',
   endUtc:'2026-10-20 12:30:00'
 });
 await expect(page.locator('#ops-workspace')).toBeVisible();
 expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,
  document.body.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);
});
test('without verified consultation capacity schema the owner cannot publish time',async({page})=>{
 await authorized(page);
 await page.route('**/api/admin/operations/commerce',route=>route.fulfill({json:{
  ok:true,schema:'operations-commerce-evidence-v1',available:true,
  orders:{states:{}},claims:{},stock:{rows:[]},notifications:{outboxStates:{}},
  fulfilment:{serviceCaseStates:{},parcelStates:{},activeServiceCaseCount:0,
   serviceActionQueue:[],parcelActionQueue:[],
   internalAvailability:{schemaReady:false,windows:[],openWindowCount:null}}
 }}));
 await page.goto(base+'/en/account/admin/');
 await page.locator('#ops-commerce > summary').click();
 const availability=page.locator('#ops-commerce-results .ops-capacity');
 await expect(availability).toHaveCount(1);
 await availability.locator('summary').click();
 await expect(availability).toContainText('not verified');
 await expect(availability.locator('input')).toHaveCount(0);
 await expect(availability.getByRole('button',{name:'Publish genuine capacity'})).toHaveCount(0);
});


// customer dashboard weekly calendar and consented enquiry linkage:
for(const [locale,route,intake] of [
 ['fa','/fa/customer-dashboard/','/fa/darkhast-moshavere/'],
 ['en','/en/account/','/en/request-consultation/']
]){
  test(locale+' customer dashboard revalidates genuine weekly hours on enquiry route',async({page})=>{
    const days=Array.from({length:7},(_,i)=>{
      const day=new Date(Date.UTC(2026,9,19+i)).toISOString().slice(0,10);
      const slots=i===0?[
        {startUtc:'2026-10-19 12:30:00',endUtc:'2026-10-19 13:30:00',status:'AVAILABLE'},
        {startUtc:'2026-10-19 13:30:00',endUtc:'2026-10-19 14:30:00',status:'FULL'}
      ]:[];
      return {date:day,totalSlots:slots.length,
        remainingSlots:slots.filter(x=>x.status==='AVAILABLE').length,slots};
    });
    let reads=0;
    await page.route('**/api/commerce/consultation-week',route=>{
      reads++;
      return route.fulfill({json:{ok:true,schema:'consultation-week-v1',
        timezone:'Asia/Tehran',slotMinutes:60,maxPublishedDailyHours:4,
        customerReservationEnabled:false,externalCalendarConfirmed:false,days}});
    });
    await page.setViewportSize({width:390,height:844});
    await page.goto(base+route);
    await page.locator('.cd-mobile-dock [data-dashboard-more]').click();
    await page.locator('[data-dashboard-sheet] a[href="#consultations"]').click();
    const week=page.locator('#consultations [data-consultation-week]');
    await expect(week.locator('.cw-day')).toHaveCount(7);
    await expect(week.locator('.cw-free')).toHaveCount(1);
    await expect(week.locator('.cw-full')).toHaveCount(1);
    await expect(week.locator('.cw-full')).toBeDisabled();
    await week.locator('.cw-free').click();
    await expect(page).toHaveURL(new RegExp(intake.replaceAll('/','\\/')+'\\?slot='));
    await expect(page.locator('form[data-consultation-composer] input[name="preferred_slot"]'))
      .toHaveValue('2026-10-19 12:30:00');
    expect(reads).toBeGreaterThanOrEqual(2);
    await expect(page.locator('form[data-consultation-composer] [data-composer-preview]')).toBeHidden();
  });
  test(locale+' customer dashboard separates owner-authenticated enquiries from paid appointments',async({page})=>{
    await page.setViewportSize({width:390,height:844});
    let reads=0;
    await page.route('**/api/growth/leads/mine',route=>{
      reads++;
      return route.fulfill({json:{ok:true,evidenceScope:'OWNER_ONLY_NO_PAYMENT_CLAIMS',
        requests:[{service_id:'service:academic_consult_60',state:'NEW'},
          {service_id:'vip:golden-talent-signature',state:'WITHDRAWN'}]}});
    });
    await page.goto(base+route);
    await page.locator('.cd-mobile-dock [data-dashboard-more]').click();
    await page.locator('[data-dashboard-sheet] a[href="#consultations"]').click();
    const lead=page.locator('#consultations [data-customer-consultation-leads]');
    await expect(lead).toBeVisible();
    expect(reads).toBe(0);
    await lead.locator('[data-consultation-lead-check]').click();
    await expect(lead.locator('.appointment-private-list li')).toHaveCount(2);
    await expect(lead.locator('.appointment-private-list li').first()).toContainText(
      locale==='fa'?'مشاوره تخصصی تحصیلی':'Specialist academic consultation');
    await expect(lead.locator('.appointment-private-list li').last()).toContainText(
      locale==='fa'?'استعدادیابی اختصاصی Golden Talent':'Signature Golden Talent guidance');
    await expect(lead.locator('a.cd-section-link[href$="#secure-consented-lead"]')).toHaveAttribute('href',
      intake+'#secure-consented-lead');
    await expect(lead).toContainText(locale==='fa'?'دریافت‌شده':'Received');
    await expect(lead).not.toContainText('private-buyer@example.invalid');
    expect(reads).toBe(1);
    await page.route('**/api/growth/leads/mine',route=>route.fulfill({
      status:503,json:{ok:false,error:'secure_lead_capture_unavailable'}}));
    await lead.locator('[data-consultation-lead-check]').click();
    await expect(lead.locator('.appointment-private-list li')).toHaveCount(0);
    await expect(lead).toContainText(locale==='fa'?'اکنون دریافت درخواست‌های حساب از سرور ممکن نیست':'could not be verified');
  });
}


test('10k USD scenario studio remains strictly hypothetical, costed and capacity-aware',async({page})=>{
  await authorized(page);
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'/en/account/admin/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#ops-workspace')).toBeVisible();
  const section=page.locator('#ops-revenue-planning');
  await section.locator('summary').click();
  const planner=section.locator('[data-jr-revenue-planner]');
  await expect(planner.locator('.jr-revenue-line')).toHaveCount(3);
  const streams=planner.locator('.jr-revenue-line');
  // Use semantic field labels: provider, acquisition, and attributable
  // cost inputs were inserted before delivery hours in the existing UI.
  const fillStream=async(index,{price,quantity,direct,gateway,acquisition,other,hours})=>{
    const row=streams.nth(index);
    for(const [label,value] of [
      ['Price per sale',price],
      ['Assumed sales per month',quantity],
      ['Direct delivery cost per sale',direct],
      ['Gateway fee per sale (assumed)',gateway],
      ['Acquisition cost per sale (assumed)',acquisition],
      ['Other attributable cost (assumed)',other],
      ['Delivery hours per sale',hours]
    ])await row.getByLabel(label,{exact:true}).fill(String(value));
  };
  await fillStream(0,{price:200,quantity:5,direct:50,gateway:2,acquisition:3,other:1,hours:1});
  await fillStream(1,{price:1000,quantity:9,direct:100,gateway:8,acquisition:10,other:2,hours:2});
  await fillStream(2,{price:0,quantity:0,direct:0,gateway:0,acquisition:0,other:0,hours:0});
  const controls=planner.locator('.jr-revenue-controls').last();
  await controls.locator('input').nth(0).fill('500');
  await controls.locator('input').nth(1).fill('10');
  await controls.locator('input').nth(2).fill('50');
  const results=planner.locator('.jr-revenue-results');
  await expect(results).toContainText('Hypothetical gross sales');
  await expect(results).toContainText('10,000.00 USD');
  await expect(results).toContainText('Contribution after attributable costs');
  await expect(results).toContainText('7,640.00 USD');
  await expect(results).toContainText('After-fixed-cost balance (before tax)');
  await expect(results).toContainText('7,140.00 USD');
  await expect(results).toContainText('Gateway + acquisition + other attributable costs');
  await expect(results).toContainText('210.00 USD');
  await expect(results).toContainText('Contribution goal shortfall');
  await expect(results).toContainText('2,360.00 USD');
  const goalKind=planner.locator('.jr-revenue-controls').first().locator('select').nth(1);
  await expect(goalKind).toHaveValue('CONTRIBUTION');
  await goalKind.selectOption('GROSS');
  await expect(results).toContainText('Gross sales goal shortfall');
  await expect(results).toContainText('0.00 USD');
  await goalKind.selectOption('CONTRIBUTION');
  await expect(results).toContainText('2,360.00 USD');
  await expect(results).toContainText('Within stated capacity');
  await expect(results).toContainText('Not observed transactions');
  await expect(results).toContainText('does not connect to live accounting');
  await controls.locator('input').nth(2).fill('10');
  await expect(results).toContainText('Over capacity');
  await expect(page.locator('#ops-organic-growth [data-ops-growth-results] article')).toHaveCount(0);
  expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,
    document.body.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});


test('owner can inspect more than twenty consented enquiries without persisting contacts',async({page})=>{
 await authorized(page);
 await page.setViewportSize({width:390,height:844});
 const cursor='1700000019:88888888-8888-4888-8888-000000000020';
 let reads=0;
 await page.route('**/api/admin/operations/growth/leads*',route=>{
   const url=new URL(route.request().url());
   if(!url.pathname.endsWith('/growth/leads'))
     return route.fulfill({status:404,json:{ok:false}});
   reads++;
   const next=url.searchParams.get('cursor');
   const first=next===null;
   expect(next===null||next===cursor).toBeTruthy();
   const start=first?0:20,count=first?20:2;
   const items=Array.from({length:count},(_,i)=>{
     const n=start+i+1;
     return {id:'88888888-8888-4888-8888-'+String(n).padStart(12,'0'),
       serviceId:'service:academic_consult_60',state:'NEW',
       contactEmail:'synthetic-'+n+'@example.test',
       createdAt:1700000000+n-1,updatedAt:1700000000+n-1};
   });
   return route.fulfill({json:{ok:true,schema:'stage14-owner-lead-worklist-v1',
     items,limit:20,asOf:1700000100,nextCursor:first?cursor:null,
     privacy:'MFA_ONLY_CURRENT_CONSENT_NO_MARKETING_PERMISSION'}});
 });
 await page.goto(base+'/en/account/admin/',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#ops-workspace')).toBeVisible();
 const growth=page.locator('#ops-organic-growth');
 await growth.locator(':scope > summary').click();
 const queue=growth.locator(':scope > details.ops-panel');
 await expect(queue).toHaveCount(1);
 await queue.locator('summary').click();
 await queue.getByRole('button',{name:'Load current follow-up queue'}).click();
 await expect(queue.locator('ol.ops-source-list > li')).toHaveCount(20);
 await expect(queue.locator('ol.ops-source-list > li').first()).toContainText('Specialist academic consultation');
 await queue.getByRole('button',{name:'Load next enquiries'}).click();
 await expect(queue.locator('ol.ops-source-list > li')).toHaveCount(22);
 await expect(queue.getByRole('button',{name:'Load next enquiries'})).toBeHidden();
 expect(reads).toBe(2);
 // A failed MFA-protected refresh must not leave old contact details actionable.
 await page.route('**/api/admin/operations/growth/leads*',route=>route.fulfill({
   status:503,json:{ok:false,error:'secure_lead_capture_unavailable'}
 }));
 await queue.getByRole('button',{name:'Load current follow-up queue'}).click();
 await expect(queue.locator('ol.ops-source-list')).toBeEmpty();
 await expect(queue).toContainText('previous contacts were cleared');
 await expect(queue).not.toContainText('synthetic-1@example.test');
 await queue.locator('summary').click();
 await expect(queue.locator('ol.ops-source-list')).toBeEmpty();
 await expect(queue).not.toContainText('synthetic-1@example.test');
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});


test('administrator audit history filters by event and reference without changing server records',async({page})=>{
 await authorized(page);
 const events=[
  {type:'mfa_verified',reference:'admin-session-1',occurredAt:1700000000},
  {type:'payment_verified',reference:'donation-order-1',occurredAt:1700000100},
  {type:'release_imported',reference:'release-2',occurredAt:1700000200}
 ];
 let reads=0;
 await page.route('**/api/admin/operations/audit-timeline',route=>{
  reads++;
  return route.fulfill({json:{ok:true,events}});
 });
 await page.goto(base+'/fa/app/admin/');
 await expect(page.locator('#ops-workspace')).toBeVisible();
 const audit=page.locator('#ops-audit-timeline');
 await audit.locator('summary').click();
 await audit.getByRole('button',{name:'دریافت تاریخچه'}).click();
 await expect(audit.locator('.ops-audit-table tbody tr')).toHaveCount(3);
 await audit.locator('select').selectOption('payment_verified');
 await expect(audit.locator('.ops-audit-table tbody tr')).toHaveCount(1);
 await expect(audit.locator('.ops-audit-table tbody')).toContainText('donation-order-1');
 await audit.locator('select').selectOption('');
 await audit.locator('input[type=search]').fill('release-2');
 await expect(audit.locator('.ops-audit-table tbody tr')).toHaveCount(1);
 await expect(audit.locator('.ops-audit-table tbody')).toContainText('release_imported');
 await audit.locator('input[type=search]').fill('missing');
 await expect(audit.locator('.ops-audit-table tbody')).toContainText('موردی یافت نشد');
 expect(reads).toBe(1);
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});


test('MFA lock purges confidential manuscript, reviewer, and author records from the owner dashboard',async({page})=>{
 await page.setViewportSize({width:390,height:850});
 await authorized(page);
 await page.route('**/api/admin/operations/jhela/reviewers',r=>r.fulfill({json:{
  ok:true,schema:'jhela-owner-reviewer-queue-v1',candidates:[{
   id:'r1',academic_name:'Confidential Reviewer',private_contact_email:'reviewer-private@example.invalid',
   status:'PENDING',expertise:'Research',methods:'Qualitative'
  }]
 }}));
 await page.route('**/api/admin/operations/jhela/manuscripts',r=>r.fulfill({json:{
  ok:true,schema:'jhela-native-owner-screening-v1',canDownloadFiles:false,manuscripts:[{
   id:'m1',tracking_code:'JH-PRIVATE',title:'Confidential Manuscript',
   author_email:'manuscript-private@example.invalid',status:'PRELIMINARY_RECEIVED',
   article_type:'research',abstract_text:'Private abstract'
  }]
 }}));
 await page.route('**/api/admin/operations/publishing/authors',r=>r.fulfill({json:{
  ok:true,authors:[{id:'a1',display_name_fa:'Confidential Author',status:'submitted',
   bank_name:'Private Bank',card_last4:'1234',iban_last4:'5678',documents:[]}]
 }}));
 await page.goto(base+'/fa/app/admin/');
 await expect(page.locator('#ops-workspace')).toBeVisible();
 await page.locator('#ops-jhela-workstream > summary').click();
 await page.locator('[data-jhela-reviewer-owner] > summary').click();
 await page.locator('[data-jhela-manuscript-owner] > summary').click();
 await page.locator('#ops-publishing-author-review > summary').click();
 await page.locator('[data-jhela-owner-review-refresh]').click();
 await page.locator('[data-jhela-owner-ms-refresh]').click();
 await page.locator('#ops-publishing-author-refresh').click();
 await expect(page.locator('[data-jhela-owner-review-results]')).toContainText('reviewer-private@example.invalid');
 await expect(page.locator('[data-jhela-owner-ms-results]')).toContainText('manuscript-private@example.invalid');
 await expect(page.locator('#ops-publishing-author-results')).toContainText('Confidential Author');
 // This is the internal lock notification issued by operations-control.lock().
 await page.evaluate(()=>{
  const root=document.getElementById('ops-workspace');
  root.hidden=true;root.dispatchEvent(new Event('jr:operations-locked'));
 });
 await expect(page.locator('[data-jhela-owner-review-results]')).toBeEmpty();
 await expect(page.locator('[data-jhela-owner-ms-results]')).toBeEmpty();
 await expect(page.locator('#ops-publishing-author-results')).toBeEmpty();
 await expect(page.locator('[data-jhela-owner-review-status]')).toBeEmpty();
 await expect(page.locator('[data-jhela-owner-ms-status]')).toBeEmpty();
 await expect(page.locator('#ops-publishing-author-status')).toBeEmpty();
 await expect(page.locator('#ops-workspace')).toBeHidden();
});


test('JHELA owner diagnostics never retain or repaint data after the administrator workspace locks',async({page})=>{
 await authorized(page);
 const maturity={
  ok:true,schema:'jhela-owner-maturity-snapshot-v1',
  scientificMilestones:Array.from({length:10},(_,i)=>({id:'JH-'+i,fa:'مرحله '+i,en:'Stage '+i})),
  infrastructureTiers:Array.from({length:4},(_,i)=>({id:'T-'+i})),
  editorial:{submissionPolicy:'CONDITIONAL_ON_LIVE_HOST'},
  evidenceReview:{progressPercent:null,verifiedStageCount:0},verifiedIndexClaims:[]
 };
 const host={ok:true,schema:'jhela-owner-host-readiness-v1',checks:{},manuscriptIntakeReady:false};
 let delay=false;
 const delayed=[];
 await page.route('**/api/admin/operations/jhela/maturity',async route=>{
  if(delay)await new Promise(resolve=>delayed.push(resolve));
  await route.fulfill({json:maturity});
 });
 await page.route('**/api/admin/operations/jhela/host-readiness',async route=>{
  if(delay)await new Promise(resolve=>delayed.push(resolve));
  await route.fulfill({json:host});
 });
 await page.goto(base+'/fa/app/admin/');
 await expect(page.locator('#ops-workspace')).toBeVisible();
 await page.locator('#ops-jhela-workstream > summary').click();
 await page.locator('#ops-jhela-maturity > summary').click();
 await page.locator('[data-jhela-host-readiness] > summary').click();
 await page.locator('[data-jhela-maturity-refresh]').click();
 await page.locator('[data-jhela-host-refresh]').click();
 const maturityResult=page.locator('[data-jhela-maturity-results]');
 const hostResult=page.locator('[data-jhela-host-results]');
 await expect(maturityResult).not.toBeEmpty();
 await expect(hostResult).not.toBeEmpty();
 delay=true;
 await page.locator('[data-jhela-maturity-refresh]').click();
 await page.locator('[data-jhela-host-refresh]').click();
 await expect.poll(()=>delayed.length).toBe(2);
 await page.evaluate(()=>{
  const workspace=document.getElementById('ops-workspace');
  workspace.hidden=true;
  workspace.dispatchEvent(new Event('jr:operations-locked'));
 });
 await expect(maturityResult).toBeEmpty();
 await expect(hostResult).toBeEmpty();
 await expect(page.locator('[data-jhela-maturity-status]')).toBeEmpty();
 await expect(page.locator('[data-jhela-host-status]')).toBeEmpty();
 delayed.forEach(resolve=>resolve());
 await page.waitForTimeout(100);
 await expect(maturityResult).toBeEmpty();
 await expect(hostResult).toBeEmpty();
 await expect(page.locator('#ops-workspace')).toBeHidden();
});


for(const [locale,route,width] of [['fa','/fa/app/admin/',320],['en','/en/account/admin/',390]]){
 test(locale+' source evidence opens existing commerce and social panels without granting any operational permission',async({page})=>{
  await authorized(page);
  const writes=[];
  page.on('request',request=>{if(request.method()==='POST')writes.push(request.url());});
  await page.setViewportSize({width,height:870});
  await page.goto(base+route);
  await expect(page.locator('#ops-workspace')).toBeVisible();
  await page.locator('#ops-search').fill('OP-11');
  await expect(page.locator('#ops-cards article')).toHaveCount(1);
  await page.locator('#ops-cards button').click();
  const link=page.locator('#ops-detail [data-ops-workspace-jump="ops-commerce"]');
  await expect(link).toBeVisible();
  await expect(page.locator('#ops-commerce')).not.toHaveAttribute('open','');
  await link.click();
  await expect(page.locator('#ops-commerce')).toHaveAttribute('open','');
  await expect(page.locator('#ops-commerce > summary')).toBeFocused();
  await page.locator('#ops-search').fill('OP-31');
  await expect(page.locator('#ops-cards article')).toHaveCount(1);
  await page.locator('#ops-cards button').click();
  await page.locator('#ops-detail [data-ops-workspace-jump="ops-social"]').click();
  await expect(page.locator('#ops-social')).toHaveAttribute('open','');
  await expect(page.locator('#ops-social > summary')).toBeFocused();
  await page.locator('#ops-search').fill('OP-03');
  await expect(page.locator('#ops-cards article')).toHaveCount(1);
  await page.locator('#ops-cards button').click();
  await expect(page.locator('#ops-detail [data-ops-workspace-jump]')).toHaveCount(0);
  expect(writes).toEqual([]);
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
 });
}


test('owner evidence report never makes untrusted URL schemes clickable',async({page})=>{
 const data=fixture(),record=data.reports.find(r=>r.id==='OP-11');
 const evidence=(name,url)=>({
  test_name:name,source_url:url,environment:'isolated_fixture',
  checked_at:Math.floor(Date.now()/1000),expires_at:Math.floor(Date.now()/1000)+3600
 });
 record.verifiedGates[0].evidence=evidence('Unsafe injected evidence','javascript:alert(1)');
 record.verifiedGates[1].evidence=evidence('Valid audit source','https://github.com/example/audits');
 await authorized(page,{data});
 await page.goto(base+'/fa/app/admin/');
 await page.locator('#ops-search').fill('OP-11');
 await page.locator('#ops-cards button').click();
 const details=page.locator('#ops-detail');
 await expect(details.locator('.ops-gate span').filter({hasText:'Unsafe injected evidence'})).toHaveCount(1);
 await expect(details.locator('.ops-gate a[href^="javascript:"]')).toHaveCount(0);
 await expect(details.locator('.ops-gate a[href="https://github.com/example/audits"]')).toHaveCount(1);
 await expect(details).toContainText('Unsafe injected evidence');
});


for(const [locale,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 test(locale+' private AI visibility report distinguishes observed zero from provider N/A on mobile',async({page})=>{
  const source=require('../api/internal/ai-search-visibility-baseline-20261020.json');
  const projected={
   ok:true,schema:'jr-owner-aisv-snapshot-v1',status:'provider_report_snapshot',
   source:'Ubersuggest AI Search Visibility',retrievedOn:'2026-10-20',
   fixedPromptCount:10,sampledAnswers:5,brandMentions:0,brandPresencePercent:0,
   verifiedCitationCount:null,
   providers:source.providers.map(p=>({...p,verifiedCitationCount:null})),
   prompts:source.prompts.map(p=>({...p,verifiedCitationCount:null}))
  };
  let reads=0;const writes=[];
  page.on('request',r=>{if(r.method()==='POST')writes.push(r.url());});
  await authorized(page);
  await page.route('**/api/admin/operations/ai-visibility',r=>{
   reads++;return r.fulfill({json:projected});
  });
  await page.setViewportSize({width:320,height:880});
  await page.goto(base+route);
  const workspace=page.locator('#ops-workspace');
  const aisv=page.locator('#ops-ai-visibility');
  await expect(workspace).toBeVisible();
  expect(reads).toBe(0);
  await aisv.locator(':scope > summary').click();
  const view=aisv.locator('[data-aisv-results]');
  await expect(view.locator('details ol li')).toHaveCount(10);
  await expect(view).toContainText('0%');
  await expect(view).toContainText(locale==='fa'?'داده موجود نیست':'N/A');
  await expect(view).toContainText('Ubersuggest');
  expect(reads).toBe(1);
  expect(writes).toEqual([]);
  await page.evaluate(()=>{
    const root=document.getElementById('ops-workspace');
    root.hidden=true;
    root.dispatchEvent(new Event('jr:operations-locked'));
  });
  await expect(view).toBeEmpty();
  await expect(aisv).not.toHaveAttribute('open','');
  await expect(workspace).toBeHidden();
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
 });
}


for(const [locale,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 test(locale+' AI search report denies regular administrators without displaying saved provider evidence',async({page})=>{
  await authorized(page);
  await page.route('**/api/admin/operations/ai-visibility',r=>
   r.fulfill({status:403,json:{ok:false,error:'owner_ai_visibility_forbidden'}}));
  await page.goto(base+route);
  const panel=page.locator('#ops-ai-visibility');
  await expect(page.locator('#ops-workspace')).toBeVisible();
  await panel.locator(':scope > summary').click();
  await expect(panel.locator('[data-aisv-status]')).toContainText(
   locale==='fa'?'فقط برای مالک سایت':'restricted to the verified site owner');
  await expect(panel.locator('[data-aisv-results]')).toBeEmpty();
 });
}


/* P6 navigation lives inside the existing authenticated workspace; no
 * additional route or engine, and mobile document width must remain stable. */
for(const [language,route] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 test(language+' owner wayfinding stays in the MFA workspace at mobile width',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await authorized(page);
  await page.goto(base+route);
  const nav=page.locator('#ops-workspace nav.ops-jump');
  await expect(nav).toBeVisible();
  const links=nav.locator('a');
  await expect(links).toHaveCount(16);
  for(const target of ['ops-executive-stats','ops-queue','ops-commerce',
    'ops-social','ops-scientific-readiness','ops-jhela-maturity']){
    await expect(nav.locator('a[href="#'+target+'"]:not([data-ops-target])')).toHaveCount(1);
    await expect(page.locator('#'+target)).toHaveCount(1);
  }
  for(const target of ['ops-alert-center','ops-page-quality']){
    await expect(nav.locator('a[data-ops-target="'+target+'"][href="#ops-executive-stats"]')).toHaveCount(1);
  }
  const width=await page.evaluate(()=>
    Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-window.innerWidth);
  expect(width).toBeLessThanOrEqual(1);
  expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 });
}
