import test from 'node:test';
import assert from 'node:assert/strict';
import {buildQueue,preparePost} from './core.mjs';
const item={id:'sample-article',url:'https://drjavadrezazadeh.com/fa/',lang:'fa',title:'Sample academic article title',summary:'Verified academic overview',approved:true};
test('creates channel-specific tagged links',()=>assert.match(preparePost(item,'x').link,/utm_source=x/));
test('rejects unapproved source',()=>assert.throws(()=>preparePost({...item,approved:false},'facebook')));
test('requires media for video platforms',()=>assert.equal(preparePost(item,'youtube').requiresMedia,true));
test('rejects external URLs',()=>assert.throws(()=>preparePost({...item,url:'https://example.org'},'x')));
test('creates deterministic queue',()=>assert.equal(buildQueue([item]).length,5));
