/* Metadata-only original-PDF human review claims. Not reviewer authentication. */
export const REVIEW_AUDIT_SCHEMA='jr-1405-human-claim-audit-v1';
const keys=['humanities','experimental','mathematics','arts','appendices','records_based'];
const gaps=['FOREIGN_LANGUAGES','OFFICIAL_AMENDMENTS','TEACHER_TRAINING_SUPPLEMENTS'];
const sha=/^[a-f0-9]{64}$/;
const ref=/^[A-Z0-9_-]{3,48}$/;
const date=/^20\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const exact=(x,fields)=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).length===fields.length&&fields.every(k=>Object.hasOwn(x,k));
export function audit1405HumanReviewClaims(manifest,claims=[]){
 if(!manifest||manifest.cycle!==1405||!Array.isArray(manifest.sources)||
   manifest.sources.length!==6||manifest.inventoryAudit?.programmeRecordsApproved!==0||
   manifest.publicationPolicy?.automaticVerificationFromText!==false||
   !Array.isArray(claims)||claims.length>2412)throw new TypeError('Research-only manifest and bounded claim list required');
 const sources=new Map();
 for(const source of manifest.sources){
  if(!source||!keys.includes(source.key)||sources.has(source.key)||!sha.test(source.sha256)||
   !Number.isSafeInteger(source.pdfPageCount)||source.pdfPageCount<1||
   source.activeForEligibility!==false||source.criticalTablesVerification!=='NOT_COMPLETED')
   throw new TypeError('Source manifest is not a complete unapproved PDF inventory');
  sources.set(source.key,source);
 }
 const pages=[...sources.values()].reduce((s,v)=>s+v.pdfPageCount,0);
 if(keys.some(k=>!sources.has(k))||pages!==2412||manifest.inventoryAudit?.totalPdfPages!==pages)
  throw new TypeError('Guide or page count drift');
 const seen=new Set(),counts=new Map(keys.map(k=>[k,0]));let invalidClaims=0;
 for(const c of claims){
  if(!exact(c,['sourceKey','pdfPage','sourceSha256','reviewers','tableCompared','amendmentsChecked'])||
   !sources.has(c.sourceKey)||!Number.isSafeInteger(c.pdfPage)||c.pdfPage<1||
   c.pdfPage>sources.get(c.sourceKey).pdfPageCount||
   c.sourceSha256!==sources.get(c.sourceKey).sha256)throw new TypeError('Untrusted PDF page review claim');
  const id=c.sourceKey+':'+c.pdfPage;
  if(seen.has(id))throw new TypeError('Duplicate human review claim');
  seen.add(id);
  const reviewers=Array.isArray(c.reviewers)&&c.reviewers.length===2&&
    c.reviewers.every(r=>exact(r,['reviewerRef','decision','reviewedOn'])&&
     ref.test(r.reviewerRef)&&r.decision==='APPROVE'&&date.test(r.reviewedOn))&&
    c.reviewers[0].reviewerRef!==c.reviewers[1].reviewerRef;
  if(c.tableCompared!==true||c.amendmentsChecked!==true||!reviewers){invalidClaims++;continue;}
  counts.set(c.sourceKey,counts.get(c.sourceKey)+1);
 }
 const existing=Array.isArray(manifest.coverageGaps)?manifest.coverageGaps:[];
 const unresolved=gaps.filter(g=>!existing.some(x=>x.kind===g&&x.status==='VERIFIED_COMPLETE'));
 return Object.freeze({
  schema:REVIEW_AUDIT_SCHEMA,status:'HUMAN_SOURCE_ACCEPTANCE_NOT_ESTABLISHED',
  totalPages:pages,claimEntries:claims.length,
  structurallyConsistentClaims:[...counts.values()].reduce((s,n)=>s+n,0),
  invalidClaims,independentlyAuthenticatedReviews:0,
  approvedProgrammeRecords:0,officialProgrammePublicationAllowed:false,databaseWrites:0,
  unresolvedGuideCategories:Object.freeze(unresolved),
  sourceSummary:Object.freeze(keys.map(k=>Object.freeze({sourceKey:k,pages:sources.get(k).pdfPageCount,
   metadataOnlyClaims:counts.get(k),independentlyAuthenticatedReviews:0}))),
  issues:Object.freeze([
   ...(invalidClaims?['UNSUBSTANTIATED_REVIEW_CLAIM']:[]),
   ...(claims.length<pages?['HUMAN_REVIEW_CLAIMS_INCOMPLETE']:[]),
   ...(unresolved.length?['OFFICIAL_GUIDES_AND_AMENDMENTS_INCOMPLETE']:[]),
   'INDEPENDENT_REVIEWER_AND_PDF_CHECK_PENDING'
  ])
 });
}
