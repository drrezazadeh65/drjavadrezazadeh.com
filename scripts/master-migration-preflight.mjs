import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const topology=read('platform/deployment-topology.json');
const backend=read('platform/backend-deployment-policy.json');
const health=read('platform/runtime-health-contract.json');
const payments=read('platform/payment-provider-registry.json');
const modules=read('platform/module-registry.json');
const failures=[];

const migrationDir=path.join(root,'platform','db','migrations');
const migrations=fs.readdirSync(migrationDir).filter(x=>/^\d{3}_.+\.sql$/.test(x)).sort();
const nums=migrations.map(x=>Number(x.slice(0,3)));
for(let i=0;i<nums.length;i++){
 const expected=i+1;
 if(nums[i]!==expected) failures.push('Migration sequence gap/duplicate: expected '+String(expected).padStart(3,'0')+' got '+String(nums[i]||'missing').padStart(3,'0'));
}
const migrationHead=migrations.at(-1)||null;

for(const k of topology.environment_contract?.required||[]){
 if((backend.public_config_allowlist||[]).includes(k)&&/URL|ORIGIN|ENV/.test(k)) continue;
 if(k.includes('SECRET')||k.includes('KEY')||k==='DATABASE_URL'){
   if(!(backend.secret_names||[]).includes(k)) failures.push('Required sensitive runtime variable missing from secret policy: '+k);
 }
}
for(const p of payments.providers||[]) if(p.enabled===true) failures.push('Payment provider enabled before credential/reconciliation production gate: '+p.key);
if(health.deployment_gate?.readiness_must_pass_before_traffic_switch!==true) failures.push('Readiness-before-traffic gate missing');
if(health.deployment_gate?.restore_test_must_pass_before_first_production_launch!==true) failures.push('Restore-before-first-production gate missing');
if(topology.deployment_contract?.migrations_before_app_promotion!==true) failures.push('Migration-before-app-promotion gate missing');
if(topology.deployment_contract?.rollback_artifact_required!==true) failures.push('Rollback artifact gate missing');
for(const m of modules.modules||[]){
 if(['PREVALIDATION','PREINTEGRATION','STAGING','PLANNED_OFF'].includes(m.state)&&m.id==='golden-talent-evidence'&&m.state!=='PREVALIDATION') failures.push('Golden Talent validation state drift');
}

const productionMode=process.argv.includes('--production-env');
if(productionMode){
 for(const key of topology.environment_contract?.required||[]){
  if(!String(process.env[key]||'').trim()) failures.push('Production environment missing '+key);
 }
 if(process.env.APP_ENV!=='PRODUCTION') failures.push('APP_ENV must equal PRODUCTION in production preflight');
 if(!/^https:\/\//.test(process.env.PUBLIC_ORIGIN||'')) failures.push('PUBLIC_ORIGIN must be HTTPS');
 if(!/^https:\/\//.test(process.env.PUBLIC_APP_ORIGIN||'')) failures.push('PUBLIC_APP_ORIGIN must be HTTPS');
 if(!/^https:\/\//.test(process.env.PUBLIC_API_ORIGIN||'')) failures.push('PUBLIC_API_ORIGIN must be HTTPS');
}

const result={mode:productionMode?'PRODUCTION_ENV':'REPOSITORY',migration_count:migrations.length,migration_head:migrationHead,required_services:(topology.required_services||[]).map(x=>x.id),payment_providers_enabled:(payments.providers||[]).filter(x=>x.enabled).map(x=>x.key),failures};
console.log(JSON.stringify(result,null,2));
if(failures.length) process.exit(1);
