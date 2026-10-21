/* Konkur 1405 candidate intake preflight. No DB writes, predictions, or approvals. */
import {auditCandidateRows} from './konkur-1405-intake.mjs';
const MAX_ROWS=20000;
const REQUIRED=['year','code','sourceFileId','page','university','programme','examinationGroup','admissionMethod'];
export function prepareKonkurBatch(rows){
 if(!Array.isArray(rows)||rows.length>MAX_ROWS)throw new TypeError('Expected at most 20000 candidate rows');
 const audit=auditCandidateRows(rows);
 const acceptedForReview=[];
 const rejected=[];
 const seen=new Set();
 rows.forEach((row,index)=>{
  const key=[row.year,row.examinationGroup,row.code].join('/');
  const problems=[...(audit.invalid.find(x=>x.index===index)?.issues||[])];
  if(seen.has(key))problems.push('DUPLICATE_INPUT_CODE');
  else seen.add(key);
  if(REQUIRED.some(field=>row[field]===undefined||row[field]===null))problems.push('REQUIRED_FIELD_MISSING');
  if(problems.length)rejected.push({index,issues:[...new Set(problems)].sort()});
  else acceptedForReview.push({index,sourceFileId:row.sourceFileId,page:row.page,code:row.code,reviewState:'AWAITING_INDEPENDENT_SOURCE_PAGE_REVIEW'});
 });
 return {schema:'jr-konkur-1405-batch-preflight-v1',inputCount:rows.length,acceptedForReview,rejected,
  publicOfferingsCreated:0,databaseWrites:0,probabilityEstimates:0,
  requiresIndependentPageReview:true,automaticActivation:false};
}
