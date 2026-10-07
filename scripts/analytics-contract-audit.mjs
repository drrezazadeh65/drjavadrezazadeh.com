import fs from 'node:fs';
const config=JSON.parse(fs.readFileSync('platform/analytics-config.json','utf8'));
const policy=JSON.parse(fs.readFileSync('platform/observability-policy.json','utf8'));
const source=fs.readFileSync('assets/js/analytics-adapter.js','utf8');
const failures=[];
if(config.provider!=='GA4') failures.push('analytics provider contract must be GA4');
if(config.enabled===true && !/^G-[A-Z0-9]{6,20}$/.test(String(config.measurement_id||''))) failures.push('enabled GA4 config requires a verified-looking Measurement ID');
if(config.enabled===false && config.measurement_id!==null) failures.push('disabled unverified GA4 config must not carry a guessed Measurement ID');
if(config.consent?.required!==true) failures.push('analytics consent must fail closed');
if(!source.includes("analytics_storage:'granted'")||!source.includes("ad_storage:'denied'")) failures.push('GA4 consent/ad-storage contract missing');
if(!source.includes("allow_google_signals:false")||!source.includes("allow_ad_personalization_signals:false")) failures.push('advertising signal suppression missing');
for(const token of ['email','phone','message','assessment','document','payment']){
  if(!config.prohibited_payload.join(' ').toLowerCase().includes(token)) failures.push('prohibited analytics payload policy missing '+token);
}
const policyEvents=new Set((policy.events||[]).filter(x=>x.client_event===true).map(x=>x.key));
for(const key of config.allowed_client_events||[]) if(!policyEvents.has(key)) failures.push('GA4 allowlist event absent from observability policy: '+key);
if(policy.rules?.raw_form_values_in_analytics!==false) failures.push('raw form values must remain prohibited');
if(failures.length){failures.forEach(x=>console.error('✗ '+x));process.exit(1);}
console.log('Analytics contract audit passed: provider disabled until verified property/Measurement ID + consent; '+config.allowed_client_events.length+' client events allow-listed.');
