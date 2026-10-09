import test from 'node:test';
import assert from 'node:assert/strict';
import {auditCrawlerAccess} from './ai-crawler-access-audit.mjs';
test('detects Googlebot restriction while preserving explicit Bingbot access',()=>{
 const result=auditCrawlerAccess({robotsTxt:'User-agent: Googlebot\nDisallow: /en/\n\nUser-agent: Bingbot\nAllow: /en/\n\nUser-agent: *\nAllow: /',publicPaths:['/en/services/'],sitemapUrls:['https://example.org/sitemap.xml']});
 assert.equal(result.coverage.Googlebot['/en/services/'],false);
 assert.equal(result.coverage.Bingbot['/en/services/'],true);
 assert.equal(result.liveIndexationVerified,false);
});
test('reports missing sitemap evidence',()=>{
 const result=auditCrawlerAccess({robotsTxt:'User-agent: *\nAllow: /',publicPaths:['/fa/']});
 assert.ok(result.findings.some(f=>f.code==='no-sitemap-evidence'));
});
test('explicit allow wins equal-length robots path tie',()=>{
 const result=auditCrawlerAccess({robotsTxt:'User-agent: *\nDisallow: /en/\nAllow: /en/',publicPaths:['/en/'],sitemapUrls:['https://example.org/sitemap.xml']});
 assert.equal(result.coverage.Googlebot['/en/'],true);
});
