import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {identifyHistoricalUrl, loadHistoricalAuthorityRegistry, classifyHistoricalTarget} from '../platform/historical-authority.mjs';

const registry=loadHistoricalAuthorityRegistry();
const origin=registry.production_origin;
const csvCell=x=>'"'+String(x).replaceAll('"','""')+'"';
const csvLine=(...cols)=>cols.map(csvCell).join(',');
const header=['Target URL','Referring domain','Referring page URL','DR','Link type','Backlinks','Notes'];
function fixture(rows,{separator=',',bom=false,newline='\r\n'}={}){
  const escape=x=>{
    const s=String(x);
    return '"'+s.replaceAll('"','""')+'"';
  };
  return (bom?'\uFEFF':'')+[header,...rows].map(row=>row.map(escape).join(separator)).join(newline)+newline;
}
function importCsv(csv){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'jr-historical-csv-'));
  try{
    const source=path.join(folder,'ahrefs-export.csv');
    const target=path.join(folder,'read-only-report.json');
    fs.writeFileSync(source,csv,'utf8');
    execFileSync(process.execPath,['scripts/historical-backlink-import.mjs',source,target],{cwd:process.cwd(),encoding:'utf8'});
    return JSON.parse(fs.readFileSync(target,'utf8'));
  }finally{
    fs.rmSync(folder,{recursive:true,force:true});
  }
}
test('query-bearing WordPress URLs retain individual evidence identity without changing runtime redirects',()=>{
  assert.deepEqual(identifyHistoricalUrl('/?p=123'),{
    path:'/',identity:'/?p=123',queryIdentityReview:true,queryDisposition:'QUERY_IDENTITY_REVIEW'
  });
  assert.equal(identifyHistoricalUrl('/?p=124').identity,'/?p=124');
  assert.equal(identifyHistoricalUrl('/?page_id=123&utm_source=old').identity,'/?page_id=123');
  assert.equal(identifyHistoricalUrl('/?p=123&utm_source=old&fbclid=token').identity,'/?p=123');
  assert.equal(identifyHistoricalUrl('/?utm_source=old&fbclid=x').identity,'/');
  assert.equal(identifyHistoricalUrl('/publications/?utm_source=x').identity,'/publications/');
  assert.equal(identifyHistoricalUrl('/?a=2&b=1').identity,identifyHistoricalUrl('/?b=1&a=2').identity);
  assert.equal(identifyHistoricalUrl('/?p=123').queryDisposition,'QUERY_IDENTITY_REVIEW');
  const persian='/wp-content/uploads/2022/12/مقاله-اول.pdf';
  assert.equal(identifyHistoricalUrl(encodeURI(persian)).path,persian);
});
test('multiline RFC4180, UTF-8 Persian paths, duplicates and query identity stay separate',()=>{
  const gone=registry.historical_candidates.find(x=>x.decision==='GONE');
  assert.ok(gone);
  const rows=[
    [origin+'/publications/?utm_campaign=old','paper.example','https://paper.example/ref?q=one,two','45','dofollow','2','Legacy authority,\r\nwith a "quoted" source note'],
    [origin+'/?p=123','archive.example','https://archive.example/story?p=123','18','follow','1','old WP ID'],
    [origin+'/?p=124','other.example','https://other.example/ref','12','nofollow','1','distinct WordPress post ID'],
    [origin+'/?p=123&utm_source=news','another.example','https://another.example/ref','20','dofollow','1','tracked duplicate'],
    [origin+'/?utm_source=campaign','home.example','https://home.example/index','15','follow','1','tracking only'],
    [origin+encodeURI('/wp-content/uploads/2022/12/مقاله-اول.pdf'),'pdf.example','https://pdf.example/link','11','nofollow','1','source PDF identity unresolved'],
    [origin+encodeURI(gone.path),'shop-legacy.example','https://shop-legacy.example/ref','17','follow','1','intentionally retired'],
    [origin+'/50-articles-about-carpet/','external.example','https://external.example/page','9','nofollow','1','unrelated content'],
    [origin+'/?page_id=456','wordpress.example','https://wordpress.example/ref','12','dofollow','1','query-specific identity'],
    [origin+'/en/about/?lang=fa','ambiguous.example','https://ambiguous.example/ref','15','follow','1','unclassified query'],
    ['https://notdrjavadrezazadeh.com/post/','outside.example','https://outside.example/ref','50','follow','2','host must not enter results']
  ];
  const report=importCsv(fixture(rows,{bom:true}));
  assert.equal(report.accepted_rows,10);
  assert.equal(report.ignored_rows,1);
  assert.equal(report.target_count,9); // the two /?p=123 records share one identity
  const byPath=new Map(report.targets.map(x=>[x.path,x]));
  assert.equal(byPath.get('/?p=123').referringDomains,2);
  assert.equal(byPath.get('/?p=123').action,'QUERY_IDENTITY_REVIEW');
  assert.equal(byPath.get('/?p=123').redirect_allowed,false);
  assert.equal(byPath.get('/?p=124').action,'QUERY_IDENTITY_REVIEW');
  assert.equal(byPath.get('/?page_id=456').action,'QUERY_IDENTITY_REVIEW');
  assert.equal(byPath.get('/en/about/?lang=fa').action,'QUERY_IDENTITY_REVIEW');
  assert.equal(byPath.get('/').action,'PRESERVE_HOME');
  assert.equal(byPath.get('/publications/').action,'ALREADY_MAPPED');
  assert.equal(byPath.get('/publications/').target,'/en/publications/');
  assert.equal(byPath.get('/publications/').backlinks,2);
  assert.equal(byPath.get('/wp-content/uploads/2022/12/مقاله-اول.pdf').action,'REVIEW');
  assert.equal(byPath.get(gone.path).action,'QUARANTINE_GONE');
  assert.equal(byPath.get('/50-articles-about-carpet/').action,'REVIEW');
  for(const entry of report.targets.filter(x=>x.query_identity_review)){
    assert.equal(entry.intent_verification_required,true);
    assert.equal(entry.target,null);
    assert.equal(entry.status,null);
    assert.equal(entry.redirect_allowed,false);
  }
  assert.equal(report.summary.query_identity_review,4);
});
test('TSV and semicolon exports preserve a newline inside a quoted text field',()=>{
  for(const separator of ['\t',';']){
    const rows=[
      [origin+'/?p=12','one.example','https://one.example/ref','20','follow','1','A\r\nB'],
      [origin+'/publications/','two.example','https://two.example/ref','30','nofollow','1','Commas, tabs\tand "quotes"']
    ];
    const report=importCsv(fixture(rows,{separator,newline:'\n'}));
    assert.equal(report.accepted_rows,2);
    assert.equal(report.targets.find(x=>x.path==='/?p=12').action,'QUERY_IDENTITY_REVIEW');
    assert.equal(report.targets.find(x=>x.path==='/publications/').target,'/en/publications/');
  }
});
test('malformed quoted record fails closed instead of silently shifting columns',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jr-bad-historical-csv-'));
  try{
    const filename=path.join(dir,'bad.csv');
    fs.writeFileSync(filename,'Target URL,Referring domain\n"https://drjavadrezazadeh.com/?p=1,example.org\n');
    const result=spawnSync(process.execPath,['scripts/historical-backlink-import.mjs',filename],{cwd:process.cwd(),encoding:'utf8'});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Unterminated quoted CSV field/);
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
test('historical evidence import does not modify any redirect, registry, sitemap, or live workflow',()=>{
  const src=fs.readFileSync('scripts/historical-backlink-import.mjs','utf8');
  assert.match(src,/queryIdentityReview/);
  assert.match(src,/parseCsvRecords/);
  assert.match(src,/QUERY_IDENTITY_REVIEW/);
  assert.match(src,/classifyHistoricalTarget/);
  assert.doesNotMatch(src,/\.htaccess[^'"]*['"],[^'"]*['"]w/);
  assert.doesNotMatch(src,/\bhttps\.request\b|\bfetch\s*\(/);
  const existing=registry.authority_redirects;
  assert.equal(existing.length,10);
  assert.equal(registry.historical_candidates.filter(x=>x.decision==='GONE').length,6);
  assert.equal(registry.historical_candidates.filter(x=>x.decision==='REVIEW').length,1);
});

test('shared classifier refuses to mislabel content-specific WordPress requests as home or existing mappings',()=>{
  for(const uri of ['/?p=123','/?page_id=456','/shop/?product_id=19','/about/?lang=fa']){
    const item=classifyHistoricalTarget(uri,registry);
    assert.equal(item.action,'QUERY_IDENTITY_REVIEW',uri);
    assert.equal(item.target,undefined,uri);
    assert.equal(item.path,identifyHistoricalUrl(uri).identity);
  }
  assert.equal(classifyHistoricalTarget('/?utm_source=old',registry).action,'PRESERVE_HOME');
  assert.equal(classifyHistoricalTarget('/shop/?utm_campaign=archived',registry).action,'PRESERVE_SHOP');
});
test('the existing Apache 404 analyzer keeps distinct post IDs in the evidence report',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'jr-historical-404-query-'));
 try{
  const file=path.join(folder,'access.log');
  const log=(request,status,ref)=>'192.0.2.10 - - [19/Oct/2026:12:01:00 +0330] "GET '+request+' HTTP/1.1" '+status+' 156 "'+ref+'" "Mozilla/5.0"';
  fs.writeFileSync(file,[
    log('/?p=123',404,'https://old-news.example/story'),
    log('/?p=123&utm_source=news',404,'https://referral.example/page'),
    log('/?p=124',404,'https://another.example/story'),
    log('/?utm_source=old',404,'-')
  ].join('\n'));
  const report=JSON.parse(execFileSync(process.execPath,['scripts/historical-404-log-analyzer.mjs',file],{encoding:'utf8'}));
  assert.equal(report.matched_404_410_lines,4);
  assert.equal(report.url_count,3);
  const data=new Map(report.rows.map(x=>[x.path,x]));
  assert.equal(data.get('/?p=123').hits,2);
  assert.equal(data.get('/?p=123').action,'QUERY_IDENTITY_REVIEW');
  assert.equal(data.get('/?p=123').target,null);
  assert.equal(data.get('/?p=124').action,'QUERY_IDENTITY_REVIEW');
  assert.equal(data.get('/').action,'PRESERVE_HOME');
 }finally{fs.rmSync(folder,{recursive:true,force:true})}
});

test('all approved historical mappings target frozen indexable public URL identities',()=>{
 const manifest=JSON.parse(fs.readFileSync('platform/public-url-stability-manifest.json','utf8'));
 const audit=fs.readFileSync('scripts/historical-authority-audit.mjs','utf8');
 assert.equal(manifest.production_origin,registry.production_origin);
 assert.equal(manifest.policy.route_identity_is_stable,true);
 assert.equal(manifest.policy.redirect_chain_allowed,false);
 const frozen=new Set(manifest.frozen_indexable_routes);
 for(const mapping of registry.authority_redirects){
  assert.equal(mapping.status,301);
  assert.ok(frozen.has(mapping.target),'Unfrozen 301 destination: '+mapping.source+' -> '+mapping.target);
 }
 assert.match(audit,/frozenPublicRoutes\.has\(rec\.target\)/);
 assert.match(audit,/privatePrefixes\.some/);
});
