/* JHELA ten-stage academic evidence ledger contract.
 * Zero source-level evidence grants no production/indexing status.
 * No private manuscript files, reviewer names, credentials or attachments are accepted here.
 */
import fs from 'node:fs';
const pattern=/^[a-f0-9]{64}$/;
const isDate=x=>typeof x==='string'&&!Number.isNaN(Date.parse(x))&&/^\d{4}-\d\d-\d\dT/.test(x);
const official={
  "JH-06":['doaj.org'],"JH-08":['scopus.com','elsevier.com'],
  "JH-09":['clarivate.com','webofscience.com'],
  "JH-10":['clarivate.com','webofscience.com','scopus.com','elsevier.com']
};
function officialDomain(url,stage){
 if(!official[stage])return true;
 try{const u=new URL(url);return u.protocol==='https:'&&official[stage].some(x=>u.hostname===x||u.hostname.endsWith('.'+x));}
 catch{return false;}
}
export function validateEvidenceLedger(ledger,roadmap){
 const errors=[];
 const fail=x=>errors.push(x);
 if(ledger.schema!=='jhela-gate-evidence-ledger-v1')fail('invalid evidence registry schema');
 if(ledger.storageBoundary?.rawEvidenceInRepository!==false||ledger.storageBoundary?.noManuscriptText!==true||ledger.storageBoundary?.noReviewerIdentity!==true||ledger.storageBoundary?.noParticipantData!==true)fail('private evidence must never be published in repo');
 if(ledger.futureOperations?.privateAuditInterfaceNotBuilt!==true||ledger.futureOperations?.realTimeDataConnected!==false)fail('do not imply audited live service');
 const phases=roadmap?.phases||[],records=ledger.stageRecords||[];
 if(phases.length!==10||records.length!==10)fail('ten-stage source and evidence registry required');
 if(new Set(records.map(x=>x.id)).size!==records.length)fail('duplicated stage');
 let verified=0,unverified=0;
 for(const phase of phases){
  const r=records.find(x=>x.id===phase.id);
  if(!r){fail('missing '+phase.id);continue;}
  if(!ledger.acceptedStatuses.includes(r.status))fail('invalid stage status '+r.id);
  if(!Array.isArray(r.requiredEvidenceKinds)||!r.requiredEvidenceKinds.length||!r.requiredEvidenceKinds.every(k=>ledger.acceptedEvidenceKinds.includes(k)))fail('required kinds invalid '+r.id);
  if(!Array.isArray(r.evidence))fail('evidence records invalid '+r.id);
  const proofs=Array.isArray(r.evidence)?r.evidence:[];
  if(r.status==='VERIFIED'){
   verified++;
   if(r.claimsAllowed!==true)fail('verified evidence status conflicts with public claim state '+r.id);
   if(!isDate(r.lastReviewedAt)||!r.reviewedByRole)fail('verified stage missing dated independent review '+r.id);
   const kinds=new Set();
   for(const e of proofs){
    if(!e||!ledger.acceptedEvidenceKinds.includes(e.kind)||!pattern.test(e.sha256||'')||!e.artifactRef||!e.sourceAuthority||!isDate(e.observedAt)||!isDate(e.verifiedAt)||!e.attestation||!e.verifiedByRole||!e.submittedByRole||e.verifiedByRole===e.submittedByRole){
      fail('missing independently signed evidence metadata '+r.id);continue;
    }
    if(e.kind==='INDEXING_AUTHORITY'&&!officialDomain(e.sourceAuthority,r.id))fail('indexing claim not supported by official authority '+r.id);
    if(e.validUntil!==null&&e.validUntil!==undefined&&(!isDate(e.validUntil)||Date.parse(e.validUntil)<Date.parse(e.verifiedAt)))fail('incorrect evidence expiry '+r.id);
    if('raw' in e||'manuscript' in e||'reviewerEmail' in e||'privateFilePath' in e||'apiKey' in e)fail('private payload in evidence metadata '+r.id);
    kinds.add(e.kind);
   }
   for(const needed of r.requiredEvidenceKinds)if(!kinds.has(needed))fail('missing required evidence kind '+needed+' '+r.id);
  }else{
   unverified++;
   if(r.claimsAllowed!==false)fail('unverified stage cannot advertise verification '+r.id);
   if(r.status==='UNVERIFIED'&&proofs.length>0)fail('unverified stage has unreviewed evidence without correct status '+r.id);
   if(r.status==='EXPIRED'&&r.claimsAllowed!==false)fail('expired claim not revoked '+r.id);
  }
 }
 if(ledger.outcomes?.certifiedStageCount!==verified||ledger.outcomes?.unverifiedStageCount!==unverified)fail('outcomes do not reflect stage evidence status');
 if(ledger.outcomes?.progressPercent!==null)fail('percent estimate not permitted without denominator and independent performance data');
 return {pass:errors.length===0,errors,stageCount:records.length,verified,unverified,sourceOnly:true};
}
if(process.argv[1]&&process.argv[1].endsWith('jhela-evidence-ledger-audit.mjs')){
 const ledger=JSON.parse(fs.readFileSync('platform/jhela-gate-evidence-ledger-v1.json','utf8'));
 const roadmap=JSON.parse(fs.readFileSync('platform/jhela-international-roadmap-v1.json','utf8'));
 const result=validateEvidenceLedger(ledger,roadmap);
 console.log(JSON.stringify({schema:ledger.schema,...result},null,2));
 if(!result.pass)process.exitCode=1;
}
