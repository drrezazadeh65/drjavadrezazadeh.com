import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const publicPages=['journal','fa/app/admin/index.html','en/account/admin/index.html'];
const retiredName=/\bOJS\b|Open Journal Systems/i;
function pages(target){
 const stat=fs.statSync(target);
 if(stat.isFile())return target.endsWith('.html')?[target]:[];
 return fs.readdirSync(target,{withFileTypes:true}).flatMap(entry=>{
   const file=path.join(target,entry.name);
   return entry.isDirectory()?pages(file):entry.isFile()&&file.endsWith('.html')?[file]:[];
 });
}
test('every bilingual public journal page and owner interface is free of retired vendor naming',()=>{
 const all=publicPages.flatMap(pages);
 assert.ok(all.length>=30,'expected full journal route inventory');
 for(const file of all){
   const html=fs.readFileSync(file,'utf8');
   assert.doesNotMatch(html,retiredName,'retired platform label leaked to '+file);
 }
});

test('sanitized release fails closed on any retired journal platform asset or public UI label',()=>{
 const builder=fs.readFileSync('scripts/build-public-site.mjs','utf8');
 assert.ok(builder.includes('Retired journal platform asset in public package:'));
 assert.ok(builder.includes('Retired journal platform label in public UI:'));
 assert.ok(builder.includes('const journalUi=all.filter('));
 assert.ok(builder.includes('retiredJournalLabel.test(fs.readFileSync(file'));
});
