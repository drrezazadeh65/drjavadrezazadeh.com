/* JR Konkur research-only, user-configured raw-percentage calculator.
 * No official score reconstruction, statistical inference, admission odds or persistence.
 */
export const PERCENTAGE_CALCULATOR_VERSION = '1.0.0';
export const PERCENTAGE_CALCULATOR_SCHEMA = 'jr-konkur-raw-percentage-v1';

const isCount = x => Number.isSafeInteger(x) && x >= 0 && x <= 100000;
const isWeight = (x,min) => Number.isSafeInteger(x) && x >= min && x <= 100;
const finish = (status, fields={}) => Object.freeze({
 schema:PERCENTAGE_CALCULATOR_SCHEMA, version:PERCENTAGE_CALCULATOR_VERSION,
 status, rawPercentage:null, rank:null, taz:null, admissionProbability:null,
 officialScore:false, officiallyVerified:false, ...fields
});

/** Caller must supply all answer counts and all scoring weights explicitly. */
export function calculateExamPercentage({correct,incorrect,unanswered,correctWeight,wrongPenalty,blankPenalty}={}){
 const issues=[];
 for(const [name,value] of Object.entries({correct,incorrect,unanswered}))
  if(!isCount(value))issues.push('INVALID_'+name.toUpperCase()+'_COUNT');
 if(!isWeight(correctWeight,1))issues.push('INVALID_CORRECT_WEIGHT');
 if(!isWeight(wrongPenalty,0))issues.push('INVALID_WRONG_PENALTY');
 if(!isWeight(blankPenalty,0))issues.push('INVALID_BLANK_PENALTY');
 if(issues.length)return finish('INVALID_INPUT',{issues:Object.freeze(issues)});
 const total=correct+incorrect+unanswered;
 if(total===0)return finish('INVALID_INPUT',{issues:Object.freeze(['NO_QUESTIONS'])});
 if(total>100000)return finish('INVALID_INPUT',{issues:Object.freeze(['TOO_MANY_QUESTIONS'])});
 const earned=correct*correctWeight-incorrect*wrongPenalty-unanswered*blankPenalty;
 const possible=total*correctWeight;
 const rawPercentage=Math.round(earned/possible*10000)/100;
 return finish('CALCULATED',{
  issues:Object.freeze([]), correct,incorrect,unanswered,total,
  scoringRule:Object.freeze({correctWeight,wrongPenalty,blankPenalty}),
  earnedPoints:earned, maximumPoints:possible, rawPercentage,
  metric:'USER_CONFIGURED_RAW_PERCENTAGE',
  interpretation:'Descriptive calculation from the supplied rule; neither a verified official score nor a rank.',
 });
}
