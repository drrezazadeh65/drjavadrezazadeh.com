import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAiDiscoveryReadiness} from './ai-discovery-orchestrator.mjs';
const page={path:'/en/services/consultation/',locale:'en',title:'Consultation',description:'Research-based guidance',indexable:true,canonical:'/en/services/consultation/',hreflang:{en:'/en/services/consultation/'},primaryEntityId:'https://example.org/#organization',authoritySource:'https://example.org/research/',structuredDataTypes:['Service'],claimsVerified:true,kind:'service'};
test('integrates evidence without asserting live indexing',()=>{
 const result=assessAiDiscoveryReadiness({pages:[page],robotsTxt:'User-agent: *\nAllow: /',sitemapUrls:['https://example.org/sitemap.xml']});
 assert.equal(result.seo.passed,true);
 assert.equal(result.discoverability.readyForPublication,true);
 assert.equal(result.indexation.findings.filter(f=>f.code==='indexation-unverified').length,2);
 assert.equal(result.readyForLiveRelease,false);
 assert.equal(result.networkCalled,false);
});
test('reports crawler blocks and prioritizes provider-confirmed indexing gaps',()=>{
 const result=assessAiDiscoveryReadiness({pages:[page],robotsTxt:'User-agent: Googlebot\nDisallow: /en/',sitemapUrls:['https://example.org/sitemap.xml'],observations:[{path:page.path,source:'google',status:'not-indexed',checkedAt:'2026-10-09T12:00:00Z'}]});
 assert.ok(result.blockers.some(b=>b.source==='crawl'&&b.bot==='Googlebot'));
 assert.equal(result.priorities.actions[0].priority,'investigate-indexing');
});
