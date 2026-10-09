/** Turn offline AI copy findings into bounded editorial work items, not invented copy. */
import {assessServiceCopyForAi} from './ai-service-copy-preflight.mjs';
const GUIDANCE={
 'missing-title':'Provide a factual service title in this language.',
 'missing-description':'Explain scope, process, eligibility and expected deliverables using verified service facts.',
 'missing-deliverables':'Specify tangible deliverables and their boundaries.',
 'missing-academic-basis':'Provide a verifiable academic rationale and real references.',
 'missing-target-audience':'Define the intended audience and eligibility.',
 'missing-limitations':'Disclose exclusions, limitations and non-guaranteed outcomes.',
 'missing-dedicated-image':'Select an approved, rights-cleared service-specific image.',
 'expand-explanation-with-evidence':'Expand the explanation using approved evidence; do not pad or fabricate.'
};
export function planServiceEditorialImprovements(service={}){
 const assessment=assessServiceCopyForAi(service);
 const findings=[...assessment.input.issues,...assessment.input.recommendations];
 const actions=findings.map((finding,index)=>({
  id:'editorial-'+String(index+1).padStart(3,'0'),
  serviceId:assessment.input.serviceId,
  locale:finding.lang??'shared',
  code:finding.code,
  instruction:GUIDANCE[finding.code]??'Review missing source facts.',
  owner:'human-editor',
  status:'awaiting-source-evidence',
  autoPublish:false
 }));
 return {serviceId:assessment.input.serviceId,actions,readyForPublication:false,
  requiresAcademicReview:true,requiresBilingualReview:true,
  aiProviderCalled:false,productionTouched:false};
}
