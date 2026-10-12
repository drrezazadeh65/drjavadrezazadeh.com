import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreOpportunity,prioritize} from './opportunities.mjs';
const sample={id:'seo-404',title:'Repair verified broken internal links',dimension:'seo',impact:5,confidence:5,effort:1,risk:1};
test('scores deterministically',()=>assert.equal(scoreOpportunity(sample),94));
test('sorts descending',()=>assert.equal(prioritize([{...sample,id:'seo-002',impact:1},sample])[0].id,'seo-404'));
test('rejects unknown dimensions',()=>assert.throws(()=>scoreOpportunity({...sample,dimension:'unknown'})));
test('rejects duplicate identifiers',()=>assert.throws(()=>prioritize([sample,sample])));
test('defaults all tasks to review',()=>assert.equal(prioritize([sample])[0].execution,'review_required'));
