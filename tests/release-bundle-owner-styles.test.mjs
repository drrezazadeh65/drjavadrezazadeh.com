/**
 * Staged final-only regression tests for the owner-managed Bertina build.
 * These are source artifacts and must not run before final owner approval.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {bundleOwnerStyles} from '../scripts/release-bundle-owner-styles.mjs';

function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jr-owner-style-'));
 fs.mkdirSync(path.join(root,'assets/css'),{recursive:true});
 for(const [language,page] of [
  ['fa','fa/app/admin/index.html'],
  ['en','en/account/admin/index.html']
 ]){
  const filename=path.join(root,page);
  fs.mkdirSync(path.dirname(filename),{recursive:true});
  const tags=[];
  for(let i=0;i<15;i++){
   const name='owner-'+language+'-'+i;
   fs.writeFileSync(path.join(root,'assets/css',name+'.css'),
     '.scope-'+language+'-'+i+'{color:#'+String(i).padStart(6,'0')+'}\n'+
     (i===14?'.ops-command-deck{display:grid}\n':''));
   tags.push('<link rel="stylesheet" href="/assets/css/'+name+'.css?v=old">');
  }
  fs.writeFileSync(filename,
   '<!doctype html><html lang="'+language+'"><head>'+
   '<meta name="robots" content="noindex,nofollow,noarchive">'+
   tags.join('')+'<link rel="canonical" href="https://drjavadrezazadeh.com/'+
   page.slice(0,-10)+'"></head><body><form id="ops-mfa-form"></form>'+
   '<div id="ops-workspace" hidden></div></body></html>');
 }
 return root;
}

test('two private locales get one ordered immutable stylesheet each',()=>{
 const root=fixture();
 try{
  const report=bundleOwnerStyles(root);
  assert.equal(report.schema,'jr.owner.styles.immutable.v1');
  for(const [lang,page] of [
   ['fa','fa/app/admin/index.html'],
   ['en','en/account/admin/index.html']
  ]){
   const item=report.results[lang];
   assert.equal(item.sourceFiles,15);
   assert.match(item.css,new RegExp('^operations-owner\\.'+lang+'\\.[a-f0-9]{12}\\.css$'));
   assert.equal(item.includesCommandDeck,true);
   const html=fs.readFileSync(path.join(root,page),'utf8');
   assert.equal((html.match(/rel="stylesheet"/g)||[]).length,1);
   assert.match(html,/noindex,nofollow,noarchive/);
   assert.match(html,/id="ops-mfa-form"/);
   assert.match(html,/id="ops-workspace"/);
   const content=fs.readFileSync(path.join(root,'assets/css',item.css),'utf8');
   const first=content.indexOf('.scope-'+lang+'-0{');
   const last=content.indexOf('.scope-'+lang+'-14{');
   assert.ok(first>=0&&last>first,'Original CSS cascade order must survive');
   assert.match(content,/\.ops-command-deck\{display:grid\}/);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('unsupported relative URLs fail closed instead of corrupting admin fonts',()=>{
 const root=fixture();
 try{
  fs.appendFileSync(path.join(root,'assets/css/owner-fa-3.css'),
    '.unsafe{background:url("../unknown-background.svg")}\n');
  assert.throws(()=>bundleOwnerStyles(root),/Relative CSS url/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
