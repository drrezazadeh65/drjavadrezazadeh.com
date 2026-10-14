/** Deterministic idempotency key for an authorized issuance request.
 * Must be used with a UNIQUE database constraint and an atomic transaction.
 * A key alone does not guarantee deduplication or authorize issuance.
 */
const allowed=/^[a-zA-Z0-9_.:-]+$/;
function field(value,name,max=160){
 if(typeof value!=="string"||value.length===0||value.length>max||!allowed.test(value))throw new TypeError("Invalid "+name);
 return value;
}
export function issuanceIdempotencyKey({source_type,source_id,document_type,template_version}={}){
 const parts=[
  field(source_type,"source_type",60),
  field(source_id,"source_id"),
  field(document_type,"document_type",60),
  field(template_version,"template_version",60)
 ];
 // Length prefixes make distinct tuples unambiguous without relying on a separator.
 return "jr-doc-v1:"+parts.map(s=>s.length+":"+s).join("|");
}
