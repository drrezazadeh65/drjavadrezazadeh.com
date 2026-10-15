// Pure integration boundary for free first-stage policy.
// The PHP API must authenticate the actor and load the FULL persisted consent
// decision history and guardian relationship from canonical Bertina records.
// Never accept consent history or subject relationships from browser JSON.
import { currentConsent } from './golden-talent-phase12-gates.mjs';
import { authoriseFreeFirstStage } from './free-first-stage-policy.mjs';

const deny = reason => Object.freeze({allowed:false,reason,tier:'NONE'});
export const FREE_CONSENT_ADAPTER_VERSION = '1.0.0-preproduction';

/**
 * Does not query a database. Caller MUST provide complete server-loaded,
 * subject-scoped persisted decisions, and must verify resource access at API.
 */
export function authoriseFreeStageFromPersistedHistory({
 module,stage,actor,subject,consents,relationships=[],now=Date.now()
}={}){
 if(!Number.isFinite(now)) return deny('INVALID_CLOCK');
 if(!Array.isArray(consents)) return deny('CONSENT_HISTORY_REQUIRED');
 const latest=currentConsent(consents,subject?.id,'ASSESSMENT',now);
 if(!latest || latest.decision!=='GRANTED') return deny('CURRENT_ASSESSMENT_CONSENT_REQUIRED');
 const relation=Array.isArray(relationships)?relationships.find(r=>
  r?.record_source==='PERSISTED' && r.type==='GUARDIAN' &&
  r.state==='VERIFIED' && r.subject_id===subject?.id &&
  r.actor_id===actor?.account_id && Array.isArray(r.capabilities) &&
  r.capabilities.includes('START_FREE_STAGE')):undefined;
 return authoriseFreeFirstStage({
  module,stage,actor,subject,guardianRelation:relation,
  assessmentConsent:{
   record_source:'PERSISTED',subject_id:subject.id,purpose:'ASSESSMENT',
   decision:latest.decision,is_current:true,policy_version:latest.policy_version,
   granted_by_account_id:latest.granted_by_account_id,
   guardian_verified:latest.guardian_verified===true
  }
 });
}
