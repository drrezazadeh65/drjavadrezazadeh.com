// Browser-level desktop and narrow-mobile acceptance checks for the Persian Knowledge Hub.
// Run in GitHub Actions against the locally served public static site.
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.env.TEST_URL || 'http://127.0.0.1:8765';
const checks = [];
function assert(value, message) { if (!value) throw new Error(message); checks.push(message); }
const browser = await chromium.launch({ headless: true });
fs.mkdirSync('test-results/knowledge-hub', { recursive: true });
try {
  for (const [name,width,height] of [['desktop',1440,900],['mobile',390,844],['small-mobile',320,640]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, locale:'fa-IR' });
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(base + '/fa/rahnamaha/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('#knowledge-result-count').waitFor();
    await page.waitForFunction(() => document.querySelector('#knowledge-result-count')?.textContent?.includes('۴۵'), { timeout: 12000 });
    const hero = page.locator('header.knowledge-hero');
    assert(await hero.count()===1,name+': redesigned Knowledge Hub hero is present');
    const heroStats = await page.evaluate(() => {
      const section=document.querySelector('header.knowledge-hero');
      const title=section?.querySelector('h1');
      const copy=section?.querySelector('.knowledge-hero-copy');
      const panel=section?.querySelector('.knowledge-hero-panel');
      const box=section?.getBoundingClientRect();
      return {height:box?.height,width:box?.width,titleSize:title?parseFloat(getComputedStyle(title).fontSize):0,titleText:title?.textContent?.trim(),copyWidth:copy?.getBoundingClientRect()?.width,panelWidth:panel?.getBoundingClientRect()?.width,display:section?getComputedStyle(section).display:'none'};
    });
    assert(heroStats.titleSize>=26&&heroStats.titleSize<=44,name+': legible controlled H1 typography ('+heroStats.titleSize+'px)');
    assert(heroStats.titleText==='راهنماهای علمی برای تصمیم‌های آگاهانه',name+': concise scientific guide heading');
    assert(heroStats.display==='grid',name+': hero uses responsive grid');
    assert(heroStats.height<((width>=950)?520:(width>=690)?650:950),name+': hero not excessively tall ('+heroStats.height+'px)');
    assert(heroStats.copyWidth>=210&&heroStats.panelWidth>=150,name+': copy and editorial panel are visible at '+width+'px');
    // Mobile layout may collapse hero CTAs: preserve the more important accessible search function.
    if (width >= 700) {
      assert(await page.locator('.knowledge-hero-actions a[href="#knowledge-toolbar-title"]').count()===1,name+': desktop search jump target is linked');
    } else {
      assert(await page.locator('#knowledge-search').count()===1,name+': mobile search remains accessible');
    }
    let count = await page.locator('.related-cluster-grid > a').count();
    if (count !== 45) {
      // DOM content must be present; allow late browser rendering but never
      // relax the exact-card-count release requirement.
      await page.waitForFunction(
        () => document.querySelectorAll('.related-cluster-grid > a').length === 45,
        null,{timeout:9000}
      ).catch(async () => {
        const diag = await page.evaluate(() => ({
          url:location.href,readyState:document.readyState,
          cards:document.querySelectorAll('.related-cluster-grid > a').length,
          clusters:document.querySelectorAll('.related-cluster').length,
          htmlLength:document.documentElement.outerHTML.length,
          h1:document.querySelector('h1')?.textContent,
          pageErrors:performance.getEntriesByType('resource').filter(x=>x.responseStatus>=400).slice(0,8).map(x=>[x.name,x.responseStatus])
        }));
        console.error('KNOWLEDGE_HUB_CARD_DIAGNOSTIC',name,JSON.stringify(diag));
      });
      count = await page.locator('.related-cluster-grid > a').count();
    }
    assert(count===45,name+': all 45 links in the DOM (observed '+count+')');
    const allImages = await page.locator('.knowledge-card-thumbnail').count();
    if (allImages !== 45) {
      const diagnostic = await page.evaluate(() => ({
        domImages: document.querySelectorAll('img.knowledge-card-thumbnail').length,
        relatedImages: document.querySelectorAll('.related-cluster-grid img').length,
        totalImg: document.images.length,
        cards: document.querySelectorAll('.related-cluster-grid > a').length,
        readyState: document.readyState,
        htmlSample: document.querySelector('.related-cluster-grid > a')?.outerHTML.slice(0,450),
        missingImageCards: [...document.querySelectorAll('.related-cluster-grid > a')].filter(a=>!a.querySelector('img.knowledge-card-thumbnail')).slice(0,5).map(a=>a.outerHTML.slice(0,250))
      }));
      console.error('MOBILE_IMAGE_DEBUG',name,JSON.stringify(diagnostic));
    }
    assert(allImages===45,name+': all featured image tags exist ('+allImages+'/45)');
    const widthCheck = await page.evaluate(() => ({body:document.documentElement.scrollWidth,viewport:innerWidth}));
    assert(widthCheck.body <= widthCheck.viewport+3,name+': no document-wide horizontal overflow ('+JSON.stringify(widthCheck)+')');
    const textbox=page.locator('#knowledge-search');
    await textbox.fill('هوش مصنوعی');
    const matches=await page.locator('.related-cluster-grid > a:visible').count();
    assert(matches>0&&matches<45,name+': live Persian search filters article cards');
    const resultText=await page.locator('#knowledge-result-count').textContent();
    assert(/نمایش/.test(resultText),name+': accessible result count changes');
    await textbox.fill('عبارتناموجودغیرممکن');
    assert(await page.locator('#knowledge-empty').isVisible(),name+': no-results state visible');
    await page.locator('#knowledge-clear').click();
    assert(await page.locator('.related-cluster-grid > a:visible').count()===45,name+': clear search restores all articles');
    await page.locator('[data-knowledge-filter="cluster-4"]').click();
    assert(await page.locator('.related-cluster-grid > a:visible').count()===9,name+': topic filter shows 9 teaching guides');
    await page.locator('[data-knowledge-filter="all"]').click();
    assert(await page.locator('.related-cluster-grid > a:visible').count()===45,name+': all-topic filter restores 45');
    const first=page.locator('.knowledge-card-thumbnail').first();
    await first.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {const i=document.querySelector('.knowledge-card-thumbnail');return i?.complete && i?.naturalWidth>0},{timeout:14000});
    assert(!errors.length,name+': no runtime JavaScript errors ('+errors.join(' | ')+')');
    await page.screenshot({path:'test-results/knowledge-hub/'+name+'.png',fullPage:false});
    console.log('PASS '+name+' ('+width+'x'+height+'), visible search='+matches+', cards='+count);
    await page.close();
  }
  console.log('BROWSER QA PASSED: '+checks.length+' responsive, interaction, media and keyboard-ready DOM checks.');
} finally {await browser.close();}
