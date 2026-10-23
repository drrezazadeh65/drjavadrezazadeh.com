#!/usr/bin/env node
/**
 * Authorize an automatic Bertina release without conflating source-change scope
 * with production safety. Releases require production schema, build and
 * live-SHA checks; hosting backups are owned and managed by Bertina.
 *
 * Scope: full is the owner-authorized development default (2026-10-14).
 * Eligible API/runtime changes may undergo guarded automatic preflight;
 * deployment authority, credentials and SQL migrations remain manually gated.
 * All malformed inputs fail closed.
 */
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {classifyGitDelta} from './bertina-auto-release-policy.mjs';

// Changes to the deployment authority itself and server/database provisioning
// must be deliberately activated, even in full development mode. Ordinary API,
// JavaScript, content and platform implementation changes remain eligible.
export function requiresManualActivation(path) {
  if (typeof path !== 'string') return true;
  return /^(?:\.github\/|database\/|migrations\/|docs\/governance\/|scripts\/bertina-(?:auto-release-policy|release-eligibility|private-recovery-gate|controlled-cpanel-gate|prune-backups)\.(?:mjs|php|py)$|scripts\/(?:build-public-site|operations-release-evidence)\.mjs$)/.test(path)
    || /(?:^|\/)(?:\.env(?:\.[^/]*)?|config\.local\.php|secrets?\.[^/]+|(?:id_rsa|id_ed25519)|[^/]+\.(?:pem|p12|pfx|key|sql|bak|dump))$/i.test(path)
    || /(?:^|\/)(?:\.htaccess|\.user\.ini|php\.ini|web\.config)$/i.test(path)
    || ['.bertina-backup-trigger','AGENTS.md'].includes(path);
}


// One-time owner activation solves the initial GitHub/live-SHA bootstrap
// without making arbitrary CI, recovery or database edits auto-deployable.
// The authority manifest and deploy trigger must be the ONLY files in the
// final owner-authored commit. The manifest binds that commit to its exact
// parent and the live fingerprint; it must not exist in the parent tree.
const BOOTSTRAP_ALLOWED_AUTHORITY = new Set([
  '.github/workflows/deploy-bertina.yml',
  '.github/workflows/bertina-deployment-readiness.yml',
  'scripts/bertina-release-eligibility.mjs',
  'scripts/build-public-site.mjs',
  '.bertina-bootstrap-authorization.json'
]);
const BOOTSTRAP_FINAL_FILES = [
  '.bertina-bootstrap-authorization.json',
  '.bertina-deploy-trigger'
];

export function verifyOneTimeOwnerBootstrap(delta, context) {
  if (!context || !delta?.groups || !Array.isArray(context.finalFiles)) return false;
  const authorization=context.authorization;
  if (!authorization || typeof authorization!=='object') return false;
  if (context.event!=='push' || context.actor!=='drrezazadeh65' ||
      context.ref!=='refs/heads/migration/bertina-linux6') return false;
  if (authorization.schema!=='bertina-one-time-owner-bootstrap-v1' ||
      authorization.owner!=='drrezazadeh65' ||
      authorization.acknowledgement!=='ACCEPT_UNTESTED_RESTORE_RISK_V5') return false;
  if (!/^[a-f0-9]{40}$/.test(context.base||'') ||
      !/^[a-f0-9]{40}$/.test(context.head||'') ||
      !/^[a-f0-9]{40}$/.test(context.parent||'') ||
      authorization.expectedLiveSha!==context.base ||
      authorization.approvedParentSha!==context.parent ||
      context.head!==delta.head || context.base!==delta.base ||
      context.authorizationExistedInParent!==false) return false;
  if (JSON.stringify([...new Set(context.finalFiles)].sort())!==
      JSON.stringify(BOOTSTRAP_FINAL_FILES.slice().sort())) return false;
  const paths=[...delta.groups.public,...delta.groups.controlled,...delta.groups.unshipped];
  if (!paths.includes('.bertina-bootstrap-authorization.json') ||
      !paths.includes('.bertina-deploy-trigger')) return false;
  const guarded=paths.filter(requiresManualActivation);
  if (!guarded.length || guarded.some(p=>!BOOTSTRAP_ALLOWED_AUTHORITY.has(p))) return false;
  return true;
}

function runGitBootstrap(args) {
  const run=spawnSync('git',args,{encoding:'utf8',maxBuffer:100000});
  if(run.error||run.status!==0) throw Error('Unable to verify owner bootstrap Git evidence');
  return run.stdout.trim();
}

function getOneTimeBootstrapEvidence(base,head) {
  // Fail closed on any untrusted environment, malformed or stale manifest.
  try {
    if (process.env.GITHUB_EVENT_NAME!=='push' ||
        process.env.GITHUB_ACTOR!=='drrezazadeh65' ||
        process.env.GITHUB_REF!=='refs/heads/migration/bertina-linux6') return null;
    if (runGitBootstrap(['rev-parse','HEAD'])!==head) return null;
    const parent=runGitBootstrap(['rev-parse',head+'^']);
    const finalFiles=runGitBootstrap(['diff','--name-only','--no-renames',parent,head]).split('\n').filter(Boolean);
    const existed=spawnSync('git',['cat-file','-e',parent+':.bertina-bootstrap-authorization.json'],{encoding:'utf8'});
    if (existed.error || existed.status===0) return null;
    const authorization=JSON.parse(fs.readFileSync('.bertina-bootstrap-authorization.json','utf8'));
    return {event:process.env.GITHUB_EVENT_NAME,actor:process.env.GITHUB_ACTOR,
      ref:process.env.GITHUB_REF,base,head,parent,finalFiles,authorization,
      authorizationExistedInParent:false};
  } catch { return null; }
}

export function decideAutomaticRelease(delta, scope='full', bootstrapContext=null) {
  if (!['full','public_only'].includes(scope)) throw Error('Unknown automatic release scope');
  if (!delta || !delta.groups || typeof delta.canAutomaticallyDeploy!=='boolean')
    throw Error('Invalid release classification');
  const {public:published,controlled,unshipped}=delta.groups;
  if (!Array.isArray(published)||!Array.isArray(controlled)||!Array.isArray(unshipped))
    throw Error('Incomplete release classification');
  if (published.length+controlled.length===0)
    return {allowed:false,reason:'No deployable source changes'};
  const manual=[...published,...controlled,...unshipped].filter(requiresManualActivation);
  const ownerBootstrap=scope==='full' && verifyOneTimeOwnerBootstrap(delta,bootstrapContext);
  if(manual.length && !ownerBootstrap)
    return {allowed:false,reason:'Deployment authority or server/database provisioning requires deliberate activation',manual};
  if (scope==='public_only' && !delta.canAutomaticallyDeploy)
    return {allowed:false,reason:'Controlled changes require manual release in public_only mode'};
  return {allowed:true,reason:ownerBootstrap
    ? 'One-time owner-authorized activation eligible for mandatory production preflight'
    : scope==='full'
      ? 'Full automatic release eligible for mandatory production preflight'
      : 'Public-only automatic release eligible for mandatory production preflight'};
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const [base,head]=process.argv.slice(2);
    const scope=process.env.BERTINA_AUTO_DEPLOY_SCOPE||'full';
    const delta=classifyGitDelta(base,head);
    const decision=decideAutomaticRelease(delta,scope,getOneTimeBootstrapEvidence(base,head));
    // Preserve the permanently frozen successful deployment workflow blob.
    // Public-URL immutability remains independently ENFORCED at the existing
    // mandatory eligibility preflight step; a guarded release never bypasses
    // the owner's newer frozen URL permanence law.
    if(decision.allowed){
      const urlGuard=spawnSync(process.execPath,
        ['scripts/jr-immutable-url-guard.mjs'],
        {encoding:'utf8',maxBuffer:128*1024,timeout:180000});
      if(urlGuard.error || urlGuard.status!==0)
        throw new Error('Immutable public URL guard blocked release');
      console.log('Immutable public URL guard accepted reviewed source routes.');
    }
    const lines=[
      'Automatic release scope: '+scope,
      'Live release SHA: '+base,
      'Target release SHA: '+head,
      'Public paths: '+delta.groups.public.length,
      'Controlled paths: '+delta.groups.controlled.length,
      'Unshipped paths: '+delta.groups.unshipped.length,
      'Decision: '+(decision.allowed?'ELIGIBLE_FOR_PREFLIGHT':'BLOCKED'),
      'Reason: '+decision.reason,
      ...(decision.manual||[]).slice(0,30).map(path=>'Manual activation required: '+path),
      ...delta.groups.controlled.slice(0,30).map(path=>'Controlled delta: '+path),
      'Eligibility is not a successful deploy: build, tests, hosting checks, origin schema and checksums must still pass.'
    ];
    for(const line of lines) console.log(line);
    if(process.env.GITHUB_STEP_SUMMARY)
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
    if(!decision.allowed)process.exitCode=1;
  } catch(error) {
    console.error('Automatic production release refused: '+error.message);
    process.exitCode=1;
  }
}
