// Golden Talent integrated evidence router — v1.1.0, PREVALIDATION.
// The existing routeEvidence/classifyDomain APIs remain the sole engine entry points.
// RCAS observations and BAHAR longitudinal records use the SAME evidence vocabulary;
// each system retains its own domain, instrument and human-review semantics.
// Immutable results are evidence-workflow decisions, NEVER psychometric measurements.
// Node-side scientific prevalidation ONLY: not an active Bertina PHP endpoint.
import {createHash} from 'node:crypto';

export const ENGINE_VERSION='1.1.0';
export const SCHEMA_VERSION='2';
export const DOMAINS=Object.freeze(['D1','D2','D3','D4','D5','D6']);
export const EVIDENCE_STATES=Object.freeze({
 INSUFFICIENT:'INSUFFICIENT',SINGLE_SOURCE:'SINGLE_SOURCE',
 CONVERGENT:'CONVERGENT',DISCREPANT:'DISCREPANT'
});
export const QUALITY_STATES=Object.freeze(['UNREVIEWED','USABLE','CONFLICTING','LIMITED','WITHDRAWN']);
export const SCIENTIFIC_STATUS='PREVALIDATION';

const sources=new Set(['STUDENT_SELF','PARENT','TEACHER','ACADEMIC_RECORD','ASSESSMENT',
 'CONTEXT','CONSULTANT','PERFORMANCE_SAMPLE']);
const quality=new Set(QUALITY_STATES);
const routable=new Set(['USABLE','CONFLICTING']);
const directions=new Set(['SUPPORTS','CONTRADICTS']);
const rank={DISCREPANT:0,SINGLE_SOURCE:1,INSUFFICIENT:2,CONVERGENT:3};
const compare=(a,b)=>a<b?-1:a>b?1:0;
const unique=values=>[...new Set(values)].sort(compare);
const recordId=s=>typeof s==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(s)?s:null;
const normalizedSource=s=>typeof s==='string'?s.trim().replace(/\s+/g,' ').toUpperCase():null;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);

export class EngineInvariantError extends Error{
 constructor(message){super(message);this.name='EngineInvariantError';}
}
export class EvidenceInputError extends TypeError{
 constructor(message){super(message);this.name='EvidenceInputError';}
}
export function sha256Hex(text){
 if(typeof text!=='string')throw new EvidenceInputError('SHA-256 input must be a string');
 return createHash('sha256').update(text,'utf8').digest('hex');
}
/** Canonical UTF-8 JSON with NFC keys/strings, sorted keys, bounded depth,
 * and explicit rejection of cyclic, accessor, exotic or unsupported values.
 * NFC is a deliberate equivalence policy; normalized key COLLISIONS are errors.
 * This is not a parser for untrusted non-JSON JavaScript class instances.
 */
export function canonicalize(value){
 const active=new Set();
 function encode(v,depth){
  if(depth>20)throw new EvidenceInputError('Maximum evidence depth exceeded');
  if(v===null)return 'null';
  if(typeof v==='string'){
   if(v.length>8192)throw new EvidenceInputError('Evidence string too long');
   return JSON.stringify(v.normalize('NFC'));
  }
  if(typeof v==='boolean')return v?'true':'false';
  if(typeof v==='number'){
   if(!Number.isFinite(v)||Object.is(v,-0))throw new EvidenceInputError('Unsupported evidence number');
   return JSON.stringify(v);
  }
  if(typeof v!=='object')throw new EvidenceInputError('Unsupported evidence value type');
  if(active.has(v))throw new EvidenceInputError('Circular evidence value');
  const array=Array.isArray(v);
  if((array&&Object.getPrototypeOf(v)!==Array.prototype)||
     (!array&&Object.getPrototypeOf(v)!==Object.prototype&&Object.getPrototypeOf(v)!==null))
   throw new EvidenceInputError('Unsupported evidence prototype');
  active.add(v);
  try{
   if(array){
    if(v.length>512)throw new EvidenceInputError('Evidence array too long');
    const keys=Reflect.ownKeys(v);
    if(keys.some(k=>typeof k!=='string'||(k!=='length'&&
      (!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=v.length))))
      throw new EvidenceInputError('Unexpected evidence array property');
    const rows=[];
    for(let i=0;i<v.length;i++){
     const desc=Object.getOwnPropertyDescriptor(v,String(i));
     if(!desc||!Object.hasOwn(desc,'value'))throw new EvidenceInputError('Sparse/accessor evidence array');
     rows.push(encode(desc.value,depth+1));
    }
    return '['+rows.join(',')+']';
   }
   const keys=Reflect.ownKeys(v);
   if(keys.length>128)throw new EvidenceInputError('Evidence object has too many keys');
   const normalized=new Set(),pairs=[];
   for(const key of keys){
    if(typeof key!=='string')throw new EvidenceInputError('Symbol evidence property');
    const norm=key.normalize('NFC');
    if(norm.length>256||normalized.has(norm))throw new EvidenceInputError('Colliding evidence property names');
    normalized.add(norm);
    const desc=Object.getOwnPropertyDescriptor(v,key);
    if(!desc||!Object.hasOwn(desc,'value'))throw new EvidenceInputError('Accessor evidence property');
    pairs.push([norm,encode(desc.value,depth+1)]);
   }
   return '{'+pairs.sort((a,b)=>compare(a[0],b[0]))
    .map(([key,serialized])=>JSON.stringify(key)+':'+serialized).join(',')+'}';
  }finally{active.delete(v);}
 }
 const serialized=encode(value,0);
 if(Buffer.byteLength(serialized,'utf8')>32768)throw new EvidenceInputError('Evidence event exceeds 32 KiB');
 return serialized;
}
const freezeDeep=value=>{
 if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const key of Object.keys(value))freezeDeep(value[key]);
  Object.freeze(value);
 }
 return value;
};
function inspect(raw){
 const serialized=canonicalize(raw);
 const event_ref=sha256Hex(serialized).slice(0,24);
 if(!plain(raw))return {raw,serialized,event_ref,id:null,domain:null,reasons:['NOT_AN_OBJECT']};
 const reasons=[];
 const id=recordId(raw.id);
 // Original RCAS/RCAS-O1 bridges create UNREVIEWED items without persisted IDs.
 // Retain them as contextual/pending rather than silently discarding them.
 if(!id&&raw.quality_state!=='UNREVIEWED'&&raw.quality_state!=='WITHDRAWN')
  reasons.push('MISSING_OR_INVALID_ID');
 let domain=null;
 if(DOMAINS.includes(raw.domain_code))domain=raw.domain_code;
 else if(raw.domain_code!=null)reasons.push('UNKNOWN_DOMAIN');
 if(!quality.has(raw.quality_state))reasons.push('UNKNOWN_QUALITY_STATE');
 return {raw,serialized,event_ref,id,domain,reasons};
}
function classifyEvent(r){
 const e=r.raw;
 if(e.quality_state==='WITHDRAWN')return {kind:'WITHDRAWN',reasons:['WITHDRAWN']};
 const reasons=[];
 if(e.quality_state==='UNREVIEWED')reasons.push('PENDING_PROFESSIONAL_REVIEW');
 if(e.quality_state==='LIMITED')reasons.push('LIMITED_EVIDENCE_PRESENT');
 if(!r.domain)reasons.push('NO_DOMAIN_MAPPING');
 const source=normalizedSource(e.source_type);
 if(!sources.has(source))reasons.push('SOURCE_TYPE_UNVERIFIED');
 const provenance=plain(e.provenance)?e.provenance:{};
 if(!recordId(provenance.review_id)||e.review_projection?.active!==true)
  reasons.push('NO_ACTIVE_REVIEW_PROJECTION');
 const direction=provenance.direction;
 if(!directions.has(direction))
  reasons.push(direction==='CONTEXTUALISES'?'CONTEXTUAL_DIRECTION':'DIRECTION_NOT_ROUTABLE');
 if(!routable.has(e.quality_state))reasons.push('QUALITY_NOT_ROUTABLE');
 if(reasons.length)return {kind:'CONTEXTUAL',reasons:unique(reasons)};
 // Source_type is a descriptive category, NOT independent evidence by itself.
 // Verified source provenance must come from a trusted professional workflow.
 const group=recordId(provenance.independence_group_id);
 const respondent=recordId(provenance.respondent_reference_id);
 const origin=recordId(e.source_reference_id);
 const observation=recordId(provenance.observation_reference_id);
 const instrumentGroup=recordId(provenance.instrument_dependency_group_id);
 const derivative=recordId(provenance.derivative_of_event_id);
 const independent=provenance.independence_verified===true&&Boolean(group&&respondent&&origin)&&
  !derivative&&!instrumentGroup;
 return {kind:'ROUTING',source,direction,group,respondent,origin,observation,
  instrumentGroup,derivative,independent};
}
function buildRoute(domain,items,rejected){
 const routing=items.filter(x=>x.disp.kind==='ROUTING');
 const contextual=items.filter(x=>x.disp.kind==='CONTEXTUAL');
 const withdrawn=items.filter(x=>x.disp.kind==='WITHDRAWN');
 const sourceTypes=unique(routing.map(x=>x.disp.source));
 const supporting=unique(routing.filter(x=>x.disp.direction==='SUPPORTS').map(x=>x.disp.source));
 const contradicting=unique(routing.filter(x=>x.disp.direction==='CONTRADICTS').map(x=>x.disp.source));
 const opposite=supporting.length>0&&contradicting.length>0;
 const conflict=routing.some(x=>x.raw.quality_state==='CONFLICTING');
 const sameClass=supporting.some(x=>contradicting.includes(x));
 // Union all potentially dependent evidence. Different source classes do NOT
 // establish independence if respondents, instruments or observations overlap.
 const parent=routing.map((_,i)=>i);
 const root=i=>{while(parent[i]!==i)i=parent[i];return i;};
 const merge=(i,j)=>{const a=root(i),b=root(j);if(a!==b)parent[Math.max(a,b)]=Math.min(a,b);};
 for(let i=0;i<routing.length;i++)for(let j=0;j<i;j++){
  const a=routing[i],b=routing[j],p=a.disp,q=b.disp;
  if((p.group&&p.group===q.group)||(p.respondent&&p.respondent===q.respondent)||
    (p.origin&&p.origin===q.origin)||(p.observation&&p.observation===q.observation)||
    (p.instrumentGroup&&p.instrumentGroup===q.instrumentGroup)||
    p.derivative===b.id||q.derivative===a.id)merge(i,j);
 }
 const clusters=new Map();
 for(let i=0;i<routing.length;i++){
  const key=root(i);
  if(!clusters.has(key))clusters.set(key,[]);
  clusters.get(key).push(routing[i]);
 }
 const verifiedClusters=[...clusters.values()].filter(c=>c.every(x=>x.disp.independent));
 const allVerified=routing.every(x=>x.disp.independent);
 const independentSourceCount=verifiedClusters.length;
 // Convergence needs at least 2 distinct approved source CLASSES, 2 genuinely
 // independent provenance clusters, AND a consistent reviewed direction.
 const convergence=routing.length>=2&&sourceTypes.length>=2&&allVerified&&
   independentSourceCount>=2&&!opposite&&!conflict;
 let state='INSUFFICIENT';
 if(routing.length>0)state='SINGLE_SOURCE';
 if(convergence)state='CONVERGENT';
 if(opposite||conflict)state='DISCREPANT';
 const rationale=[state];
 if(opposite)rationale.push('OPPOSING_DIRECTIONS');
 if(sameClass)rationale.push('INTRA_SOURCE_CONTRADICTION');
 if(opposite&&!sameClass)rationale.push('CROSS_SOURCE_CONTRADICTION');
 if(conflict)rationale.push('EXPLICIT_CONFLICT_FLAG');
 if(routing.length&&!allVerified)rationale.push('INDEPENDENCE_NOT_VERIFIED');
 if(routing.length&&sourceTypes.length>=2&&independentSourceCount<2)
  rationale.push('INDEPENDENT_SOURCES_INSUFFICIENT');
 if(items.some(x=>x.raw.quality_state==='LIMITED'))rationale.push('LIMITED_EVIDENCE_PRESENT');
 if(contextual.some(x=>x.raw.quality_state==='UNREVIEWED'))rationale.push('PENDING_REVIEW_PRESENT');
 if(rejected.length)rationale.push('MALFORMED_EVENT_PRESENT');
 const sorted=(a,b)=>compare(a.event_ref,b.event_ref)||compare(a.id||'',b.id||'');
 const reviewRequired=state==='DISCREPANT'||!allVerified&&routing.length>0||
  contextual.length>0||rejected.length>0;
 return {
  route_code:domain,evidence_state:state,agreement_direction:convergence?
   (supporting.length?'SUPPORTS':'CONTRADICTS'):null,
  source_count:sourceTypes.length,independent_source_count:independentSourceCount,
  source_types:sourceTypes,supporting_source_types:supporting,contradicting_source_types:contradicting,
  usable_event_count:routing.length,contextual_event_count:contextual.length,
  withdrawn_event_count:withdrawn.length,rejected_event_count:rejected.length,
  evidence_event_ids:routing.map(x=>x.id).sort(compare),
  contextual_events:contextual.map(x=>({id:x.id,event_ref:x.event_ref,reasons:x.disp.reasons})).sort(sorted),
  withdrawn_events:withdrawn.map(x=>({id:x.id,event_ref:x.event_ref})).sort(sorted),
  requires_more_evidence:state!=='CONVERGENT',human_review_required:Boolean(reviewRequired),
  rationale_codes:unique(rationale)
 };
}
/** Same public API as the 0.2 engine; all entries accounted for exactly once.
 * No I/O, mutation, clock, random values, hidden scoring or normative labels.
 */
export function routeEvidence(events=[]){
 if(!Array.isArray(events)||events.length>500)
  throw new EvidenceInputError('Expected 0–500 evidence events');
 const records=events.map(inspect);
 if(records.reduce((sum,x)=>sum+Buffer.byteLength(x.serialized,'utf8'),0)>4194304)
  throw new EvidenceInputError('Evidence batch exceeds 4 MiB');
 const ids=new Map();
 for(const r of records)if(r.id)ids.set(r.id,(ids.get(r.id)||0)+1);
 for(const r of records)if(r.id&&ids.get(r.id)>1)r.reasons.push('DUPLICATE_ID');
 const rejected=[],domainMap=new Map(DOMAINS.map(d=>[d,[]]));
 const outOfDomain=[];
 for(const r of records){
  if(r.reasons.length){
   rejected.push({event_ref:r.event_ref,id:r.id,domain_code:r.domain,reasons:unique(r.reasons)});
   continue;
  }
  const record={...r,disp:classifyEvent(r)};
  if(r.domain)domainMap.get(r.domain).push(record);
  else outOfDomain.push(record);
 }
 const sorted=(a,b)=>compare(a.event_ref,b.event_ref)||compare(a.id||'',b.id||'');
 rejected.sort(sorted);
 const routes=DOMAINS.map(d=>buildRoute(d,domainMap.get(d),
   rejected.filter(r=>r.domain_code===d)));
 const outsideContext=outOfDomain.filter(x=>x.disp.kind==='CONTEXTUAL');
 const outsideWithdrawn=outOfDomain.filter(x=>x.disp.kind==='WITHDRAWN');
 const accounting={
  input_events:events.length,
  routing:routes.reduce((n,r)=>n+r.usable_event_count,0),
  contextual:routes.reduce((n,r)=>n+r.contextual_event_count,outsideContext.length),
  withdrawn:routes.reduce((n,r)=>n+r.withdrawn_event_count,outsideWithdrawn.length),
  rejected:rejected.length
 };
 accounting.balanced=accounting.routing+accounting.contextual+accounting.withdrawn+
  accounting.rejected===accounting.input_events;
 if(!accounting.balanced)throw new EngineInvariantError('Evidence accounting does not balance');
 const input=sha256Hex(records.map(r=>r.serialized).sort(compare).join('\n'));
 const next=routes.filter(r=>r.requires_more_evidence)
  .sort((a,b)=>rank[a.evidence_state]-rank[b.evidence_state]||
   DOMAINS.indexOf(a.route_code)-DOMAINS.indexOf(b.route_code))
  .map(r=>r.route_code);
 const body={
  engine_version:ENGINE_VERSION,schema_version:SCHEMA_VERSION,
  scientific_status:SCIENTIFIC_STATUS,total_score:null,normative_label:null,
  routes,next_evidence_priority:next,
  human_review_required:routes.some(r=>r.human_review_required)||rejected.length>0||
   outOfDomain.length>0,
  integrity:{
   accounting,rejected_events:rejected,
   unassigned_contextual_events:outsideContext.map(x=>({
    event_ref:x.event_ref,id:x.id,reasons:x.disp.reasons})).sort(sorted),
   unassigned_withdrawn_events:outsideWithdrawn.map(x=>({
    event_ref:x.event_ref,id:x.id})).sort(sorted),
   hash_is_authentication:false,server_signature_present:false
  },
  fingerprints:{input}
 };
 body.fingerprints.result=sha256Hex(canonicalize(body));
 return freezeDeep(body);
}
export function classifyDomain(domain,events=[]){
 if(!DOMAINS.includes(domain))throw new EvidenceInputError('Unknown Golden Talent domain');
 return routeEvidence(events).routes.find(r=>r.route_code===domain);
}
/** Verify consistency (and optionally input/output correspondence), not author
 * authenticity, signed reviews, learner consent or psychometric validity.
 */
export function verifyResult(result,events){
 try{
  if(!plain(result)||result.engine_version!==ENGINE_VERSION||
     result.total_score!==null||result.normative_label!==null||
     result.integrity?.accounting?.balanced!==true||
     result.integrity?.hash_is_authentication!==false||
     result.integrity?.server_signature_present!==false||
     !Array.isArray(result.routes)||result.routes.length!==DOMAINS.length)return false;
  const {result:claimed,...fingerprints}=result.fingerprints||{};
  if(typeof claimed!=='string'||typeof fingerprints.input!=='string')return false;
  if(sha256Hex(canonicalize({...result,fingerprints}))!==claimed)return false;
  if(events!==undefined){
   const actual=routeEvidence(events);
   return actual.fingerprints.result===claimed&&actual.fingerprints.input===fingerprints.input;
  }
  return true;
 }catch{return false;}
}
