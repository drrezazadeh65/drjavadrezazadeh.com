import test from 'node:test';
import assert from 'node:assert/strict';
import {collectEdgeHealthEvidence} from './edge-health-evidence.mjs';
test('requires server-side fetch',async()=>{await assert.rejects(()=>collectEdgeHealthEvidence(),/transport/)});
test('observes actual service-specific health without inventing traffic counts',async()=>{
 const records=await collectEdgeHealthEvidence({now:()=>new Date('2026-10-09T20:00:00Z'),fetcher:async(url)=>({ok:true,url,async json(){return {status:'ok',service:url.includes('assistant.')?'site-assistant':'payments'}}})});
 assert.equal(records.length,2);assert.ok(records.every(x=>x.healthy===true&&!('requests_24h' in x)));
});
test('rejects wrong service response and network failures',async()=>{
 const records=await collectEdgeHealthEvidence({fetcher:async(url)=>{if(url.includes('payments.'))throw Error('down');return {ok:true,url,async json(){return {status:'ok',service:'payments'}}}}});
 assert.ok(records.every(x=>x.healthy===false));
});
