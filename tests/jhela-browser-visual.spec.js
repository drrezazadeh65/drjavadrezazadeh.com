const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
test.use({serviceWorkers:'block'});
test.setTimeout(90000);
const base='http://127.0.0.1:4173';
const widths=[320,390,768,1440];
const routes=(dir,locale)=>{
 const files=[dir+'/index.html'];
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(!entry.isDirectory()||entry.name==='fa')continue;
  const file=dir+'/'+entry.name+'/index.html';
  if(fs.existsSync(file))files.push(file);
 }
 return files.map(file=>({file,route:'/'+file.replace(/index\.html$/,''),locale}));
};
const pages=[...routes('journal','en'),...routes('journal/fa','fa')];
const dashboardDir='docs/journal/prototypes';
const roleContract=JSON.parse(fs.readFileSync('platform/jhela-ojs-editorial-workflow-v1.json','utf8'));
const roles=roleContract.panels.map(r=>({role:r.id,route:'/'+dashboardDir+'/jhela-'+r.id+'-preview.html'}));
const screenshotsRoot='test-results/jhela-browser-visual';
const slug=s=>s.replace(/[^a-z0-9-]/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
async function capture(page,file){
 await fs.promises.mkdir(path.dirname(file),{recursive:true});
 try{await page.evaluate(()=>document.fonts?.clear?.())}catch{}
 await page.screenshot({path:file,fullPage:true,animations:'disabled',timeout:20000});
}
test('all JHELA routes have approved 33-page bilingual navigation inventory',()=>{
 expect(pages.length).toBe(33);
 expect(pages.filter(x=>x.locale==='en').length).toBe(17);
 expect(pages.filter(x=>x.locale==='fa').length).toBe(16);
 expect(roles.length).toBe(8);
});
for(const {route,locale} of pages){
 test('JHELA public visual '+route,async({page})=>{
  const errs=[],badResponses=[];
  page.on('pageerror',e=>errs.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))badResponses.push(r.status()+' '+r.url())});
  for(const width of widths){
   await page.setViewportSize({width,height:width<=390?850:width===768?1024:900});
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});
   expect(response?.status(),route+' unavailable').toBe(200);
   const heading=page.locator('h1');
   await expect(heading,route+' must have exactly one accessible h1').toHaveCount(1);
   await expect(heading).toBeVisible();
   const root=await page.evaluate(()=>({
    lang:document.documentElement.lang,
    dir:document.documentElement.dir,
    viewport:window.innerWidth,
    maxScroll:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),
    theme:[...document.styleSheets].some(s=>{try{return (s.href||'').includes('journal-v2.css')}catch{return false}}),
    headerTitle:!!document.querySelector('.journal-header .journal-brand strong'),
    masthead:document.querySelector('.journal-header .journal-brand img')?.getAttribute('src')||'',
    alt:document.querySelector('.journal-header .journal-brand img')?.getAttribute('alt'),
    naturalWidth:document.querySelector('.journal-header .journal-brand img')?.naturalWidth,
    imageComplete:document.querySelector('.journal-header .journal-brand img')?.complete,
    primaryMain:document.querySelector('main')!==null
   }));
   expect(root.lang).toBe(locale);
   if(locale==='fa')expect(root.dir).toBe('rtl');
   expect(root.theme,route+' missing journal stylesheet').toBe(true);
   expect(root.headerTitle,route+' missing academic identity heading').toBe(true);
   expect(root.masthead).toContain('jhela/');
   expect(root.maxScroll,route+' viewport overflow '+width).toBeLessThanOrEqual(root.viewport+2);
   expect(root.primaryMain).toBe(true);
   if(width<=390){
     const sections=await page.evaluate(()=>[...document.querySelectorAll('.journal-main .journal-section,.journal-main .journal-article')]
      .map(el=>({left:Number.parseFloat(getComputedStyle(el).paddingLeft),right:Number.parseFloat(getComputedStyle(el).paddingRight)})));
     for(const [i,space] of sections.entries()){
      expect(space.left,route+' left reading gutter section '+i+' at '+width).toBeGreaterThanOrEqual(17);
      expect(space.right,route+' right reading gutter section '+i+' at '+width).toBeGreaterThanOrEqual(17);
     }
   }
   expect(root.imageComplete,route+' logo not loaded').toBe(true);
   expect(root.naturalWidth,route+' broken journal masthead').toBeGreaterThan(0);
   if([390,1440].includes(width)){
    const file=screenshotsRoot+'/public/'+(locale==='fa'?'fa':'en')+'-'+slug(route.slice(1)||'journal-home')+'-'+width+'.png';
    await capture(page,file);
   }
  }
  expect(errs,route+' browser exceptions').toEqual([]);
  expect(badResponses,route+' broken local resources').toEqual([]);
 });
}
for(const {role,route} of roles){
 test('JHELA isolated role interface '+role,async({page})=>{
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  for(const width of [390,1440]){
   await page.setViewportSize({width,height:width<500?844:900});
   const result=await page.goto(base+route,{waitUntil:'domcontentloaded'});
   expect(result?.status()).toBe(200);
   await expect(page.locator('h1')).toHaveCount(1);
   await expect(page.getByText('STATUS: NOT CONNECTED')).toBeVisible();
   const pageInfo=await page.evaluate(()=>({
     width:innerWidth,scroll:Math.max(document.body.scrollWidth,document.documentElement.scrollWidth),
     logo:document.querySelector('.jhela-top-brand img')?.naturalWidth||0,
     navigation:document.querySelectorAll('.jhela-showroom-sidebar nav a').length,
     scriptCount:document.scripts.length,
     roleSelected:document.querySelectorAll('.jhela-showroom-sidebar nav [aria-current=page]').length
   }));
   expect(pageInfo.scroll,role+' horizontal overflow '+width).toBeLessThanOrEqual(pageInfo.width+2);
   expect(pageInfo.logo).toBeGreaterThan(0);
   expect(pageInfo.navigation).toBe(8);
   expect(pageInfo.scriptCount).toBe(0);
   expect(pageInfo.roleSelected).toBe(1);
   await capture(page,screenshotsRoot+'/roles/'+role+'-'+width+'.png');
  }
  expect(errs).toEqual([]);
 });
}
test('A4 scholarly stationery previews render print-safe with no issued record',async({page})=>{
 const samples=['jhela-reviewer-invitation-preview-en.html','jhela-reviewer-report-preview-en.html','jhela-editorial-decision-preview-en.html','jhela-finance-waiver-preview-en.html','jhela-article-galley-preview-en.html','jhela-issue-cover-preview-en.html','jhela-reviewer-certificate-preview-en.html'];
 for(const sample of samples){
  const response=await page.goto(base+'/identity/templates/'+sample,{waitUntil:'domcontentloaded'});
  expect(response?.status()).toBe(200);
  await expect(page.locator('.jhela-document__issue-status')).toHaveText('DRAFT TEMPLATE — NOT ISSUED');
  await expect(page.locator('h1')).toHaveCount(1);
  const width=await page.locator('.jhela-document').evaluate(x=>x.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(500);
  await page.emulateMedia({media:'print'});
  const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});
  expect(pdf.length).toBeGreaterThan(4000);
  const pdfPageCount=(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)||[]).length;
  expect(pdfPageCount,sample+' must print on exactly one A4 page with no orphaned footer').toBe(1);
  await fs.promises.mkdir(screenshotsRoot+'/print',{recursive:true});
  await fs.promises.writeFile(screenshotsRoot+'/print/'+sample.replace('.html','.pdf'),pdf);
  await page.emulateMedia({media:'screen'});
 }
});
