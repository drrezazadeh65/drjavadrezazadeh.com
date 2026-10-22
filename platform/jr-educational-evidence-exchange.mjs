/**
 * JR educational evidence interchange — source-only, versioned, fail closed.
 *
 * Purpose: self-authored descriptive research evidence may move between
 * educational components ONLY with explicit consent; "reviewed"/"validated"
 * statuses need cryptographically attested OFFLINE scientific approval.
 * No identity claims, ability scores, admission odds, diagnosis or purchases.
 *
 * Attestation keys MUST come from separately controlled server secrets.
 * Browser inputs, request JSON or service-provider claims cannot supply keys.
 */
import {createHmac,timingSafeEqual} from 'node:crypto';
export const JR_EDUCATIONAL_EXCHANGE_VERSION='2.0.0';
export const JR_EDUCATIONAL_ENGINES=Object.freeze([
  'golden-talent','rcas','bahar','golden-path',
  'admission-intelligence','choice-studio'
]);
const SOURCES=new Set(JR_EDUCATIONAL_ENGINES);
const STATUSES=new Set(['research','reviewed','validated']);
const LEVELS=new Set(['descriptive','decision-support']);
const MAX_EVIDENCE=40;
const text=(v,limit=240)=>typeof v==='string'?v.trim().slice(0,limit):'';
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const safeId=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(v);
const isDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
  Number.isFinite(Date.parse(s+'T00:00:00Z'))&&
  new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
const freezeDeep=v=>{
  if(Array.isArray(v)){v.forEach(freezeDeep);return Object.freeze(v);}
  if(plain(v)){Object.values(v).forEach(freezeDeep);return Object.freeze(v);}
  return v;
};
function checkMac(key,payload,signature){
  if(!Buffer.isBuffer(key)||key.length<32||
    typeof signature!=='string'||!/^[a-f0-9]{64}$/.test(signature))return false;
  const digest=createHmac('sha256',key).update(payload,'utf8').digest();
  return timingSafeEqual(digest,Buffer.from(signature,'hex'));
}
/**
 * No cryptographically authorised reviewers are configured in source.
 * A future server can inject its verified, secret-managed review context.
 * Status upgrade requires a human review ticket and optionally a separate
 * scientific board cosignature, bound to the EXACT evidence payload.
 */
function hasScientificReview(envelope,reviewContext){
  if(envelope.status==='research')return true;
  const approval=reviewContext?.scientificApproval;
  if(!plain(approval)||!safeId(approval.reviewerId)||
    !safeId(approval.reviewReference)||!isDay(approval.reviewDate)||
    approval.decision!=='APPROVED'||
    approval.status!==envelope.status)return false;
  const payload=JSON.stringify([
    'jr.evidence-science-v2',envelope.engine,envelope.version,
    envelope.purpose,envelope.status,envelope.evidence,
    approval.reviewerId,approval.reviewReference,approval.reviewDate,
    approval.boardId||null,approval.validationReference||null
  ]);
  if(!checkMac(reviewContext.reviewerKey,payload,approval.reviewerSignature))
    return false;
  if(envelope.status==='validated')return (
    safeId(approval.boardId)&&approval.boardId!==approval.reviewerId&&
    safeId(approval.validationReference)&&
    checkMac(reviewContext.boardKey,payload,approval.boardSignature)
  )===true;
  return true;
}
/**
 * @param raw metadata only, supplied after independent account-scoped
 * permission checks. Not a generic parser for arbitrary learner files.
 * @param trustedServerContext NEVER taken from HTTP request data.
 */
export function normalizeEducationalEvidence(raw,trustedServerContext=null){
  const errors=[];
  if(!plain(raw))return {ok:false,errors:['Evidence must be an object']};
  const engine=text(raw.engine,60);
  if(!SOURCES.has(engine))errors.push('Unknown engine');
  const status=text(raw.status,20);
  if(!STATUSES.has(status))errors.push('Invalid scientific status');
  const purpose=text(raw.purpose,50);
  if(!LEVELS.has(purpose))errors.push('Unsupported purpose');
  const version=text(raw.version,40);
  if(!/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(version))
    errors.push('Invalid version');
  if(raw.consent!==true)errors.push('Explicit consent required');
  if(raw.approvedForExchange!==true)errors.push('No exchange authorisation');
  // Zero-item transfers must not masquerade as meaningful RCAS/BAHAR
  // evidence. An empty personal note is not a reviewed finding.
  if(!Array.isArray(raw.evidence)||raw.evidence.length<1||
     raw.evidence.length>MAX_EVIDENCE)
    errors.push('Evidence list must contain 1 to '+MAX_EVIDENCE+' items');
  const evidence=[];
  // The same source/title/limitation repeated in slightly different
  // Unicode/casing is ONE observation, not multiple independent reasons
  // for an aptitude claim, pathway proposal or professional inference.
  const seenEvidence=new Set();
  const evidenceKey=v=>v.normalize('NFKC').replace(/\s+/gu,' ').toLocaleLowerCase('en-US');
  if(Array.isArray(raw.evidence)&&raw.evidence.length<=MAX_EVIDENCE){
    for(const item of raw.evidence){
      if(!plain(item)){errors.push('Invalid evidence item');continue;}
      if(!['title','source','limitation'].every(key=>Object.hasOwn(item,key))){
        errors.push('Missing evidence provenance or limitation');continue;
      }
      if(['title','source','limitation'].some(key=>typeof item[key]!=='string'||
        item[key].length>500)){
        errors.push('Invalid or oversized evidence text');continue;
      }
      const title=text(item.title,180);
      const source=text(item.source,240);
      const limitation=text(item.limitation,300);
      if(!title||!source||!limitation){
        errors.push('Evidence requires title, source and limitation');continue;
      }
      const identity=JSON.stringify([
        evidenceKey(title),evidenceKey(source),evidenceKey(limitation)
      ]);
      if(seenEvidence.has(identity)){
        errors.push('Duplicate source evidence is not independent evidence');
        continue;
      }
      seenEvidence.add(identity);
      evidence.push({title,source,limitation});
    }
  }
  if(errors.length)return {ok:false,errors};
  const envelope={schema:'jr.educational-evidence.v2',engine,status,
    purpose,version,approvedForExchange:true,consent:true,evidence};
  if(!hasScientificReview(envelope,trustedServerContext))
    return {ok:false,errors:['Independent attested scientific review required']};
  return {ok:true,value:freezeDeep({
    ...envelope,trust:status==='research'
      ?'SELF_DECLARED_RESEARCH_EVIDENCE'
      :'CRYPTOGRAPHICALLY_ATTESTED_SCIENTIFIC_REVIEW',
    predictsAdmission:false,diagnosticInterpretation:null
  })};
}
/** Choice Studio cannot author its own supporting scientific certification. */
export function prepareChoiceStudioEvidence(raw,trustedServerContext=null){
  const normalized=normalizeEducationalEvidence(raw,trustedServerContext);
  if(!normalized.ok)return normalized;
  const v=normalized.value;
  if(v.engine==='choice-studio')
    return {ok:false,errors:['Studio cannot self-certify evidence']};
  return {ok:true,value:freezeDeep({
    schema:'jr.choice-studio-context.v2',origin:v.engine,version:v.version,
    status:v.status,scope:v.purpose,trust:v.trust,
    disclaimer:v.status==='research'
      ?'Research-stage evidence; no validated aptitude, diagnosis or admission prediction.'
      :'Source-reviewed descriptive evidence only; admission eligibility requires current official rules.',
    predictsAdmission:false,evidence:v.evidence
  })};
}
