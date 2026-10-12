#!/usr/bin/env node
/**
 * Static, read-only audit for optional free resources.
 * Provider integrations, secrets, live metrics and deployment are outside this test.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'platform/free-resources-registry.json'),'utf8'));
const expected={GROWTH:8,TECHNICAL:12,SCHOLARLY:10};
const allowedModes=new Set(['MANUAL_REFERENCE','READ_API_CANDIDATE','CI_OPEN_SOURCE_CANDIDATE','ACCOUNT_SETUP_REQUIRED','CONDITIONAL_ELIGIBILITY']);
const allowedEngines=new Set(['ENG-01','ENG-02','ENG-03','ENG-05','ENG-06','ENG-10','ENG-11','ENG-13']);
const resources=data.resources||[];
assert.equal(data.schema,'free-resource-inventory-v1');
assert.equal(data.canonical_branch,'migration/bertina-linux6');
assert.equal(data.reporting?.no_dashboard_replacement,true);
assert.equal(data.reporting?.false_completion_prohibited,true);
assert.equal(data.reporting?.live_metrics,'UNAVAILABLE');
assert.equal(resources.length,30,'Expected all 30 selected resources');
const ids=new Set(),urls=new Set(),counts={GROWTH:0,TECHNICAL:0,SCHOLARLY:0};
let reuseLinks=0;
for(const r of resources){
 assert.match(r.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
 assert(!ids.has(r.id),'Duplicate resource ID: '+r.id);ids.add(r.id);
 assert.equal(typeof r.name,'string');
 assert(r.name.trim().length>=2);
 const parsed=new URL(r.official_url);
 assert.equal(parsed.protocol,'https:','Only HTTPS references permitted: '+r.id);
 assert(!parsed.username&&!parsed.password,'Credentials embedded in resource URL: '+r.id);
 assert(!urls.has(r.official_url),'Duplicate reference URL: '+r.id);urls.add(r.official_url);
 assert(Object.hasOwn(expected,r.category),'Invalid area for '+r.id);counts[r.category]++;
 assert(allowedEngines.has(r.owner_engine),'Unknown canonical owner for '+r.id);
 assert(allowedModes.has(r.access_path),'Unknown access classification for '+r.id);
 assert.equal(r.external_connection,'UNVERIFIED','Do not declare unverified providers active: '+r.id);
 assert.equal(r.automated_data_in_use,false,'No unverified external data ingestion: '+r.id);
 assert.equal(typeof r.purpose,'string');
 assert(r.purpose.length>15);
 assert(Array.isArray(r.existing_coverage_paths));
 for(const file of r.existing_coverage_paths){
   assert(!path.isAbsolute(file)&&!file.split('/').includes('..'),'Unsafe reuse reference');
   assert(fs.existsSync(path.join(root,file)),'Nonexistent existing coverage: '+r.id+' -> '+file);
   reuseLinks++;
 }
 assert(!/trial-only|wordpress plugin|paid subscription required/i.test(r.purpose),'Disallowed resource type: '+r.id);
}
assert.deepEqual(counts,expected,'Category counts changed');
assert(data.authority.includes('No network requests'),'Registry authority must remain read-only');
assert(data.privacy_note.includes('separate reviewed authorization'),'Provider data boundary missing');
const report={
 schema:'free-resource-audit-v1',
 source:'platform/free-resources-registry.json',
 result:'PASS',resources:resources.length,category_counts:counts,
 unverified_external_connections:resources.filter(r=>r.external_connection==='UNVERIFIED').length,
 active_external_connections:0,
 existing_coverage_references:reuseLinks,
 note:'A registry integrity pass does not establish active integration, free-plan eligibility, API operation or live website readiness.'
};
console.log(JSON.stringify(report,null,2));
