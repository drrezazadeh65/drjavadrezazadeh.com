import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';

const read=p=>readFileSync(p,'utf8');
function pages(dir){
 const all=[];
 for(const child of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,child.name);
  if(child.isDirectory())all.push(...pages(p));
  else if(child.isFile()&&child.name==='index.html')all.push(p);
 }
 return all;
}
test('every bilingual JHELA public index page imports one shared accessible mobile menu',()=>{
 const files=pages('journal');
 assert.ok(files.length>=30,'journal must include both language routes');
 for(const file of files){
  const html=read(file);
  assert.match(html,/jhela-mobile-nav-v52\.js/,'missing shared nav on '+file);
  assert.match(html,/class="journal-page/,'journal page identity missing '+file);
  assert.match(html,/<nav\b/,'semantic navigation missing '+file);
 }
});
test('JHELA menu is progressive, accessible and isolated from mother-site navigation',()=>{
 const js=read('assets/js/jhela-mobile-nav-v52.js');
 const css=read('assets/css/jhela-mobile-nav-v52.css');
 assert.match(js,/body\.journal-page/);
 assert.match(js,/aria-expanded/);
 assert.match(js,/aria-controls/);
 assert.match(js,/Escape/);
 assert.match(js,/journal\/fa\/search/);
 assert.match(js,/journal\/search/);
 assert.match(css,/jhela-nav-enhanced/);
 assert.match(css,/jhela-nav-open/);
 assert.match(css,/@media\(max-width:850px\)/);
 assert.doesNotMatch(js,/site-header/);
});
