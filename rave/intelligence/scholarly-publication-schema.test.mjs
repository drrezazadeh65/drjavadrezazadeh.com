import test from 'node:test';
import assert from 'node:assert/strict';
import {buildScholarlyPublicationGraph} from './scholarly-publication-schema.mjs';
const base={siteOrigin:'https://drjavadrezazadeh.com',authorId:'https://drjavadrezazadeh.com/#academic-person'};
const publication={kind:'article',titleFa:'مقاله',titleEn:'Research article',pathFa:'/fa/research/article/',pathEn:'/en/research/article/',abstractEn:'A research abstract.',editorialVerified:true,doi:'10.1234/example'};
test('creates verified article graph with DOI and author linkage',()=>{
 const g=buildScholarlyPublicationGraph({...base,publication});
 assert.equal(g['@graph'][0]['@type'],'ScholarlyArticle');
 assert.equal(g['@graph'][0].identifier,'https://doi.org/10.1234/example');
 assert.equal(g['@graph'][0].author['@id'],base.authorId);
});
test('creates book graph without inventing an identifier',()=>{
 const g=buildScholarlyPublicationGraph({...base,publication:{...publication,kind:'book',doi:undefined}});
 assert.equal(g['@graph'][0]['@type'],'Book');
 assert.equal(g['@graph'][0].isbn,undefined);
});
test('rejects unverified and malformed publication claims',()=>{
 assert.throws(()=>buildScholarlyPublicationGraph({...base,publication:{...publication,editorialVerified:false}}));
 assert.throws(()=>buildScholarlyPublicationGraph({...base,publication:{...publication,doi:'not-a-doi'}}));
});
