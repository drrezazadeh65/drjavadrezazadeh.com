/**
 * JREI V5 deterministic daily BM25 learner.
 *
 * Trusted offline Windows worker only. No network/DB/environment, no model
 * weights, no public assistant or user profile and no remote commands.
 *
 * Compares identical human-curated PUBLIC educational questions against
 * immutable, independently reviewed public evidence. It learns narrowly:
 * proposes safer BM25 ranking parameters, never invents source facts.
 * Decisions are advisory only; deployment remains a separate audited owner
 * process on the Bertina system of record.
 */
import { createHash } from 'node:crypto';
import {
  LEARNING_MODES,normalizeRetrievalPolicy,assessLearningCandidate
} from './jrei-learning-loop.mjs';

const hash=(v)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const hex=(s)=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const isId=(s)=>typeof s==='string'&&/^[A-Za-z0-9._:-]{1,80}$/.test(s);
const simple=(o)=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
  (Object.getPrototypeOf(o)===Object.prototype||Object.getPrototypeOf(o)===null);
const ONLY_LABELS=new Set(['OFFICIAL_FACT','SOURCE_REVIEWED_FACT','DESCRIPTIVE_ANALYSIS']);
const forbiddenKeys=/(?:student|guardian|national.?id|phone|email|address|name|account|secret|token|cookie|promptHistory|messageHistory|scorecard)/i;
const piiPattern=/[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?<!\d)(?:\+98|0098|0)9\d{9}(?!\d)|(?<!\d)\d{10}(?!\d)|(?<!\d)\d{16}(?!\d)/i;
const maxLen= (s,n)=>typeof s==='string'&&s.length>0&&s.length<=n;
const clean=(t)=>String(t).normalize('NFKC').toLowerCase()
  .replace(/[يى]/g,'ی').replace(/ك/g,'ک')
  .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g,'')
  .replace(/\u200c/g,' ')
  .replace(/[۰-۹]/g,x=>String(x.charCodeAt(0)-0x06f0))
  .replace(/[٠-٩]/g,x=>String(x.charCodeAt(0)-0x0660))
  .replace(/[^\p{L}\p{N}]+/gu,' ');
export const tokenizePublicEducation=(text)=>clean(text).split(/\s+/).filter(t=>t.length>=2);
function assertReviewedEvidence(docs){
  if(!Array.isArray(docs)||docs.length<1||docs.length>10000)
    throw new Error('REVIEWED_EVIDENCE_COLLECTION_INVALID');
  const ids=new Set();const cleanDocs=[];
  for(const e of docs){
    if(!simple(e)||Object.keys(e).some(k=>forbiddenKeys.test(k))||
       !isId(e.id)||ids.has(e.id)||
       !maxLen(e.claimKey,160)||!maxLen(e.excerpt,10000)||
       piiPattern.test(e.excerpt)||!ONLY_LABELS.has(e.label)||
       !simple(e.provenance))throw new Error('REVIEWED_EVIDENCE_INVALID');
    const p=e.provenance;
    if(!isId(p.sourceId)||!hex(p.contentSha256)||
       !['OFFICIAL_APPROVED','REVIEWED'].includes(p.reviewStatus)||
       p.publicationPermission!=='ALLOWED'||p.superseded!==false||
       !maxLen(p.retrievedAt,40)||Number.isNaN(Date.parse(p.retrievedAt)))
      throw new Error('EVIDENCE_PROVENANCE_NOT_APPROVED');
    ids.add(e.id);
    cleanDocs.push(Object.freeze({
      id:e.id,claimKey:e.claimKey,excerpt:e.excerpt,label:e.label,
      authority:p.sourceId,contentSha256:p.contentSha256,reviewStatus:p.reviewStatus
    }));
  }
  return {docs:cleanDocs,ids};
}
function assertReviewedCases(cases,ids){
  if(!Array.isArray(cases)||cases.length<1||cases.length>10000)
    throw new Error('REVIEWED_HOLDOUT_COLLECTION_INVALID');
  const seen=new Set();return cases.map(c=>{
    if(!simple(c)||Object.keys(c).some(k=>forbiddenKeys.test(k))||
       !isId(c.id)||seen.has(c.id)||!maxLen(c.query,400)||
       piiPattern.test(c.query)||!['fa','en'].includes(c.locale)||
       !Array.isArray(c.expectedEvidenceIds)||c.expectedEvidenceIds.length<1||
       c.expectedEvidenceIds.length>15||
       c.expectedEvidenceIds.some(x=>!ids.has(x)))throw new Error('REVIEWED_HOLDOUT_INVALID');
    seen.add(c.id);
    return Object.freeze({id:c.id,query:c.query,locale:c.locale,
      expectedEvidenceIds:Object.freeze([...new Set(c.expectedEvidenceIds)])});
  });
}
/**
 * Reproduce the exact aggregate fingerprint of the approved local bundle.
 * Fingerprints are over validated public evidence only; no personal files.
 * These hashes must match the trusted Bertina owner-approved dataset mapping.
 */
export function fingerprintReviewedRetrievalCorpus({reviewedEvidence,heldOutCases}={}) {
  const {docs,ids}=assertReviewedEvidence(reviewedEvidence);
  const cases=assertReviewedCases(heldOutCases,ids);
  return Object.freeze({
    datasetSha256:hash(cases),evidenceSha256:hash(docs),
    caseCount:cases.length,sourceCount:docs.length
  });
}
function createRanker(docs,policy) {
  const entries=docs.map(d=>{
    const tokens=tokenizePublicEducation(d.claimKey+' '+d.excerpt);
    const tf=new Map();
    for(const token of tokens)tf.set(token,(tf.get(token)||0)+1);
    return {id:d.id,tf,len:tokens.length};
  });
  const df=new Map();
  for(const d of entries)for(const key of d.tf.keys())
    df.set(key,(df.get(key)||0)+1);
  const totalLen=entries.reduce((n,d)=>n+d.len,0);
  const avg=totalLen/entries.length||1;
  return query=>{
    const qt=[...new Set(tokenizePublicEducation(query))];
    if(!qt.length)return [];
    const scored=[];
    for(const doc of entries){
      let score=0;
      for(const word of qt){
        const tf=doc.tf.get(word)||0;
        if(tf===0)continue;
        const dfWord=df.get(word)||0;
        const idf=Math.log(1+(entries.length-dfWord+.5)/(dfWord+.5));
        score+=idf*(tf*(policy.k1+1))/
          (tf+policy.k1*(1-policy.b+policy.b*doc.len/avg));
      }
      if(score>0)scored.push({id:doc.id,score});
    }
    scored.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    return scored.slice(0,policy.maxEvidence).map(x=>x.id);
  };
}
/**
 * Outputs only aggregated counts and SHA digests, never texts or learner data.
 * Accuracy measures recall of human-labeled source IDs. It is NOT correctness
 * of a model answer, admissibility or calibration of admission outcomes.
 */
export function compareReviewedRetrieval({
  reviewedEvidence,heldOutCases,currentPolicy,candidatePolicy,
  expectedRunDay,evaluationVersion='reviewed-bm25-v1',
  independentSourceReview=false,controls={},expectedActivePolicySha256,
  privacyIncidentCount=0
}={}) {
  if(independentSourceReview!==true)throw new Error('INDEPENDENT_SOURCE_REVIEW_REQUIRED');
  const active=normalizeRetrievalPolicy(currentPolicy);
  const candidate=normalizeRetrievalPolicy(candidatePolicy);
  if(!active||!candidate)throw new Error('BM25_POLICY_INVALID');
  if(!Number.isSafeInteger(privacyIncidentCount)||privacyIncidentCount!==0)
    throw new Error('PRIVACY_INCIDENT_REQUIRES_OWNER_REVIEW');
  const {docs,ids}=assertReviewedEvidence(reviewedEvidence);
  const cases=assertReviewedCases(heldOutCases,ids);
  if(!maxLen(evaluationVersion,64)||!isId(evaluationVersion))
    throw new Error('EVALUATION_VERSION_INVALID');
  const datasetSha256=hash(cases);
  const evidenceSha256=hash(docs);
  const evaluate=(policy)=>{
    const retrieve=createRanker(docs,policy);
    let correct=0,abstain=0;
    const success={fa:0,en:0},total={fa:0,en:0};
    for(const q of cases){
      const chosen=retrieve(q.query);
      total[q.locale]++;
      if(!chosen.length){abstain++;continue;}
      if(q.expectedEvidenceIds.every(id=>chosen.includes(id))){
        correct++;success[q.locale]++;
      }
    }
    const rate=(l)=>total[l]?success[l]/total[l]:null;
    const fa=rate('fa'),en=rate('en');
    const gap=(fa===null||en===null)?10000:
      Math.round(Math.abs(fa-en)*10000);
    return {correctCount:correct,abstentionCount:abstain,
      fairnessGapBps:gap};
  };
  // Do not make up latency: this pure CPU-free benchmark has no real
  // deployed worker p95; use equal neutral figures. Independent Windows
  // latency measurement is required before any live auto-promotion.
  const b=evaluate(active),c=evaluate(candidate);
  const summary=(m)=>({
    runDay:expectedRunDay,datasetSha256,evidenceSha256,
    evaluationVersion,modelVersion:'bm25-retrieval-v1',
    heldOut:true,sourceApproved:independentSourceReview,
    sampleCount:cases.length,correctCount:m.correctCount,
    unsupportedCount:0,abstentionCount:m.abstentionCount,
    privacyIncidentCount,fairnessGapBps:m.fairnessGapBps,
    p95LatencyMs:0
  });
  const proposal=assessLearningCandidate({
    mode:LEARNING_MODES.RETRIEVAL_TUNING,
    baseline:summary(b),challenger:summary(c),
    currentPolicy:active,candidatePolicy:candidate,
    controls:{...controls,autoPromoteLowRisk:false},
    expectedRunDay,expectedActivePolicySha256
  });
  // Source comparison never independently verifies actual inference,
  // latency, official source freshness or platform runtime.
  return Object.freeze({
    schema:'jr.jrei.retrieval-comparison.v1',
    publicReady:false,modelTrained:false,learningPublished:false,
    sourceReviewExternallyAsserted:independentSourceReview,
    measuredWorkerLatency:false,latencyEvidenceRequired:true,
    datasetSha256,evidenceSha256,caseCount:cases.length,
    baselineCorrect:b.correctCount,candidateCorrect:c.correctCount,
    baselineAbstained:b.abstentionCount,candidateAbstained:c.abstentionCount,
    decision:proposal.decision,reason:proposal.reason,
    eligibleToPropose:proposal.decision==='OWNER_REVIEW'||
      proposal.decision==='ELIGIBLE_LOW_RISK',
    proposal
  });
}
