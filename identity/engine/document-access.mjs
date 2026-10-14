/** Authorization decision for private document retrieval. Pure policy, no storage access. */
const record=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const text=x=>typeof x==="string"&&x.trim().length>0;
export function evaluateDocumentAccess(input){
 const reasons=[];
 if(!record(input))return {allowed:false,reasons:["INVALID_REQUEST"]};
 const {actor,document,delegation}=input;
 if(!record(actor)||actor.authenticated!==true||!text(actor.account_id))reasons.push("UNAUTHENTICATED");
 if(!record(document)||!text(document.id)||!text(document.owner_account_id))reasons.push("INVALID_DOCUMENT");
 if(record(document)&&document.status!=="issued")reasons.push("DOCUMENT_NOT_ACTIVE");
 if(record(document)&&document.revoked===true)reasons.push("DOCUMENT_REVOKED");
 if(record(document)&&document.private_storage_verified!==true)reasons.push("UNVERIFIED_STORAGE");
 const owner=record(actor)&&record(document)&&actor.account_id===document.owner_account_id;
 const delegate=record(delegation)&&delegation.server_verified===true&&delegation.active===true&&delegation.document_id===document?.id&&delegation.delegate_account_id===actor?.account_id&&delegation.scope==="read";
 if(!owner&&!delegate)reasons.push("NOT_AUTHORIZED");
 return {allowed:reasons.length===0,reasons};
}
export const PRIVATE_DOCUMENT_HEADERS=Object.freeze({
 "Cache-Control":"private, no-store, max-age=0",
 "Pragma":"no-cache",
 "X-Content-Type-Options":"nosniff",
 "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'; sandbox",
 "Referrer-Policy":"no-referrer",
 "X-Robots-Tag":"noindex, nofollow, noarchive"
});
