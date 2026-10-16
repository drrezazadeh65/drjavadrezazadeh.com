const {test,expect}=require('@playwright/test');
const base='http://127.0.0.1:4173';
test.use({serviceWorkers:'block'});
const fixture={ok:true,schema:'ramzinex-usdt-irr-indicative-v1',rate:{
 source:'Ramzinex public USDT/IRR market',pairId:11,base:'USDT',quote:'IRR',localUnit:'toman',
 buyIRR:2628995,sellIRR:2632000,buyToman:262899.5,sellToman:263200,
 indicativeOnly:true,isUsdFiatRate:false,paymentQuote:false,receivedAt:new Date().toISOString()
}};
for(const [locale,route] of [
 ['fa','/fa/shop/'],['en','/en/shop/'],['fa','/fa/khadamat/'],['en','/en/services/'],
 ['fa','/fa/support-talented-students/'],['en','/en/support-talented-students/']]){
 test(locale+' '+route+' displays fresh nontransactional Ramzinex conversion',async({page})=>{
  const requests=[];await page.route('**/api/rates/usdt-irt',async r=>{requests.push(r.request().method());await r.fulfill({json:{...fixture,rate:{...fixture.rate,receivedAt:new Date().toISOString()}}});});
  await page.goto(base+route);const section=page.locator('[data-jr-fx-converter]');
  await expect(section).toBeVisible({timeout:12000});
  await expect(section.locator('.jr-fx-status')).toContainText(locale==='fa'?'نرخ نمایشی':'Indicative market rate');
  await section.locator('#jr-fx-amount').fill('1000000');
  await expect(section.locator('.jr-fx-result')).toContainText('USDT');
  const shown=await section.locator('.jr-fx-result').innerText();
  expect(shown).not.toContain('—');expect(shown).not.toContain('NaN');
  await expect(section).toContainText('Ramzinex'.replace('Ramzinex',locale==='fa'?'رمزینکس':'Ramzinex'));
  expect(requests).toEqual(['GET']);
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
 });
}
test('Public unavailable market never shows a payable number',async({page})=>{
 await page.route('**/api/rates/usdt-irt',r=>r.fulfill({status:503,json:{ok:false,error:'public_market_rate_unavailable'}}));
 await page.goto(base+'/fa/shop/');const s=page.locator('[data-jr-fx-converter]');await expect(s).toBeVisible();
 await s.locator('#jr-fx-amount').fill('5000000');
 await expect(s.locator('.jr-fx-result')).toHaveText('— USDT');
 await expect(s.locator('.jr-fx-status')).toContainText('نرخ معتبر در دسترس نیست');
});
test('Wrong currency contract or old rate never becomes a price',async({page})=>{
 await page.route('**/api/rates/usdt-irt',r=>r.fulfill({json:{...fixture,rate:{...fixture.rate,quote:'IRT',receivedAt:new Date(Date.now()-500000).toISOString()}}}));
 await page.goto(base+'/en/shop/');const s=page.locator('[data-jr-fx-converter]');await expect(s).toBeVisible();
 await s.locator('#jr-fx-amount').fill('3000000');
 await expect(s.locator('.jr-fx-result')).toHaveText('— USDT');
 await expect(s.locator('.jr-fx-status')).toContainText('unavailable');
});
test('Unrelated scientific methodology page does not load a financial widget',async({page})=>{
 await page.goto(base+'/en/golden-talent/methodology/');
 await expect(page.locator('[data-jr-fx-converter]')).toHaveCount(0);
});
