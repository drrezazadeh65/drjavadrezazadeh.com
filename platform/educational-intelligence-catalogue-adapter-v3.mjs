/**
 * JR EI V3: strict, read-only adapter for the EXISTING PHP /konkur/programmes API.
 * Structural contract only; it cannot authenticate a server, PDF or human reviewer.
 * Use with a trusted, same-origin API response. No storage, network, LLM or PII.
 */
import {JR_EI_VERSION} from './educational-intelligence-v3.mjs';
const denied=reason=>Object.freeze({version:JR_EI_VERSION,status:'UNAVAILABLE',reason,items:Object.freeze([]),
  eligibilityEvaluated:false,probabilityAvailable:false,officialApplication:false});
const string=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const validRecord=(x,year)=>x&&typeof x==='object'&&!Array.isArray(x)&&
  x.year===year && string(x.programmeCode,5)&&/^[0-9]{5}$/.test(x.programmeCode)&&
  string(x.programme,220)&&string(x.university,220)&&
  string(x.sourceDocument,160)&&Number.isInteger(x.sourceRevision)&&x.sourceRevision>0&&
  Number.isInteger(x.sourcePdfPage)&&x.sourcePdfPage>0&&
  x.eligibilityStatus==='NOT_ASSESSED'&&x.officialRegistration===false&&
  (x.capacity===null||(Number.isSafeInteger(x.capacity)&&x.capacity>=0));

export function adaptOfficialCatalogueResponse(payload,{year=1405}={}) {
  if (!Number.isInteger(year)||year<1300||year>1500) return denied('INVALID_CYCLE');
  if (!payload||typeof payload!=='object'||Array.isArray(payload)||payload.ok!==true||
    payload.year!==year||payload.admissionProbabilityEnabled!==false||
    payload.eligibilityAssessment!=='NOT_PERFORMED'||payload.officialApplicationSubmitted!==false)
    return denied('INVALID_SERVER_CONTRACT');
  if (payload.status==='OFFICIAL_CATALOGUE_NOT_READY'||payload.status==='NO_SOURCE_APPROVED_RECORDS')
    return denied('NO_APPROVED_CATALOGUE_RECORDS');
  if (payload.status!=='SOURCE_REVIEWED_CATALOGUE'||payload.sourceVerification!=='HUMAN_REVIEWED')
    return denied('APPROVED_SOURCE_STATUS_REQUIRED');
  if (!Array.isArray(payload.records)||payload.records.length<1||payload.records.length>50)
    return denied('UNBOUNDED_OR_EMPTY_RESULT');
  if (!payload.records.every(row=>validRecord(row,year)))
    return denied('ROW_PROVENANCE_OR_SCHEMA_INVALID');
  const items=payload.records.map(row=>Object.freeze({
    programmeCode:row.programmeCode,programme:row.programme,
    university:row.university,city:typeof row.city==='string'?row.city:null,
    capacity:row.capacity,admissionYear:year,
    evidence:Object.freeze({kind:'API_REPORTED_HUMAN_REVIEW',
      document:row.sourceDocument,revision:row.sourceRevision,
      pdfPage:row.sourcePdfPage}),
    eligibility:'NOT_ASSESSED',probability:null,
  }));
  return Object.freeze({version:JR_EI_VERSION,status:'SOURCE_REVIEWED_CATALOGUE',
    items:Object.freeze(items),eligibilityEvaluated:false,
    probabilityAvailable:false,officialApplication:false,
    caveat:'API review assertions require independent source and amendment verification by the trusted PHP backend.'});
}
