/** Private document lifecycle policy; pure transitions, no DB side effects. */
const TRANSITIONS=Object.freeze({
 pending:new Set(["issued","failed"]),
 failed:new Set(["pending"]),
 issued:new Set(["revoked","superseded"]),
 revoked:new Set(),
 superseded:new Set()
});
const valid=new Set(Object.keys(TRANSITIONS));
export function evaluateDocumentTransition(input){
 const reasons=[];
 if(!input||typeof input!=="object"||Array.isArray(input))return {allowed:false,reasons:["INVALID_REQUEST"]};
 const {from,to,actor,source_verified,storage_verified,audit_ready}=input;
 if(!valid.has(from)||!valid.has(to)||!TRANSITIONS[from]?.has(to))reasons.push("INVALID_TRANSITION");
 if(!actor||actor.authenticated!==true||actor.can_manage_documents!==true)reasons.push("UNAUTHORIZED_ACTOR");
 if(audit_ready!==true)reasons.push("AUDIT_REQUIRED");
 if(to==="issued"&&(source_verified!==true||storage_verified!==true))reasons.push("ISSUANCE_EVIDENCE_MISSING");
 if(to==="superseded"&&!(typeof input.replacement_document_id==="string"&&input.replacement_document_id.trim()))reasons.push("REPLACEMENT_REQUIRED");
 if(to==="revoked"&&!(typeof input.revocation_reason==="string"&&input.revocation_reason.trim()))reasons.push("REVOCATION_REASON_REQUIRED");
 return {allowed:reasons.length===0,reasons};
}
