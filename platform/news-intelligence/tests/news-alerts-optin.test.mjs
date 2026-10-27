import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const code=fs.readFileSync(path.resolve(here,'../../../assets/js/jrei-news-reader-alerts-v1.js'),'utf8');

class Element {
  constructor(name='div'){
    this.nodeName=name;this.children=[];this.listeners={};this.attributes={};
    this.textContent='';this.hidden=false;this.dataset={};
  }
  setAttribute(k,v){this.attributes[k]=v;}
  getAttribute(k){return this.attributes[k]??null;}
  append(...items){this.children.push(...items);}
  addEventListener(name,listener){this.listeners[name]=listener;}
  insertAdjacentElement(where,el){this.adjacent=el;}
}

function mount({locale='fa',storySequence=[]}={}){
  const root=new Element();root.setAttribute('data-jr-language',locale);
  const card=new Element();root.querySelector=(key)=>key==='.jrn21-subscribe'?card:null;
  const document={
    hidden:false,events:{},
    querySelector(key){return key==='.jrn21[data-jrn21]'?root:null;},
    createElement(name){return new Element(name);},
    addEventListener(name,cb){this.events[name]=cb;}
  };
  const timer={next:null,calls:0,permission:0,notifications:[]};
  let queue=storySequence.slice();
  const DOMParser=class{
    parseFromString(xml){
      const rows=xml.split('|').filter(Boolean);
      return {
        querySelector(k){return k==='rss channel'?{}:null;},
        querySelectorAll(k){
          if(k!=='channel > item')return [];
          return rows.map(raw=>{
            const [href,title,published,urgency]=JSON.parse(raw);
            return {
              querySelector(field){
                return {textContent:{
                  link:href,title,description:'',pubDate:published
                }[field]||''};
              },
              querySelectorAll(key){
                if(key!=='category'||urgency!=='BREAKING')return [];
                return [{hasAttribute(){return false;},textContent:'BREAKING'}];
              }
            };
          });
        }
      };
    }
  };
  const store=new Map();
  const Notification=class{
    static permission='default';
    static requestPermission(){timer.permission++;return Promise.resolve('denied');}
    constructor(title,details){timer.notifications.push({title,details});}
  };
  const ctx={
    document,DOMParser,Notification,URL,Date,Promise,Set,
    location:{origin:'https://drjavadrezazadeh.com'},
    localStorage:{
      getItem(k){return store.get(k)??null;},
      setItem(k,v){store.set(k,v);},
      removeItem(k){store.delete(k);}
    },
    window:{focus(){}},
    fetch:async (url,options)=>{
      timer.calls++;timer.latestRequest={url,options};
      const data=queue.shift();
      if(data==='offline')return {ok:false,status:503};
      return {ok:true,headers:{get:()=> 'application/rss+xml'},text:async()=>data||''};
    },
    setInterval:fn=>{timer.next=fn;return 1;},
    clearInterval:()=>{timer.next=null;},
    setTimeout:()=>1,clearTimeout(){},AbortController
  };
  runInNewContext(code,ctx,{timeout:2500});
  const area=card.adjacent;
  const [, ,button,state,latest]=area.children;
  return {area,button,state,latest,timer,store,ctx,document,
    async click(){button.listeners.click();await new Promise(resolve=>setImmediate(resolve));},
    async tick(){timer.next?.();await new Promise(resolve=>setImmediate(resolve));},
  };
}
const story=(url,title,iso,urgent='NEWS')=>
  JSON.stringify([url,title,iso,urgent]);
const recent1=new Date(Date.now()-90000).toUTCString();
const recent2=new Date(Date.now()-15000).toUTCString();
const original='https://drjavadrezazadeh.com/fa/akhbar/approved-verified-story/';
const next='https://drjavadrezazadeh.com/fa/akhbar/second-verified-story/';

test('no fetch, storage, notification request, or alert before explicit opt-in',()=>{
  const app=mount();
  assert.equal(app.timer.calls,0);
  assert.equal(app.timer.permission,0);
  assert.equal(app.store.size,0);
  assert.equal(app.button.getAttribute('aria-pressed'),'false');
  assert.match(app.state.textContent,/خاموش/);
});
test('consented reader sets baseline silently, then alerts on newly published verified story only',async()=>{
  const app=mount({storySequence:[
    story(original,'اطلاعیه رسمی قدیمی',recent1,'BREAKING'),
    [story(next,'اطلاعیه رسمی جدید',recent2,'BREAKING'),
     story(original,'اطلاعیه رسمی قدیمی',recent1)].join('|')
  ]});
  await app.click();
  assert.equal(app.timer.permission,1);
  assert.equal(app.timer.calls,1);
  assert.equal(app.latest.hidden,true,'existing story must not be mistaken for new');
  assert.equal(app.button.getAttribute('aria-pressed'),'true');
  assert.equal(app.timer.latestRequest.options.credentials,'omit');
  assert.equal(app.timer.latestRequest.options.redirect,'error');
  assert.equal(app.timer.latestRequest.options.cache,'no-store');
  await app.tick();
  assert.equal(app.latest.hidden,false);
  assert.equal(app.latest.href,'/fa/akhbar/second-verified-story/');
  assert.match(app.state.textContent,/خبر تازه منتشر شد/);
  assert.equal(app.timer.notifications.length,0,'OS notifications denied');
  await app.click();
  assert.equal(app.button.getAttribute('aria-pressed'),'false');
  assert.equal(app.store.size,0);
});
test('unavailable original receipt-backed feed cannot trigger a false alert',async()=>{
  const app=mount({storySequence:['offline']});
  await app.click();
  assert.equal(app.latest.hidden,true);
  assert.match(app.state.textContent,/اتصال به آرشیو خبری/);
});
test('rejects external, private, or parameterized URLs from nominal RSS',async()=>{
  const app=mount({storySequence:[
    story(original,'Official original',recent1),
    [story(original,'Official original',recent1),
     story('https://untrusted.example/fa/akhbar/forged/','Forger',recent2),
     story('https://drjavadrezazadeh.com/fa/akhbar/evil/?tracking=1','Fake',recent2),
     story('https://drjavadrezazadeh.com/fa/app/admin/','Private',recent2)].join('|')
  ]});
  await app.click();await app.tick();
  assert.equal(app.latest.hidden,true);
});
