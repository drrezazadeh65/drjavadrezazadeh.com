import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const script=read('assets/js/operations-revenue-planner.mjs');
const model=read('assets/js/revenue-planner-model.mjs');
const stylesheet=read('assets/css/operations-revenue-planner.css');
for(const locale of ['fa/app/admin/index.html','en/account/admin/index.html']){
 const page=read(locale);
 assert.equal((page.match(/data-jr-revenue-planner/g)||[]).length,1,locale+' requires exactly one planning mount');
 assert.equal((page.match(/operations-revenue-planner\.mjs/g)||[]).length,1,locale+' must load model UI once');
 assert.equal((page.match(/operations-revenue-planner\.css/g)||[]).length,1,locale+' must load its mobile stylesheet');
 assert.ok(page.indexOf('id="ops-revenue-planning"')>page.indexOf('id="ops-organic-growth"'),locale+' must use the existing operations workspace');
 assert.ok(page.includes('id="ops-workspace" hidden'),locale+' must remain behind existing admin display gate');
}
for(const text of [script,model]){
 assert.doesNotMatch(text,/localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|document\.cookie|analytics\.track|gtag\(/,'planning cannot persist or transmit private records');
}
assert.match(script,/credentials:'omit'/,'only anonymous public catalog fetches permitted');
assert.match(script,/data-jr-revenue-planner/);
assert.match(model,/HYPOTHETICAL_NOT_VERIFIED_REVENUE/);
assert.match(model,/isOperationalEvidence:false/);
assert.match(model,/afterFixedCostMinor/,'fixed overhead must be reported separately from contribution');
assert.match(model,/gatewayFeeMinor/,'gateway fee assumptions must be itemised');
assert.match(model,/marketingCostMinor/,'acquisition assumptions must be itemised');
assert.match(script,/forecast.afterFixedCostMinor/,'admin must distinguish after-fixed estimate from contribution');
assert.match(script,/forecast.gatewayFeeMinor/,'admin must show attributed gateway assumptions');
assert.match(stylesheet,/@media\(max-width:430px\)/);
const services=JSON.parse(read('assets/data/service-catalog.json'));
const vips=JSON.parse(read('assets/data/vip-catalog.json'));
const books=JSON.parse(read('assets/data/book-catalog.json'));
assert.deepEqual([services.services.length,vips.services.length,books.books.length],[21,6,3]);
assert.equal(services.currency,'IRT');assert.equal(vips.currency,'IRT');
for(const entry of [...services.services,...vips.services,...books.books.map(b=>b.commerce)]){
 assert.ok(Number.isSafeInteger(entry.price)&&entry.price>=0,'published catalog price contract');
}
console.log('PASS JR Revenue Scenario Studio: 2 admin locales, 30 published offers, hypothetical-only reporting, no storage or private telemetry; production not verified.');
