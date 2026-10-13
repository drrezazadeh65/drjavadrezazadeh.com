import fs from 'node:fs';
import assert from 'node:assert/strict';
const registry=JSON.parse(fs.readFileSync('api/internal/operations-registry.json','utf8'));
assert.equal(registry.schema,'operations-registry-v2');assert.equal(registry.reports.length,36);assert.equal(registry.sourceSections.length,36);
const records=[...registry.reports,registry.dashboard],ids=new Set(records.map(r=>r.id));assert.equal(ids.size,37);
for(const [index,r] of registry.reports.entries())assert.equal(r.id,'OP-'+String(index+1).padStart(2,'0'));
for(const r of records){for(const key of ['title','titleFa','engine','remaining','acceptance','historicalClaims','blocker'])assert.equal(typeof r[key],'string',r.id+' '+key);assert.deepEqual(Object.keys(r.gates),['code','tests','production','evidence']);for(const id of r.dependencies)assert(ids.has(id)&&id!==r.id);}
const visited=new Set(),active=new Set();function visit(id){assert(!active.has(id),'Dependency cycle: '+id);if(visited.has(id))return;active.add(id);for(const dep of records.find(r=>r.id===id).dependencies)visit(dep);active.delete(id);visited.add(id);}for(const id of ids)visit(id);
for(const [i,section] of registry.sourceSections.entries()){assert.equal(section.number,i+1);assert(section.operations.length);for(const id of section.operations)assert(ids.has(id));}
// Safeguard stable engine/action/report identities and fail-closed execution contracts.
assert.equal(registry.engines.length,13);
assert.equal(registry.actions.length,52);
const actionIds=new Set(registry.actions.map(a=>a.id));
assert.equal(actionIds.size,52,'Duplicate Action ID');
const engineIds=new Set(registry.engines.map(e=>e.id));
assert.equal(engineIds.size,13,'Duplicate engine ID');
for(const report of registry.reports){
  assert(actionIds.has(report.actionId),'Missing report Action: '+report.id);
  assert(engineIds.has(report.engineId),'Missing report engine: '+report.id);
}
let executable=0;
for(const action of registry.actions){
  assert(engineIds.has(action.responsibleEngine),'Orphan Action: '+action.id);
  for(const parent of action.legacyReportIds||[])assert(ids.has(parent),'Orphan report reference: '+action.id);
  if(action.supportedExecutor!==null && action.supportedExecutor!==undefined){
    executable++;
    assert.equal(action.supportedExecutor.type,'readonly_snapshot','Non-read-only executor requires independent review: '+action.id);
    assert.equal(action.supportedExecutor.function,'operationsSignals','Unexpected executor function: '+action.id);
    assert.equal(action.supportedExecutor.writes,false,'Mutation executor forbidden by this contract: '+action.id);
    assert.equal(action.approvalPolicy.required,false,'Approval-required Action cannot auto-run: '+action.id);
  }
}
assert.equal(executable,7,'Changes to the seven executor allowlist require explicit review');

const approvedReadOnlyIds = [
  'ENG-01.ACT-011','ENG-05.ACT-008','ENG-05.ACT-009','ENG-05.ACT-010',
  'ENG-07.ACT-007','ENG-11.ACT-008','ENG-11.ACT-009'
].sort();
assert.deepEqual(
  registry.actions.filter(a=>a.supportedExecutor).map(a=>a.id).sort(),
  approvedReadOnlyIds,
  'The identity of the seven read-only executors cannot silently change'
);
const nonExecutable=registry.actions.filter(a=>!a.supportedExecutor);
assert.equal(nonExecutable.length,45,'The 45 approval-gated Action contracts require independent review');
assert.equal(nonExecutable.filter(a=>a.riskCategory==='HIGH').length,35,'HIGH backlog drift');
assert.equal(nonExecutable.filter(a=>a.riskCategory==='CRITICAL').length,10,'CRITICAL backlog drift');
for(const action of registry.actions){
  const policy=action.approvalPolicy||{};
  assert.equal(policy.serverEnforced,true,'Missing server approval policy: '+action.id);
  assert.equal(policy.cannotBeDowngradedByLearning,true,'Unsafe approval downgrade: '+action.id);
  if(!action.supportedExecutor){
    assert(['manual','approval-required'].includes(action.executionType),'Unsafe execution type: '+action.id);
    assert(['HIGH','CRITICAL'].includes(action.riskCategory),'Unreviewed backlog risk: '+action.id);
    assert.equal(policy.required,true,'Missing approval for an unimplemented Action: '+action.id);
  }else{
    assert.equal(action.executionType,'automatic','Read-only executor changed type: '+action.id);
    assert.equal(action.riskCategory,'LOW','Read-only executor changed risk: '+action.id);
    assert.equal(action.scoringScope,'observation','Read-only Action gained acceptance authority: '+action.id);
    assert.equal(policy.required,false,'Read-only Action unexpectedly requires approval: '+action.id);
    assert.equal(action.supportedExecutor.endpoint,'/api/admin/operations','Executor endpoint drift: '+action.id);
    assert(Array.isArray(action.supportedExecutor.signalIds)
      && action.supportedExecutor.signalIds.length>0
      && action.supportedExecutor.signalIds.length<=20
      && new Set(action.supportedExecutor.signalIds).size===action.supportedExecutor.signalIds.length,
      'Unsafe executor signals: '+action.id);
  }
}

assert.match(registry.reports[6].blocker,/اینماد/);assert.equal(registry.sourceSections[22].title,'Enamad');
assert.match(fs.readFileSync('api/internal/.htaccess','utf8'),/Require all denied/);
assert.match(fs.readFileSync('api/.htaccess','utf8'),/operations-schema/);
assert.match(fs.readFileSync('scripts/build-public-site.mjs','utf8'),/'proposals','work'/);
for(const page of ['fa/app/admin/index.html','en/account/admin/index.html']){const html=fs.readFileSync(page,'utf8');assert.match(html,/noindex,nofollow,noarchive/);assert.match(html,/id="ops-workspace" hidden/);assert.match(html,/\/api\/|operations-control\.js/);}
console.log('PASS: 36 operation records, separate admin track, 36 source mappings, acyclic dependencies and private artifact guards.');
