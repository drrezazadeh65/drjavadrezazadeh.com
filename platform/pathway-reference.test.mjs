import assert from 'node:assert/strict';
import {validatePathwayReference,createPathwayHypothesis,pathwayPortfolio} from './pathway-reference.mjs';

const ref=validatePathwayReference({
 reference_type:'CAREER',source_system:'ONET',source_version:'example-version',
 source_record_id:'example-id',jurisdiction:'US',locale:'en',source_url:'https://example.invalid/reference',
 licence:'VERIFY_BEFORE_LIVE_USE',retrieved_at:'2026-10-06T00:00:00Z',title:'Example pathway'
});
assert.equal(ref.validated_reference,true);
assert.throws(()=>validatePathwayReference({reference_type:'CAREER'}));
const h=createPathwayHypothesis({
 subject_user_id:'subject',pathway_reference:ref,supporting_evidence_ids:['e1'],
 counterevidence_ids:['e2'],uncertainty:'Evidence remains incomplete.',
 proposed_experiment:'Complete a supervised real-world exploration task.',reviewer_user_id:'reviewer'
});
assert.equal(h.status,'HYPOTHESIS');
assert.equal(h.suitability_score,null);
assert.equal(h.automatic_career_prescription,false);
const p=pathwayPortfolio([h]);
assert.equal(p.ordering,'UNRANKED');
assert.equal(p.total_score,null);
console.log('Pathway reference contract passed');
