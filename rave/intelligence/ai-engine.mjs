/** AI Engine: offline-first governance and provider-independent planning. No network calls. */
export const AI_CAPABILITIES=Object.freeze(['seo-advice','growth-insights','talent-explanations','commerce-assistance','content-assistance','support-drafts']);
const ENGINE_ACCESS=Object.freeze({'seo-advice':'seo','growth-insights':'rave','talent-explanations':'golden-talent','commerce-assistance':'commerce','content-assistance':'content','support-drafts':'crm'});
const SENSITIVE=/\b(?:password|api[_ -]?key|secret|token|credit[_ -]?card)\b/i;
export function planAiTask({capability,input,consent=false,providerConfigured=false}={}){
 if(!AI_CAPABILITIES.includes(capability))throw Error('Unsupported AI capability');
 if(typeof input!=='string'||!input.trim()||input.length>12000)throw Error('Invalid input');
 if(SENSITIVE.test(input))return {status:'blocked',reason:'possible_secret',capability};
 if(!consent)return {status:'blocked',reason:'consent_required',capability};
 if(!providerConfigured)return {status:'pending_configuration',capability,engine:ENGINE_ACCESS[capability],networkCalled:false};
 return {status:'ready_for_provider',capability,engine:ENGINE_ACCESS[capability],networkCalled:false,requiresHumanReview:true};
}
export function assessAiResponse({capability,output,citations=[]}={}){
 if(!AI_CAPABILITIES.includes(capability)||typeof output!=='string')throw Error('Invalid AI response');
 const sources=Array.isArray(citations)?citations.filter(c=>typeof c?.url==='string'&&/^https:\/\//.test(c.url)&&typeof c?.title==='string'):[];
 return {capability,output,sourceCount:sources.length,reviewStatus:'pending_human_review',verified:false,mayPublish:false};
}
export function aiEngineStatus(){return {id:'ai',standalone:true,connected:false,providerConfigured:false,capabilities:[...AI_CAPABILITIES]};}
