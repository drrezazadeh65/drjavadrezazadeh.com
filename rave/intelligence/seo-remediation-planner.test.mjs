import test from 'node:test';
import assert from 'node:assert/strict';
import {planSeoRemediation,remediationSummary} from './seo-remediation-planner.mjs';

test('generates offline candidate only with supplied title',()=>{
 const plan=planSeoRemediation({findings:[{code:'missing_title',path:'/fa/about/'}]},{titles:{'/fa/about/':'درباره ما'}});
 assert.equal(plan[0].mode,'candidate');
 assert.deepEqual(plan[0].proposal,{operation:'set-title',value:'درباره ما'});
 assert.equal(plan[0].applied,false);
 assert.equal(remediationSummary(plan).productionTouched,false);
});
test('never invents titles or descriptions',()=>{
 const plan=planSeoRemediation({findings:[{code:'missing_title',path:'/en/about/'},{code:'missing_description',path:'/en/about/'}]});
 assert.ok(plan.every(x=>x.mode==='needs-evidence'&&x.proposal===null));
});
test('requires manual review for risky canonical and duplicate issues',()=>{
 const plan=planSeoRemediation({findings:[{code:'canonical_mismatch',path:'/en/a/'},{code:'duplicate_path',path:'/en/a/'}]});
 assert.ok(plan.every(x=>x.mode==='manual-review'&&!x.applied));
});
test('removes noindex entries from sitemap only as proposed action',()=>{
 const plan=planSeoRemediation({findings:[{code:'noindex_in_sitemap',path:'/fa/private/'}]});
 assert.equal(plan[0].proposal.operation,'remove-from-sitemap');
 assert.equal(remediationSummary(plan).applied,0);
});
test('rejects malformed audit',()=>assert.throws(()=>planSeoRemediation({}),TypeError));
