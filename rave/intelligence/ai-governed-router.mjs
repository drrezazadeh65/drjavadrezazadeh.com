/** Shared AI task router with explicit consent and strict no-network boundary. */
import {planAiTask,assessAiResponse} from './ai-engine.mjs';
export function routeOfflineAiTask({capability,input,consent=false,providerConfigured=false,requestId}={}){
 if(typeof requestId!=='string'||!/^[-_a-zA-Z0-9]{1,80}$/.test(requestId))throw new Error('Invalid request ID');
 const plan=planAiTask({capability,input,consent,providerConfigured});
 return {requestId,plan,execution:'not-executed',requiresHumanReview:plan.status==='ready_for_provider',networkCalled:false,productionTouched:false};
}
export function reviewOfflineAiDraft({capability,output,citations=[]}={}){
 const assessment=assessAiResponse({capability,output,citations});
 return {...assessment,publicationAllowed:false,sourceUrlsVerified:false,networkCalled:false};
}
