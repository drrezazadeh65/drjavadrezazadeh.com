/* JR Admission Intelligence release classification — source-only, no SQL.
 * Tests eligibility of the local research EXPERIENCE for CI without certifying
 * official catalogue sources, user data, model accuracy or production deployment.
 */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {build1405ReviewQueue} from './konkur-1405-review-queue.mjs';
import {runSourceOnly003fAudit} from './konkur-003f-proposal-audit.mjs';

export const RELEASE_READINESS_SCHEMA='jr-admission-research-vs-official-readiness-v1';
const getOk=(files,path)=>typeof files[path]==='string'&&files[path].length>0;
const REQUIRED=[
 'fa/konkur-ai-lab/index.html',
 'fa/entekhab-reshteh/index.html',
 'en/student-guidance/index.html',
 'assets/js/jr-konkur-study-review-v1.js',
 'assets/js/jr-konkur-mock-practice-v1.js',
 'assets/js/jr-konkur-choice-portability-v1.js',
 'assets/js/jr-konkur-mock-export-v1.js',
 'assets/js/jr-konkur-percentage-v1.mjs',
 'assets/js/jr-konkur-percentage-ui-v1.mjs',
 'assets/js/jr-konkur-official-catalogue-v1.js'
];
export function classifyAdmissionReadiness({manifest,files,assistantPolicy,dbProposalAudit,sourceQueue}={}){
 const issues=[];
 if(!files||typeof files!=='object'||Array.isArray(files))
  issues.push('FRONTEND_FILE_INVENTORY_MISSING');
 else for(const name of REQUIRED)if(!getOk(files,name))issues.push('FEATURE_MISSING:'+name);
 const fa=files?.['fa/entekhab-reshteh/index.html']||'';
 const en=files?.['en/student-guidance/index.html']||'';
 if(!fa.includes('jr-konkur-study-review-v1.js')||!en.includes('jr-konkur-study-review-v1.js'))
  issues.push('STUDY_REVIEW_NOT_WIRED_BILINGUALLY');
 if(!fa.includes('jr-konkur-choice-portability-v1.js')||
  !en.includes('jr-konkur-choice-portability-v1.js'))
  issues.push('PORTABILITY_NOT_WIRED_BILINGUALLY');
 const lab=files?.['fa/konkur-ai-lab/index.html']||'';
 if(!lab.includes('noindex,nofollow')||
  !lab.includes('این صفحه انتخاب رشته رسمی یا پیش‌بینی احتمال قبولی نیست'))
  issues.push('RESEARCH_LABEL_OR_SEARCH_BOUNDARY_MISSING');
 if(!assistantPolicy||assistantPolicy.runtime!=='STATIC_BROWSER_FALLBACK'||
  assistantPolicy.public_endpoint!==null)
  issues.push('LIVE_ASSISTANT_NOT_IN_SCOPE');
 if(!dbProposalAudit||dbProposalAudit.migrationAuthorized!==false||
  dbProposalAudit.overlappingConcepts?.length!==4)
  issues.push('COMPETING_003F_MIGRATIONS_NOT_QUARANTINED');
 if(!sourceQueue||sourceQueue.totalPages!==2412||sourceQueue.reviewedPages!==0||
  sourceQueue.mayPublish!==false||sourceQueue.officialProgrammeRecordsApproved!==0)
  issues.push('SOURCE_HUMAN_REVIEW_GATE_UNRESOLVED');
 if(!manifest||manifest.inventoryAudit?.programmeRecordsApproved!==0||
  manifest.publicationPolicy?.admissionProbabilityEnabled!==false)
  issues.push('RESEARCH_ONLY_SOURCE_STATUS_DRIFT');
 const researchReady=issues.length===0;
 return Object.freeze({
  schema:RELEASE_READINESS_SCHEMA,
  researchCandidate:researchReady?'SOURCE_CONTRACTS_READY_PENDING_CI_AND_OWNER_RELEASE':
   'SOURCE_CONTRACTS_BLOCKED',
  researchIssues:Object.freeze(issues),
  officialAdmissions:'BLOCKED_PENDING_INDEPENDENT_HUMAN_AND_LIVE_DATA_ACCEPTANCE',
  officialReleaseAuthorized:false,automaticDeploymentAuthorized:false,
  migrationAuthorized:false,admissionProbabilityEnabled:false,
  verifiedProgrammeRecordsCertified:0,
  backendAndLiveSqlVerifiedByThisTool:false,
  requiredOfficialGates:Object.freeze([
   'LATEST_AUTHENTICATED_MARIADB_SCHEMA_AND_LEDGER',
   'INDEPENDENT_HUMAN_ORIGINAL_PDF_PAGE_TABLE_CHECK',
   'OFFICIAL_AMENDMENT_AND_ELIGIBILITY_RULE_ACCEPTANCE',
   'ACCOUNT_GUARDIAN_CONSENT_AND_RETENTION_FOR_SAVED_PRIVATE_SCORECARDS',
   'VALIDATED_CALIBRATED_OUTCOME_MODEL_BEFORE_ANY_ADMISSION_PROBABILITIES'
  ])
 });
}
export function sourceOnlyAdmissionReadiness(){
 const files=Object.fromEntries(REQUIRED.map(path=>[path,fs.readFileSync(path,'utf8')]));
 const manifest=JSON.parse(fs.readFileSync('platform/konkur-1405-sources.json','utf8'));
 const assistantPolicy=JSON.parse(fs.readFileSync('platform/assistant-runtime-policy.json','utf8'));
 const dbProposalAudit=runSourceOnly003fAudit();
 const sourceQueue=build1405ReviewQueue(manifest);
 return classifyAdmissionReadiness({manifest,files,assistantPolicy,dbProposalAudit,sourceQueue});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const r=sourceOnlyAdmissionReadiness();
 console.log(JSON.stringify(r,null,2));
 if(r.researchIssues.length||r.officialReleaseAuthorized!==false)process.exitCode=1;
}
