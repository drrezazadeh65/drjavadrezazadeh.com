/* Staged source-regression cases; NEVER run by this file's presence.
 * This cannot verify private Python runtime, real model or Bertina database.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('owner Python route requires existing MFA, SUPER_ADMIN, CSRF and rate limits',()=>{
 const code=source('api/operations.php');
 const gate=code.indexOf("if (!$fresh) fail('admin_mfa_required',403)");
 const route=code.indexOf("'/admin/operations/jrei-python-skills'");
 assert.ok(gate>0&&route>gate);
 const guard=code.slice(route,route+1200);
 for(const required of ['SUPER_ADMIN','operationsMutationAllowed','rateAllowed',
                       'jrOwnerJreiPythonSkillDispatch'])
  assert.ok(guard.includes(required),required);
});

test('source-stage Python switch fails closed and never reveals keys to frontend',()=>{
 assert.match(source('api/index.php'),
  /'jrei_python_internal_enabled' => getenv\('JR_JREI_PYTHON_INTERNAL_ENABLED'\) === 'true'/);
 const owner=source('api/jrei-python-owner-skills.php');
 assert.match(owner,/PRIVATE_PYTHON_NOT_ENABLED/);
 assert.match(owner,/jrei_python_internal_enabled/);
 assert.doesNotMatch(source('assets/js/operations-jrei-python-skills-v1.js'),
  /JREI_PYTHON_HMAC_KEY|jrei_python_hmac_key|JR_DB_PASSWORD/);
});

test('service routes are allowlisted, and evidence never self-promotes',()=>{
 const php=source('platform/jrei-python/php/jrei-python-internal-client.php');
 for(const route of [
  '/internal/v1/learning/prioritize','/internal/v1/missions/propose',
  '/internal/v1/skills/catalog','/internal/v1/skills/evidence/triage'
 ])assert.ok(php.includes(route));
 const owner=source('api/jrei-python-owner-skills.php');
 for(const guard of ['source_rights_approved_by_skill',
    'approved_for_retrieval','privileged_execution_enabled'])
  assert.ok(owner.includes(guard));
});

test('bilingual original admin consoles remain the only skill UI hosts',()=>{
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=source(p);
  assert.match(html,/operations-jrei-python-skills-v1\.js/);
  assert.match(html,/id="ops-jrei-learning"/);
  assert.match(html,/name="robots" content="noindex/);
 }
});

test('Python skill registration is closed and model-free',()=>{
 const manifest=source('platform/jrei-python/jrei_skills/registry.py');
 for(const k of ['STATIC_REVIEWED_ALLOWLIST','mutates_mother_db',
                 'network_access','privileged_execution_enabled'])
  assert.ok(manifest.includes(k));
 const core=source('platform/jrei-python/jrei_skills/evidence_revision.py');
 for(const k of ['approved_for_retrieval','source_rights_approved_by_skill',
                 'independently_verified_by_service','memory_mutated'])
  assert.ok(core.includes(k));
});
