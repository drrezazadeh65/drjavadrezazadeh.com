/**
 * Final-only owner command deck acceptance contracts.
 * This test file is staged in source and MUST NOT be executed until the owner
 * authorises the single post-development integrated QA/release window.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const shell=read('assets/js/operations-command-deck-v1.js');
const css=read('assets/css/operations-command-deck-v1.css');
const control=read('assets/js/operations-control.js');
const release=read('scripts/build-public-site.mjs');

test('both original owner routes retain server MFA, noindex and all existing workspaces',()=>{
 for(const path of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(path);
  assert.match(html,/<meta name="robots" content="noindex,nofollow,noarchive"/);
  assert.match(html,/<div id="ops-workspace" hidden>/);
  assert.match(html,/id="ops-mfa-form"/);
  assert.match(html,/id="ops-education-readiness"/);
  assert.match(html,/id="ops-jhela-workstream"/);
  assert.match(html,/id="ops-commerce"/);
  assert.match(html,/id="ops-jrei-hybrid-nodes"/);
  assert.match(html,/id="ops-gsc-direct"/);
  assert.match(html,/id="ops-workspace"/);
  assert.match(html,/operations-workspace-index-v1\.js/);
  assert.match(html,/operations-command-deck-v1\.css\?v=/);
  assert.match(html,/operations-command-deck-v1\.js\?v=/);
 }
});

test('compact areas and second-level module selection do not duplicate controls',()=>{
 for(const category of ['overview','engines','planning','ai','seo',
   'education','commerce','journal','media','systems']){
  assert.ok(shell.includes("['"+category+"'"),'missing category '+category);
 }
 for(const marker of [
  'ops-command-modules','ops-command-module-buttons','function annotate()',
  'function selectModule(element)','ops-command-inactive','jr:ops-workspace-activate',
  'ops-command-plan-board','ops-command-engine-matrix','ops-command-timeline-bars'
 ])assert.ok(shell.includes(marker),marker);
 assert.match(css,/height:100dvh/);
 assert.match(css,/ops-command-mini-pulse/);
 assert.match(css,/ops-command-engine-cells/);
 assert.match(css,/ops-command-plan-items/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media print/);
});

test('server truth, no invented uptime, no persistent data or browser authority',()=>{
 assert.match(shell,/\/api\/admin\/operations\/session/);
 assert.match(shell,/credentials:'same-origin',cache:'no-store'/);
 assert.match(shell,/body\.mfaRequired===false/);
 assert.match(shell,/browser is offline|Browser is offline/);
 assert.match(shell,/not a whole-site uptime claim/);
 assert.match(shell,/lastProbeAttempt<60000/);
 assert.match(shell,/document\.hidden/);
 assert.match(shell,/recordObservation/);
 assert.match(shell,/jr:operations-session-invalid/);
 assert.match(shell,/jr:operations-locked/);
 assert.match(control,/jr:operations-engine-evidence/);
 assert.match(control,/jr:operations-planning-evidence/);
 assert.match(control,/jr:ops-open-report/);
 assert.match(control,/new Event\('jr:operations-ready'\)/);
 assert.match(control,/jr:operations-session-invalid/);
 for(const regex of [
  /\blocalStorage\b/,/\bsessionStorage\b/,/\bindexedDB\b/,/\bdocument\.cookie\b/,
  /\bsendBeacon\b/,/\bXMLHttpRequest\b/,/fetch\(['"]https?:\/\//,
  /window\.location\.assign/,/\binnerHTML\s*=/
 ])assert.doesNotMatch(shell,regex,'forbidden command shell side effect: '+regex);
});

test('reviewed release requires both new assets but never changes private auth policy',()=>{
 for(const filename of ['assets/js/operations-command-deck-v1.js',
                            'assets/css/operations-command-deck-v1.css']){
  assert.ok(release.includes("'"+filename+"'"),filename);
 }
 assert.match(release,/Owner command deck or existing private auth shell missing/);
 assert.match(control,/operationsMfaFresh|operations-session-invalid/);
 const htaccess=read('.htaccess');
 assert.match(htaccess,/PRIVATE_ROUTE/);
 assert.match(htaccess,/Cache-Control/);
});
