import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateEvidenceLedger} from '../scripts/jhela-evidence-ledger-audit.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const ledger=read('platform/jhela-gate-evidence-ledger-v1.json');
const roadmap=read('platform/jhela-international-roadmap-v1.json');
const fixture=()=>structuredClone(ledger);
const proof=(kind,domain)=>({
 id:'test-fixture-'+kind,kind,scope:'Only the independently verified journal stage',
 sourceAuthority:domain,artifactRef:'vault://nonproduction-fixture/stage-proof',
 sha256:'a'.repeat(64),observedAt:'2026-10-16T11:00:00Z',
 submittedByRole:'JournalManager',verifiedByRole:'IndependentAuditor',
 verifiedAt:'2026-10-16T12:00:00Z',validUntil:null,
 attestation:'simulated-independent-signed-record-for-test-only'
});
function verifiedFixture(){
 const j=fixture(),r=j.stageRecords.find(x=>x.id==='JH-06');
 r.status='VERIFIED';r.claimsAllowed=true;
 r.lastReviewedAt='2026-10-16T13:00:00Z';r.reviewedByRole='IndependentAuditor';
 r.evidence=[proof('INDEXING_AUTHORITY','https://doaj.org/'),proof('INDEPENDENT_AUDIT','vault://audit/review')];
 j.outcomes.certifiedStageCount=1;j.outcomes.unverifiedStageCount=9;
 return j;
}
test('new journal is never marked indexed, accredited or operational without evidence',()=>{
 const r=validateEvidenceLedger(ledger,roadmap);
 assert.equal(r.pass,true,JSON.stringify(r.errors));
 assert.equal(r.verified,0);assert.equal(r.unverified,10);
 assert.ok(ledger.stageRecords.every(x=>x.status==='UNVERIFIED'&&x.claimsAllowed===false&&x.evidence.length===0));
 assert.equal(ledger.futureOperations.privateAuditInterfaceNotBuilt,true);
});
test('attempt to invent an indexing award without proof is blocked',()=>{
 const j=fixture(),r=j.stageRecords.find(x=>x.id==='JH-08');
 r.status='VERIFIED';r.claimsAllowed=true;
 j.outcomes.certifiedStageCount=1;j.outcomes.unverifiedStageCount=9;
 const result=validateEvidenceLedger(j,roadmap);
 assert.equal(result.pass,false);
 assert.ok(result.errors.some(x=>x.includes('missing required evidence kind')));
});
test('verified entry requires independent observer and official index',()=>{
 const j=verifiedFixture();
 assert.equal(validateEvidenceLedger(j,roadmap).pass,true,'fully populated synthetic fixture should validate WITHOUT changing canonical data');
 j.stageRecords.find(x=>x.id==='JH-06').evidence[0].sourceAuthority='https://lookalike-doaj.example';
 assert.ok(validateEvidenceLedger(j,roadmap).errors.some(x=>x.includes('official authority')));
 const k=verifiedFixture();
 k.stageRecords.find(x=>x.id==='JH-06').evidence[0].verifiedByRole='JournalManager';
 assert.ok(validateEvidenceLedger(k,roadmap).errors.some(x=>x.includes('independently signed')));
});
test('do not allow secret/private manuscript payloads in certification metadata',()=>{
 const j=verifiedFixture();
 j.stageRecords.find(x=>x.id==='JH-06').evidence[0].manuscript='private participant transcript';
 assert.ok(validateEvidenceLedger(j,roadmap).errors.some(x=>x.includes('private payload')));
});
test('expired or unverified stages cannot advertise awards',()=>{
 const j=fixture();
 j.stageRecords[0].status='EXPIRED';j.stageRecords[0].claimsAllowed=true;
 assert.ok(validateEvidenceLedger(j,roadmap).errors.some(x=>x.includes('unverified stage cannot advertise verification')));
});
test('status totals and progress percentage must not be fictional',()=>{
 const j=fixture();j.outcomes.progressPercent=85;
 assert.ok(validateEvidenceLedger(j,roadmap).errors.some(x=>x.includes('percent estimate not permitted')));
});
