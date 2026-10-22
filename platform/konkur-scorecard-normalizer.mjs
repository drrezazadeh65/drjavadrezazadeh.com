/* JR Konkur AI — privacy-preserving, deterministic scorecard adapter.
 * No inferred official scores, no admission probabilities, no persistence.
 */
export const SCORECARD_ADAPTER_VERSION='0.2.0';
const DIGITS='0123456789';
export function toAsciiDigits(value){
 if(typeof value!=='string')throw new TypeError('String required');
 return value.replace(/[۰-۹٠-٩]/g,c=>DIGITS[c.codePointAt(0)>0x6ef?c.codePointAt(0)-0x6f0:c.codePointAt(0)-0x660]);
}
// Stable cross-worksheet IDs: identity aliases are NOT statistical score conversions.
const providerAliases=Object.freeze({GHALAMCHI:'KANOON',GOZINE2:'GOZINEH_DO'});
const examinationGroupAliases=Object.freeze({EXPERIMENTAL_SCIENCES:'EXPERIMENTAL',FOREIGN_LANGUAGES:'LANGUAGES'});
const providers=new Set(['KANOON','GAJ','GOZINEH_DO','MAZ','SANJESH','SANJESH_MOCK',
 'VALEH','MOBTAKERAN','AYANDESAZAN','SCHOOL_LOCAL','OTHER']);
function finiteInRange(value,min,max){return typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;}
export function normalizeCandidateScorecard(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('Scorecard object required');
 const issues=[];
 const reportedProvider=typeof input.provider==='string'?input.provider.trim().toUpperCase():null;
 const provider=providerAliases[reportedProvider]||reportedProvider;
 if(!providers.has(provider))issues.push('UNRECOGNIZED_PROVIDER');
 const year=typeof input.year==='number'?input.year:Number(toAsciiDigits(String(input.year??'')));
 if(!Number.isInteger(year)||year<1400||year>1500)issues.push('INVALID_EXAM_YEAR');
 const reportedGroup=typeof input.examinationGroup==='string'?input.examinationGroup.trim().toUpperCase():null;
 const examGroup=examinationGroupAliases[reportedGroup]||reportedGroup;
 if(!['HUMANITIES','EXPERIMENTAL','MATHEMATICS','ARTS','LANGUAGES'].includes(examGroup))issues.push('INVALID_EXAMINATION_GROUP');
 if(!Array.isArray(input.subjects)||input.subjects.length>40)issues.push('INVALID_SUBJECTS');
 const subjects=[];
 const seenSubjectCodes=new Set();
 if(Array.isArray(input.subjects)&&input.subjects.length<=40)for(const s of input.subjects){
  if(!s||typeof s!=='object'||typeof s.subjectCode!=='string'||!/^[A-Z0-9_-]{1,40}$/.test(s.subjectCode)) {issues.push('INVALID_SUBJECT_CODE');continue;}
  // Repeating the same named subject is not extra independent evidence.
  // Do not silently count it twice when forming downstream descriptions.
  if(seenSubjectCodes.has(s.subjectCode)){
   issues.push('DUPLICATE_SUBJECT_CODE');continue;
  }
  seenSubjectCodes.add(s.subjectCode);
  const percent=s.percent;
  if(percent!==null&&percent!==undefined&&!finiteInRange(percent,-33.34,100))issues.push('INVALID_SUBJECT_PERCENT');
  subjects.push(Object.freeze({subjectCode:s.subjectCode,percent:finiteInRange(percent,-33.34,100)?percent:null}));
 }
 const rank=input.rank??null;
 if(rank!==null&&(!Number.isSafeInteger(rank)||rank<1))issues.push('INVALID_RANK');
 if(input.rankVerified===true&&provider!=='SANJESH')issues.push('UNSUPPORTED_OFFICIAL_RANK_ATTESTATION');
 if(input.rankVerified===true&&input.officialVerificationEvidence!==true)issues.push('MISSING_OFFICIAL_RANK_EVIDENCE');
 return Object.freeze({schema:'jr-scorecard-normalized-v1',version:SCORECARD_ADAPTER_VERSION,
  provider,year,examinationGroup:examGroup,subjects:Object.freeze(subjects),rank:Number.isSafeInteger(rank)&&rank>0?rank:null,
  rankSourceVerified:false,
  issues:Object.freeze([...new Set(issues)].sort()),valid:issues.length===0,
  officialAdmissionEvidence:false,
  personalIdentifiersStored:false,admissionProbability:null});
}
export function scorecardToReasonerCandidate(normalized){
 if(!normalized||normalized.valid!==true)throw new TypeError('Validated scorecard required');
 return Object.freeze({examYear:normalized.year,examinationGroup:normalized.examinationGroup,
  rank:normalized.rank,rankSourceVerified:normalized.rankSourceVerified,
  academicRecordStatus:'UNVERIFIED'});
}
