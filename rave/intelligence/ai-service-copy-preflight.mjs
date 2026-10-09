/** Deterministic preflight for AI-assisted academic service copy. No AI provider calls. */
const contains=(s)=>typeof s==='string'&&s.trim().length>0;
export function assessServiceCopyForAi(service={}){
 const issues=[],recommendations=[];
 for(const lang of ['fa','en']){
  const title=service?.['title'+(lang==='fa'?'Fa':'En')];
  const description=service?.['description'+(lang==='fa'?'Fa':'En')];
  const deliverables=service?.['deliverables'+(lang==='fa'?'Fa':'En')];
  if(!contains(title))issues.push({lang,code:'missing-title'});
  if(!contains(description))issues.push({lang,code:'missing-description'});
  if(!contains(deliverables))issues.push({lang,code:'missing-deliverables'});
  if(contains(description)&&description.trim().length<120)recommendations.push({lang,code:'expand-explanation-with-evidence'});
 }
 if(!contains(service?.academicBasis))issues.push({code:'missing-academic-basis'});
 if(!contains(service?.audience))issues.push({code:'missing-target-audience'});
 if(!contains(service?.limitations))issues.push({code:'missing-limitations'});
 if(!contains(service?.imageId))issues.push({code:'missing-dedicated-image'});
 const input={serviceId:contains(service.id)?service.id:null,issues,recommendations};
 return {input,needsReview:issues.length>0||recommendations.length>0,aiGenerated:false,aiProviderCalled:false,mayPublish:false,productionTouched:false};
}
export function makeServiceCopyReviewPrompt(assessment){
 if(!assessment||assessment.aiGenerated!==false||!Array.isArray(assessment.input?.issues))throw new TypeError('Invalid preflight');
 return {task:'Propose improvements to bilingual academic service copy. Never invent prices, credentials, research evidence, outcomes, citations or service details. Identify missing facts as questions. Preserve academic tone. Do not publish.',evidence:assessment.input,requiresHumanReview:true,providerCalled:false};
}
