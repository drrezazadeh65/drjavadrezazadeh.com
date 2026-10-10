import test from 'node:test';
import assert from 'node:assert/strict';
import {loadHistoricalAuthorityRegistry, classifyHistoricalTarget, authorityScore, priorityFromScore, normalizeHistoricalPath} from '../platform/historical-authority.mjs';

const registry=loadHistoricalAuthorityRegistry();

test('homepage and shop retain dedicated authority behavior',()=>{
  assert.deepEqual(classifyHistoricalTarget('/',registry),{path:'/',action:'PRESERVE_HOME',target:'/'});
  const shop=classifyHistoricalTarget('/shop/',registry);
  assert.equal(shop.action,'PRESERVE_SHOP');
  assert.equal(shop.target,'/fa/shop/');
});

test('approved legacy routes map one hop to live public destinations',()=>{
  const pubs=classifyHistoricalTarget('/publications/',registry);
  assert.equal(pubs.action,'ALREADY_MAPPED');
  assert.equal(pubs.target,'/en/publications/');
  assert.equal(pubs.status,301);
});

test('confirmed historical carpet product maps to truthful archive',()=>{
  const p=classifyHistoricalTarget('/product/%D8%AE%D8%B1%DB%8C%D8%AF-%D9%81%D8%B1%D8%B4-%D9%85%D8%A7%D8%B4%DB%8C%D9%86%DB%8C-%DA%A9%D8%AF-2-7801-9735/',registry);
  assert.equal(p.action,'ALREADY_MAPPED');
  assert.equal(p.target,'/fa/archive/legacy-shop/');
  assert.equal(p.status,301);
});

test('unknown legacy URL stays in review instead of redirecting to homepage',()=>{
  const p=classifyHistoricalTarget('/old-wordpress-page-that-we-have-not-verified/',registry);
  assert.equal(p.action,'REVIEW');
  assert.equal(p.target,undefined);
});

test('historical PDF remains review-only until identity is verified',()=>{
  const p=classifyHistoricalTarget('/wp-content/uploads/2022/12/%D9%85%D9%82%D8%A7%D9%84%D9%87-%D8%A7%D9%88%D9%84.pdf',registry);
  assert.equal(p.action,'REVIEW');
});

test('normalization strips query strings and decodes Persian slugs',()=>{
  const p=normalizeHistoricalPath('https://www.drjavadrezazadeh.com/product/%D8%AE%D8%B1%DB%8C%D8%AF-%DA%AF%D8%A8%D9%87-%D9%85%D8%A7%D8%B4%DB%8C%D9%86%DB%8C-%DA%A9%D8%AF-1009-2/?utm_source=old');
  assert.equal(p,'/product/خرید-گبه-ماشینی-کد-1009-2/');
});

test('authority scoring is deterministic and priority rises with stronger evidence',()=>{
  const weak=authorityScore({referringDomains:1,dofollowDomains:0,maxDomainRating:5,impressions:1});
  const strong=authorityScore({referringDomains:40,dofollowDomains:20,maxDomainRating:70,clicks:25,impressions:500});
  assert.ok(strong>weak);
  const order={P0:4,P1:3,P2:2,P3:1};
  assert.ok(order[priorityFromScore(strong)]>=order[priorityFromScore(weak)]);
});
