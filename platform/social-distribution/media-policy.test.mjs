import test from 'node:test';
import assert from 'node:assert/strict';
import {LAYOUTS,mediaBrief,storyStoryboard} from './media-policy.mjs';

const item={url:'https://drjavadrezazadeh.com/fa/rahnamaha/test/',title:'ارزیابی آموزشی',
 description:'کیفیت ارزیابی را باید در پیوند با زمینه یادگیری و کاربرد نتایج بررسی کرد.'};
test('plans only unique requested layouts without generating fabricated assets',()=>{
 const p=mediaBrief(item,['instagram','telegram','facebook']);
 assert.equal(p.derivatives.length,4);
 assert.ok(p.derivatives.every(a=>a.output===null&&a.needsActualFile===true));
 assert.equal(p.networkRequirements.length,3);
});
test('WhatsApp is not misclassified as a Story/status publisher',()=>{
 const p=mediaBrief(item,['whatsapp']);
 assert.equal(p.derivatives.length,0);
 assert.equal(p.networkRequirements[0].deliveryAllowed,false);
});
test('every story frame uses a 9:16 storyboard with original source',()=>{
 const s=storyStoryboard(item);
 assert.deepEqual(s.layout,LAYOUTS.story);
 assert.equal(s.frames.length,3);
 assert.equal(s.frames[2].target,item.url);
 assert.equal(s.publishingEnabled,false);
});
