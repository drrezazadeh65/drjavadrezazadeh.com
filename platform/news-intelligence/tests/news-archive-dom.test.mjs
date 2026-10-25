import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';

// Real first-party browser script, exercised with a deliberately minimal
// in-memory DOM; no external browser, network, cookies or dependency packages.
const currentDir=path.dirname(fileURLToPath(import.meta.url));
const client=fs.readFileSync(path.resolve(currentDir,'../ui/news-search.js'),'utf8');

class Node {
  constructor(tag='div'){
    this.tagName=tag;this.children=[];this.handlers={};
    this.attributes={};this.textContent='';this.value='';
  }
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(name,value){this.attributes[name]=value;}
  getAttribute(name){return this.attributes[name]??null;}
  addEventListener(name,fn){this.handlers[name]=fn;}
}

function mount(language,response){
  const host=new Node();
  host.setAttribute('data-ni-language',language);
  const calls=[];
  const doc={
    querySelector(q){return q==='[data-ni-archive-search]'?host:null;},
    createElement(tag){return new Node(tag);}
  };
  const location={origin:'https://drjavadrezazadeh.com'};
  const fetch=async (url,options)=>{
    calls.push({url,options});
    return response(url,options);
  };
  runInNewContext(client,{
    document:doc,location,fetch,URL,URLSearchParams,AbortController
  },{timeout:1500});
  const [form,status,results]=host.children;
  const search=form.children[0].children[1];
  return {host,form,status,results,search,calls,
    async submit(text){
      search.value=text;
      await form.handlers.submit({preventDefault(){}});
    }
  };
}

test('search suppresses whitespace-only requests and does not touch cookies',async()=>{
  const app=mount('fa',async()=>{throw Error('network must not be called');});
  await app.submit('   ');
  assert.equal(app.calls.length,0);
  assert.match(app.status.textContent,/عبارت جست/);
  assert.equal(app.results.children.length,0);
});

test('public Persian search renders only exact approved canonical paths',async()=>{
  const results=[
    {url:'https://drjavadrezazadeh.com/fa/akhbar/official-admissions/',
      headline:'رسمی',summary:'خبر معتبر'},
    {url:'https://drjavadrezazadeh.com/fa/akhbar/official-admissions/?token=1',
      headline:'Unsafe query',summary:'must not render'},
    {url:'https://drjavadrezazadeh.com/fa/app/admin/',
      headline:'Private route',summary:'must not render'},
    {url:'https://drjavadrezazadeh.com/en/news-insights/official-admissions/',
      headline:'Other language',summary:'must not render'},
    {url:'https://other.example/fa/akhbar/official-admissions/',
      headline:'Foreign origin',summary:'must not render'},
    {url:'https://drjavadrezazadeh.com/fa/akhbar/official-admissions/extra/',
      headline:'Nested path',summary:'must not render'}
  ];
  const app=mount('fa',async()=>({
    status:200,ok:true,
    async json(){return {schema:'jr.jrei.news-public-search.v1',results};}
  }));
  await app.submit('دانشگاه');
  assert.equal(app.calls.length,1);
  assert.equal(app.calls[0].options.credentials,'omit');
  assert.equal(app.calls[0].options.cache,'no-store');
  assert.equal(app.calls[0].options.redirect,'error');
  assert.ok(app.calls[0].url.includes('language=fa'));
  assert.equal(app.results.children.length,1);
  const article=app.results.children[0];
  assert.equal(article.children[0].children[0].href,
    '/fa/akhbar/official-admissions/');
  assert.equal(article.children[1].textContent,'خبر معتبر');
  assert.match(app.status.textContent,/^1 نتیجه یافت شد$/);
});

test('unactivated English archive remains an honest unavailable state',async()=>{
  const app=mount('en',async()=>({status:503,ok:false}));
  await app.submit('university');
  assert.equal(app.results.children.length,0);
  assert.match(app.status.textContent,/not yet been activated/);
  assert.equal(app.calls.length,1);
});
