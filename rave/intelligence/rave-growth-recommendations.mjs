/** Evidence-limited RAVE action recommendations. Advisory only, no live changes. */
import {diagnoseRaveFunnel} from './rave-conversion-diagnostics.mjs';
const IDEAS={
 'visit>engagement':{action:'audit-landing-page',measure:'engagement-rate'},
 'engagement>lead':{action:'review-signup-friction',measure:'lead-conversion-rate'},
 'lead>checkout':{action:'review-offer-and-checkout-entry',measure:'checkout-start-rate'},
 'checkout>purchase':{action:'audit-payment-and-checkout-errors',measure:'purchase-completion-rate'}
};
export function recommendRaveActions(events,options={}){
 const diagnosis=diagnoseRaveFunnel(events,options);
 const recommendations=diagnosis.opportunities.map((issue,index)=>{
  const key=issue.from+'>'+issue.to;
  if(issue.status==='data-quality')return {id:index+1,stage:key,priority:'high',action:'validate-event-instrumentation',measure:'stage-count-consistency',status:'requires-data-review',autoApply:false};
  const idea=IDEAS[key];
  return {id:index+1,stage:key,priority:issue.priority,action:idea.action,measure:idea.measure,status:'hypothesis-needs-experiment',autoApply:false,causalEvidence:false};
 });
 return {diagnosis,recommendations,networkCalled:false,productionTouched:false,disclaimer:'Observational funnel counts do not establish causation.'};
}
