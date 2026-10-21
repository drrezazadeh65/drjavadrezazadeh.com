/* Public Konkur AI Lab: no network, no storage, no official predictions. */
export function normalizeLabScorecard(input){
 const issues=[];
 const digits=v=>String(v??'').replace(/[۰-۹٠-٩]/g,c=>String(c.codePointAt(0)>=0x6f0?c.codePointAt(0)-0x6f0:c.codePointAt(0)-0x660));
 const year=Number(digits(input.year));
 if(!Number.isInteger(year)||year<1400||year>1500)issues.push('INVALID_EXAM_YEAR');
 if(!['KANOON','GAJ','GOZINEH_DO','SANJESH','OTHER'].includes(input.provider))issues.push('UNRECOGNIZED_PROVIDER');
 if(!['HUMANITIES','EXPERIMENTAL','MATHEMATICS','ARTS','LANGUAGES'].includes(input.examinationGroup))issues.push('INVALID_EXAMINATION_GROUP');
 if(!Array.isArray(input.subjects)||input.subjects.length>40)issues.push('INVALID_SUBJECTS');
 else for(const s of input.subjects)if(!s||typeof s.subjectCode!=='string'||typeof s.percent!=='number'||!Number.isFinite(s.percent)||s.percent< -33.34||s.percent>100)issues.push('INVALID_SUBJECT_PERCENT');
 if(input.rank!==undefined&&(!Number.isSafeInteger(input.rank)||input.rank<1))issues.push('INVALID_RANK');
 return Object.freeze({valid:issues.length===0,issues:Object.freeze([...new Set(issues)]),
 provider:input.provider,year,examinationGroup:input.examinationGroup,
 rankSourceVerified:false,admissionProbability:null});
}
export function analyseLabScorecard(scorecard){
 const n=normalizeLabScorecard(scorecard);
 return Object.freeze({status:n.valid?'AWAITING_VERIFIED_CATALOGUE':'INVALID_SCORECARD',
  issues:n.issues,results:Object.freeze([]),admissionProbability:null,officialEligibilityEstablished:false});
}
