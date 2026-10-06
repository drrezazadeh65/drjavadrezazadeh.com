// Transaction plan for consent withdrawal propagation.
export function planConsentWithdrawal({subject_user_id,purpose,policy_version,affected_evidence_ids=[],current_route_run_id=null}={}){
 if(!subject_user_id||!purpose||!policy_version) throw new Error('Versioned withdrawal context required');
 return {
  isolation:'SERIALIZABLE_OR_EQUIVALENT',
  steps:[
   'lock_subject_consent_scope',
   'append_WITHDRAWN_consent_decision',
   'mark_dependent_evidence_WITHDRAWN',
   'invalidate_future_use_without_deleting_history',
   ...(affected_evidence_ids.length?['create_reassessment_request']:[]),
   'write_privacy_minimised_audit_event'
  ],
  subject_user_id,purpose,policy_version,affected_evidence_ids,current_route_run_id,
  delete_historical_evidence:false,
  automatically_release_replacement:false,
  requires_new_route_run:affected_evidence_ids.length>0
 };
}
export function withdrawalCompleted(result={}){
 return result.consent_appended===true&&result.evidence_propagated===true&&result.audit_written===true&&(!result.requires_new_route_run||result.reassessment_created===true);
}
