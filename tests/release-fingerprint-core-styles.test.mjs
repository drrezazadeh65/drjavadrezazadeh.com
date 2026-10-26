import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fingerprintCoreStyles} from '../scripts/release-fingerprint-core-styles.mjs';

function buildFixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jr-perf-'));
 fs.mkdirSync(path.join(root,'assets/css'),{recursive:true});
 for(const [name,value] of [['style','base'],['public-v2','public']]){
  fs.writeFileSync(path.join(root,'assets/css/'+name+'.css'),'.'+value+'{color:#deb887}'.repeat(120));
 }
 fs.mkdirSync(path.join(root,'fa/deep'),{recursive:true});
 fs.mkdirSync(path.join(root,'en/shop'),{recursive:true});
 fs.mkdirSync(path.join(root,'api'),{recursive:true});
 fs.writeFileSync(path.join(root,'fa/deep/index.html'),
  '<link rel="stylesheet" href="../../assets/css/style.css?v=old"><link rel="stylesheet" href="/assets/css/public-v2.css?v=old">');
 fs.writeFileSync(path.join(root,'en/shop/index.html'),
  '<link rel="stylesheet" href="../assets/css/style.css?v=before">');
 fs.writeFileSync(path.join(root,'index.html'),
  '<link rel="stylesheet" href="assets/css/public-v2.css?v=old">');
 fs.writeFileSync(path.join(root,'api/private.html'),
  '<link rel="stylesheet" href="/assets/css/style.css?v=private">');
 return root;
}

test('digest styles retain file identity and upgrade public HTML paths',()=>{
 const root=buildFixture();
 try{
  const report=fingerprintCoreStyles(root);
  assert.equal(report.schema,'jr.immutable.shared-styles.v1');
  assert.equal(report.revisedPages,3);
  assert.equal(report.rewrittenReferences,4);
  for(const name of ['style','public-v2']){
   const source=fs.readFileSync(path.join(root,'assets/css/'+name+'.css'));
   const expected=crypto.createHash('sha256').update(source).digest('hex').slice(0,12);
   assert.equal(report.aliases[name],name+'.'+expected+'.css');
   assert.deepEqual(fs.readFileSync(path.join(root,'assets/css/'+report.aliases[name])),source);
  }
  const fa=fs.readFileSync(path.join(root,'fa/deep/index.html'),'utf8');
  assert.ok(fa.includes('../../assets/css/'+report.aliases.style+'"'));
  assert.ok(fa.includes('/assets/css/'+report.aliases['public-v2']+'"'));
  assert.doesNotMatch(fa,/\?v=old/);
  const en=fs.readFileSync(path.join(root,'en/shop/index.html'),'utf8');
  assert.ok(en.includes('../assets/css/'+report.aliases.style+'"'));
  const gateway=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(gateway.includes('assets/css/'+report.aliases['public-v2']+'"'));
  const privateApi=fs.readFileSync(path.join(root,'api/private.html'),'utf8');
  assert.match(privateApi,/style\.css\?v=private/);
 }finally{
  fs.rmSync(root,{force:true,recursive:true});
 }
});

test('new stylesheet content causes a new public URL, never overwriting old bytes',()=>{
 const root=buildFixture();
 try{
  const first=fingerprintCoreStyles(root);
  const original=fs.readFileSync(path.join(root,'assets/css/'+first.aliases.style));
  fs.appendFileSync(path.join(root,'assets/css/style.css'),'\n.next{padding:4px}');
  const second=fingerprintCoreStyles(root);
  assert.notEqual(first.aliases.style,second.aliases.style);
  assert.deepEqual(fs.readFileSync(path.join(root,'assets/css/'+first.aliases.style)),original);
 }finally{
  fs.rmSync(root,{force:true,recursive:true});
 }
});
