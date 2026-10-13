/* Standalone validator for proposal data. Run: node proposals/validate-operations-reports.cjs */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const data = JSON.parse(fs.readFileSync(path.join(__dirname,'operations-36-reports.json'),'utf8'));
assert.equal(data.schema,'operations-reports-v1');
assert.equal(data.reports.length,36);
const ids = new Set(), allowedPriority = new Set(['P0','P1','P2']);
for(const [i,r] of data.reports.entries()){
  assert.equal(r.id,'OP-'+String(i+1).padStart(2,'0'));
  assert(!ids.has(r.id));ids.add(r.id);
  assert(allowedPriority.has(r.priority));
  assert(Number.isInteger(r.estimatedProgress) && r.estimatedProgress>=0 && r.estimatedProgress<=100);
  for(const k of ['title','engine','done','remaining','acceptance','evidenceSource','estimateType']) assert(typeof r[k]==='string'&&r[k].trim(),r.id+': '+k);
  assert.equal(r.liveVerified,false,'No unsupported live verification');
  assert.equal(r.closed,false,'No unsupported closure');
}
console.log('PASS: 36 complete report records, valid IDs, acceptance criteria and fail-closed states.');
