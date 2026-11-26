const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(process.env.SITE_ARTIFACT_ROOT||process.cwd());
const base=process.env.SITE_BASE_URL||'http://127.0.0.1:4173';
// Keep the certification inventory aligned with the sanitized public release artifact.
// Internal document templates are tested by the dedicated Identity OS suite.
const ignore=new Set(['.git','node_modules','identity','.public-site','tests','test-results','.github','scripts','docs','platform','foundation','database','migrations','edge','payment-api','work','proposals']);
const html=[];

function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignore.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()&&ent.name.endsWith('.html')) html.push(path.relative(root,full).replaceAll(path.sep,'/'));
  }
}
walk(root);

function routeFor(rel){
  if(rel==='index.html') return '/';
  if(rel.endsWith('/index.html')) return '/'+rel.slice(0,-'index.html'.length);
  return '/'+rel;
}

const routes=html.map(routeFor).sort();
const viewports=[
  ['mobile-320',320,800],
  ['mobile-390',390,844],
  ['mobile-430',430,932],
  ['tablet-768',768,1024],
  ['tablet-820',820,1180],
  ['tablet-landscape-1024',1024,768],
  ['desktop-1440',1440,900],
  ['landscape-mobile',844,390],['small-foldable',280,653],['laptop',1366,768],['wide-short',1920,720],['full-hd',1920,1080],['qhd',2560,1440],['ultrawide',2560,1080],['ultrawide-3440',3440,1440],['superwide',5120,1440],['4k',3840,2160],['5k',5120,2880],['8k',7680,4320]
];

test.describe.configure({mode:'parallel'});
test.use({serviceWorkers:'block'});

for(const route of routes){
  test('responsive certification '+route,async({page,request})=>{
    test.setTimeout(180000);
    const http=await request.get(base+route,{maxRedirects:5});
    expect(http.status(),route+' HTTP status').toBeLessThan(400);

    // Historic HTML redirects deliberately use the production canonical origin.
    // In certification, resolve that exact same-origin target against the release
    // artifact, never the previously deployed website. Unknown targets fail closed.
    const origin=new URL(base).origin;
    await page.route('https://drjavadrezazadeh.com/**',async interception=>{
      const req=interception.request();
      if(!req.isNavigationRequest()||req.frame()!==page.mainFrame())return interception.continue();
      const target=new URL(req.url());
      if(!routes.includes(target.pathname))return interception.abort('blockedbyclient');
      return interception.fulfill({status:302,headers:{location:origin+target.pathname+target.search+target.hash}});
    });
    const pageErrors=[];
    page.on('pageerror',err=>pageErrors.push(String(err.message||err)));
    for(const [label,width,height] of viewports){
      await page.setViewportSize({width,height});
      try{
        await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:10000});
      }catch(error){
        const message=String(error?.message||error);
        if(!/ERR_ABORTED|interrupted by another navigation/i.test(message)) throw error;
        await page.waitForLoadState('domcontentloaded',{timeout:5000}).catch(()=>{});
      }
      await page.waitForTimeout(140);
      await page.waitForLoadState('domcontentloaded',{timeout:3000}).catch(()=>{});

      // Some public routes legitimately redirect on first load. Retry only
      // a navigation-destroyed JS context, then perform the same strict checks.
      // Never treat a failed image/overflow assertion as a retryable success.
      let result,transient;
      for(let attempt=0;attempt<3;attempt++){
        try{
          result=await page.evaluate(()=>{
            const html=document.documentElement;
            const body=document.body;
            const viewport=window.innerWidth;
            const brokenImages=[...document.images]
              .filter(img=>img.complete&&img.naturalWidth===0)
              .map(img=>img.currentSrc||img.src||'(unknown)');
            return {
              viewport,
              htmlWidth:html.scrollWidth,
              bodyWidth:body?body.scrollWidth:0,
              brokenImages,
              adaptiveWidth:(()=>{const el=document.querySelector('body.public-home-page main,body.public-content-page .article-shell,body.public-content-page .authority-shell,body.jr-ar-public main.jr-ar-wrap,body[data-jrei-public-centre] main > .wrap,body.academic .hero .wrap,body.forge .hero .wrap,body.seo .hero .wrap');return el?el.getBoundingClientRect().width:0;})()
            };
          });
          break;
        }catch(error){
          transient=error;
          if(!/Execution context was destroyed|navigation/i.test(String(error))||attempt===2)
            throw error;
          await page.waitForLoadState('domcontentloaded',{timeout:5000}).catch(()=>{});
          await page.waitForTimeout(120);
        }
      }
      if(!result)throw transient||new Error('responsive_document_not_stable');
      expect(new URL(page.url()).origin,route+' must certify the local release, not production').toBe(origin);

      expect(result.htmlWidth,route+' '+label+' html horizontal overflow').toBeLessThanOrEqual(result.viewport+1);
      expect(result.bodyWidth,route+' '+label+' body horizontal overflow').toBeLessThanOrEqual(result.viewport+1);
      if(width>=1500&&result.adaptiveWidth>0)expect(result.adaptiveWidth,route+' '+label+' usable shell width').toBeGreaterThanOrEqual(width*.8);
      expect(result.brokenImages,route+' '+label+' broken image(s)').toEqual([]);
    }
    expect(pageErrors,route+' client page errors').toEqual([]);
  });
}

test('full-route inventory is substantial',async()=>{
  expect(routes.length).toBeGreaterThanOrEqual(200);
  console.log('Certified route inventory:',routes.length,'HTML routes ×',viewports.length,'viewports');
});
