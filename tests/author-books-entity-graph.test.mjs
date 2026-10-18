import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const books=JSON.parse(read('assets/data/book-catalog.json')).books;
const pages=[['fa','fa/ketab-ha/index.html'],['en','en/books/index.html']];
const base='https://drjavadrezazadeh.com/';
for(const [lang,path] of pages){
 test(lang+' published books have grounded human-visible metadata and entity links',()=>{
  const html=read(path);assert.equal(books.length,3);
  assert.match(html,/author-books-bibliography-20261018\.css/);
  assert.equal((html.match(/class="authority-card book-publication"/g)||[]).length,books.length);
  const s=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(s,'schema.org must be valid on the public page');
  const graph=JSON.parse(s[1])['@graph'];
  const list=graph.find(n=>n['@type']==='ItemList');assert.equal(list.numberOfItems,3);
  const nodes=graph.filter(n=>n['@type']==='Book');assert.equal(nodes.length,books.length);
  for(const b of books){
   const node=nodes.find(n=>n['@id']===base+'#book-'+b.slug);assert.ok(node,b.id);
   assert.equal(node.name,b.title_fa);assert.equal(node.alternateName,b.english_reference_title);
   assert.equal(node.inLanguage,'fa');assert.equal(node.isbn,b.bibliography.isbn);
   assert.equal(node.image,base.slice(0,-1)+b.bibliography.cover_image);
   assert.equal(node.publisher.name,b.bibliography.publisher);
   assert.equal(node.author['@id'],base+'#person');
   assert.equal(node.url,base+(lang==='fa'?'fa/ketab-ha/':'en/books/')+'#book-'+b.slug);
   for(const forbidden of ['offers','aggregateRating','review','datePublished','award'])assert.equal(Object.hasOwn(node,forbidden),false);
   assert.ok(html.includes('id="book-'+b.slug+'"'));
   assert.ok(html.includes('href="../shop/book/?id='+b.id+'"'));
   assert.ok(html.includes('src="'+b.bibliography.cover_image+'"'));
   assert.ok(html.includes(b.bibliography.isbn));
   assert.ok(html.includes(String(b.bibliography.publication_year)));
  }
  assert.match(html,/hreflang="fa"/);assert.match(html,/hreflang="en"/);
  assert.match(html,/name="robots" content="index,follow/);
 });
}
