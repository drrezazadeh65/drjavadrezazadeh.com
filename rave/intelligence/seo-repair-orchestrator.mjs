/** SEO remediation orchestrator: plans, simulates and verifies with zero I/O. */
import {auditBilingualPages} from './master-seo-audit.mjs';
import {planSeoRemediation} from './seo-remediation-planner.mjs';
import {verifySeoRemediation} from './seo-remediation-verifier.mjs';
export function runOfflineSeoRepair(pages,{titles={},descriptions={}}={}){
 const audit=auditBilingualPages(pages);
 const plan=planSeoRemediation(audit,{titles,descriptions});
 const verification=verifySeoRemediation(pages,plan);
 return {audit,plan,verification,approvedForDeployment:false,networkCalled:false,productionTouched:false};
}
