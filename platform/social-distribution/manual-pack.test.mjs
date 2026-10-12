import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareManualPack,captureManualReference} from './manual-pack.mjs';
const article={title:'Human-centred educational assessment',description:'Interpretive analysis of responsible assessment.',
 url:'https://drjavadrezazadeh.com/en/research/'};
test('manual pack preserves self canonical, separates tracked share URL and asserts no delivery',()=>{
 const p=prepareManualPack(article,'aparat');
 assert.equal(p.sourceCanonical,article.url);
 assert.match(p.trackedUrl,/utm_source=aparat/);
 assert.equal(p.published,false);
 assert.equal(p.providerPostId,null);
 assert.equal(p.status,'needs_manual_upload');
 assert.ok(p.warnings.some(v=>v.includes('upload')));
});
test('WhatsApp cannot become a public broadcast fallback',()=>{
 assert.throws(()=>prepareManualPack(article,'whatsapp'),/opt-in/);
});
test('unverified media rights cannot be laundered into export',()=>{
 const p=prepareManualPack(article,'instagram',{approvedMedia:[{type:'photo',url:'https://example.com/image.png',public:true,rightsVerified:false}]});
 assert.equal(p.rightsClearedMedia.length,0);
 assert.equal(p.published,false);
});
test('a claimed manual post link remains unverified, even when provider host matches',()=>{
 const pack=prepareManualPack(article,'youtube');
 const proof=captureManualReference(pack,'https://studio.youtube.com/video/example/edit');
 assert.equal(proof.status,'awaiting_provider_verification');
 assert.equal(proof.providerPostId,null);
 assert.equal(proof.published,false);
 assert.throws(()=>captureManualReference(pack,'https://evil.example/anything'));
 assert.throws(()=>captureManualReference(pack,'https://studio.youtube.com/'));
});
