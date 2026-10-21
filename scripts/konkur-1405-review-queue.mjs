/* JR Konkur 1405 reviewer packet generator: metadata-only.
 * Every page starts UNREVIEWED. No public programme approvals, admissions
 * predictions, source-text extraction, fileIds or database access.
 */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export const REVIEW_QUEUE_SCHEMA='jr-konkur-1405-human-page-review-queue-v1';
const keys=Object.freeze(['humanities','experimental','mathematics','arts','appendices','records_based']);
const SHA=/^[0-9a-f]{64}$/;
const safeKey=s=>typeof s==='string'&&/^[a-z][a-z_]{1,50}$/.test(s);
const safeCategory=s=>typeof s==='string'&&/^[A-Z_]{3,90}$/.test(s);
const csv=value=>'"'+String(value).replace(/"/g,'""')+'"';
export function build1405ReviewQueue(manifest){
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest)||
  manifest.cycle!==1405||!Array.isArray(manifest.sources)||manifest.sources.length!==6)
  throw new TypeError('Six-file 1405 source inventory required');
 if(manifest.publicationPolicy?.automaticVerificationFromText!==false||
  manifest.publicationPolicy?.admissionProbabilityEnabled!==false||
  manifest.inventoryAudit?.programmeRecordsApproved!==0)
  throw new TypeError('Source manifest is not in research-only state');
 const seen=new Set(),rows=[],counts=[];
 for(const source of manifest.sources){
  if(!source||!safeKey(source.key)||!keys.includes(source.key)||seen.has(source.key)||
   !safeCategory(source.category)||!SHA.test(source.sha256)||
   !Number.isSafeInteger(source.pdfPageCount)||source.pdfPageCount<1||
   source.pdfPageCount>5000||source.activeForEligibility!==false||
   source.criticalTablesVerification!=='NOT_COMPLETED'||
   source.pdfPageAudit!=='ORIGINAL_PDF_PAGE_COUNT_AND_SHA256_VERIFIED')
   throw new TypeError('Unreviewed PDF source metadata required');
  seen.add(source.key);
  for(let page=1;page<=source.pdfPageCount;page++)
   rows.push(Object.freeze({sourceKey:source.key,category:source.category,
    pdfSha256:source.sha256,pdfPage:page,reviewState:'UNREVIEWED',
    programmeRowsApproved:0,pageHumanVerified:false,amendmentVerified:false}));
  counts.push(Object.freeze({sourceKey:source.key,pages:source.pdfPageCount,
   originalPdfSha256:source.sha256,reviewedPages:0}));
 }
 if(keys.some(key=>!seen.has(key))||rows.length!==manifest.inventoryAudit.totalPdfPages||
  rows.length!==2412)throw new TypeError('Manifest page-total and guide coverage drift');
 return Object.freeze({
  schema:REVIEW_QUEUE_SCHEMA,admissionYear:1405,reviewStatus:'ALL_PENDING_HUMAN_PDF_COMPARISON',
  totalPages:rows.length,reviewedPages:0,officialProgrammeRecordsApproved:0,
  mayPublish:false,databaseWrites:0,sourcePdfContentsIncluded:false,
  counts:Object.freeze(counts),rows:Object.freeze(rows)
 });
}
export function render1405ReviewQueueCsv(queue){
 if(!queue||queue.schema!==REVIEW_QUEUE_SCHEMA||queue.mayPublish!==false||
  queue.rows?.length!==2412||queue.reviewedPages!==0)throw new TypeError('Unsafe review queue');
 const header=['source_key','source_category','original_pdf_sha256','pdf_page_number',
  'review_state','source_table_reviewed_by_human','applicable_amendments_checked',
  'reviewer_signoff','reviewer_notes'];
 const lines=[header.join(',')];
 for(const row of queue.rows){
  if(row.reviewState!=='UNREVIEWED'||row.pageHumanVerified!==false||
   row.programmeRowsApproved!==0||row.amendmentVerified!==false||!safeKey(row.sourceKey)||
   !safeCategory(row.category)||!SHA.test(row.pdfSha256)||
   !Number.isSafeInteger(row.pdfPage)||row.pdfPage<1||row.pdfPage>5000)
   throw new TypeError('Attempted automatic page approval or malformed row');
  lines.push([row.sourceKey,row.category,row.pdfSha256,row.pdfPage,'UNREVIEWED',
   '','','',''].map(csv).join(','));
 }
 return '\uFEFF'+lines.join('\r\n')+'\r\n';
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const manifest=JSON.parse(fs.readFileSync('platform/konkur-1405-sources.json','utf8'));
 const result=build1405ReviewQueue(manifest);
 if(process.argv.includes('--csv'))process.stdout.write(render1405ReviewQueueCsv(result));
 else if(process.argv.includes('--check'))console.log(JSON.stringify({
  schema:result.schema,status:result.reviewStatus,documents:result.counts.length,
  totalPages:result.totalPages,reviewedPages:result.reviewedPages,
  officialProgrammeRecordsApproved:result.officialProgrammeRecordsApproved,
  mayPublish:false,databaseWrites:0
 }));
 else console.log('Use --check for a metadata audit or --csv for an offline human-review packet. No SQL or PDF content is read.');
}
