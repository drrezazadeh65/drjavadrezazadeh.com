/* JR public Konkur research lab v1.1. Strictly local, no network, no persistence, no admission odds. */
const PROVIDER_ALIASES=Object.freeze({GHALAMCHI:'KANOON',GOZINE2:'GOZINEH_DO'});
const GROUP_ALIASES=Object.freeze({EXPERIMENTAL_SCIENCES:'EXPERIMENTAL',FOREIGN_LANGUAGES:'LANGUAGES'});
const PROVIDERS=new Set(['KANOON','GAJ','GOZINEH_DO','MAZ','SANJESH','SANJESH_MOCK',
 'VALEH','MOBTAKERAN','AYANDESAZAN','SCHOOL_LOCAL','OTHER']);
const GROUPS=new Set(['HUMANITIES','EXPERIMENTAL','MATHEMATICS','ARTS','LANGUAGES']);
const digits=v=>String(v??'').replace(/[۰-۹٠-٩]/g,c=>{const n=c.codePointAt(0);return String(n>=0x6f0?n-0x6f0:n-0x660)});
const isRecord=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const cleanNumber=v=>typeof v==='number'?v:(typeof v==='string'&&/^[-+]?\d+(?:\.\d+)?$/.test(digits(v).trim())?Number(digits(v).trim()):NaN);
export function normalizeLabScorecard(input){
 const issues=[];
 if(!isRecord(input))return Object.freeze({valid:false,issues:Object.freeze(['INVALID_SCORECARD']),rankSourceVerified:false,admissionProbability:null});
 const reportedProvider=typeof input.provider==='string'?input.provider.trim().toUpperCase():null;
 const provider=PROVIDER_ALIASES[reportedProvider]||reportedProvider;
 const reportedGroup=typeof input.examinationGroup==='string'?input.examinationGroup.trim().toUpperCase():null;
 const group=GROUP_ALIASES[reportedGroup]||reportedGroup;
 const year=cleanNumber(input.year);
 if(!Number.isInteger(year)||year<1400||year>1450)issues.push('INVALID_EXAM_YEAR');
 if(!PROVIDERS.has(provider))issues.push('UNRECOGNIZED_PROVIDER');
 if(!GROUPS.has(group))issues.push('INVALID_EXAMINATION_GROUP');
 if(!Array.isArray(input.subjects)||input.subjects.length>6)issues.push('INVALID_SUBJECTS');
 else{
  const seen=new Set();
  for(const s of input.subjects){
   if(!isRecord(s)||typeof s.subjectCode!=='string'||s.subjectCode.length<1||s.subjectCode.length>80||
    !Number.isFinite(s.percent)||s.percent< -33.34||s.percent>100){issues.push('INVALID_SUBJECT_PERCENT');continue}
   const key=s.subjectCode.normalize('NFKC').trim().toLowerCase();
   if(!key||(key!=='self_reported'&&seen.has(key)))issues.push('DUPLICATE_OR_EMPTY_SUBJECT');
   seen.add(key);
  }
 }
 if(input.rank!==undefined&&(!Number.isSafeInteger(input.rank)||input.rank<1||input.rank>2000000))issues.push('INVALID_RANK');
 return Object.freeze({valid:issues.length===0,issues:Object.freeze([...new Set(issues)]),provider,year,examinationGroup:group,
  rankSourceVerified:false,admissionProbability:null,officialEligibilityEstablished:false});
}
export function analyseLabScorecard(scorecard){
 const n=normalizeLabScorecard(scorecard);
 return Object.freeze({status:n.valid?'AWAITING_VERIFIED_CATALOGUE':'INVALID_SCORECARD',issues:n.issues,
  results:Object.freeze([]),admissionProbability:null,officialEligibilityEstablished:false,publicReady:false});
}
