import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const src=fs.readFileSync('scripts/jhela-ojs-readiness.php','utf8');

test('runtime cannot certify a self-signed journal TLS certificate from an operator variable',()=>{
 for(const [label,fragment] of Object.entries({
  'fixed journal name':"$journalHost='journal.drjavadrezazadeh.com'",
  'chain trust':"'verify_peer'=>true",
  'hostname verification':"'verify_peer_name'=>true",
  'SNI':"'SNI_enabled'=>true",
  'explicit SNI name':"'SNI_server_name'=>$journalHost",
  'reject self signed':"'allow_self_signed'=>false",
  'captured peer certificate':"'capture_peer_cert'=>true",
  'actual network handshake':"stream_socket_client('tls://'.$journalHost.':443'",
  'real TLS evidence gate':"independent_ca_trusted_tls_handshake"
 }))assert.ok(src.includes(fragment),'Missing TLS trust proof: '+label);
 assert.ok(src.includes('$trustedJournalTls=$peerCert instanceof OpenSSLCertificate'));
 assert.ok(!src.includes("'independent_ca_trusted_tls_handshake',true"));
});

test('unprovisioned OJS runtime refuses certification and never prints credentials',()=>{
 const result=spawnSync('php',['scripts/jhela-ojs-readiness.php','--runtime'],{
  cwd:process.cwd(),
  env:{...process.env,JHELA_OJS_TLS_CERTIFIED:'',JHELA_OJS_DB_PASSWORD:''},
  encoding:'utf8',timeout:12000
 });
 if(result.error?.code==='ENOENT')throw new Error('PHP executable required in the OJS workflow');
 assert.equal(result.status,1,'Unprovisioned live OJS must not be declared ready');
 const report=JSON.parse(result.stdout);
 assert.equal(report.schema,'jhela-ojs-readiness-v1');
 assert.equal(report.ready,false);
 assert.equal(report.mode,'runtime');
 const checks=Object.fromEntries(report.checks.map(x=>[x.id,x.pass]));
 assert.equal(checks.live_dns_tls_owner_verification,false);
 assert.equal(checks.independent_ca_trusted_tls_handshake,false);
 assert.equal(checks.native_ojs_schema_present,false);
 assert.equal(checks.submission_files_outside_webroot,false);
 assert.doesNotMatch(result.stdout,/DB_PASSWORD|SECRET|JHELA_OJS_DB_PASSWORD/);
});

test('TLS checking is independent of source-only contract mode and remains CLI-only',()=>{
 assert.ok(src.includes("PHP_SAPI !== 'cli'"));
 const r=spawnSync('php',['scripts/jhela-ojs-readiness.php','--contract'],{
  cwd:process.cwd(),encoding:'utf8',timeout:12000
 });
 assert.equal(r.status,0,'The PHP 8.3 CI runner must satisfy software extension requirements: '+r.stderr);
 const j=JSON.parse(r.stdout);
 assert.equal(j.mode,'contract');
 assert.equal(j.ready,true);
 assert.ok(j.checks.every(x=>x.pass));
 assert.ok(!j.checks.some(x=>x.id==='independent_ca_trusted_tls_handshake'),
   'CLI contract check alone must never certify the deployed TLS host');
});
