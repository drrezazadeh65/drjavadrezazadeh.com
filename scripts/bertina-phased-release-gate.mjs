#!/usr/bin/env node
/**
 * Owner-directed phase-1 Bertina publication, WITHOUT falsifying 100% masterplan evidence.
 * This does not deploy. The existing manual owner workflow still performs CI, TLS,
 * bank schema, backup custody/recovery, exact live SHA and file checksum checks.
 * PDF custody, private KYC evidence and SQL migrations remain deferred.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const PHASED_APPROVAL_PHRASE='I_APPROVE_GUARDED_LIVE_AUDIT_RELEASE_WITH_PDF_AND_SQL_DEFERRED';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SHA=/^[a-f0-9]{40}$/;
const requireText=(root,file)=>fs.readFileSync(path.join(root,file),'utf8');
export function assessPhasedRelease(input={},root=ROOT) {
  const errors=[];
  const check=(ok,reason)=>{if(!ok)errors.push(reason);};
  const sha=input.targetSha;
  check(input.scope==='phased_live_audit','Phased release scope must be selected.');
  check(input.event==='workflow_dispatch'&&input.actor==='drrezazadeh65'
    &&input.ref==='refs/heads/migration/bertina-linux6',
    'Only the canonical owner may start a manual release from the canonical branch.');
  check(typeof sha==='string'&&SHA.test(sha)
    &&input.approvedCommit===sha,'Exact approved source SHA must match the workflow checkout.');
  check(typeof input.expectedLiveSha==='string'&&SHA.test(input.expectedLiveSha)
    &&input.expectedLiveSha!==sha,'Exact previous live SHA must be supplied.');
  check(input.confirmation===PHASED_APPROVAL_PHRASE,
    'Explicit single-release owner confirmation is required.');
  check(['signed_restore','owner_cpanel_custody'].includes(input.recoveryMode),
    'Phased release needs signed recovery or witnessed private cPanel backup custody; hosting_managed without inspection is not enough.');
  if(input.recoveryMode==='owner_cpanel_custody')
    check(input.ownerAcknowledgement==='ACCEPT_UNTESTED_RESTORE_RISK_V5',
      'Owner must explicitly accept that cPanel custody is not a restore test.');
  try {
    const gate=JSON.parse(requireText(root,'docs/governance/MASTERPLAN_100_RELEASE_ACCEPTANCE.json'));
    check(gate.schema==='owner-masterplan-100-acceptance-v1'
      &&gate.canonicalRepository==='drrezazadeh65/drjavadrezazadeh.com'
      &&gate.canonicalBranch==='migration/bertina-linux6','Wrong masterplan provenance.');
    check(Array.isArray(gate.verifiedGates)&&gate.verifiedGates.length===41
      &&Array.isArray(gate.verifiedServices)&&gate.verifiedServices.length===21,
      'All 41 obligations and 21 service acceptance cases must remain tracked.');
    check(gate.releaseState==='BLOCKED_PENDING_FULL_ACCEPTANCE'&&gate.ownerFinalAuthorization===false,
      'Phased publication must never imply the full masterplan was certified.');
    const pre=JSON.parse(requireText(root,'assets/data/jr-publishing-prelaunch.json'));
    const item=pre.works.find(w=>w.id==='tefl-ma-exams-1370-1405');
    check(Boolean(item)&&item.quote.checkout_enabled===false&&item.rights_confirmed===false
      &&pre.compliance.scientific_review_approved===false
      &&pre.finance_policy.settlement_allowed===false,
      'Private PDF, author rights, settlement and scientific review must remain unapproved.');
    const digital=requireText(root,'api/internal/jr-publishing-digital.php');
    const api=requireText(root,'api/publishing.php');
    const client=requireText(root,'assets/js/jr-publishing-checkout-v1.js');
    const callback=requireText(root,'api/commerce-stage9.php');
    check(digital.includes('JR_PUBLISHING_DIGITAL_ENABLED')&&digital.includes('jrPublishingSchemaReady')
      &&digital.includes('digital_distribution')&&digital.includes('malware_scanned_at')
      &&digital.includes('jrPubPrivateDir()'),
      'Digital sales must fail closed until host rights/schema/private-file setup.');
    check(api.includes('Cache-Control: no-store')&&api.includes('email_verified_at'),
      'Author private dashboard must retain privacy and verified identity.');
    check(client.includes('j.checkoutEnabled===true&&j.available===true')
      &&client.includes("dest.origin!==location.origin")&&client.includes('dest.searchParams.size!==1'),
      'Buyer checkout must verify provider readiness and exact same-origin gateway relay.');
    check(callback.includes('jrPubCommitVerifiedDigitalOrder'),
      'Digital entitlement must remain tied to verified shared payment callback.');
    const workflow=requireText(root,'.github/workflows/deploy-bertina.yml');
    check(workflow.includes('drjrCpanelBackupCheck')
      &&workflow.includes('drjrRecoveryCheck')
      &&workflow.includes('stage09_schema_preflight_required')
      &&workflow.includes('Reject a stale production commit before uploading')
      &&workflow.includes('Upload one release package over explicit TLS'),
      'The owner deployment pipeline lost protected host/recovery/identity preflights.');
  } catch(e){errors.push('Required source/registry unavailable: '+e.constructor.name);}
  return {allowed:errors.length===0,errors,scope:'phased_live_audit',
    publicationIsFullMasterplanAcceptance:false,hostAndPaymentProofProvidedByThisGate:false};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])) {
  const r=assessPhasedRelease({
    scope:process.env.RELEASE_SCOPE,event:process.env.GITHUB_EVENT_NAME,
    actor:process.env.GITHUB_ACTOR,ref:process.env.GITHUB_REF,
    targetSha:process.env.GITHUB_SHA,approvedCommit:process.env.APPROVED_COMMIT_SHA_INPUT,
    expectedLiveSha:process.env.EXPECTED_LIVE_SHA_INPUT,
    recoveryMode:process.env.RECOVERY_MODE_INPUT,
    ownerAcknowledgement:process.env.OWNER_ACKNOWLEDGEMENT_INPUT,
    confirmation:process.env.OWNER_PHASED_RELEASE_CONFIRMATION
  });
  if(!r.allowed) {
    console.error('BLOCKED: guarded phased release preflight failed. '+r.errors.join(' | '));
    process.exitCode=1;
  } else console.log('Owner scoped phased gate passed; proceed to all existing independent CI and host checks. NOT a deployment, PDF activation, schema migration or 100% certification.');
}
