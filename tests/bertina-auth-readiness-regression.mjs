import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const frontend=readFileSync('assets/js/customer-auth.js','utf8');
assert.match(frontend, /const API='\/api';/, 'Account frontend must use same-origin Bertina API');
assert.doesNotMatch(frontend, /workers\\.dev|api\\.resend\\.com/, 'Retired endpoints must not return');
assert.match(frontend, /verification_email_failed:text\.emailFailed/, 'Known email failure must be shown safely');

const port=19237;
const php=spawn('php',['-S',`127.0.0.1:${port}`,'api/index.php'],{
  cwd:process.cwd(),stdio:'ignore',
  env:{...process.env,JR_DB_DSN:'',JR_DB_USER:'',JR_MAIL_ENABLED:'true',JR_SMTP_ENABLED:'true',JR_SMTP_HOST:'',JR_MAIL_FROM:'accounts@drjavadrezazadeh.com'}
});
try{
  let response=null;
  for(let i=0;i<30;i++){
    try{response=await fetch(`http://127.0.0.1:${port}/api/auth/health`);break}catch{await delay(100)}
  }
  assert.ok(response,'Local Bertina PHP router must start');
  assert.equal(response.status,200);
  const health=await response.json();
  assert.equal(health.service,'auth');
  assert.equal(health.database,false);
  assert.equal(health.schemaReady,false,'Incomplete MySQL setup must not report ready');
  assert.equal(health.email,false,'Broken selected SMTP configuration must not fall back to PHP mail');
  assert.equal(health.ready,false,'Registration must remain fail-closed');
  console.log('PASS: Bertina PHP auth health, schema and selected SMTP safety');
}finally{
  php.kill('SIGTERM');
}
