import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 ORIGIN,POST_RELEASE_ROUTES,PRIVATE_FEATURE_GATES,
 validatedPublicUrl,classifyPublicResponse,publicGate,normalizePsi,renderHtml,sourceSelfTest
} from '../scripts/lib/performance-production.mjs';

test('bounded canonical URLs reject foreign, parameterized and private resources',()=>{
 for(const route of ['/fa/','/en/','/journal/','/fa/shop/','/en/golden-talent/']){
  assert.equal(validatedPublicUrl(ORIGIN+route),ORIGIN+route);
 }
 for(const url of [
  ORIGIN+'/fa/assessments/golden-talent/start/',
  ORIGIN+'/fa/app/student/bahar/',
  ORIGIN+'/fa/customer-dashboard/',ORIGIN+'/api/health',ORIGIN+'/en/account/',
  ORIGIN+'/fa/shop/checkout/',ORIGIN+'/fa/?order=18',ORIGIN+'/fa/#form',
  ORIGIN+'/fa/123456789/',ORIGIN+'/fa/%2fapi/',ORIGIN+'/fa//',
  'http://drjavadrezazadeh.com/fa/','https://other.example/fa/'
 ])assert.throws(()=>validatedPublicUrl(url),url);
 assert.equal(POST_RELEASE_ROUTES.length,8,'bounded representative public scope');
 assert.deepEqual(PRIVATE_FEATURE_GATES.map(x=>x.feature),['BAHAR','RCAS']);
});
test('public response requires 200, self-canonical and no noindex anywhere',()=>{
 const url=ORIGIN+'/fa/';
 const eligible='<meta name="robots" content="index,follow"><link href="'+url+'" rel="canonical">';
 assert.equal(classifyPublicResponse(eligible,url,200),'eligible');
 assert.equal(classifyPublicResponse(eligible,url,301),'not_http_200');
 assert.equal(classifyPublicResponse(eligible,url,200,{'x-robots-tag':'noindex,follow'}),'noindex_header');
 assert.equal(classifyPublicResponse(eligible+'<meta content="noindex" name="robots">',url,200),'noindex_meta');
 assert.equal(classifyPublicResponse('<link href="'+ORIGIN+'/en/" rel="canonical">',url,200),'canonicalized_elsewhere');
 assert.equal(classifyPublicResponse(eligible+'<link rel="canonical" href="'+url+'">',url,200),'missing_or_multiple_canonical');
 assert.equal(classifyPublicResponse('<h1>Title</h1>',url,200),'missing_or_multiple_canonical');
});
test('field INP is never invented from TBT; absent values stay null',()=>{
 const url=ORIGIN+'/en/';
 const fake={lighthouseResult:{finalUrl:url,categories:{
   performance:{score:.92},accessibility:{score:1},'best-practices':{score:.96},seo:{score:.99}
  },audits:{'largest-contentful-paint':{numericValue:2600},'total-blocking-time':{numericValue:400},
    'cumulative-layout-shift':{numericValue:.09}}}};
 const rec=normalizePsi(fake,url,'mobile','2026-10-20T10:00:00Z');
 assert.equal(rec.categories.performance,92);
 assert.equal(rec.categories['best-practices'],96);
 assert.equal(rec.lab.tbtMs,400);
 assert.equal(rec.fieldVitals.inpMs,null,'lab TBT is not real-user INP');
 assert.equal(rec.fieldVitals.source,null);
 const measured=normalizePsi({...fake,loadingExperience:{overall_category:'FAST',metrics:{
  INTERACTION_TO_NEXT_PAINT:{percentile:180},
  LARGEST_CONTENTFUL_PAINT_MS:{percentile:1900},
  CUMULATIVE_LAYOUT_SHIFT_SCORE:{percentile:8}
 }}},url,'desktop','2026-10-20T10:00:00Z');
 assert.equal(measured.fieldVitals.inpMs,180);
 assert.equal(measured.fieldVitals.lcpMs,1900);
 assert.equal(measured.fieldVitals.cls,0.08);
 assert.equal(measured.fieldVitals.source,'url');
 const foreign=normalizePsi({...fake,lighthouseResult:{...fake.lighthouseResult,finalUrl:'https://evil.example/'}},url,'mobile','2026-10-20T10:00:00Z');
 assert.equal(foreign.status,'unavailable');
});
test('HTML report encodes contents and keeps lab/field caveat',()=>{
 const report={releaseSha:'a'.repeat(40),observedAt:'2026-10-20T10:00:00Z',
  records:[{url:ORIGIN+'/fa/',strategy:'mobile',status:'excluded',reason:'<script>alert(1)</script>'}],
  exclusions:PRIVATE_FEATURE_GATES,priorities:[]};
 const html=renderHtml(report);
 assert.match(html,/private CI artifact/i);
 assert.match(html,/real-user Core Web Vitals/i);
 assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
 assert.match(html,/&lt;script&gt;/);
});
test('self test uses only synthetic observations',()=>{sourceSelfTest()});

test('verified owner release proof uses the same strict token across PageSpeed and IndexNow',()=>{
 const proof=fs.readFileSync('scripts/performance-release-verify.mjs','utf8');
 const workflow=fs.readFileSync('.github/workflows/post-release-observations.yml','utf8');
 const production=fs.readFileSync('scripts/lib/performance-production.mjs','utf8');
 const delta=fs.readFileSync('scripts/indexnow-release-delta.mjs','utf8');
 const sender=fs.readFileSync('scripts/indexnow-submit.mjs','utf8');
 assert.match(proof,/verified=1\\nsha=/,'successful live-SHA proof must emit token 1');
 assert.match(proof,/if\(stamp!==expected\)throw Error\('live_service_worker_sha_does_not_match_successful_release'\)/);
 assert.match(workflow,/PSI_RELEASE_VERIFIED:\s*\$\{\{\s*steps\.release\.outputs\.verified\s*\}\}/);
 for(const consumer of [production,delta,sender]){
  assert.match(consumer,/process\.env\.PSI_RELEASE_VERIFIED!=='1'/,'gated consumers must agree on the proof token');
 }
});


test('public HTML transport is measured without inventing unavailable PSI or CWV',async()=>{
 const url=ORIGIN+'/fa/';
 const html='<meta name="robots" content="index,follow"><link href="'+url+'" rel="canonical"><h1>Education</h1>';
 const request=async()=>new Response(html,{status:200,
   headers:{'Content-Type':'text/html; charset=utf-8'}});
 const ok=await publicGate(url,request);
 assert.equal(ok.ok,true);
 assert.equal(ok.transport.source,'read_only_public_html_fetch');
 assert.ok(Number.isInteger(ok.transport.responseHeadersMs));
 assert.ok(Number.isInteger(ok.transport.completeHtmlMs));
 assert.ok(ok.transport.completeHtmlMs>=ok.transport.responseHeadersMs);
 assert.equal(ok.transport.decodedHtmlBytes,Buffer.byteLength(html));
 assert.equal(ok.transport.notLighthouseOrFieldVitals,true);
 const hidden=await publicGate(url,async()=>new Response(
   '<meta name="robots" content="noindex">'+html,{status:200,
     headers:{'Content-Type':'text/html'}}));
 assert.equal(hidden.ok,false);
 assert.equal(hidden.reason,'noindex_meta');
 assert.equal(hidden.transport,undefined,
   'private or noindex content is never represented as a public timing');
});
