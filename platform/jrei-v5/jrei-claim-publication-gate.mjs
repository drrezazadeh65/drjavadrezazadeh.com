/**
 * JREI V5.1 — fail-closed claim-level review of LOCAL MODEL DRAFTS.
 *
 * Pure source module. A caller-supplied document/metadata is NOT automatically
 * trusted: the backend must obtain these from its authenticated approved-source
 * registry, not from a visitor, a model or an arbitrary retrieval result.
 *
 * The gate proves only bounded EXTRACTIVE support when the literal claim
 * occurs in the cited, still-approved passage. This is not an NLI/semantic
 * proof, scientific certification, admissions decision or automatic publish.
 */
import {createHash} from 'node:crypto';

const HASH=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9._:-]{1,80}$/;
const MAX_EVIDENCE=24, MAX_CLAIMS=18;
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x,k);
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&
  Object.getPrototypeOf(x)===Object.prototype;
const safeText=(x,n)=>typeof x==='string'&&x.trim().length>0&&
  x.length<=n&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x);
const norm=s=>s.normalize('NFKC').replace(/\u200c/g,' ')
  .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g,'')
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک')
  .replace(/\s+/g,' ').trim();
const fail=(code,extra={})=>Object.freeze({
  schema:'jr.jrei.claim-publication-gate.v1',
  state:'BLOCKED',canPublish:false,verified:false,
  modelTrained:false,code, ...extra
});
const sha=t=>createHash('sha256').update(t).digest('hex');
const containsPrivacySignals=t=>
  /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?<!\d)(?:\+98|0098|0)9\d{9}(?!\d)|(?<!\d)\d{16}(?!\d)/i.test(t);
const extractNumbers=t=>Array.from(norm(t).matchAll(
  /(?:[0-9۰-۹٠-٩]+(?:[.,٬٫][0-9۰-۹٠-٩]+)*)/g),x=>x[0]);
const normalNumber=t=>t
  .replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-0x06f0))
  .replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-0x0660))
  .replace(/[٬٫]/g,x=>x==='٬'?',':'.');
const tokens=t=>norm(t).toLowerCase().split(/[^\p{L}\p{N}]+/u)
  .filter(Boolean);

/** Strict item projection after original server-side authenticated retrieval. */
function approvedEvidence(items, expectedAuthority) {
  if(!Array.isArray(items)||items.length<1||items.length>MAX_EVIDENCE)
    return null;
  const map=new Map();
  for(const item of items) {
    if(!plain(item)||!ID.test(item.id??'')||map.has(item.id)||
      !safeText(item.excerpt,8000)||containsPrivacySignals(item.excerpt)||
      !plain(item.provenance))
      return null;
    const p=item.provenance;
    if(!ID.test(p.sourceId??'')||!HASH.test(p.contentSha256??'')||
       !safeText(p.canonicalUrl,700)||
       p.reviewStatus!=='APPROVED'||
       p.publicationPermission!=='ALLOWED'||
       p.superseded!==false||
       p.revoked!==false||
       p.scientificIndependenceReviewed!==true||
       p.authoritativeRegistryRead!==true||
       (expectedAuthority!==null&&p.sourceId!==expectedAuthority))
      return null;
    let u;
    try{u=new URL(p.canonicalUrl);}catch{return null;}
    if(u.protocol!=='https:'||u.username||u.password||u.hash||
       !u.hostname.includes('.'))return null;
    map.set(item.id,{excerpt:norm(item.excerpt),
      sourceId:p.sourceId,contentSha256:p.contentSha256,
      sourceUrl:u.toString()});
  }
  return map;
}
function parseStructuredDraft(raw) {
  if(typeof raw!=='string'||raw.length>17000)return null;
  let parsed;
  try{parsed=JSON.parse(raw);}catch{return null;}
  if(!plain(parsed)||Object.keys(parsed).sort().join(',')!==
    'claims,locale,version'||parsed.version!=='jrei-claims-v1'||
    !['fa','en'].includes(parsed.locale)||
    !Array.isArray(parsed.claims)||parsed.claims.length<1||
    parsed.claims.length>MAX_CLAIMS)return null;
  for(const claim of parsed.claims){
    if(!plain(claim)||Object.keys(claim).sort().join(',')!==
       'evidenceIds,text'||!safeText(claim.text,600)||
       containsPrivacySignals(claim.text)||
       !Array.isArray(claim.evidenceIds)||
       claim.evidenceIds.length<1||claim.evidenceIds.length>4||
       claim.evidenceIds.some(x=>!ID.test(x)))return null;
  }
  return parsed;
}
/**
 * Rejects paraphrases (unproven semantic equivalence) and only accepts exact
 * normalized continuous evidence spans. An independently reviewed moderator
 * may later approve any additional style edits, but NOT this automatic gate.
 */
export function reviewModelDraft({
  draft,reviewedEvidence,serverAuthority=null,
  requestPurpose='PUBLIC_EDUCATIONAL_EXPLANATION',
  serverRetrieved=false,highConsequence=false
}={}) {
  if(serverRetrieved!==true)return fail('TRUSTED_SERVER_RETRIEVAL_REQUIRED');
  if(requestPurpose!=='PUBLIC_EDUCATIONAL_EXPLANATION'||
     highConsequence===true)
    return fail('HUMAN_REVIEW_FOR_CONSEQUENTIAL_CLAIMS');
  const docs=approvedEvidence(reviewedEvidence,serverAuthority);
  if(!docs)return fail('APPROVED_EVIDENCE_NOT_ESTABLISHED');
  const result=parseStructuredDraft(draft);
  if(!result)return fail('STRUCTURED_MODEL_DRAFT_INVALID');
  const findings=[];
  for(let i=0;i<result.claims.length;i++){
    const claim=result.claims[i],body=norm(claim.text);
    const codes=[];
    if(body.length<20)codes.push('CLAIM_CONTEXT_INSUFFICIENT');
    if(/https?:\/\/|www\./i.test(body))codes.push('LINK_IN_DRAFT_NOT_AUTHORIZED');
    const refs=[...new Set(claim.evidenceIds)];
    if(refs.length!==claim.evidenceIds.length)
      codes.push('DUPLICATED_CITATION');
    const cited=refs.map(id=>docs.get(id));
    if(cited.some(x=>!x))codes.push('UNRECOGNIZED_EVIDENCE_CITATION');
    if(codes.length===0&&!cited.some(x=>x.excerpt.includes(body)))
      codes.push('LITERAL_CLAIM_NOT_SUPPORTED_BY_CITED_SOURCE');
    // Citation-specific numeral check; matching numbers in UNcited documents
    // never confer authority on an individual educational programme code.
    for(const number of extractNumbers(body)){
      if(!cited.some(x=>x&&extractNumbers(x.excerpt).some(y=>
        normalNumber(y)===normalNumber(number)))) {
        codes.push('NUMERIC_CLAIM_NOT_IN_CITED_SOURCE');break;
      }
    }
    findings.push(Object.freeze({
      claimIndex:i,claimDigest:sha(body),
      citationIds:refs,accepted:codes.length===0,
      failureCodes:Object.freeze([...new Set(codes)])
    }));
  }
  const rejected=findings.filter(f=>!f.accepted).length;
  if(rejected)return fail('CLAIM_LEVEL_CITATION_REVIEW_FAILED',{
    claimCount:findings.length,rejectedCount:rejected,
    findings:Object.freeze(findings)
  });
  // This status deliberately does not claim semantic, legal, scientific or
  // operational acceptance. A trusted human/policy layer must authorize final
  // display; the public assistant stays static fallback until live acceptance.
  return Object.freeze({
    schema:'jr.jrei.claim-publication-gate.v1',
    state:'ELIGIBLE_FOR_SEPARATE_OWNER_REVIEW',
    canPublish:false,verified:false,modelTrained:false,
    claimCount:findings.length,rejectedCount:0,
    locale:result.locale,findings:Object.freeze(findings),
    policyBoundary:'NO_AUTOMATIC_PUBLICATION'
  });
}
