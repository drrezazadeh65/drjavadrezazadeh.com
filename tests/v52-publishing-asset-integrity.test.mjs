import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=p=>readFileSync(p,'utf8');
const runtime=read('api/internal/jr-publishing-digital.php');
const activation=read('api/internal/jr-publishing-activate-existing-cli.php');
const preflight=read('api/internal/jr-publishing-preflight-cli.php');
const expected={
 question_pdf:['tefl_1370_1405_questions.pdf','6245641c453e92ee005c4176575ef315b96ac72fd8535b7e3ff67c2369dda7c8'],
 answer_pdf:['tefl_1370_1405_answers.pdf','db8070f8a88723c1947a094a461ad2f703192092b09f03255867bbab53fa2ab4']
};
test('original digital PDFs have one canonical checksum manifest shared by activation and checkout',()=>{
 assert.match(runtime,/const JR_PUB_ORIGINAL_ASSETS = \[/);
 for(const [kind,[name,sha]] of Object.entries(expected)){
  assert.ok(runtime.includes("'"+kind+"'=>['"+name+"','"+sha+"']"));
  assert.ok(!activation.includes(sha),'activation must not duplicate hardcoded SHA');
  assert.ok(!preflight.includes(sha),'preflight must not duplicate hardcoded SHA');
 }
 assert.match(activation,/JR_PUB_ORIGINAL_ASSETS\[\$kind\]/);
 assert.match(preflight,/foreach\(JR_PUB_ORIGINAL_ASSETS as \[\$filename,\$expectedSha\]\)/);
 assert.match(runtime,/hash_equals\(\$originalHash,hash_file\('sha256',\$file\)\)/);
 assert.match(runtime,/\$expected=JR_PUB_ORIGINAL_ASSETS\[\$kind\]\?\?null/);
 assert.match(runtime,/hash_equals\(\$expected\[1\],hash_file\('sha256',\$file\)\)/);
 assert.match(runtime,/f\.currency='IRT'/);
 // The operator keeps a verified author-recipient mapping for private
 // sale notices; a separate author licence is not a checkout precondition.
 assert.match(activation,/l\.role='author'/);
 assert.match(activation,/author_account_verified/);
 assert.doesNotMatch(runtime,/count\(\$licences\)!==1/);
 assert.doesNotMatch(runtime,/SELECT l\.evidence_sha256/);
 assert.doesNotMatch(activation,/rights_verified_at=COALESCE/);
 assert.match(runtime,/malware_scanned_at/);
});
test('verified bank payment, two grants, durable notifications and separate fund entries stay intact',()=>{
 assert.match(runtime,/function jrPubCommitVerifiedDigitalOrder/);
 assert.match(runtime,/author_share',600000/);
 assert.match(runtime,/talent_fund',400000/);
 assert.match(runtime,/700,70000,'reserve_on_sale'/);
 assert.match(runtime,/publishing_notification_outbox/);
 assert.match(runtime,/buyer_paid','author_sale/);
 assert.match(runtime,/commerce_payment_claims p ON p\.order_id=o\.id/);
 assert.match(runtime,/p\.verified_amount=o\.provider_amount/);
 assert.match(runtime,/hash_hmac\('sha256','jr-publishing-download-v1\|'/);
});
test('changed PHP publishing surfaces pass PHP syntax lint when interpreter is available',t=>{
 const version=spawnSync('php',['-v'],{encoding:'utf8'});
 if(version.error?.code==='ENOENT'){t.diagnostic('PHP not installed in this runner: PHP syntax lint not executed');return;}
 assert.equal(version.status,0,version.stderr);
 for(const path of [
  'api/internal/jr-publishing-digital.php',
  'api/internal/jr-publishing-preflight-cli.php',
  'api/internal/jr-publishing-activate-existing-cli.php'
 ]){
  const result=spawnSync('php',['-l',path],{encoding:'utf8'});
  assert.equal(result.status,0,path+': '+result.stderr+' '+result.stdout);
 }
});
