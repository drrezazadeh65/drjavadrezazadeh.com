/**
 * Production immutability gate: all Bertina host-writing GitHub jobs must be
 * explicit, manually dispatched actions. This audits events, not secret values.
 *
 * It does not assert anything about off-GitHub hooks or host control-panel
 * settings. It prevents reintroducing the old trigger-file push path.
 */
import fs from 'node:fs';
import path from 'node:path';

const directory=path.resolve('.github/workflows');
const mandatoryManual=new Set([
  'deploy-bertina.yml',
  'bertina-private-backup.yml',
  'bertina-one-time-email-proof.yml',
  'bertina-commerce-schema-migrate.yml',
  'bertina-ftps-data-diagnostic.yml',
  'bertina-php-cache-diagnostic.yml',
  'bertina-autossl.yml'
]);
const errors=[];
function eventSection(source){
  const lines=source.replace(/\r\n/g,'\n').split('\n');
  const at=lines.findIndex(line=>/^on:\s*(?:#.*)?$/.test(line));
  if(at<0)return '';
  const out=[];
  for(let i=at+1;i<lines.length;i++){
    if(/^[A-Za-z][\w-]*:\s*(?:$|[^#])/.test(lines[i]))break;
    out.push(lines[i]);
  }
  return out.join('\n');
}
function triggers(section){
  return [...section.matchAll(/^  ([\w-]+):/gm)].map(m=>m[1]);
}
const files=fs.readdirSync(directory).filter(n=>/\.ya?ml$/.test(n)).sort();
for(const filename of files){
  const source=fs.readFileSync(path.join(directory,filename),'utf8');
  const events=triggers(eventSection(source));
  // These commands write scripts or content over a verified host channel.
  const remoteUpload=/\blftp\b[\s\S]*?\bput\s+|set ftp:ssl-force true[\s\S]*?\bput\s+/i.test(source)
    || /(?:^|\n)\s*(?:scp|rsync|sftp)\b[\s\S]*?(?:public_html|BERTINA_FTP)/m.test(source);
  const sensitive=mandatoryManual.has(filename)||remoteUpload;
  if(!sensitive)continue;
  if(events.some(e=>e!=='workflow_dispatch')){
    errors.push(filename+': host-changing workflow must be manual-only, found '+events.join(','));
  }
  if(!events.includes('workflow_dispatch')){
    errors.push(filename+': missing manual workflow_dispatch event');
  }
  if(filename==='deploy-bertina.yml'){
    // Explicit owner 2026-10-17 order: ALL accepted masterplan work must be
    // verified BEFORE production release. Protect this guard against removal
    // in later well-intended source or workflow refactors.
    const masterplanGate=source.indexOf('node scripts/masterplan-100-release-gate.mjs');
    const firstProductionAction=source.indexOf('Authorize the exact recovery policy before any deploy activity');
    if(masterplanGate<0||firstProductionAction<0||masterplanGate>=firstProductionAction)
      errors.push(filename+': mandatory 100% masterplan gate missing or not first');
    if(!/github\.actor == 'drrezazadeh65'/.test(source)
       ||!/github\.event_name == 'workflow_dispatch'/.test(source))
      errors.push(filename+': final release must be owner-only and manually dispatched');
    if(!/owner_masterplan_final_confirmation:/.test(source))
      errors.push(filename+': explicit owner masterplan final confirmation missing');
  }
  if(mandatoryManual.has(filename)&&filename==='bertina-private-backup.yml' &&
     !/github\.actor == 'drrezazadeh65'/.test(source)){
    errors.push(filename+': owner actor restriction missing');
  }
  if(mandatoryManual.has(filename)&&filename==='bertina-one-time-email-proof.yml' &&
     !/github\.actor == 'drrezazadeh65'/.test(source)){
    errors.push(filename+': owner actor restriction missing');
  }
}
for(const filename of mandatoryManual){
  if(!files.includes(filename))errors.push('Required release boundary not found: '+filename);
}
if(errors.length){
  console.error('PRODUCTION_WRITE_TRIGGER_AUDIT FAILED\n'+errors.join('\n'));
  process.exitCode=1;
}else{
  console.log('PRODUCTION_WRITE_TRIGGER_AUDIT PASS: '+files.length+
    ' workflow files inspected; known host-mutating jobs require deliberate manual dispatch.');
  console.log('Scope excludes external host-side schedulers, cPanel hooks and repository administration settings.');
}
