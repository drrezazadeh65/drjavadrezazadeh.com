/* JR Konkur AI: safe end-to-end analysis orchestration.
 * Pure computation only. No persistence, payments, uploads or model-generated admission odds.
 */
import {normalizeCandidateScorecard,scorecardToReasonerCandidate} from './konkur-scorecard-normalizer.mjs';
import {evaluateAdmissionChoices} from './konkur-admission-reasoner.mjs';
export const ADMISSION_PIPELINE_VERSION='0.1.0';
export function analyseKonkurChoices({scorecard,offerings=[],rules=[]}={}){
 const normalized=normalizeCandidateScorecard(scorecard);
 if(!normalized.valid)return Object.freeze({
  schema:'jr-konkur-analysis-v1',version:ADMISSION_PIPELINE_VERSION,status:'INVALID_SCORECARD',
  issues:normalized.issues,results:[],admissionProbability:null,
  officialEligibilityEstablished:false,publicReady:false});
 const candidate=scorecardToReasonerCandidate(normalized);
 const analysis=evaluateAdmissionChoices({candidate,offerings,rules});
 const counts={requirementsSatisfied:0,requirementsNotSatisfied:0,insufficientEvidence:0};
 for(const result of analysis.results){
  if(result.status==='REQUIREMENTS_SATISFIED')counts.requirementsSatisfied++;
  else if(result.status==='REQUIREMENTS_NOT_SATISFIED')counts.requirementsNotSatisfied++;
  else counts.insufficientEvidence++;
 }
 return Object.freeze({schema:'jr-konkur-analysis-v1',version:ADMISSION_PIPELINE_VERSION,
  status:offerings.length===0?'AWAITING_VERIFIED_CATALOGUE':'ANALYSIS_COMPLETE',
  provider:normalized.provider,year:normalized.year,examinationGroup:normalized.examinationGroup,
  counts:Object.freeze(counts),results:analysis.results,admissionProbability:null,
  officialEligibilityEstablished:false,publicReady:false,
  notices:Object.freeze(['Decision support only; not an official Sanjesh decision.',
   'Mock-exam rank is never treated as official admission rank.',
   'No statistical admission probability is available without a validated model.'])});
}
