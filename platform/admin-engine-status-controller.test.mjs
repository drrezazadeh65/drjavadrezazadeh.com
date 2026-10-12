import test from 'node:test';
import assert from 'node:assert/strict';
import {createEngineStatusController} from './admin-engine-status-controller.mjs';
function node(tag){return {tag,children:[],attrs:{},dataset:{},textContent:'',append(...xs){this.children.push(...xs)},replaceChildren(...xs){this.children=xs},setAttribute(k,v){this.attrs[k]=v}}}
const document={createElement:node};
const origin='https://drjavadrezazadeh.com';
test('rejects insecure origin',()=>assert.throws(()=>createEngineStatusController({document,container:node('div'),fetcher:async()=>{},origin:'http://example.com'}),/HTTPS/));
test('does not render unverified API errors as healthy engines',async()=>{
 const container=node('div');
 const controller=createEngineStatusController({document,container,origin,fetcher:async()=>({ok:false,status:403})});
 assert.equal(await controller.refresh(),false);
 assert.match(container.children[0].textContent,/در دسترس نیست/);
});
test('uses same-origin no-store transport and renders authenticated payload',async()=>{
 const container=node('div');let options;
 const controller=createEngineStatusController({document,container,origin,now:()=>new Date('2026-10-09T20:05:00Z'),
 fetcher:async(url,opts)=>{options=opts;assert.equal(url,origin+'/api/v1/admin/engine-status');
 return {ok:true,url,async json(){return {as_of:'2026-10-09T20:05:00Z',engines:[{id:'crm',status:'ACTIVE',last_verified_at:'2026-10-09T20:04:00Z'}]}}}}});
 assert.equal(await controller.refresh(),true);
 assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-store');
 assert.equal(container.children[0].tag,'table');
});
