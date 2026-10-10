import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import https from 'node:https';
import {loadHistoricalAuthorityRegistry, classifyHistoricalTarget, authorityScore, priorityFromScore, normalizeHistoricalPath} from '../platform/historical-authority.mjs';
import {verifyHistoricalAuthority,parseCurlHeaders,trustedPublicRequest} from '../scripts/historical-authority-live-verify.mjs';

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

function liveFixture(url){
  const u=new URL(url);
  const path=normalizeHistoricalPath(u.pathname);
  const mapping=registry.authority_redirects.find(r=>r.source===path);
  if(mapping) return {status:301,headers:{location:registry.production_origin+mapping.target+u.search},body:''};
  const targets=new Set(registry.authority_redirects.map(r=>r.target));
  if(u.origin===registry.production_origin&&(path==='/'||targets.has(path))){
    return {status:200,headers:{'cache-control':'public, no-cache, must-revalidate'},body:`<meta name="robots" content="index,follow"><link rel="canonical" href="${registry.production_origin+path}">`};
  }
  if(path==='/') return {status:301,headers:{location:registry.production_origin+'/'},body:''};
  return {status:404,headers:{},body:'<meta name="robots" content="noindex">'};
}

test('strict live matrix covers every registered redirect, transport and slash form',async()=>{
  const requested=[];
  const result=await verifyHistoricalAuthority(registry,{request:async url=>{requested.push(url);return liveFixture(url)}});
  assert.equal(result.failed,0);
  assert.equal(result.checks,137);
  assert.equal(result.authority_redirects,15);
  for(const mapping of registry.authority_redirects){
    for(const origin of result.origins){
      assert.ok(requested.includes(new URL(mapping.source,origin).href));
      assert.ok(requested.includes(new URL(mapping.source.replace(/\/$/,''),origin).href));
    }
  }
  assert.ok(requested.some(u=>u.includes('/product/%D8%')));
});

test('strict live verification rejects an HTTP/www transport-first redirect chain',async()=>{
  const result=await verifyHistoricalAuthority(registry,{request:async url=>url==='http://www.drjavadrezazadeh.com/shop/'?
    {status:301,headers:{location:registry.production_origin+'/shop/'},body:''}:liveFixture(url)});
  assert.equal(result.failed,1);
  assert.match(result.failures[0].error,/one 301 directly/);
});

test('strict live verification rejects temporary and incorrect authority destinations',async()=>{
  for(const replacement of [
    {status:302,headers:{location:registry.production_origin+'/fa/shop/'}},
    {status:301,headers:{location:'https://example.org/fa/shop/'}},
    {status:301,headers:{location:registry.production_origin+'/'}}
  ]){
    const result=await verifyHistoricalAuthority(registry,{request:async url=>url===registry.production_origin+'/shop/'?{...replacement,body:''}:liveFixture(url)});
    assert.equal(result.failed,1);
  }
});

test('strict live verification rejects non-public or noncanonical final pages',async()=>{
  const target=registry.production_origin+'/fa/archive/legacy-shop/';
  const variants=[
    {status:301}, {status:404},
    {headers:{'x-robots-tag':'googlebot: noindex'}},
    {headers:{'cache-control':'private, no-store'}},
    {body:`<meta content="none" name="robots"><link href="${target}" rel="canonical">`},
    {body:`<meta name="robots" content="noindex"><link rel="canonical" href="${target}">`},
    {body:'<link rel="canonical" href="https://drjavadrezazadeh.com/">'},
    {body:`<link rel="canonical" href="${target}"><link rel="canonical" href="${target}">`}
  ];
  for(const variant of variants){
    const result=await verifyHistoricalAuthority(registry,{request:async url=>url===target?{...liveFixture(url),...variant}:liveFixture(url)});
    assert.equal(result.failed,1,JSON.stringify(variant));
  }
});

test('strict live verification rejects guessed PDF redirects and network/TLS errors',async()=>{
  const result=await verifyHistoricalAuthority(registry,{request:async url=>{
    if(url===registry.production_origin+'/') throw new Error('certificate verification failed');
    if(url.includes('/wp-content/')) return {status:301,headers:{location:registry.production_origin+'/en/publications/'},body:''};
    return liveFixture(url);
  }});
  assert.equal(result.failed,2);
  assert.ok(result.failures.some(f=>/certificate verification failed/.test(f.error)));
  assert.ok(result.failures.some(f=>/genuine 404/.test(f.error)));
});

test('curl header parsing ignores CONNECT/interim headers and preserves repeated robots directives',()=>{
  const headers=parseCurlHeaders('HTTP/1.1 200 Connection established\r\nX-Proxy: test\r\n\r\nHTTP/1.1 103 Early Hints\r\nLink: </style.css>\r\n\r\nHTTP/2 200\r\nCache-Control: public\r\nX-Robots-Tag: follow\r\nX-Robots-Tag: noindex\r\n\r\n');
  assert.equal(headers['cache-control'],'public');
  assert.equal(headers['x-robots-tag'],'follow, noindex');
  assert.equal(headers['x-proxy'],undefined);
  assert.throws(()=>parseCurlHeaders('garbled response'),/Missing origin/);
});

test('ordinary curl trust rejects an untrusted localhost certificate',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'historical-tls-test-'));
  let server;
  try{
    execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1',
      '-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1',
      '-keyout',path.join(dir,'key.pem'),'-out',path.join(dir,'cert.pem')],{stdio:'ignore'});
    server=https.createServer({key:fs.readFileSync(path.join(dir,'key.pem')),cert:fs.readFileSync(path.join(dir,'cert.pem'))},(_request,response)=>response.end('untrusted'));
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    await assert.rejects(trustedPublicRequest(`https://127.0.0.1:${server.address().port}/`),/certificate|SSL/i);
  }finally{
    if(server) await new Promise(resolve=>server.close(resolve));
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('404 intelligence counts only valid external HTTP referrers, including suffix lookalikes',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'historical-log-test-'));
  try{
    const file=path.join(dir,'access.log');
    const referrers=[
      'https://drjavadrezazadeh.com/from/', 'https://www.drjavadrezazadeh.com/from/',
      'https://news.drjavadrezazadeh.com/from/', 'https://DRJAVADREZAZADEH.COM./from/',
      'https://outside.example/a/', 'https://outside.example/b/', 'https://outside.example/a/',
      'https://notdrjavadrezazadeh.com/from/', 'not a URL', '-', 'ftp://outside.example/file'
    ];
    fs.writeFileSync(file,referrers.map(ref=>`192.0.2.1 - - [11/Oct/2026:00:50:00 +0330] "GET /missing-old-page/ HTTP/1.1" 404 100 "${ref}" "Mozilla/5.0"`).join('\n'));
    const result=JSON.parse(execFileSync(process.execPath,['scripts/historical-404-log-analyzer.mjs',file],{encoding:'utf8'}));
    assert.equal(result.rows[0].externalReferringDomains,2);
    assert.equal(result.rows[0].externalReferrers,3);
    assert.equal(result.rows[0].hits,referrers.length);
    assert.equal(result.rows[0].action,'REVIEW');
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
