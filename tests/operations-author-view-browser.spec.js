const {test,expect}=require('@playwright/test');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';
const authorId='11111111-1111-4111-8111-111111111111';
for(const [locale,url] of [['fa','/fa/app/admin/'],['en','/en/account/admin/']]){
 test(locale+' super-admin opens and closes actual author projection (synthetic, read-only)',async({page})=>{
  const nonGet=[];
  page.on('request',r=>{if(r.method()!=='GET'&&r.method()!=='HEAD')nonGet.push(r.url());});
  await page.setViewportSize({width:390,height:844});
  await page.route('**/assets/js/operations-control.js*',route=>route.abort());
  await page.route('**/api/admin/operations/session',route=>route.fulfill({
   status:200,contentType:'application/json',headers:{'cache-control':'no-store'},
   body:JSON.stringify({ok:true,mfaRequired:false,mfaExpiresIn:600,csrfToken:'fixture-only'})
  }));
  await page.route('**/api/admin/operations/author-view*',route=>{
   const request=new URL(route.request().url());
   if(!request.searchParams.get('authorId'))return route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({
     ok:true,readOnly:true,impersonation:false,roleMutation:false,
     authors:[{id:authorId,slug:'synthetic',displayNameFa:'مؤلف آزمایشی',displayNameEn:'Synthetic author'}]
    })
   });
   if(request.searchParams.get('authorId')!==authorId)return route.fulfill({status:404,body:'{}'});
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
    ok:true,readOnly:true,impersonation:false,roleMutation:false,
    author:{
     id:authorId,slug:'synthetic',displayNameFa:'مؤلف آزمایشی',displayNameEn:'Synthetic author',
     verifiedPaidOrders:2,authorAccruedToman:1400000,talentFundEarmarkedToman:600000,
     authorBankSettledToman:0,authorUnsettledToman:1400000,platformOperatingReserveToman:0,
     platformOperatingFundingReconciledToman:0,settledRefundsAwaitingAllocationReversal:0,
     works:[{title:'Synthetic educational work',publicationStatus:'approved',scientificReview:'pending'}],
     recentSales:[{saleRef:'safe-012',bookedAt:'2026-10-20',authorShareToman:700000,talentFundShareToman:300000,authorNotificationState:'queued'}],
     contracts:[{version:'v1',state:'draft',effectiveFrom:null}]
    }
   })});
  });
  await page.goto(origin+url,{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{document.getElementById('ops-workspace').hidden=false;});
  const root=page.locator('#ops-author-real-view');
  await root.locator('summary').click();
  const picker=root.locator('[data-real-author-select]');
  await expect(picker).toBeVisible();
  await picker.selectOption(authorId);
  await root.locator('[data-real-author-load]').click();
  const content=root.locator('[data-real-author-content]');
  await expect(content).toBeVisible();
  await expect(content.locator('.jr-ar-stats .jr-ar-stat')).toHaveCount(6);
  await expect(content).toContainText(locale==='fa'?'مؤلف آزمایشی':'Synthetic author');
  await expect(content.locator('[role=tab]')).toHaveCount(5);
  await content.getByRole('tab',{name:locale==='fa'?'فروش':'Sales'}).click();
  await expect(content).toContainText('safe-012');
  await root.locator('[data-real-author-close]').click();
  await expect(content).toBeHidden();
  await expect(content.locator('.jr-ar-screen')).toHaveCount(0);
  await page.evaluate(()=>{document.getElementById('ops-workspace').dispatchEvent(new Event('jr:operations-locked'));});
  await expect(root).not.toHaveAttribute('open','');
  await expect(content).toBeHidden();
  expect(nonGet).toEqual([]);
 });
}
