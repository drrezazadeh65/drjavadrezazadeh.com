import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const retiredName = new RegExp('\\b' + 'o' + 'j' + 's' + '\\b', 'i');
function htmlFiles(root) {
  return fs.readdirSync(root, {withFileTypes:true}).flatMap(entry => {
    const file=path.join(root,entry.name);
    return entry.isDirectory()?htmlFiles(file):entry.isFile()&&entry.name.endsWith('.html')?[file]:[];
  });
}
test('all published journal pages and owner interfaces use only the independent editorial platform',()=>{
  const paths=[
    ...htmlFiles('journal'),
    'fa/app/admin/index.html',
    'en/account/admin/index.html',
    'fa/akhbar/farakhvan-jhela/index.html',
    'assets/search-index.json',
    'assets/js/operations-jhela-maturity.js',
    'assets/js/operations-jhela-workstream.js',
    'assets/js/jhela-author-workspace.js',
    'assets/js/operations-jhela-manuscripts.js'
  ];
  for(const file of paths){
    const content=fs.readFileSync(file,'utf8');
    assert.ok(!retiredName.test(content),'Retired vendor must not appear in '+file);
  }
});
test('retired journal stylesheet is blocked from future releases and from public HTTP access',()=>{
  const builder=fs.readFileSync('scripts/build-public-site.mjs','utf8');
  const rewrite=fs.readFileSync('.htaccess','utf8');
  assert.ok(builder.includes("'assets/css/jhela-ojs-theme.css'"));
  assert.ok(rewrite.includes('RewriteRule ^assets/css/jhela-ojs-theme\\\\.css$ - [G,L]'));
});
test('journal policies referenced from the bilingual roadmap exist',()=>{
  assert.ok(fs.existsSync('journal/ethics/index.html'));
  assert.ok(fs.existsSync('journal/fa/ethics/index.html'));
});
