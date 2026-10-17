import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=p=>readFileSync(p,'utf8');
test('private ZIP installer cannot create web-public PDF assets or activate payments',()=>{
 const s=read('api/internal/jr-publishing-private-install-cli.php');
 assert.match(s,/PHP_SAPI!=='cli'/);
 assert.match(s,/realpath\(dirname\(__DIR__,2\)\)/);
 assert.match(s,/public_html_is_forbidden/);
 assert.match(s,/explicit_operator_confirmation_required/);
 assert.match(s,/INSTALL_VERIFIED_PRIVATE_PDFS/);
 assert.match(s,/hash_equals\(\$meta\['sha256'\],hash_file\('sha256',\$temporary\)\)/);
 assert.match(s,/count\(\$manifest\['manifest'\]\?\?\[\]\)!==2/);
 assert.match(s,/chmod\(\$temporary,0640\)/);
 assert.doesNotMatch(s,/JR_PUBLISHING_DIGITAL_ENABLED=true|JR_PUBLISHING_OWNER_APPROVED=YES/);
 assert.doesNotMatch(s,/sendLocalMail|gatewayPost|INSERT INTO|UPDATE commerce_orders/);
});
test('private installer refuses execution without exact affirmative operator flags',()=>{
 const p=spawnSync('php',['api/internal/jr-publishing-private-install-cli.php'],{encoding:'utf8',timeout:2000});
 assert.notEqual(p.status,0);
 assert.match(p.stderr||'',/explicit_operator_confirmation_required/);
});
test('public artifact builder requires all bound paid-code modules and prohibits paid PDFs',()=>{
 const build=read('scripts/build-public-site.mjs');
 assert.match(build,/api\/internal\/jr-publishing-digital\.php/);
 assert.match(build,/api\/internal\/jr-publishing-mailer\.php/);
 assert.match(build,/api\/internal\/jr-publishing-private-install-cli\.php/);
 assert.match(build,/tefl_1370_1405_questions\.pdf/);
 assert.match(build,/tefl_1370_1405_answers\.pdf/);
 assert.match(build,/Private paid scholarly resource must not be in sanitized public release/);
});
