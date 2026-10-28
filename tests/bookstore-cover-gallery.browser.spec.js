const {test,expect}=require('@playwright/test');
const catalog=require('../assets/data/book-catalog.json');
test.use({serviceWorkers:'block'});
const origin='http://127.0.0.1:4173';

for(const locale of ['fa','en']){
 test(locale+' authentic book-gallery is responsive, keyboard accessible and separate from checkout',async({page})=>{
  await page.setViewportSize({width:390,height:850});
  const transactions=[];
  page.on('request',request=>{
   if(request.url().includes('/api/commerce/')&&request.method()==='POST')transactions.push(request.url());
  });
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  const response=await page.goto(origin+'/'+locale+'/shop/',{waitUntil:'domcontentloaded'});
  expect(response.status()).toBe(200);
  const host=page.locator('[data-book-catalog]');
  const cards=host.locator('.book-product-card');
  // The original three-book catalogue and optional collectible sidecar load asynchronously.
  // Wait for the actual legacy covers rather than checking before fetch completes.
  await expect.poll(()=>cards.count(),{timeout:15000}).toBeGreaterThanOrEqual(catalog.books.length);
  const coverImages=cards.locator('.jr-book-card-gallery .book-cover img');
  expect(await coverImages.count()).toBeGreaterThanOrEqual(catalog.books.length);
  for(const [i,book] of catalog.books.entries()){
   const card=cards.nth(i);
   const gallery=card.locator('.jr-book-card-gallery');
   const image=gallery.locator('[data-book-gallery-image]');
   const front=gallery.locator('[data-book-gallery-view=front]');
   const back=gallery.locator('[data-book-gallery-view=back]');
   await expect(front).toHaveAttribute('aria-pressed','true');
   await expect(back).toHaveAttribute('aria-pressed','false');
   await expect(image).toHaveAttribute('src',book.bibliography.cover_image);
   await expect(image).toHaveAttribute('alt',/Cover|جلد/);
   await back.click();
   await expect(image).toHaveAttribute('src',book.bibliography.back_cover_image);
   await expect(image).toHaveAttribute('alt',/back|پشت/i);
   await expect(back).toHaveAttribute('aria-pressed','true');
   await expect(front).toHaveAttribute('aria-pressed','false');
   await expect.poll(()=>image.evaluate(img=>img.complete&&img.naturalWidth>0),
    {message:book.id+' genuine back cover must load'}).toBe(true);
   await front.focus();
   await page.keyboard.press('Enter');
   await expect(image).toHaveAttribute('src',book.bibliography.cover_image);
   await expect(front).toHaveAttribute('aria-pressed','true');
   await expect(card.locator('dl.book-catalog-imprint')).toContainText(book.bibliography.isbn);
   await expect(card.locator('.book-price')).toContainText(
    locale==='fa'?'تومان':'toman'
   );
  }
  for(const width of [320,390,430,768,1024,1440]){
   await page.setViewportSize({width,height:850});
   const sizes=await host.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
   expect(sizes.scroll,'gallery horizontal overflow at '+width).toBeLessThanOrEqual(sizes.client+2);
  }
  expect(transactions).toEqual([]);
  expect(errors).toEqual([]);
 });
}
