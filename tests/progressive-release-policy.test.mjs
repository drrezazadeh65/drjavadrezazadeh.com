#!/usr/bin/env node
// Nondeploying progressive release contract test. A policy file alone is not a release gate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const policy=fs.readFileSync('docs/governance/PROGRESSIVE_RELEASE_STANDARD_20261015.md','utf8');
for (const phrase of ['HOLD','NO REGRESSION','RELEASE EVIDENCE','GOLDEN TALENT','EXCEPTION','ONE-BRANCH, BATCH-FIRST','migration/bertina-linux6','one consolidated integrated test and audit','No extra development, accumulation, staging or replacement Git branches']) assert.ok(policy.includes(phrase),'Missing policy clause: '+phrase);
const workflows=['.github/workflows/deploy-bertina.yml','.github/workflows/bertina-controlled-release-guard.yml'];
for (const file of workflows) assert.ok(fs.existsSync(file),'Missing deployment protection: '+file);
const deploy=fs.readFileSync(workflows[0],'utf8');
assert.match(deploy,/expected_live_sha/,'Deployment must check live fingerprint');
assert.match(deploy,/approved_commit_sha/,'Deployment must bind source SHA');
assert.match(deploy,/concurrency:/,'Deployment must serialize releases');
const candidates=['scripts/build-public-site.mjs','scripts/bertina-release-eligibility.mjs','scripts/customer-dashboard-audit.mjs'];
for(const file of candidates) assert.ok(fs.existsSync(file),'Missing release test: '+file);
console.log('PASS: progressive release policy, SHA protections and core test scripts present. This is source-contract verification only, not proof of incremental user value or production readiness.');
