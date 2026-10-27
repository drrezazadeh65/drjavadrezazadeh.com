/** Screenshot only the isolated localhost candidate. Never access production. */
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from '@playwright/test';

const origin='http://127.0.0.1:4173';
const captureRoot=path.resolve('jrei-preview-screenshots');
const destinations=[
  {path:'/fa/',slug:'fa',viewport:{width:390,height:844},isMobile:true},
  {path:'/en/',slug:'en',viewport:{width:390,height:844},isMobile:true},
  {path:'/fa/',slug:'fa',viewport:{width:1440,height:900},isMobile:false},
  {path:'/en/',slug:'en',viewport:{width:1440,height:900},isMobile:false},
  {path:'/journal/',slug:'journal',viewport:{width:1440,height:900},isMobile:false},
];
fs.mkdirSync(captureRoot,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const view of destinations){
  const context=await browser.newContext({
   viewport:view.viewport,isMobile:view.isMobile,
   deviceScaleFactor:1,serviceWorkers:'block',
   ignoreHTTPSErrors:false,
  });
  try{
   const page=await context.newPage();
   await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.protocol==='http:' && url.hostname==='127.0.0.1'
       && url.port==='4173'){
      return route.continue();
    }
    return route.abort('blockedbyclient');
   });
   const response=await page.goto(origin+view.path,{
    waitUntil:'domcontentloaded',timeout:12000,
   });
   if(!response || response.status()!==200){
    throw Error('SANDBOX_SCREENSHOT_ROUTE_UNAVAILABLE: '+view.path);
   }
   await page.screenshot({
    path:path.join(captureRoot,view.slug+
      (view.isMobile?'-mobile':'-desktop')+'.png'),
    fullPage:true,timeout:10000,
   });
  }finally{await context.close();}
 }
}finally{await browser.close();}
console.log('Isolated localhost previews captured; production untouched');
