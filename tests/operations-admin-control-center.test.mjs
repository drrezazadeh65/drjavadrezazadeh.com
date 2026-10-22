import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {generateQualityInventory} from '../scripts/operations-page-quality.mjs';
import {hiddenFeatureSourceInventory} from '../scripts/operations-hidden-features.mjs';

const sample=(route,body)=>`<!doctype html><html lang="en"><head>
<title>International academic writing and teaching resources</title>
<meta name="description" content="A public research description that is substantial enough to demonstrate source-level quality checks.">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="canonical" href="https://drjavadrezazadeh.com${route}">
</head><body><main><article><h1>Academic teaching resources</h1>
<h2>Research and practice</h2><p>${body}</p></article></main></body></html>`;

test('per-page grades distinguish static source readiness from field measurements',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'drjr-admin-quality-'));
 try{
  const en=path.join(dir,'en');fs.mkdirSync(en);
  fs.writeFileSync(path.join(en,'index.html'),sample('/en/','methods '.repeat(110)));
  fs.writeFileSync(path.join(dir,'sitemap.xml'),`<?xml version="1.0"?>
<urlset><url><loc>https://drjavadrezazadeh.com/en/</loc></url>
<url><loc>https://drjavadrezazadeh.com/en/dynamic/</loc></url></urlset>`);
  const inventory=generateQualityInventory(dir);
  assert.equal(inventory.schema,'operations-page-quality-inventory-v1');
  assert.equal(inventory.total,2);
  const page=inventory.pages.find(x=>x.route==='/en/');
  assert.ok(page);assert.equal(typeof page.grades.content.score,'number');
  assert.equal(typeof page.grades.speedReadiness.score,'number');
  assert.equal(page.grades.speed.score,null);
  assert.equal(page.grades.security.score,null);
  const dynamic=inventory.pages.find(x=>x.route==='/en/dynamic/');
  assert.ok(dynamic);
  assert.equal(dynamic.grades.seo.score,null);
  assert.equal(dynamic.overallSourceReadiness,null);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('existing hidden features do not claim live activation',()=>{
 const result=hiddenFeatureSourceInventory(path.resolve('.'));
 assert.equal(result.schema,'operations-existing-feature-catalogue-v1');
 assert.ok(result.features.some(x=>x.id==='redirect-301-410'&&x.engineId==='ENG-01'));
 assert.ok(result.features.some(x=>x.id==='site-runtime-health'&&x.engineId==='ENG-11'));
 assert.ok(result.features.every(x=>x.productionState==='not_independently_verified'));
 assert.ok(result.features.every(x=>/^ENG-(0[1-9]|1[0-3])$/.test(x.engineId)));
});
