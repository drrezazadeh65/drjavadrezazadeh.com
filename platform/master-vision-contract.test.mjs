import assert from 'node:assert/strict';
import fs from 'node:fs';

const vision=JSON.parse(fs.readFileSync(new URL('./master-vision-architecture.json',import.meta.url),'utf8'));
const modules=JSON.parse(fs.readFileSync(new URL('./module-registry.json',import.meta.url),'utf8'));
const coaching=JSON.parse(fs.readFileSync(new URL('./development-coaching-policy.json',import.meta.url),'utf8'));
const api=fs.readFileSync(new URL('../foundation/API-CONTRACT-v1.yaml',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('./db/migrations/029_master_vision_longitudinal_revenue.sql',import.meta.url),'utf8');

assert.equal(vision.north_star,'Authority + Education + Intelligence + Revenue Ecosystem');
assert.deepEqual(vision.moats,['BRAND','PRODUCT_DATA','DISCOVERY']);
assert.equal(vision.public_audiences.length,4);
assert.equal(vision.engines.golden_talent.core,'COUNTRY_AGNOSTIC');
assert.deepEqual(vision.engines.golden_talent.journey,['DISCOVER','ASSESS','PLAN','COACH','TRACK','PREDICT','DECIDE','GROW']);
assert.equal(vision.engines.intelligence.rule,'AI_ASSISTED_EVIDENCE_BASED_HUMAN_SUPERVISED');
assert(vision.do_not_build_now.includes('THIN_PROGRAMMATIC_SEO'));
assert(vision.do_not_build_now.includes('DECORATIVE_AI_CHATBOT'));

const moduleIds=new Set(modules.modules.map(x=>x.id));
assert(moduleIds.has('longitudinal-development'));
assert(moduleIds.has('coaching'));
assert(modules.modules.find(x=>x.id==='coaching').depends_on.includes('longitudinal-development'));

for(const service of [
 'ACADEMIC_ENGLISH_EDITING','MANUSCRIPT_DIAGNOSTIC','RESEARCH_CONSULTATION',
 'PUBLICATION_CONSULTATION','REVIEWER_RESPONSE_SUPPORT','ACADEMIC_CAREER_CONSULTATION',
 'TEACHER_MENTORING','ASSESSMENT_CONSULTATION','INSTITUTIONAL_CONSULTING','SPEAKING_TRAINING'
]){
 assert(api.includes('- '+service),'API missing service '+service);
 assert(migration.includes("'"+service+"'"),'Migration missing service '+service);
}

for(const role of ['CONSULTATION_CLIENT','INSTITUTION','COUNSELLOR']){
 assert(api.includes(role),'API missing role '+role);
 assert(migration.includes("'"+role+"'"),'Migration missing role '+role);
}

for(const table of [
 'study_plan','study_plan_revision','study_task','progress_measurement',
 'saved_pathway_option','educational_decision','decision_support_explanation',
 'coaching_program','coaching_enrollment','coaching_review'
]){
 assert(migration.includes('CREATE TABLE IF NOT EXISTS '+table),'Migration missing '+table);
}

assert.equal(coaching.trajectory.one_observation_is_not_a_trend,true);
assert.equal(coaching.trajectory.no_cross_measure_aggregation_score,true);
assert.equal(coaching.study_plan.ai_may_activate,false);
assert.equal(coaching.decision_support.human_review_required_for_consequential_recommendation,true);
assert.equal(coaching.coaching.payment_state_separate_from_professional_judgement,true);

console.log('Master vision contract passed');
