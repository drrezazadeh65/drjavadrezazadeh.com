/**
 * Optional, public-only service question surfaces in the sanitized Bertina bundle.
 * Only approved 21 FA/EN service description routes; never account, checkout,
 * unpublished manuscripts or arbitrary page directories.
 *
 * Feature is still disabled on the server unless three independent owner gates
 * allow it. There is no SQL, payment activation or direct production mutation.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const CSS='<link rel="stylesheet" href="/assets/css/community-comments.css?v=20261021-academic-v2">';
const JS='<script src="/assets/js/community-comments.js?v=20261021-academic-v2" defer></script>';

export function projectCommunityServicePages(root,out,{write=true}={}){
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/data/service-catalog.json'),'utf8'));
 const ids=(catalog.services||[]).filter(x=>x.sellable===true).map(x=>x.id);
 assert.equal(ids.length,21,'Exactly 21 owner-approved sellable service descriptions');
 assert.equal(new Set(ids).size,21,'Service identifiers must be unique');
 for(const id of ids)assert.match(id,/^[a-z][a-z0-9_]{1,59}$/,'Safe service directory');
 // Stage every language before writing any file. No partial source/artefact edit.
 const staged=[];
 for(const lang of ['fa','en']){
  for(const id of ids){
   const file=path.join(out,lang,'services',id,'index.html');
   const before=fs.readFileSync(file,'utf8');
   assert.match(before,new RegExp('<html[^>]*lang="'+lang+'"'),'Correct page language');
   assert.match(before,/<main\b/);
   assert.match(before,/<article\b/);
   assert.match(before,/<meta name="robots" content="index,follow/);
   assert.ok(!before.includes('community-comments.js')&&!before.includes('community-comments.css'),
     'No duplicate community loader');
   assert.equal((before.match(/<\/head>/g)||[]).length,1,'Exactly one head');
   assert.equal((before.match(/<\/body>/g)||[]).length,1,'Exactly one body');
   const html=before.replace('</head>',CSS+'</head>').replace('</body>',JS+'</body>');
   staged.push({lang,id,file,html});
  }
 }
 assert.equal(staged.length,42,'Exactly 21 approved bilingual services');
 if(write)for(const item of staged)fs.writeFileSync(item.file,item.html,'utf8');
 return {services:ids.length,pages:staged.length,featureFlag:'JR_COMMUNITY_SERVICES_ENABLED'};
}
