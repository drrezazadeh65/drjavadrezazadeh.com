import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sources = JSON.parse(fs.readFileSync('platform/konkur-1405-sources.json','utf8')).sources;
const sql = fs.readFileSync('docs/migrations/20261021_konkur_1405_page_anchors_DRAFT_PROPOSED.sql','utf8');
const executable = sql.replace(/--[^\n]*/g,'');
const codes = Object.freeze({
  humanities:'HUMANITIES',experimental:'EXPERIMENTAL',mathematics:'MATHEMATICS',
  arts:'ARTS',appendices:'APPENDICES',records_based:'RECORDS_BASED'
});

test('reuses exactly the six fingerprinted 1405 PDFs and 2,412 existing page counts',()=>{
  assert.equal(sources.length,6);
  assert.equal(sources.reduce((n,s)=>n+s.pdfPageCount,0),2412);
  assert.equal((executable.match(/AS document_code/g)||[]).length,6);
  assert.equal((executable.match(/UNION ALL SELECT 'SANJESH_1405_/g)||[]).length,5);
  for(const source of sources){
    assert.ok(executable.includes("'SANJESH_1405_"+codes[source.key]+"'"),source.key);
    assert.ok(executable.includes("'"+source.fileId+"'"),source.key);
    assert.ok(executable.includes("'"+source.sha256+"'"),source.key);
    assert.ok(executable.includes(" "+source.pdfPageCount+" AS verified_pdf_pages"),source.key);
  }
});

test('stages only unreviewed, deduplicated, source-matched page anchors',()=>{
  assert.match(executable,/INSERT INTO eco_admission_document_pages/);
  assert.equal((executable.match(/\bINSERT INTO\b/g)||[]).length,1);
  assert.match(executable,/page_review_state\)/);
  assert.match(executable,/SELECT UUID\(\), d\.id, digits\.page_no, 'UNREVIEWED'/);
  assert.match(executable,/d\.original_pdf_sha256 = expected\.source_sha256/);
  assert.match(executable,/d\.source_external_id = expected\.source_external_id/);
  assert.match(executable,/d\.pdf_page_count = expected\.verified_pdf_pages/);
  assert.match(executable,/NOT EXISTS\s*\(\s*SELECT 1 FROM eco_admission_document_pages/);
  assert.match(executable,/existing\.document_id = d\.id AND existing\.pdf_page_number = digits\.page_no/);
  assert.doesNotMatch(executable,/INSERT INTO eco_admission_(?:programme_offerings|rule_versions|offering_conditions|import_rows)/);
  assert.doesNotMatch(executable,/\b(?:UPDATE|DELETE|REPLACE|DROP|ALTER|TRUNCATE|GRANT|REVOKE)\b/i);
  assert.doesNotMatch(executable,/\bpage_review_state\s*=\s*['"](?:REVIEWED|DISCREPANT)['"]/i);
  assert.doesNotMatch(executable,/\bINSERT INTO\s+eco_admission_documents/i);
});
