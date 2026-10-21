import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build1405ReviewQueue,render1405ReviewQueueCsv} from '../scripts/konkur-1405-review-queue.mjs';
const manifest=JSON.parse(fs.readFileSync('platform/konkur-1405-sources.json','utf8'));
test('six official-PDF fingerprints produce 2412 UNREVIEWED page anchors, never approved entries',()=>{
 const q=build1405ReviewQueue(manifest);
 assert.equal(q.counts.length,6);
 assert.equal(q.totalPages,2412);
 assert.equal(q.rows.length,2412);
 assert.equal(q.reviewedPages,0);
 assert.equal(q.officialProgrammeRecordsApproved,0);
 assert.equal(q.databaseWrites,0);
 assert.equal(q.mayPublish,false);
 assert.equal(q.sourcePdfContentsIncluded,false);
 assert.ok(Object.isFrozen(q.rows));
 assert.ok(q.rows.every(row=>row.reviewState==='UNREVIEWED'&&row.pageHumanVerified===false&&row.programmeRowsApproved===0));
 const unique=new Set(q.rows.map(r=>r.sourceKey+':'+r.pdfPage));
 assert.equal(unique.size,q.totalPages);
 assert.equal(q.counts.reduce((n,s)=>n+s.pages,0),2412);
});
test('CSV handoff is confined to metadata and blank human-review fields',()=>{
 const q=build1405ReviewQueue(manifest),csv=render1405ReviewQueueCsv(q);
 assert.equal(csv.charCodeAt(0),0xfeff);
 const lines=csv.trim().split('\r\n');
 assert.equal(lines.length,2413);
 assert.match(lines[0],/source_table_reviewed_by_human/);
 assert.ok(lines[1].includes('"UNREVIEWED"'));
 assert.ok(lines[1].endsWith(',"","","",""'));
 for(const src of manifest.sources){
  assert.ok(csv.includes(src.sha256));
  assert.ok(!csv.includes(src.fileId),'private Drive reference was exposed');
 }
 assert.doesNotMatch(csv,/user_email|national_id|verified_programme_code|admission_probability/i);
});
test('altered source counts, duplicated PDFs or fabricated human sign-offs fail closed',()=>{
 const clone=()=>JSON.parse(JSON.stringify(manifest));
 let m=clone();m.sources[1].key=m.sources[0].key;
 assert.throws(()=>build1405ReviewQueue(m),TypeError);
 m=clone();m.sources[2].pdfPageCount++;
 assert.throws(()=>build1405ReviewQueue(m),TypeError);
 m=clone();m.sources[2].activeForEligibility=true;
 assert.throws(()=>build1405ReviewQueue(m),TypeError);
 m=clone();m.sources[0].criticalTablesVerification='COMPLETE';
 assert.throws(()=>build1405ReviewQueue(m),TypeError);
 m=clone();m.inventoryAudit.programmeRecordsApproved=1;
 assert.throws(()=>build1405ReviewQueue(m),TypeError);
 const q=build1405ReviewQueue(manifest);
 const altered={...q,rows:[{...q.rows[0],pageHumanVerified:true},...q.rows.slice(1)]};
 assert.throws(()=>render1405ReviewQueueCsv(altered),TypeError);
});
