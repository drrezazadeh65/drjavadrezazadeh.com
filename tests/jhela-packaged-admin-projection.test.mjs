import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='.public-site';
test('the JHELA admin API receives only protected whitelisted projections in deployable artifact',()=>{
 assert.ok(!fs.existsSync(root+'/platform'));
 const files=['jhela-ojs-activation.json','jhela-international-roadmap-v1.json',
  'jhela-target-architecture-v1.json','jhela-gate-evidence-ledger-v1.json'];
 const permitted=[
  ['schema','ojsInstalled','publicSubmissionsEnabled'],
  ['schema','publicationStatus','phases'],
  ['schema','status','scaleStages'],
  ['schema','stageRecords']
 ];
 assert.match(fs.readFileSync(root+'/api/internal/.htaccess','utf8'),/Require all denied/);
 for(let i=0;i<files.length;i++){
  const item=JSON.parse(fs.readFileSync(root+'/api/internal/'+files[i],'utf8'));
  assert.deepEqual(Object.keys(item),permitted[i]);
  assert.ok(!/auth_pepper|totp_secret|manuscriptBody|reviewerEmail|passwordHash|privateFilePath/i.test(JSON.stringify(item)));
  if(files[i]==='jhela-gate-evidence-ledger-v1.json'){
   assert.equal(item.stageRecords.length,10);
   for(const s of item.stageRecords){
    assert.deepEqual(Object.keys(s),['id','status','claimsAllowed','evidence']);
    assert.equal(s.status,'UNVERIFIED');
    assert.deepEqual(s.evidence,[]);
   }
  }
 }
 assert.ok(fs.existsSync(root+'/api/operations-jhela.php'));
 assert.ok(fs.existsSync(root+'/assets/js/operations-jhela-maturity.js'));
});
