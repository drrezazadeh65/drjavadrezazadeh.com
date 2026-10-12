const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
test.use({serviceWorkers:'block'});
const base=process.env.OPERATIONS_PUBLIC_PREVIEW_BASE||'http://127.0.0.1:4173';
const privateSentinel='private-owner-record-must-never-be-exported';
async function health(page,{available=true}={}){
 const requests=[];
 page.on('request',r=>requests.push({method:r.method(),path:new URL(r.url()).pathname}));
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(!['/api/auth/health','/api/commerce/health','/api/donations/health'].includes(path))throw Error('Private or unexpected API used');
  return route.fulfill({status:available?200:503,json:{ok:available,ready:true,registrationReady:true,checkout:true,capabilities:{books:true},minToman:1000,maxToman:10000000,customerRecord:privateSentinel}});
 });return requests;
}
for(const width of [320,390,1440])test(`Open preview ${width}px exposes canonical scopes without privileged requests`,async({page})=>{
 await page.setViewportSize({width,height:900});const requests=await health(page);
 await page.goto(base+'/fa/app/engine-status/');
 await expect(page.locator('[data-engine-list] article')).toHaveCount(13);
 await expect(page.locator('[data-health-list] article')).toHaveCount(3);
 await expect(page.locator('[data-engine-total]')).toHaveText('13');
 await expect(page.locator('[data-action-total]')).toHaveText('52');
 await page.locator('[data-view="reports"]').click();
 await expect(page.locator('[data-engine-list] article')).toHaveCount(36);
 await expect(page.locator('[data-engine-list]')).toContainText('نیازمند شواهد');
 await page.locator('[data-engine-domain]').selectOption('ENG-01');
 await expect(page.locator('[data-engine-list] article')).toHaveCount(7);
 await page.locator('[data-engine-domain]').selectOption('');
 await page.locator('[data-engine-search]').fill('OP-09');
 await expect(page.locator('[data-engine-list] article')).toHaveCount(1);
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-public-report]').click();
 const download=await downloadPromise;const report=fs.readFileSync(await download.path(),'utf8');
 expect(report).toContain('گزارش‌ها: 36');expect(report).not.toContain(privateSentinel);
 expect(await page.locator('body').textContent()).not.toContain(privateSentinel);
 expect(requests.every(r=>r.method==='GET')).toBe(true);
 expect(requests.some(r=>r.path.startsWith('/api/admin/'))).toBe(false);
 expect(await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth)).toBeLessThanOrEqual(1);
 expect(await page.context().cookies()).toEqual([]);
 expect(await page.evaluate(()=>localStorage.length+sessionStorage.length)).toBe(0);
});
test('Unavailable public health never renders a confirmed state',async({page})=>{
 await health(page,{available:false});await page.goto(base+'/fa/app/engine-status/');
 await expect(page.locator('[data-health-list] article')).toHaveCount(3);
 await expect(page.locator('[data-health-list]')).toContainText('پاسخ معتبر دریافت نشد');
 expect(await page.locator('[data-health-list]').textContent()).not.toContain('آمادگی تنظیمات سرور تأیید شد');
});
