// Propagates Golden Path release invalidation into longitudinal development without deleting history.
export function invalidateGoldenPathRelease({release,reason,new_route_run_id=null,affected_evidence_ids=[]}={}){
 if(!release?.id||release.release_status!=='RELEASED') throw new Error('Active release required');
 if(!['EVIDENCE_WITHDRAWN','CONSENT_WITHDRAWN','MATERIAL_ROUTE_CHANGE','PROFESSIONAL_REVOCATION'].includes(reason)) throw new Error('Controlled invalidation reason required');
 return {
  previous_release:{...release,release_status:new_route_run_id?'SUPERSEDED':'REVOKED'},
  reason,new_route_run_id,affected_evidence_ids,
  preserve_historical_release:true,
  automatically_release_replacement:false,
  bahar_action:'PAUSE_FOR_REASSESSMENT',
  requires_human_review:true
 };
}
export function reconcileBaharBaseline({portfolio,invalidation}={}){
 if(!portfolio?.id||!portfolio.source_release_id) throw new Error('Versioned BAHAR baseline required');
 if(!invalidation?.previous_release?.id) throw new Error('Release invalidation required');
 if(portfolio.source_release_id!==invalidation.previous_release.id) return {...portfolio,reconciliation:'NO_CHANGE_DIFFERENT_BASELINE'};
 return {...portfolio,status:'PAUSED',reconciliation:'REASSESSMENT_REQUIRED',reassessment_reason:invalidation.reason,pending_route_run_id:invalidation.new_route_run_id||null,automatic_baseline_replacement:false};
}
export function activateReplacementBaseline({portfolio,new_release}={}){
 if(portfolio?.status!=='PAUSED'||portfolio?.reconciliation!=='REASSESSMENT_REQUIRED') throw new Error('Paused reassessment portfolio required');
 if(new_release?.release_status!=='RELEASED'||!new_release?.id||!new_release?.route_run_id) throw new Error('Explicit replacement release required');
 return {...portfolio,status:'ACTIVE',source_release_id:new_release.id,source_route_run_id:new_release.route_run_id,reconciliation:'RECONCILED',pending_route_run_id:null,baseline_version:(portfolio.baseline_version||1)+1};
}
