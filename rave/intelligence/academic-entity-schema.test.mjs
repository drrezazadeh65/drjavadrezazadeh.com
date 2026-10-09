import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAcademicIdentityGraph,buildAcademicServiceGraph} from './academic-entity-schema.mjs';
const siteOrigin='https://drjavadrezazadeh.com';
const organization={nameFa:'مرکز علمی',nameEn:'Academic Centre',pathFa:'/fa/about/',pathEn:'/en/about/'};
test('builds stable linked organization and verified person identities',()=>{
 const graph=buildAcademicIdentityGraph({siteOrigin,organization,person:{nameFa:'جواد رضازاده',nameEn:'Javad Rezazadeh',pathFa:'/fa/about/',pathEn:'/en/about/',verified:true}});
 assert.equal(graph['@graph'][0]['@id'],siteOrigin+'/#organization');
 assert.equal(graph['@graph'][1].affiliation['@id'],siteOrigin+'/#organization');
});
test('does not invent unverified academic identity',()=>{
 assert.throws(()=>buildAcademicIdentityGraph({siteOrigin,organization,person:{nameFa:'نام',nameEn:'Name',pathFa:'/fa/about/',pathEn:'/en/about/'}}));
});
test('links approved service to organization without inventing pricing',()=>{
 const graph=buildAcademicServiceGraph({siteOrigin,organizationId:siteOrigin+'/#organization',service:{id:'s1',titleFa:'مشاوره',titleEn:'Consultation',descriptionFa:'توضیح',descriptionEn:'Description',paths:{fa:'/fa/services/consultation/',en:'/en/services/consultation/'},approvedByEditor:true}});
 assert.equal(graph['@graph'][0].provider['@id'],siteOrigin+'/#organization');
 assert.equal(graph['@graph'][0].offers,undefined);
});
