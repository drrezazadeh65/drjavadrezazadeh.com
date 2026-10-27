import test from 'node:test';
import assert from 'node:assert/strict';
import {repairPageImages} from '../scripts/jrei-autonomous-seo-repair.mjs';

const page=body=>'<html><head><title>Reviewed page</title></head><body>'+
'<main><h1>Review</h1>'+body+'</main></body></html>';
const image=(name,extra='')=>'<img src="/assets/images/'+name+
  '.svg" alt="Original verified alt" width="100" height="100"'+extra+'>';

test('adds a lazy hint to second eligible content image, never the LCP image',()=>{
  const source=page(image('initial')+image('secondary'));
  const result=repairPageImages(source);
  assert.equal(result.changes,1);
  assert.match(result.html,/<img src="\/assets\/images\/initial.svg"[^>]*>/);
  assert.match(result.html,/<img src="\/assets\/images\/secondary.svg"[^>]*loading="lazy">/);
  assert.doesNotMatch(result.html,/initial.svg"[^>]*loading=/);
  assert.equal(repairPageImages(result.html).changes,0);
});
test('leaves hero, logo, trust badges, and explicit priorities alone',()=>{
  const source=page(image('initial')+image('brand-symbol')+
    image('third',' fetchpriority="high"')+
    image('fourth',' loading="lazy"'));
  const result=repairPageImages(source);
  assert.equal(result.changes,0);
  assert.equal(result.html,source);
});
test('skips protected and nonindex pages and unknown dimensions',()=>{
  const input=page(image('first')+image('second'));
  assert.equal(repairPageImages(input.replace('<head>','<head><meta name="robots" content="noindex,nofollow">')).changes,0);
  assert.equal(repairPageImages(input.replace('width="100"','')).changes,1);
  assert.equal(repairPageImages(input.replace('height="100"','')).changes,1);
  const bothWithoutSizes=page(image('first')+'<img src="/assets/images/second.svg" alt="ok">');
  assert.equal(repairPageImages(bothWithoutSizes).changes,0);
});
test('preserves self closing syntax and unicode text',()=>{
  const input=page(image('first')+'<p>توسعه JREI</p>'+
    '<img src="/assets/images/second.svg" alt="کسب دانش" width="100" height="100" />');
  const result=repairPageImages(input);
  assert.equal(result.changes,1);
  assert.match(result.html,/loading="lazy" \/>/);
  assert.match(result.html,/توسعه JREI/);
});
test('never guesses images on pages without main and h1',()=>{
  assert.equal(repairPageImages('<html>'+image('a')+image('b')+'</html>').changes,0);
});
