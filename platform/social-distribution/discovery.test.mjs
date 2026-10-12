import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNewsSitemap,articleInfo,enrichNews,mergeNews} from './discovery.mjs';

const url='https://drjavadrezazadeh.com/fa/akhbar/farakhvan-jhela/';
const sitemap='<urlset><url><loc>'+url+'</loc><lastmod>2026-10-11</lastmod></url>'+
'<url><loc>https://other.example/fa/akhbar/evil/</loc></url></urlset>';
const article='<!doctype html><html><head>'+
'<link rel="canonical" href="'+url+'">'+
'<meta property="og:title" content="دعوت به مشارکت علمی">'+
'<meta property="og:description" content="فراخوان بررسی علمی و روشمند"></head><body><h1>خبر</h1></body></html>';
test('never ingest a foreign origin from news sitemap',()=>{
 const list=parseNewsSitemap(sitemap);
 assert.equal(list.length,1);
 assert.equal(list[0].url,url);
});
test('only a canonical released and titled news page passes',()=>{
 const item=articleInfo(article,url,'2026-10-11');
 assert.equal(item.source,'news');
 assert.equal(item.title,'دعوت به مشارکت علمی');
 assert.equal(articleInfo(article.replace(url,'https://example.com/'),url,'2026-10-11'),null);
 assert.equal(articleInfo(article.replace('<head>','<head><meta name="robots" content="noindex">'),url,'2026-10-11'),null);
});
test('news enrichment is isolated from actual external networking',async()=>{
 const fetcher=async target=>({ok:target===url,text:async()=>article});
 const news=await enrichNews(sitemap,fetcher);
 assert.equal(news.length,1);
});
test('news content has priority over evergreen material without duplicates',async()=>{
 const fetcher=async target=>({ok:true,text:async()=>target.endsWith('sitemap-news.xml')?sitemap:article});
 const merged=await mergeNews([
  {url:'https://drjavadrezazadeh.com/fa/rahnamaha/guide/',title:'راهنما'},
  {url,title:'duplicated feed'}],fetcher);
 assert.equal(merged.length,2);
 assert.equal(merged[0].source,'news');
});
