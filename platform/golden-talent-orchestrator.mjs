// Golden Talent server orchestration state machine.
const transitions={
 IN_PROGRESS:new Set(['SUBMITTED','CANCELLED']),
 SUBMITTED:new Set(['ROUTING','CANCELLED']),
 ROUTING:new Set(['REVIEW_REQUIRED','COMPLETE']),
 REVIEW_REQUIRED:new Set(['ROUTING','COMPLETE','CANCELLED']),
 COMPLETE:new Set([]),CANCELLED:new Set([])
};
export function transitionSession(current,next){
 if(!transitions[current]?.has(next)) throw new Error('Invalid session transition: '+current+' -> '+next);
 return next;
}
export function submissionKey({session_id,instrument_version,response_revision}={}){
 if(!session_id||!instrument_version||!Number.isInteger(response_revision)||response_revision<1) throw new Error('Versioned submission identity required');
 return [session_id,instrument_version,response_revision].join(':');
}
export function planSubmission({session,idempotency_key,instrument_version,response_revision}={}){
 if(session?.status!=='IN_PROGRESS') throw new Error('Only IN_PROGRESS session can be submitted');
 const expected=submissionKey({session_id:session.id,instrument_version,response_revision});
 if(idempotency_key!==expected) throw new Error('Idempotency key mismatch');
 return {session_id:session.id,from:'IN_PROGRESS',to:'SUBMITTED',idempotency_key:expected,transaction_steps:['lock_session','verify_subject_and_version','freeze_response_snapshot','insert_evidence_once','create_route_run_once','mark_submitted'],client_authoritative:false};
}
export function routeRunVersion({profile_id,trigger_session_id,engine_version,evidence_revision}={}){
 if(!profile_id||!engine_version||!Number.isInteger(evidence_revision)||evidence_revision<1) throw new Error('Versioned route identity required');
 return [profile_id,trigger_session_id||'manual',engine_version,evidence_revision].join(':');
}
export function supersedeRouteRun(previous,newRun){
 if(!previous?.id||!newRun?.id||previous.id===newRun.id) throw new Error('Distinct route versions required');
 return {previous:{...previous,status:'SUPERSEDED'},current:{...newRun,status:newRun.status||'DRAFT'},history_preserved:true};
}
