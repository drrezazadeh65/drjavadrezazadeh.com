/**
 * JR BAHAR study-cycle bridge — user-authored, local-memory interface contract.
 * Educational scaffolding only; not a diagnostic, psychometric or clinical score.
 * No persistence, network requests or automatic Golden Path updates.
 */
import {createThirtyDayStarter,createEightWeekCompass,createWeeklyCycle} from './bahar-engine.mjs';
export const BAHAR_BRIDGE_VERSION='1.0.0';
export const BAHAR_ACCESS_POLICY=Object.freeze({
  introductorySectionsFree:2,
  fullContentRequiresVerifiedEntitlement:true,
  noAutomaticPurchases:true,
  noAutomaticDiagnosis:true
});
const bounded=(x,n=300)=>typeof x==='string'&&x.trim().length>0&&x.trim().length<=n;
const clone=x=>JSON.parse(JSON.stringify(x));
export function getFreeBaharStarter(){
  return Object.freeze({
    version:BAHAR_BRIDGE_VERSION,
    status:'EDUCATIONAL_TEMPLATE_ONLY',
    introduction:'BAHAR supports observation, small study actions, evidence and reflective revision.',
    freeSections:Object.freeze([
      Object.freeze({number:1,title:'Observe how you currently study',goal:'Document your learning context and current study routine without rating yourself.',prompt:'Which study actions helped you recall what you learned this week?'}),
      Object.freeze({number:2,title:'Choose a small learning experiment',goal:'Try retrieval practice, observe gaps, and make one revisable change.',prompt:'What evidence would help you decide whether your next study action worked?'})
    ]),
    thirtyDayTemplate:clone(createThirtyDayStarter()),
    disclaimer:'Research-stage educational guidance; not a validated assessment or guaranteed outcome.'
  });
}
export function createLocalBaharCycle(input={}){
  if(!bounded(input.goal,300)||!bounded(input.action,500))
    return Object.freeze({ok:false,reason:'Human-authored goal and action are required'});
  try{
    const cycle=createWeeklyCycle({
      week_start:input.weekStart,
      goal_text:input.goal.trim(),
      planned_action:input.action.trim()
    });
    return {ok:true,cycle:clone(cycle),persistence:'NONE',humanReviewRequired:true};
  }catch{return Object.freeze({ok:false,reason:'Invalid date or weekly study-cycle fields'});}
}
export function createLocalBaharCompass(input={}){
  if(!bounded(input.goal,300)||!bounded(input.successEvidence,500))
    return Object.freeze({ok:false,reason:'Human-authored goal and evidence required'});
  try{
    const compass=createEightWeekCompass({
      goal:input.goal.trim(),success_evidence:input.successEvidence.trim(),
      context_constraints:typeof input.context==='string'?input.context.trim().slice(0,500):''
    });
    return {ok:true,compass:clone(compass),persistence:'NONE',humanReviewRequired:true};
  }catch{return Object.freeze({ok:false,reason:'Invalid compass input'});}
}
export function isBaharFullContentAllowed({authenticated=false,entitlementVerified=false,consent=false}={}){
  return authenticated===true&&entitlementVerified===true&&consent===true;
}
