import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const readJson=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const readiness=readJson('platform/master-readiness.json');
const topology=readJson('platform/deployment-topology.json');
const allowed=new Set(readiness.status_values||[]);
const failures=[];

for(const track of readiness.tracks||[]){
 if(!track.id||!allowed.has(track.production_state)) failures.push('Invalid readiness track '+(track.id||'unknown'));
 if(!['CRITICAL','HIGH','MEDIUM','LOW'].includes(track.revenue_priority)) failures.push(track.id+': invalid revenue_priority');
 if(!Array.isArray(track.artifacts)||!track.artifacts.length) failures.push(track.id+': artifacts required');
 for(const artifact of track.artifacts||[]) if(!fs.existsSync(path.join(root,artifact))) failures.push(track.id+': missing artifact '+artifact);
 if(!Array.isArray(track.next_actions)||!track.next_actions.length) failures.push(track.id+': next_actions required');
 if(track.production_state==='LIVE'&&(track.external_blockers||[]).length) failures.push(track.id+': LIVE track cannot retain external blockers');
}
const serviceIds=new Set((topology.required_services||[]).map(x=>x.id));
for(const required of ['application_runtime','postgres','private_object_storage','transactional_email','backup_target','monitoring']) if(!serviceIds.has(required)) failures.push('deployment topology missing required service '+required);
if(topology?.deployment_contract?.staging_before_production!==true) failures.push('staging-before-production invariant missing');
if(topology?.deployment_contract?.database_public_ingress_prohibited!==true) failures.push('database public-ingress prohibition missing');
if(topology?.portability?.domain_logic_may_not_import_hosting_sdk!==true) failures.push('provider-neutral domain boundary missing');
if(topology?.backup_recovery?.restore_test_required!==true) failures.push('restore test gate missing');
const priorityRank={CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3};
const actionable=(readiness.tracks||[]).filter(x=>x.production_state!=='LIVE').sort((a,b)=>priorityRank[a.revenue_priority]-priorityRank[b.revenue_priority]||a.id.localeCompare(b.id)).map(x=>({id:x.id,state:x.production_state,priority:x.revenue_priority,next:x.next_actions?.[0],blocked:(x.external_blockers||[]).length>0}));
if(failures.length){console.error('Platform readiness failures ('+failures.length+')');for(const f of failures) console.error('✗ '+f);process.exit(1);}
console.log('Platform readiness control passed.');
console.log(JSON.stringify({as_of:readiness.as_of,tracks:readiness.tracks.length,actionable},null,2));
