import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
const pagePath=['en/publications/index.html','fa/entesharat-elmi/index.html'];
const jsonld=page=>[...page.matchAll(/<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/gi)].map(hit=>JSON.parse(hit[1]));
const graph=page=>jsonld(page).flatMap(doc=>Array.isArray(doc['@graph'])?doc['@graph']:[doc]);
const byType=(nodes,type)=>nodes.filter(x=>x['@type']===type);
const id='https://drjavadrezazadeh.com/#person';

test('the same three public scholarly articles retain metadata in both languages',()=>{
 const snapshots=pagePath.map(p=>graph(read(p)));
 const [english,persian]=snapshots.map(nodes=>byType(nodes,'ScholarlyArticle'));
 assert.equal(english.length,3);
 assert.deepEqual(persian,english);
 const dois=english.map(a=>a.identifier).filter(Boolean);
 assert.deepEqual(dois,[
  'https://doi.org/10.61838/kman.ijes.1413',
  'https://doi.org/10.17576/3L-2016-2201-09'
 ]);
 assert.equal(english[2].identifier,undefined,'do not fabricate third DOI');
});

test('all six unsupported article-level volume and issue properties are absent',()=>{
 for(const p of pagePath){
  const nodes=graph(read(p));
  const articles=byType(nodes,'ScholarlyArticle');
  assert.equal(articles.length,3,p);
  for(const a of articles){
   assert.equal(Object.hasOwn(a,'volumeNumber'),false,a.name);
   assert.equal(Object.hasOwn(a,'issueNumber'),false,a.name);
   assert.ok(a.isPartOf?.['@id'],'article must reference issue');
  }
  assert.equal(byType(nodes,'PublicationVolume').length,3,p);
  assert.equal(byType(nodes,'PublicationIssue').length,3,p);
  assert.equal(byType(nodes,'Periodical').length,3,p);
 }
});

test('article → issue → volume → periodical is exact and acyclic',()=>{
 for(const p of pagePath){
  const nodes=graph(read(p)),map=new Map(nodes.filter(n=>n['@id']).map(n=>[n['@id'],n]));
  assert.equal(new Set(nodes.filter(n=>n['@id']).map(n=>n['@id'])).size,map.size);
  for(const a of byType(nodes,'ScholarlyArticle')){
    const issue=map.get(a.isPartOf['@id']);
    assert.equal(issue?.['@type'],'PublicationIssue',a.name);
    assert.match(String(issue.issueNumber),/^\d+$/);
    const volume=map.get(issue.isPartOf?.['@id']);
    assert.equal(volume?.['@type'],'PublicationVolume',a.name);
    assert.match(String(volume.volumeNumber),/^\d+$/);
    const journal=map.get(volume.isPartOf?.['@id']);
    assert.equal(journal?.['@type'],'Periodical',a.name);
    assert.ok(journal.name?.length>7);
    assert.ok(!('issueNumber' in volume));
    assert.ok(!('volumeNumber' in issue));
  }
 }
});

test('third article metadata is supported by the original IJHCS issue index, with no invented DOI',()=>{
 for(const filename of pagePath){
  const nodes=graph(read(filename));
  const issue=byType(nodes,'PublicationIssue').find(x=>x.issueNumber==='2');
  const periodical=byType(nodes,'Periodical').find(x=>x.name==='International Journal of Humanities and Cultural Studies');
  assert.equal(issue?.url,'https://www.ijhcs.com/index.php/IJHCS/issue/download/10/28');
  assert.equal(periodical?.issn,'2356-5926');
  const third=byType(nodes,'ScholarlyArticle').find(x=>x.name==='On the Effect of Phonetic Transcription and Morphological Awareness on Performing Listening Tasks');
  assert.equal(third?.identifier,undefined,'no publisher-confirmed DOI available');
  assert.equal(third?.pagination,'1791-1800');
  assert.deepEqual(third?.author?.map(a=>a.name||a['@id']),[
   'Hooshang Yazdani','Afsaneh Afshin Mehr','Hojjat Yousefali',id
  ]);
 }
});
test('verified coauthors are authors, not merely contributors; preserve the true order',()=>{
 const authors=byType(graph(read(pagePath[0])),'ScholarlyArticle').map(a=>a.author);
 assert.deepEqual(authors.map(list=>list.map(p=>p.name||p['@id'])),[
  [id,'Moussa Ahmadian','Hooshang Yazdani'],
  [id,'Morteza Mellati','Mostafa Mehdizadeh'],
  ['Hooshang Yazdani','Afsaneh Afshin Mehr','Hojjat Yousefali',id]
 ]);
 assert.ok(authors.every(list=>Array.isArray(list)&&list.every(person=>person['@type']==='Person'||person['@id']===id)));
 assert.ok(byType(graph(read(pagePath[0])),'ScholarlyArticle').every(article=>!article.contributor));
});

test('preserve canonical bilingual pages and the single stable person entity',()=>{
 const en=read(pagePath[0]),fa=read(pagePath[1]);
 assert.match(en,/rel="canonical" href="https:\/\/drjavadrezazadeh\.com\/en\/publications\/"/);
 assert.match(fa,/rel="canonical" href="https:\/\/drjavadrezazadeh\.com\/fa\/entesharat-elmi\/"/);
 for(const p of [en,fa]){
  assert.ok(p.includes('hreflang="en"'));
  assert.ok(p.includes('hreflang="fa"'));
  assert.equal(byType(graph(p),'Person').filter(person=>person['@id']===id).length<=1,true);
  assert.doesNotMatch(p,/\bprivate[_-]?key\b/i);
 }
});

test('SEO identity governance preserves real independent coauthors without relaxing owner identity',()=>{
 const source=read('scripts/seo-regression.mjs');
 const registry=JSON.parse(read('platform/public-entity-registry.json'));
 const owner=registry.person.structured_name;
 assert.equal(owner,'Javad Rezazadeh Yazdeli');
 assert.match(source,/const ownerIdentity=obj\['@id'\]===expectedPersonId/);
 assert.match(source,/ownerNames\.has\(obj\.name\)/);
 assert.match(source,/if\(ownerIdentity\)/);
 assert.match(source,/if\(obj\.name&&obj\.name!==person\.structured_name\)/);
 assert.match(source,/if\(!approvedSameAs\.has\(url\)\)/);
 for(const file of pagePath){
  const authors=byType(graph(read(file)),'ScholarlyArticle').flatMap(a=>a.author);
  const namedColleagues=authors.filter(a=>a['@type']==='Person'&&a['@id']!==id);
  assert.equal(namedColleagues.length,7,'retain independently identified colleagues');
  assert.ok(namedColleagues.every(a=>typeof a.name==='string'&&a.name.length>=8));
  assert.ok(namedColleagues.every(a=>a.name!==owner));
  assert.ok(namedColleagues.every(a=>a['@id']!==id),
   'coauthors must not be assigned the site owner identity');
 }
});
