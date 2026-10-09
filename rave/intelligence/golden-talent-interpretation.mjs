/** Explain exploratory talent scores without diagnostic or placement claims. */
import {scoreGoldenTalent} from './golden-talent-assessment.mjs';
import {evaluateTalentResponseQuality} from './golden-talent-instrument-governance.mjs';
export function buildTalentInterpretation({instrument,responses,audience='student'}={}){
 if(!['student','parent','counselor'].includes(audience))throw new Error('Unsupported audience');
 const quality=evaluateTalentResponseQuality(instrument,responses);
 if(!quality.eligibleForScoring)return {status:'blocked',issues:quality.issues,audience,productionTouched:false};
 const scores=scoreGoldenTalent({items:instrument.items,responses});
 const dimensions=Object.entries(scores.dimensions).map(([dimension,values])=>({
  dimension,rawScore:values.score,maximum:values.maxScore,percentOfAvailablePoints:values.percent,
  interpretation:'Descriptive score only; no norm-referenced rank or diagnostic inference.',
  followUp:'Discuss observed interests, contexts and additional evidence with a qualified counselor.'
 }));
 return {status:'exploratory',instrumentId:instrument.id,instrumentVersion:instrument.version,audience,dimensions,
  limitations:['No normative sample','No reliability evidence supplied','No construct-validity evidence supplied','Not for high-stakes placement'],
  requiresCounselorReview:true,automaticPlacement:false,productionTouched:false};
}
