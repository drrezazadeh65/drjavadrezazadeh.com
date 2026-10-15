// Pure policy for free-first access; server must verify persisted identity, consent and stage.
// This does not override existing paid entitlement or record-level authorization gates.
export const FREE_STAGE_POLICY_VERSION='1.0.0';
export const FREE_STAGE_MODULES=Object.freeze(['GOLDEN_TALENT','RCAS','BAHAR']);
const stages=Object.freeze({
 GOLDEN_TALENT:'ORIENTATION',
 RCAS:'CONTEXT_REFLECTION',
 BAHAR:'STARTER_PLAN'
});
const deny=reason=>Object.freeze({allowed:false,reason,tier:'NONE'});
export function authoriseFreeFirstStage({module,stage,actor,subject,assessmentConsent,guardianRelation}={}){
 if(!Object.hasOwn(stages,module)||stages[module]!==stage)return deny('UNKNOWN_OR_PAID_STAGE');
 if(actor?.record_source!=='PERSISTED'||actor.session_verified!==true||!actor.account_id)
   return deny('AUTHENTICATION_REQUIRED');
 if(subject?.record_source!=='PERSISTED'||!subject.id)return deny('SUBJECT_NOT_VERIFIED');
 if(typeof subject.is_minor!=='boolean')return deny('AGE_CLASSIFICATION_REQUIRED');
 const isSelf=subject.student_account_id===actor.account_id;
 const isGuardian=subject.is_minor===true&&subject.guardian_account_id===actor.account_id&&
   guardianRelation?.record_source==='PERSISTED'&&guardianRelation.state==='VERIFIED'&&
   guardianRelation.subject_id===subject.id&&guardianRelation.actor_id===actor.account_id;
 if(!isSelf&&!isGuardian)return deny('RELATION_NOT_VERIFIED');
 if(assessmentConsent?.record_source!=='PERSISTED'||assessmentConsent.subject_id!==subject.id||
   assessmentConsent.purpose!=='ASSESSMENT'||assessmentConsent.decision!=='GRANTED'||
   assessmentConsent.is_current!==true||!assessmentConsent.policy_version)
   return deny('ACTIVE_CONSENT_REQUIRED');
 if(subject.is_minor===true&&
   (assessmentConsent.guardian_verified!==true||
    assessmentConsent.granted_by_account_id!==subject.guardian_account_id))
   return deny('VERIFIED_GUARDIAN_CONSENT_REQUIRED');
 if(subject.is_minor!==true&&assessmentConsent.granted_by_account_id!==subject.student_account_id)
   return deny('SELF_CONSENT_REQUIRED');
 return Object.freeze({allowed:true,reason:'FREE_STAGE_AUTHORISED',tier:'FREE',
   payment_required:false,stage,module,projection:'FORMATIVE_ONLY'});
}
