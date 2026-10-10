import fs from 'node:fs';
import assert from 'node:assert/strict';
const registry=JSON.parse(fs.readFileSync('api/internal/operations-registry.json','utf8'));
assert.equal(registry.schema,'operations-registry-v2');assert.equal(registry.reports.length,36);assert.equal(registry.sourceSections.length,36);
const records=[...registry.reports,registry.dashboard],ids=new Set(records.map(r=>r.id));assert.equal(ids.size,37);
for(const [index,r] of registry.reports.entries())assert.equal(r.id,'OP-'+String(index+1).padStart(2,'0'));
for(const r of records){for(const key of ['title','titleFa','engine','remaining','acceptance','historicalClaims','blocker'])assert.equal(typeof r[key],'string',r.id+' '+key);assert.deepEqual(Object.keys(r.gates),['code','tests','production','evidence']);for(const id of r.dependencies)assert(ids.has(id)&&id!==r.id);}
const visited=new Set(),active=new Set();function visit(id){assert(!active.has(id),'Dependency cycle: '+id);if(visited.has(id))return;active.add(id);for(const dep of records.find(r=>r.id===id).dependencies)visit(dep);active.delete(id);visited.add(id);}for(const id of ids)visit(id);
for(const [i,section] of registry.sourceSections.entries()){assert.equal(section.number,i+1);assert(section.operations.length);for(const id of section.operations)assert(ids.has(id));}
assert.match(registry.reports[6].blocker,/اینماد/);assert.equal(registry.sourceSections[22].title,'Enamad');
assert.match(fs.readFileSync('api/internal/.htaccess','utf8'),/Require all denied/);
assert.match(fs.readFileSync('api/.htaccess','utf8'),/operations-schema/);
assert.match(fs.readFileSync('scripts/build-public-site.mjs','utf8'),/'proposals','work'/);
for(const page of ['fa/app/admin/index.html','en/account/admin/index.html']){const html=fs.readFileSync(page,'utf8');assert.match(html,/noindex,nofollow,noarchive/);assert.match(html,/id="ops-workspace" hidden/);assert.match(html,/\/api\/|operations-control\.js/);}
console.log('PASS: 36 operation records, separate admin track, 36 source mappings, acyclic dependencies and private artifact guards.');
