// Golden Talent deterministic failure recovery planner.
const RETRYABLE=new Set(['TRANSIENT_DB','PROVIDER_TIMEOUT','ROUTE_WORKER_TIMEOUT','NETWORK']);
export function recoveryPlan({operation,failure_code,idempotency_key,persisted_state}={}){
 if(!operation||!failure_code||!idempotency_key) throw new Error('Recovery context required');
 const retryable=RETRYABLE.has(failure_code);
 return {operation,failure_code,idempotency_key,retryable,resume_from:persisted_state||null,rollback_client_state:true,grant_entitlement:false,release_golden_path:false,delete_evidence:false,requires_audit_event:true};
}
export function paymentRecovery({payment_state,provider_verified=false,fulfillment_persisted=false}={}){
 if(payment_state==='COMPLETED'&&provider_verified&&fulfillment_persisted) return {action:'RETURN_COMPLETED',grant_entitlement:true};
 if(payment_state==='PAYMENT_VERIFIED'&&provider_verified) return {action:'RESUME_FULFILLMENT',grant_entitlement:false};
 return {action:'FAIL_CLOSED_OR_REVERIFY',grant_entitlement:false};
}
export function routeRecovery({evidence_persisted=false,route_run_persisted=false,route_status=null}={}){
 if(route_run_persisted&&['RELEASED','REVIEW_REQUIRED','DRAFT'].includes(route_status)) return {action:'RETURN_OR_RESUME_EXISTING_ROUTE',create_duplicate:false};
 if(evidence_persisted) return {action:'REBUILD_ROUTE_FROM_PERSISTED_EVIDENCE',create_duplicate:false};
 return {action:'RETRY_TRANSACTION_FROM_FROZEN_SNAPSHOT',create_duplicate:false};
}
export function goldenPathRecovery({route_status,review_accepted=false,synthesis_persisted=false}={}){
 if(synthesis_persisted) return {action:'RETURN_EXISTING_SYNTHESIS',release:false};
 if(route_status==='RELEASED'&&review_accepted) return {action:'REBUILD_SYNTHESIS_DETERMINISTICALLY',release:false};
 return {action:'BLOCK_AND_REQUIRE_VERIFIED_ROUTE_REVIEW',release:false};
}
