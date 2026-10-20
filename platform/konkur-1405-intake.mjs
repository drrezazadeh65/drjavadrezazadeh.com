/* JR Konkur 1405 official-source intake: staging only, never an eligibility authority.
 * The Sanjesh issuer is acknowledged. Extracted text / five-digit tokens are NOT verified programme rows.
 */
import manifest from './konkur-1405-sources.json' with {type:'json'};
export {manifest as officialAdmissionSources1405};
export const INTAKE_VERSION='1.0.0';
const nativeDigits='0123456789';
export function normalizePersianDigits(value){
 if(typeof value!=='string')throw new TypeError('Codes are strings; never coerce numbers');
 return value.replace(/[۰-۹٠-٩]/g,c=>{
  const code=c.codePointAt(0);
  return nativeDigits[(code>=0x6f0?code-0x6f0:code-0x660)];
 });
}
export function normalizeProgrammeCode(value){
 const code=normalizePersianDigits(value).trim();
 return /^[0-9]{5}$/.test(code)?code:null;
}
export function candidateFiveDigitTokens(extractedText,{limit=500}={}){
 if(typeof extractedText!=='string'||extractedText.length>5_000_000)throw new TypeError('Bounded text required');
 if(!Number.isInteger(limit)||limit<1||limit>10000)throw new RangeError('Invalid token limit');
 const seen=new Set(),tokens=[];
 const re=/(?<![0-9۰-۹٠-٩])[0-9۰-۹٠-٩]{5}(?![0-9۰-۹٠-٩])/g;
 for(const match of extractedText.matchAll(re)){
  const code=normalizePersianDigits(match[0]);
  if(!seen.has(code)){tokens.push({token:code,kind:'UNCLASSIFIED_FIVE_DIGIT_TOKEN',page:null,verification:'NEEDS_PDF_TABLE_REVIEW'});seen.add(code);}
  if(tokens.length>=limit)break;
 }
 return {status:'STAGING_ONLY',tokens,programmeRecordsVerified:0};
}
export function auditProposedProgramme(record){
 const issues=[];
 if(!record||typeof record!=='object'||Array.isArray(record))throw new TypeError('Programme proposal object required');
 if(record.year!==1405)issues.push('WRONG_ADMISSION_CYCLE');
 const source=manifest.sources.find(x=>x.fileId===record.sourceFileId);
 if(!source)issues.push('SOURCE_NOT_IN_VERIFIED_INVENTORY');
 const code=typeof record.code==='string'?normalizeProgrammeCode(record.code):null;
 if(!code)issues.push('INVALID_FIVE_DIGIT_PROGRAMME_CODE');
 for(const field of ['university','programme','examinationGroup','admissionMethod']){
  if(typeof record[field]!=='string'||!record[field].trim())issues.push('MISSING_'+field.toUpperCase());
 }
 if(!Number.isInteger(record.page)||record.page<1)issues.push('MISSING_OR_INVALID_PAGE');
 if(record.capacity!==null&&record.capacity!==undefined&&(!Number.isInteger(record.capacity)||record.capacity<0))
  issues.push('INVALID_CAPACITY');
 if(record.admissionMethod===''){
  issues.push('ADMISSION_METHOD_UNKNOWN');
 }
 // Page anchors, publisher and human signoff cannot be derived from raw text.
 return Object.freeze({
  year:1405,code,sourceFileId:record.sourceFileId||null,sourceCategory:source?.category||null,
  page:Number.isInteger(record.page)&&record.page>0?record.page:null,
  status:'AWAITING_INDEPENDENT_SOURCE_PAGE_REVIEW',
  issues:[...new Set(issues)].sort(),
  sourcePageVerified:false,reviewerApproved:false,eligibleForPublicCatalog:false
 });
}
export function auditCandidateRows(rows){
 if(!Array.isArray(rows)||rows.length>20000)throw new TypeError('Bounded intake array required');
 const seen=new Map(),duplicates=[],invalid=[];
 rows.forEach((row,index)=>{
  const audited=auditProposedProgramme(row);
  if(audited.issues.length)invalid.push({index,issues:audited.issues});
  if(audited.code){
   const key=[audited.year,row.examinationGroup,audited.code].join('/');
   if(seen.has(key))duplicates.push({firstIndex:seen.get(key),duplicateIndex:index,kind:'POSSIBLE_DUPLICATE_OR_AMENDMENT'});
   else seen.set(key,index);
  }
 });
 return {schema:'konkur-intake-audit-v1',count:rows.length,pendingHumanReview:rows.length,
  publishedCount:0,duplicates,invalid,automaticActivation:false};
}
