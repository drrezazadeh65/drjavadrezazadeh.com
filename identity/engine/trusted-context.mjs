/** Server-side adapter contract validation only. Does not trust browser-supplied proofs. */
const isObj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const text=x=>typeof x==="string"&&x.trim().length>0;
export function validateTrustedIssuanceContext(ctx){
 const errors=[];
 if(!isObj(ctx))return {ok:false,errors:["INVALID_CONTEXT"]};
 if(ctx.origin!=="bertina-server")errors.push("UNTRUSTED_ORIGIN");
 if(!isObj(ctx.session)||ctx.session.server_authenticated!==true||!text(ctx.session.account_id))errors.push("UNVERIFIED_SESSION");
 if(!isObj(ctx.authorization)||ctx.authorization.server_checked!==true||ctx.authorization.allowed!==true)errors.push("UNVERIFIED_AUTHORIZATION");
 if(!isObj(ctx.source)||ctx.source.loaded_from_canonical_db!==true||!text(ctx.source.id)||!text(ctx.source.type))errors.push("UNVERIFIED_CANONICAL_SOURCE");
 if(!isObj(ctx.transaction)||ctx.transaction.atomic===true&&ctx.transaction.unique_constraint_verified!==true||ctx.transaction?.atomic!==true)errors.push("NO_ATOMIC_TRANSACTION");
 if(!isObj(ctx.audit)||ctx.audit.persisted!==true)errors.push("AUDIT_NOT_PERSISTED");
 if(!isObj(ctx.storage)||ctx.storage.private===true&&ctx.storage.webroot_excluded!==true||ctx.storage?.private!==true)errors.push("STORAGE_NOT_PRIVATE");
 return {ok:errors.length===0,errors};
}
