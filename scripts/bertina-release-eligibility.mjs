#!/usr/bin/env node
/**
 * Authorize an automatic Bertina release without conflating source-change scope
 * with production safety. All releases still pass the complete workflow's
 * backup/recovery, production schema, build and live-SHA checks.
 *
 * Scope: "full" allows API/runtime changes; "public_only" retains the previous
 * restriction. Classification failures, divergent history, invalid inputs
 * and unshipped-only diffs remain fail-closed.
 */
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {classifyGitDelta} from './bertina-auto-release-policy.mjs';

export function decideAutomaticRelease(delta, scope='full') {
  if (!['full','public_only'].includes(scope)) throw Error('Unknown automatic release scope');
  if (!delta || !delta.groups || typeof delta.canAutomaticallyDeploy!=='boolean')
    throw Error('Invalid release classification');
  const {public:published,controlled,unshipped}=delta.groups;
  if (!Array.isArray(published)||!Array.isArray(controlled)||!Array.isArray(unshipped))
    throw Error('Incomplete release classification');
  if (published.length+controlled.length===0)
    return {allowed:false,reason:'No deployable source changes'};
  if (scope==='public_only' && !delta.canAutomaticallyDeploy)
    return {allowed:false,reason:'Controlled changes require manual release in public_only mode'};
  return {allowed:true,reason:scope==='full'
    ? 'Full automatic release eligible for mandatory production preflight'
    : 'Public-only automatic release eligible for mandatory production preflight'};
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const [base,head]=process.argv.slice(2);
    const scope=process.env.BERTINA_AUTO_DEPLOY_SCOPE||'full';
    const delta=classifyGitDelta(base,head);
    const decision=decideAutomaticRelease(delta,scope);
    const lines=[
      'Automatic release scope: '+scope,
      'Live release SHA: '+base,
      'Target release SHA: '+head,
      'Public paths: '+delta.groups.public.length,
      'Controlled paths: '+delta.groups.controlled.length,
      'Unshipped paths: '+delta.groups.unshipped.length,
      'Decision: '+(decision.allowed?'ELIGIBLE_FOR_PREFLIGHT':'BLOCKED'),
      'Reason: '+decision.reason,
      ...delta.groups.controlled.slice(0,30).map(path=>'Controlled delta: '+path),
      'Eligibility is not a successful deploy: build, tests, backup custody, origin schema and checksum verification must still pass.'
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
