import {auditBilingualPages} from './master-seo-audit.mjs';
import {auditAiDiscoverability} from './ai-discoverability-audit.mjs';
import {auditCrawlerAccess} from './ai-crawler-access-audit.mjs';
import {assessIndexationEvidence} from './ai-indexation-evidence.mjs';
import {prioritizeDiscoveryRepairs} from './ai-discovery-repair-priorities.mjs';
/** Offline discovery orchestration: supplied evidence only, no network or deployment. */
export function assessAiDiscoveryReadiness({pages=[],robotsTxt='',sitemapUrls=[],observations=[]}={}){
 if(!Array.isArray(pages))throw new TypeError('Page inventory required');
 const seo=auditBilingualPages(pages);
 const discoverability=auditAiDiscoverability(pages);
 const crawl=auditCrawlerAccess({robotsTxt,publicPaths:pages.filter(p=>p?.indexable===true).map(p=>p.path),sitemapUrls});
 const indexation=assessIndexationEvidence({pages,observations});
 const priorities=prioritizeDiscoveryRepairs({pages,indexation});
 const blockers=[...seo.findings.filter(f=>f.severity==='error').map(f=>({source:'seo',...f})),...discoverability.findings.map(f=>({source:'discoverability',...f})),...crawl.findings.filter(f=>f.code==='crawler-blocked').map(f=>({source:'crawl',...f}))];
 return {seo,discoverability,crawl,indexation,priorities,blockers,readyForLiveRelease:false,requiresLiveCrawl:true,requiresVerifiedSearchProviderData:true,networkCalled:false,productionTouched:false};
}
