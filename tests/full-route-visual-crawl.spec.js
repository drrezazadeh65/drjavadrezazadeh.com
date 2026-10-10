const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');

const root=process.cwd();
const base=process.env.SITE_BASE_URL||'http://127.0.0.1:4173';
const outRoot=path.join(root,'test-results','full-route-visual-crawl');
const ignore=new Set(['.git','node_modules','test-results']);
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
function fileFor(route,label){
  const safe=(route==='/'?'root':route.replace(/^\/+|\/+$/g,'').replace(/[^0-9A-Za-z._-]+/g,'__'))||'root';
  return path.join(outRoot,label,safe+'.jpg');
}

async function captureStableDocument(page,target){
  // The offline shell can reload once during online recovery. Retry only a
  // destroyed/navigating document; screenshot and unrelated errors still fail.
  for(let attempt=0;attempt<4;attempt++){
    try{
      await page.evaluate(()=>{
        try{ document.fonts?.clear?.(); }catch(_){}
      });
      await page.screenshot({path:target,type:'jpeg',quality:58,fullPage:true,animations:'disabled'});
      return;
    }catch(error){
      if(attempt===3 || !/Execution context was destroyed|interrupted by another navigation|Cannot take a screenshot while page is navigating/i.test(String(error?.message||error))) throw error;
      await page.waitForLoadState('domcontentloaded',{timeout:5000});
      await page.waitForTimeout(120);
    }
  }
}

const routes=html.map(routeFor).sort();
const viewports=[
  ['320',320,800],
  ['390',390,844],
  ['430',430,932],
  ['1440',1440,900]
];

test.describe.configure({mode:'parallel'});
test.use({serviceWorkers:'block'});

for(const route of routes){
  test('visual crawl '+route,async({page,request})=>{
    const http=await request.get(base+route,{maxRedirects:5});
    expect(http.status(),route+' HTTP status').toBeLessThan(400);
    for(const [label,width,height] of viewports){
      await page.setViewportSize({width,height});
      try{
        await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:10000});
      }catch(error){
        const message=String(error?.message||error);
        if(!/ERR_ABORTED|interrupted by another navigation/i.test(message)) throw error;
        await page.waitForLoadState('domcontentloaded',{timeout:5000}).catch(()=>{});
      }
      await page.waitForTimeout(180);
      await page.evaluate(async()=>{
        const imgs=[...document.images].filter(img=>img.loading==='lazy'&&!img.complete);
        await Promise.race([
          Promise.all(imgs.map(img=>new Promise(resolve=>{
            img.addEventListener('load',resolve,{once:true});
            img.addEventListener('error',resolve,{once:true});
          }))),
          new Promise(resolve=>setTimeout(resolve,700))
        ]);
      }).catch(()=>{});
      const target=fileFor(route,label);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      await captureStableDocument(page,target);
    }
  });
}

test('visual inventory is complete',async()=>{
  expect(routes.length).toBeGreaterThanOrEqual(200);
  console.log('Visual evidence target:',routes.length,'routes ×',viewports.length,'viewports =',routes.length*viewports.length,'screenshots');
});
