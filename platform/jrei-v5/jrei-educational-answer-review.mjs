/**
 * JREI multilingual scientific output quality firewall.
 * Conservative negative-only review. A 'CLEAR' draft is not validated science.
 * No transcripts are stored, no external calls are issued.
 */
import {createHash} from 'node:crypto';
import {auditJreiArithmetic,planJreiArithmetic} from './jrei-deterministic-arithmetic.mjs';
export const JREI_ANSWER_REVIEW='jr.jrei.educational-output-review.v1';
const digest=s=>createHash('sha256').update(s).digest('hex');
const flags=Object.freeze({
 CJK_SCRIPT_INTRUSION:'CJK_SCRIPT_INTRUSION',
 TRUNCATED_COMPLETION:'TRUNCATED_COMPLETION',
 EMPTY_OR_OVERSIZED:'EMPTY_OR_OVERSIZED',
 EXPOSED_INTERNAL_THINKING:'EXPOSED_INTERNAL_THINKING',
 NUMERIC_MISMATCH:'NUMERIC_MISMATCH',
 UNSOURCED_ADMISSION_GUARANTEE:'UNSOURCED_ADMISSION_GUARANTEE',
 FLAWED_PERSIAN_VALIDITY_DEFINITION:'FLAWED_PERSIAN_VALIDITY_DEFINITION',
 UNVERIFIED_REFERENCE_ASSURANCE:'UNVERIFIED_REFERENCE_ASSURANCE'
});
export function inspectJreiEducationalDraft({question='',answer,language,
 stopReason='stop',scope='GENERAL'}={}){
 if(!['fa','en'].includes(language)||typeof question!=='string'||
   question.length>2400||typeof answer!=='string'||answer.length>10000)
   return Object.freeze({schema:JREI_ANSWER_REVIEW,status:'REJECT',
    reasonCodes:['INVALID_REVIEW_INPUT'],scientificAcceptance:false});
 const fail=[];
 const put=s=>{if(!fail.includes(s))fail.push(s);};
 if(answer.trim().length<1||answer.length>4000)put(flags.EMPTY_OR_OVERSIZED);
 if(stopReason!=='stop')put(flags.TRUNCATED_COMPLETION);
 if(/<\/?think(?:\s|>)/i.test(answer))put(flags.EXPOSED_INTERNAL_THINKING);
 if(language==='fa'&&/\p{Script=Han}/u.test(answer))
   put(flags.CJK_SCRIPT_INTRUSION);
 if(planJreiArithmetic(question,language).eligible&&
    !auditJreiArithmetic(question,answer,language).verified)
   put(flags.NUMERIC_MISMATCH);
 if(/(?:قبولی\s*(?:شما|قطعی|تضمینی)|رتبه\s*قطعی|guaranteed\s+admission|certain\s+exam\s+rank)/iu.test(answer))
   put(flags.UNSOURCED_ADMISSION_GUARANTEE);
 // A narrow negative expert lexicon, not a claim to fully verify psychometrics.
 if(language==='fa'&&/روایی/.test(question)&&/پایایی/.test(question)&&
    /روایی.{0,35}(?:سرعت|اثربخشی\s+اطلاعات)/u.test(answer))
   put(flags.FLAWED_PERSIAN_VALIDITY_DEFINITION);
 if(/(?:plagiarism\s+detector|citation\s+generator).{0,100}(?:ensure|prove|guarantee).{0,40}(?:authentic|real|valid)/iu.test(answer))
   put(flags.UNVERIFIED_REFERENCE_ASSURANCE);
 const reasons=Object.freeze(fail.sort());
 return Object.freeze({schema:JREI_ANSWER_REVIEW,
   status:reasons.length?'REJECT':'REVIEW_REQUIRED',
   reasonCodes:reasons,language,scope,
   questionSha256:digest(question),answerSha256:digest(answer),
   confidenceScore:null,independentScientificValidation:false,
   originalModelTextAltered:false,automaticReleaseApproved:false,
   generatedExamAnswerKeyApproved:false});
}
export function summarizeJreiQualityIncident(review,{modelSha256,reviewerApproved=false}={}){
 if(!review||review.schema!==JREI_ANSWER_REVIEW||
    !/^[a-f0-9]{64}$/.test(modelSha256??''))
    return Object.freeze({admissible:false,reason:'INVALID_REVIEW_EVIDENCE'});
 return Object.freeze({admissible:true,
   schema:'jr.jrei.private-quality-incident.v1',
   modelSha256,questionDigest:review.questionSha256,
   answerDigest:review.answerSha256,
   negativeCodes:review.reasonCodes||[],
   status:reviewerApproved?'REVIEWED_PROPOSAL':'OBSERVED_REQUIRES_REVIEW',
   modelWeightsChanged:false,
   studentTranscriptStored:false,trainingAuthorized:false,
   scienceAccepted:false,publicActivationAuthorized:false});
}
