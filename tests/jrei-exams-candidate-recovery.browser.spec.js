const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:4173';
test.use({serviceWorkers:'block'});

test('JREI private exam recovers a committed save after lost acknowledgement without repeating it',async({page})=>{
 const attemptId='11111111-1111-4111-8111-111111111181';
 const itemId='22222222-2222-4222-8222-222222222282';
 const option1='33333333-3333-4333-8333-333333333381';
 const option2='33333333-3333-4333-8333-333333333382';
 const now=Math.floor(Date.now()/1000);
 let revision=0,saved=null,saves=0,progressReads=0;
 // The local system clock is four hours late. It must not shorten or
 // artificially extend the server-authoritative examination clock.
 await page.addInitScript(()=>{
   const realNow=Date.now.bind(Date);
   Date.now=()=>realNow()-4*3600*1000;
 });
 await page.route('**/api/exams/**',async route=>{
   const req=route.request();
   const pathname=new URL(req.url()).pathname;
   if(pathname==='/api/exams/my'){
     return route.fulfill({json:{ok:true,schema:'jr.jrei.candidate-exams.v1',
       attempts:[{attemptId,titleFa:'آزمون آزمایشی',titleEn:'Synthetic examination',attemptState:'IN_PROGRESS'}]}});
   }
   if(pathname==='/api/exams/items')
     return route.fulfill({json:{ok:true,schema:'jr.jrei.private-published-items.v1',
       attemptId,responseRevision:revision,
       items:[{itemId,stem:'Synthetic question',options:[
         {id:option1,text:'One'},{id:option2,text:'Two'}]}]}});
   if(pathname==='/api/exams/attempt'&&req.method()==='GET'){
     progressReads++;
     return route.fulfill({json:{ok:true,schema:'jr.jrei.exam-progress.v1',
       attemptId,canResume:true,deadlineAt:now+125,serverNow:Math.floor(Date.now()/1000),
       responseRevision:revision,savedChoices:saved?[{itemId,selectedOptionId:saved}]:[]}});
   }
   if(pathname==='/api/exams/attempt'&&req.method()==='POST'){
     const body=req.postDataJSON();
     if(body.action==='save'){
       saves++;
       expect(body.expectedResponseRevision).toBe(0);
       expect(body.selectedOptionId).toBe(option2);
       // The server COMMITTED before network lost the acknowledgement.
       revision=1;saved=option2;
       return route.fulfill({status:503,json:{ok:false,error:'ACKNOWLEDGEMENT_LOST'}});
     }
   }
   return route.fulfill({status:404,json:{ok:false,error:'not_found'}});
 });
 await page.goto(base+'/en/exams/my/');
 await page.getByRole('button',{name:'Resume examination'}).click();
 await expect(page.getByText('Synthetic question')).toBeVisible();
 await expect(page.locator('[data-exam-deadline]')).toContainText('2:');
 await page.locator('.jr-candidate-choice input').nth(1).check();
 await page.getByRole('button',{name:'Save selected choice to server'}).click();
 await expect.poll(()=>progressReads).toBeGreaterThan(1);
 await expect(page.locator('.jr-candidate-choice input').nth(1)).toBeChecked();
 await expect(page.getByText('Only server-saved choices were restored.')).toBeVisible();
 expect(saves).toBe(1);
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
});

test('candidate exam remains a private noindex bilingual page',async({page})=>{
 for(const lang of ['fa','en']){
   const response=await page.goto(base+'/'+lang+'/exams/my/');
   expect(response.status()).toBe(200);
   await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/noindex/);
   await expect(page.locator('main[data-exam-candidate]')).toHaveCount(1);
 }
});
