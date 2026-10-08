const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');

const base=process.env.SITE_BASE_URL||'http://127.0.0.1:4173';
const xml=fs.readFileSync('sitemap-fa.xml','utf8');
const slugs=[...xml.matchAll(/<loc>https:\/\/drjavadrezazadeh\.com\/fa\/rahnamaha\/([a-z0-9-]+)\/<\/loc>/g)].map(m=>m[1]);
const sizes=[
  ['mobile',390,844],
  ['tablet-portrait',768,1024],
  ['tablet-medium',820,1180],
  ['tablet-landscape',1024,768],
  ['desktop',1440,900]
];
test.setTimeout(140_000);
test.describe.configure({mode:'parallel'});
test.use({serviceWorkers:'block'});
for(const slug of slugs) {
  test('premium guide '+slug,async({page,request})=>{
    const route='/fa/rahnamaha/'+slug+'/';
    const errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    const resp=await request.get(base+route);
    expect(resp.status()).toBe(200);
    for(const [label,width,height] of sizes) {
      await page.setViewportSize({width,height});
      await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:18000});
      await expect(page.locator('.knowledge-article-layout')).toHaveCount(1);
      await expect(page.locator('.knowledge-article-content')).toHaveCount(1);
      const headings=await page.locator('.knowledge-article-content h2[id]').count();
      expect(headings).toBeGreaterThanOrEqual(5);
      const tocAnchors=page.locator('.knowledge-article-toc a[href^="#"]');
      expect(await tocAnchors.count()).toBe(headings);
      const geometry=await page.evaluate(()=>{
        const h=document.querySelector('.article-hero h1');
        const img=document.querySelector('.editorial-figure img');
        const toc=document.querySelector('.knowledge-article-toc');
        const mobile=document.querySelector('.knowledge-article-mobiletoc');
        const content=document.querySelector('.knowledge-article-content');
        return {
          width:document.documentElement.scrollWidth,
          viewport:window.innerWidth,
          headingSize:parseFloat(getComputedStyle(h).fontSize),
          imageNaturalWidth:img?.naturalWidth,
          imageSource:img?.currentSrc,
          tocVisible:toc?getComputedStyle(toc).display!=='none' && !!toc.getClientRects().length:false,
          mobileVisible:mobile?getComputedStyle(mobile).display!=='none' && !!mobile.getClientRects().length:false,
          contentWidth:content?.getBoundingClientRect().width
        };
      });
      expect(geometry.width,slug+' '+label+' horizontal overflow').toBeLessThanOrEqual(geometry.viewport+2);
      expect(geometry.headingSize,slug+' '+label+' heading too small').toBeGreaterThanOrEqual(25);
      expect(geometry.contentWidth,slug+' '+label+' content width').toBeGreaterThan(250);
      if(width<=850)expect(geometry.mobileVisible,slug+' '+label+' mobile/tablet contents hidden').toBe(true);
      else expect(geometry.tocVisible,slug+' '+label+' desktop/landscape TOC hidden').toBe(true);
      await page.locator('.editorial-figure img').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {const i=document.querySelector('.editorial-figure img');return i&&i.complete&&i.naturalWidth>0},{timeout:15000});
      if(['golden-talent-chist','moghayese-reshteha-ba-matris-tasmim'].includes(slug)){
        const out='test-results/article-responsive/'+label;
        fs.mkdirSync(out,{recursive:true});
        await page.screenshot({path:path.join(out,slug+'.jpg'),type:'jpeg',quality:66,fullPage:true,animations:'disabled'});
      }
    }
    expect(errors,slug+' runtime errors').toEqual([]);
  });
}
test('exactly 45 article pages',()=>{expect(slugs.length).toBe(45)});
