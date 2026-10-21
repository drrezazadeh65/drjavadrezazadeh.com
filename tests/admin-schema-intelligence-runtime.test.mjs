import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../assets/js/operations-intelligence.js',import.meta.url),'utf8');
const ORIGIN='https://drjavadrezazadeh.com';

class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.textContent='';this.hidden=false;this.style={setProperty(){}};}
 append(...children){this.children.push(...children);}
 after(node){this.afterNode=node;}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(name,value){this[name]=value;}
 addEventListener(name,listener){this[name]=listener;}
}

function makeHarness({locked=false}={}){
 const elements=new Map(),root=new Element('section'),workspace=new Element('div'),visited=[],options=[];
 root.dataset.lang='en';workspace.hidden=locked;
 root.querySelector=selector=>{
  if(!elements.has(selector))elements.set(selector,new Element(selector));
  return elements.get(selector);
 };
 const document={
  getElementById:id=>id==='jr-intelligence'?root:id==='ops-workspace'?workspace:null,
  createElement:tag=>new Element(tag)
 };
 const sitemaps={
  '/sitemap.xml':{kind:'sitemapindex',values:['/sitemap-fa.xml','/journal/sitemap.xml','/sitemap-en.xml']},
  '/sitemap-fa.xml':{kind:'urlset',values:['/fa/','/fa/ketab-ha/how-languages-are-learned/','/fa/foreign-canonical/','/fa/app/admin/']},
  '/sitemap-en.xml':{kind:'urlset',values:['/en/','/en/books/how-languages-are-learned/','/en/duplicate-canonical/','https://external.example/private/']}
 };
 const meta={
  '/fa/foreign-canonical/':{canonicals:['https://external.example/fa/foreign-canonical/']},
  '/en/duplicate-canonical/':{canonicals:[ORIGIN+'/en/duplicate-canonical/',ORIGIN+'/en/books/']}
 };
 const fetch=async(input,opts={})=>{
  const u=new URL(input,ORIGIN);visited.push(u.pathname);options.push(opts);
  const child=sitemaps[u.pathname];
  return {ok:true,status:200,url:u.href,text:async()=>child?JSON.stringify(child):'PAGE:'+u.pathname};
 };
 class Parser{
  parseFromString(payload,type){
   if(type==='text/html'){
    const route=payload.slice('PAGE:'.length);
    const state=meta[route]||{canonicals:[ORIGIN+route]};
    return {
     querySelector:selector=>selector==='meta[name="robots"]'?{content:'index,follow'}:null,
     querySelectorAll:selector=>{
      if(selector==='link[rel~="canonical"]')return state.canonicals.map(href=>({getAttribute:name=>name==='href'?href:null}));
      if(selector==='script[type="application/ld+json"]')return [{textContent:'{"@context":"https://schema.org","@type":"WebPage"}'}];
      return [];
     }
    };
   }
   const item=JSON.parse(payload);
   return {
    documentElement:{localName:item.kind},
    querySelector:()=>null,
    getElementsByTagName:tag=>{
     if((tag==='sitemap'&&item.kind==='sitemapindex')||(tag==='url'&&item.kind==='urlset')){
      return item.values.map(value=>({getElementsByTagName:name=>name==='loc'?[{textContent:new URL(value,ORIGIN).href}]:[]}));
     }
     return [];
    }
   };
  }
 }
 vm.runInNewContext(source,{document,location:{origin:ORIGIN},fetch,DOMParser:Parser,URL},{timeout:1500});
 return {elements,visited,options,workspace};
}

test('admin engine follows local bilingual sitemap index and flags foreign or duplicate canonicals',async()=>{
 const app=makeHarness();
 await app.elements.get('[data-jr-audit]').click();
 const rows=app.elements.get('[data-jr-results]').children;
 const paths=rows.map(row=>new URL(row.children[0].href).pathname);
 assert.ok(paths.includes('/fa/'));
 assert.ok(paths.includes('/en/'));
 assert.ok(paths.includes('/fa/ketab-ha/how-languages-are-learned/'));
 assert.ok(paths.includes('/en/books/how-languages-are-learned/'));
 assert.ok(!app.visited.includes('/journal/sitemap.xml'),'independent journal XML is not a public FA/EN URL set');
 assert.ok(!paths.includes('/fa/app/admin/'),'admin route is not sampled');
 assert.ok(!app.visited.some(url=>url.includes('external.example')));
 assert.ok(rows.length<=32);
 for(const opts of app.options)assert.equal(opts.credentials,'omit');
 const foreign=rows.find(row=>row.children[0].href.endsWith('/fa/foreign-canonical/'));
 const duplicate=rows.find(row=>row.children[0].href.endsWith('/en/duplicate-canonical/'));
 assert.match(foreign.children[1].textContent,/Review|نیازمند بازبینی/);
 assert.match(duplicate.children[1].textContent,/Error|خطا/);
 assert.match(app.elements.get('[data-jr-summary]').textContent,/Balanced bilingual sample/);
 assert.equal(app.elements.get('[data-jr-audit]').disabled,false);
});

test('admin schema audit cannot issue requests while MFA workspace is locked',async()=>{
 const app=makeHarness({locked:true});
 await app.elements.get('[data-jr-audit]').click();
 assert.deepEqual(app.visited,[]);
 assert.equal(app.elements.get('[data-jr-results]').children.length,0);
});
