/* STAGED, NOT EXECUTED -- exact source contract assertions.
 * Do not substitute this file for a MariaDB test clone or owner MFA audit.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('additive SQL cannot erase or auto-authorize missions',()=>{
 const ddl=src('docs/migrations/20261026_jrei_apex_owner_missions_mother_mysql.sql');
 assert.doesNotMatch(ddl,/\b(?:DROP TABLE|DROP DATABASE|TRUNCATE|DELETE FROM)\b/i);
 assert.doesNotMatch(ddl,/\bCREATE DATABASE\b/i);
 for(const name of ['jrei_apex_mission_controls','jrei_apex_owner_missions',
                    'jrei_apex_mission_events','customer_accounts'])
  assert.ok(ddl.includes(name));
 assert.match(ddl,/planning_enabled TINYINT\(1\) NOT NULL DEFAULT 0/);
 assert.match(ddl,/emergency_stop TINYINT\(1\) NOT NULL DEFAULT 1/);
 assert.match(ddl,/execution_enabled TINYINT\(1\) NOT NULL DEFAULT 0/);
});

test('original owner session, MFA and CSRF precede the mission endpoint',()=>{
 const code=src('api/operations.php');
 const mfa=code.indexOf("if (!$fresh) fail('admin_mfa_required',403)");
 const route=code.indexOf("'/admin/operations/jrei-apex-missions'");
 assert.ok(mfa>0&&route>mfa);
 const chunk=code.slice(route,route+1900);
 for(const expected of ['SUPER_ADMIN','operationsMutationAllowed','rateAllowed',
                        'jrApexMissionOwnerChange','jrApexMissionSnapshot'])
  assert.ok(chunk.includes(expected),expected);
});

test('no arbitrary command, cloud model, shell, payment or SQL execution endpoint',()=>{
 const owner=src('api/jrei-apex-owner-missions.php');
 assert.match(owner,/JR_APEX_MISSION_INTENTS/);
 assert.match(owner,/mission_action_invalid/);
 assert.doesNotMatch(owner,/shell_exec\s*\(|proc_open\s*\(|eval\s*\(|curl_exec\s*\(/);
 assert.match(owner,/mission_event_atomic_update_conflict/);
 assert.match(owner,/beginTransaction/);
 assert.match(owner,/operationsAudit/);
});

test('owner planning gated by private OFF configuration',()=>{
 const config=src('api/index.php');
 assert.match(config,/'jrei_apex_missions_owner_write_enabled'/);
 assert.match(config,/JR_JREI_APEX_MISSIONS_OWNER_WRITE_ENABLED/);
 const code=src('api/jrei-apex-owner-missions.php');
 assert.match(code,/mission_planning_source_only/);
 assert.match(code,/emergency-stop/);
 assert.match(code,/resume-planning/);
});

test('same bilingual admin panel and privacy boundary preserved',()=>{
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=src(p);
  assert.match(html,/operations-jrei-apex-command-room-v1\.js/);
  assert.match(html,/operations-jrei-apex-command-room-v1\.css/);
  assert.match(html,/id="ops-jrei-learning"/);
  assert.match(html,/name="robots" content="noindex/);
 }
 const ui=src('assets/js/operations-jrei-apex-command-room-v1.js');
 assert.doesNotMatch(ui,/localStorage|sessionStorage|window\.open\(/);
 assert.match(ui,/crypto\.getRandomValues/);
 assert.match(ui,/UNKNOWN/);
});
