import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const read=p=>fs.readFileSync(path.join(process.cwd(),p),'utf8');

test('reader commentary uses frozen global brand tokens, not an independent palette',()=>{
 const s=read('assets/css/community-comments.css');
 for(const token of ['--bg','--bg-elev','--surface-2','--text','--muted','--gold','--line','--r-xl','--shadow'])
  assert.ok(s.includes(token),'Missing semantic token: '+token);
 assert.match(s,/academic|academia/i);
 assert.match(s,/radial-gradient/);
});
test('admin component inherits operations design tokens and protects privacy visibility',()=>{
 const s=read('assets/css/operations-community-moderation.css');
 for(const token of ['--ops-bg','--ops-panel','--ops-border','--ops-text','--ops-muted','--ops-gold'])
  assert.ok(s.includes(token),'Missing token '+token);
 assert.match(s,/#jr-community-admin/);
 const ui=read('assets/js/operations-community-moderation.js');
 assert.match(ui,/if\(workspace\.hidden\)\{lock\(\);return;\}/);
 assert.match(ui,/id='jr-community-admin-heading'|heading\.id='jr-community-admin-heading'/);
});
test('authentic logo is reused on both surfaces; no fictional portrait generated',()=>{
 for(const file of ['assets/js/community-comments.js','assets/js/operations-community-moderation.js']){
  const src=read(file);
  assert.match(src,/\/favicon\.svg/);
  assert.doesNotMatch(src,/images\.unsplash\.com|placehold\.co|randomuser\.me|fake-portrait/);
 }
});
test('both surfaces respect mobile, keyboard and reduced-motion preferences',()=>{
 for(const file of ['assets/css/community-comments.css','assets/css/operations-community-moderation.css']){
  const s=read(file);
  assert.match(s,/@media\(max-width:/);
  assert.match(s,/:focus-visible/);
  assert.match(s, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(s, /@media\(forced-colors:active\)/);
 }
 assert.match(read('assets/css/community-comments.css'),/min-height:48px/);
 assert.match(read('assets/css/operations-community-moderation.css'),/min-height:46px/);
});
test('reader star scale has semantic radio controls and no speculative SEO schema',()=>{
 const src=read('assets/js/community-comments.js');
 assert.match(src,/<fieldset class="jr-community-rating">/);
 assert.match(src,/<legend>امتیاز اختیاری به این مقاله<\/legend>/);
 assert.match(src,/type="radio" name="rating"/);
 assert.match(src,/value="5"/);
 assert.match(src,/value="1"/);
 assert.match(src,/name="consent" required/);
 assert.match(src,/aria-live/);
 assert.doesNotMatch(src,/aggregateRating|ReviewCount|schema\.org\/Review/);
});
