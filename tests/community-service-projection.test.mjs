import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {projectCommunityServicePages} from '../scripts/community-service-bundle.mjs';

const live=JSON.parse(fs.readFileSync('assets/data/service-catalog.json','utf8'));
const ids=live.services.filter(x=>x.sellable===true).map(x=>x.id);

function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'jr-community-services-'));
 const out=path.join(root,'.public-site');
 fs.mkdirSync(path.join(root,'assets/data'),{recursive:true});
 fs.writeFileSync(path.join(root,'assets/data/service-catalog.json'),JSON.stringify(live));
 for(const lang of ['fa','en'])for(const id of ids){
  const dir=path.join(out,lang,'services',id);fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),
   '<!doctype html><html lang="'+lang+'"><head><meta name="robots" content="index,follow"></head><body><main><article>Trusted public service</article></main></body></html>');
 }
 return {root,out,clean:()=>fs.rmSync(root,{force:true,recursive:true})};
}
test('source projection has exactly 42 public service pages and never changes owner homepage banners',()=>{
 const f=fixture();
 try{
  const r=projectCommunityServicePages(f.root,f.out);
  assert.deepEqual(r,{services:21,pages:42,featureFlag:'JR_COMMUNITY_SERVICES_ENABLED'});
  for(const lang of ['fa','en'])for(const id of ids){
   const html=fs.readFileSync(path.join(f.out,lang,'services',id,'index.html'),'utf8');
   assert.equal((html.match(/community-comments\.css/g)||[]).length,1);
   assert.equal((html.match(/community-comments\.js/g)||[]).length,1);
   assert.match(html,/<main><article>Trusted public service<\/article><\/main>/);
  }
  assert.equal(fs.existsSync(path.join(f.out,'fa/index.html')),false,'Homepages unchanged');
 }finally{f.clean();}
});
test('invalid final English service refuses partial modifications to any Persian page',()=>{
 const f=fixture();
 try{
  const bad=path.join(f.out,'en','services',ids.at(-1),'index.html');
  fs.writeFileSync(bad,'<html lang="en"><head></head><body><main>Broken service</main></body></html>');
  assert.throws(()=>projectCommunityServicePages(f.root,f.out),/article/);
  const fa=fs.readFileSync(path.join(f.out,'fa','services',ids[0],'index.html'),'utf8');
  assert.ok(!fa.includes('community-comments.js'),'No partial FA content write');
 }finally{f.clean();}
});
test('public service Q&A retains all three flags and prohibits unverified service stars',()=>{
 const php=fs.readFileSync('api/community.php','utf8');
 const ui=fs.readFileSync('assets/js/community-comments.js','utf8');
 const build=fs.readFileSync('scripts/build-public-site.mjs','utf8');
 assert.match(php,/JR_COMMUNITY_ENABLED/);
 assert.match(php,/JR_COMMUNITY_MIGRATION_APPROVED/);
 assert.match(php,/JR_COMMUNITY_SERVICES_ENABLED/);
 assert.match(php,/service_ratings_not_verified/);
 assert.match(php,/service-catalog\.json/);
 assert.match(ui,/const isService=/);
 assert.match(ui,/if\(isService\)/);
 assert.match(ui,/rating=!isService&&choice\?\.value/);
 assert.match(ui,/\/privacy\//);
 assert.match(ui,/\/en\/login\//);
 assert.match(build,/projectCommunityServicePages\(root,out\)/);
 assert.doesNotMatch(build,/JR_COMMUNITY_SERVICES_ENABLED\s*=\s*true/);
});
