/** Offline cross-engine prioritization of service editorial, SEO and checkout blockers. */
import {planServiceEditorialImprovements} from './service-editorial-action-planner.mjs';
import {auditServiceJourney} from './service-seo-checkout-journey.mjs';
const PRIORITY=Object.freeze({'checkout-not-configured':100,'email-only-identity-policy-violation':100,'missing-invalid-or-duplicate-path':95,'canonical-mismatch':90,'self-hreflang-missing':85,'translation-linkage-incomplete':85,'missing-seo-title':80,'missing-meta-description':65,'missing-academic-basis':90,'missing-limitations':80,'missing-deliverables':80,'missing-title':75,'missing-description':75,'missing-target-audience':70,'missing-dedicated-image':60,'expand-explanation-with-evidence':45});
export function prioritizeServiceGrowthFixes(services=[]){
 if(!Array.isArray(services))throw new TypeError('Expected services');
 const findings=[];
 for(const service of services){
  const id=service?.id??null;
  const editorial=planServiceEditorialImprovements(service);
  const journey=auditServiceJourney([service]);
  for(const action of editorial.actions)findings.push({serviceId:id,source:'editorial',locale:action.locale,code:action.code,action:action.instruction});
  for(const finding of journey.findings)findings.push({serviceId:id,source:'seo-checkout',locale:finding.locale??'shared',code:finding.code,action:'Review and correct source configuration; do not auto-deploy.'});
 }
 const tasks=findings.map((finding,index)=>({...finding,priority:PRIORITY[finding.code]??50,sequence:index})).sort((a,b)=>b.priority-a.priority||a.sequence-b.sequence).map(({sequence,...task})=>task);
 return {servicesReviewed:services.length,totalTasks:tasks.length,tasks,prioritiesAreHeuristic:true,revenueImpactMeasured:false,autoApply:false,productionTouched:false};
}
