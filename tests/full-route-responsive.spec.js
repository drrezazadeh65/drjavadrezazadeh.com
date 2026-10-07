const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const root=process.cwd();
const base=process.env.SITE_BASE_URL||'http://127.0.0.1:4173';
const ignore=new Set(['.git','node_modules']);
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
  ['desktop-1440',1440,900]
];

test.describe.configure({mode:'parallel'});
test.use({serviceWorkers:'block'});

for(const route of routes){
  test('responsive certification '+route,async({page,request})=>{
    const http=await request.get(base+route,{maxRedirects:5});
    expect(http.status(),route+' HTTP status').toBeLessThan(400);

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

      const result=await page.evaluate(()=>{
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
          brokenImages
        };
      });

      expect(result.htmlWidth,route+' '+label+' html horizontal overflow').toBeLessThanOrEqual(result.viewport+1);
      expect(result.bodyWidth,route+' '+label+' body horizontal overflow').toBeLessThanOrEqual(result.viewport+1);
      expect(result.brokenImages,route+' '+label+' broken image(s)').toEqual([]);
    }
    expect(pageErrors,route+' client page errors').toEqual([]);
  });
}

test('full-route inventory is substantial',async()=>{
  expect(routes.length).toBeGreaterThanOrEqual(200);
  console.log('Certified route inventory:',routes.length,'HTML routes ×',viewports.length,'viewports');
});
