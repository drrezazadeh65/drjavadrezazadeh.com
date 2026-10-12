import test from 'node:test';import assert from 'node:assert/strict';import {validateMetric,summarizeMetrics} from './metrics.mjs';
const row={metric:'organic_clicks',value:8,period:'2026-10-09',source:'search_console'};
test('valid metric',()=>assert.equal(validateMetric(row).value,8));
test('reject unknown fields',()=>assert.throws(()=>validateMetric({...row,email:'x@y.z'})));
test('financial metrics require currency',()=>assert.throws(()=>validateMetric({...row,metric:'gross_revenue_minor'})));
test('aggregate consistent rows',()=>assert.equal(summarizeMetrics([row,{...row,value:3}])[0].value,11));
test('do not silently mix sources',()=>assert.throws(()=>summarizeMetrics([row,{...row,source:'another_source'}])));
