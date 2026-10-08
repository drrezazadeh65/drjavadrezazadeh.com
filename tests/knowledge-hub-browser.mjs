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
    assert(await page.locator('.knowledge-hero-actions a[href="#knowledge-toolbar-title"]').count()===1,name+': search jump target is linked');
    const count = await page.locator('.related-cluster-grid > a').count();
    assert(count===45,name+': all 45 links in the DOM');
    const allImages = await page.locator('.knowledge-card-thumbnail').count();
    assert(allImages===45,name+': all featured image tags exist');
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
