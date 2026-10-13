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
test('Expired MFA clears previously loaded reports',async({page})=>{
 await authorized(page,{expiry:1});await page.goto(base+'/fa/app/admin/');await expect(page.locator('#ops-workspace')).toBeVisible();await expect(page.locator('#ops-workspace')).toBeHidden({timeout:4000});await expect(page.locator('#ops-cards article')).toHaveCount(0);
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
 await expect(page.locator('[data-command-item]')).toHaveCount(12);
 await expect(page.locator('[data-command-path]')).toHaveCount(4);
 await page.locator('[data-command-path="sponsorship"]').click();
 await expect(page.locator('[data-command-path="sponsorship"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('[data-command-item][href="#student-support"]')).toBeVisible();
 await expect(page.locator('[data-command-item][data-command-group="learning"]:visible')).toHaveCount(0);
 await expect(page.locator('#ecosystem')).toBeHidden();
 await expect(page.locator('[data-live-dot].ready')).toHaveCount(0);
 await page.locator('[data-command-path="all"]').click();
 await expect(page.locator('[data-command-item]:visible')).toHaveCount(12);
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
 for(const [lang,route] of [['fa','/fa/customer-dashboard/'],['en','/en/account/']]){
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await expect(page.locator('[data-account-email]')).toHaveText('member@example.test');
  await expect(page.locator('[data-home-action]')).toHaveAttribute('href','#ecosystem');
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
  await expect(page.locator('#ops-commerce-results details').first()).toContainText('12345678');
  await expect(page.locator('#ops-commerce-results details').nth(1)).toContainText('87654321');
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
 await expect(page.locator('#ops-workspace')).toBeHidden({timeout:7000});
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
