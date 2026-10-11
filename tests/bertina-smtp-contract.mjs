import assert from 'node:assert/strict';
import fs from 'node:fs';
const php=fs.readFileSync('api/index.php','utf8');
const ui=fs.readFileSync('assets/js/customer-auth.js','utf8');
assert.match(php,/function smtpConfigured/);
assert.match(php,/function smtpFail/);
assert.match(php,/function sendLocalMail/);
assert.doesNotMatch(php,/@mail\s*\(/);
assert.match(php,/smtpSend\(\$to,\s*\$subject,\s*\$body\)/);
assert.match(php,/auth\/resend-verification/);
assert.match(php,/verification_if_pending_sent/);
assert.match(ui,/bindResend\(\)/);
for (const lang of ['fa','en']) {
 const html=fs.readFileSync(lang+'/register/index.html','utf8');
 assert.match(html,/data-auth-resend/);
}
console.log('PASS: SMTP-only auth mail and account verification recovery');
