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

for(const route of routes){
  test('responsive certification '+route,async({page})=>{
    const pageErrors=[];
    page.on('pageerror',err=>pageErrors.push(String(err.message||err)));
    for(const [label,width,height] of viewports){
      await page.setViewportSize({width,height});
      const response=await page.goto(base+route,{waitUntil:'domcontentloaded'});
      expect(response,route+' '+label+' missing response').not.toBeNull();
      expect(response.status(),route+' '+label+' HTTP status').toBeLessThan(400);
      await page.waitForTimeout(60);

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
