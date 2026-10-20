import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=path=>readFileSync(path,'utf8');
const evidence=JSON.parse(read('api/internal/ai-search-visibility-baseline-20261020.json'));
const PROMPTS=[
 'Who is Dr Javad Rezazadeh Yazdeli and what are his research areas?',
 "Where can I verify Javad Rezazadeh Yazdeli's publications and scholarly identifiers?",
 'What is the Golden Talent framework developed by Javad Rezazadeh Yazdeli?',
 'How should students combine interests, strengths and practical constraints when choosing a university major?',
 "What are the limits of using one test to identify a student's talents?",
 'How can parent and teacher observations support student educational guidance?',
 'What evidence would show that a developmental talent assessment is valid?',
 'What should I check before choosing academic manuscript editing or research consultation?',
 'How can teachers evaluate the cultural and pedagogical suitability of English language teaching materials?',
 'How can researchers use AI in academic writing while preserving authorship and source verification?'
];
test('fixed English Ubersuggest prompts are immutable and map to existing public source routes',()=>{
 assert.equal(evidence.schema,'jr-aisv-evidence-v1');
 assert.deepEqual(evidence.prompts.map(p=>p.prompt),PROMPTS);
 assert.equal(evidence.scope.locale,'en');
 assert.equal(evidence.scope.region,'United States');
 for(const p of evidence.prompts){
  assert.match(p.primaryPublicRoute,/^\/en\/(?:[a-z0-9-]+\/){1,3}$/);
  assert.ok(existsSync('.'+p.primaryPublicRoute+'index.html'),p.primaryPublicRoute);
  const page=read('.'+p.primaryPublicRoute+'index.html');
  assert.match(page,/<meta name="robots" content="index,follow/);
  assert.match(page,/<link rel="canonical" href="https:\/\/drjavadrezazadeh\.com\/en\//);
 }
});
test('five sampled 0% entries remain distinct from five unsampled null entries',()=>{
 assert.equal(evidence.prompts.length,10);
 assert.equal(evidence.prompts.reduce((s,p)=>s+p.sampledAnswers,0),5);
 for(const [i,p] of evidence.prompts.entries()){
  if(i<5)assert.deepEqual([p.sampledAnswers,p.brandMentions,p.brandPresencePercent],[1,0,0]);
  else assert.deepEqual([p.sampledAnswers,p.brandMentions,p.brandPresencePercent],[0,null,null]);
  assert.equal(p.verifiedWebsiteCitationCount,null);
  assert.equal(p.verifiedCitationUrls,null);
 }
 assert.deepEqual(evidence.providers.map(p=>p.provider),['openai','gemini','google_aio']);
 for(const p of evidence.providers.slice(1)){
  assert.equal(p.status,'not_measured');
  assert.equal(p.sampledAnswers,null);
  assert.equal(p.brandPresencePercent,null);
 }
 assert.equal(evidence.trend.improvementEstablished,false);
});
test('baseline is private and only served after existing privileged MFA gate',()=>{
 assert.match(read('api/internal/.htaccess'),/Require all denied/);
 const api=read('api/operations.php');
 const gate=api.indexOf("if (!$fresh) fail('admin_mfa_required',403);");
 const route=api.indexOf("if ($path === '/admin/operations/ai-visibility' && $verb === 'GET')");
 assert.ok(gate>=0&&route>gate);
 assert.match(api,/operations_ai_visibility_read/);
 assert.match(api,/respond\(operationsAiVisibilitySnapshot\(\)\)/);
 for(const p of ['fa/app/admin/index.html','en/account/admin/index.html']){
  const html=read(p);
  assert.match(html,/<div id="ops-workspace" hidden>/);
  assert.match(html,/id="ops-ai-visibility"/);
  assert.match(html,/operations-ai-visibility\.js\?v=20261020-aisv-v1/);
  assert.match(html,/noindex,nofollow,noarchive/);
 }
});
test('private bilingual UI is read-only, N/A-safe and purges on MFA lock',()=>{
 const js=read('assets/js/operations-ai-visibility.js');
 for(const v of ['jr:operations-locked','generation++','results.replaceChildren()','cache:\'no-store\'','credentials:\'same-origin\''])
  assert.ok(js.includes(v),v);
 assert.match(js,/value===null\|\|value===undefined/);
 assert.match(js,/\/api\/admin\/operations\/ai-visibility/);
 assert.doesNotMatch(js,/fetch\(\s*['"]https?:\/\//);
 assert.doesNotMatch(js,/localStorage|sessionStorage|innerHTML|document\.cookie/);
 const syntax=spawnSync(process.execPath,['--check','assets/js/operations-ai-visibility.js'],{encoding:'utf8'});
 assert.equal(syntax.status,0,syntax.stderr);
});


test('canonical researcher identity is reused in existing academic and developmental JSON-LD',()=>{
 const person='https://drjavadrezazadeh.com/#person';
 const cases=[
  ['en/academic-profile/index.html',entity=>entity.mainEntity?.['@id']],
  ['en/golden-talent/index.html',entity=>entity.author?.['@id']],
  ['en/golden-talent/methodology/index.html',entity=>entity.author?.['@id']],
  ['en/student-guidance/index.html',entity=>entity.provider?.['@id']]
 ];
 for(const [file,get] of cases){
  const html=read(file);
  const match=html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(match,file+' JSON-LD absent');
  const data=JSON.parse(match[1]);
  const candidate=(data['@graph']||[data]).find(e=>['WebPage','ProfilePage','Service'].includes(e['@type']));
  assert.equal(get(candidate),person,file+' Person identity drift');
 }
});
test('academic source pages answer the two research-integrity gaps without invented results',()=>{
 const teacher=read('en/teacher-education/index.html');
 const research=read('en/research/index.html');
 assert.match(teacher,/id="materials-cultural-pedagogical-fit"/);
 assert.match(teacher,/cultural and pedagogical suitability of English language teaching materials/i);
 assert.match(teacher,/learner work and classroom participation/i);
 assert.match(teacher,/href="\/en\/publications\/"/);
 assert.match(research,/id="responsible-ai-academic-authorship"/);
 assert.match(research,/authorship or source responsibility/i);
 assert.match(research,/returning to the original scholarly record/i);
 assert.match(research,/protect confidential data/i);
 assert.match(research,/href="\/en\/academic-profile\/"/);
 for(const [route,html] of [['/en/teacher-education/',teacher],['/en/research/',research]]){
  assert.match(html,new RegExp('rel="canonical" href="https://drjavadrezazadeh.com'+route.replace(/\//g,'\\/')+'"'));
  assert.equal((html.match(/<h1\b/g)||[]).length,1);
 }
});


test('release assembly requires all private AI visibility dependencies together',()=>{
 const build=read('scripts/build-public-site.mjs');
 const required=build.split('const required=[')[1]?.split('];')[0];
 assert.ok(required,'sanitized deployment required-files gate absent');
 for(const filename of [
  'api/operations-ai-visibility.php',
  'api/internal/ai-search-visibility-baseline-20261020.json',
  'assets/js/operations-ai-visibility.js',
  'fa/app/admin/index.html',
  'en/account/admin/index.html',
  'api/internal/.htaccess'
 ])assert.ok(required.includes("'"+filename+"'"),filename+' excluded from atomic release');
 assert.match(read('api/internal/.htaccess'),/Require all denied/);
 const workflows=[
  '.github/workflows/operations-control-center.yml',
  '.github/workflows/v5-release-candidate.yml'
 ];
 const operations=read(workflows[0]);
 for(const path of ['assets/js/operations-ai-visibility.js','tests/ai-search-visibility-contract.test.mjs'])
  assert.ok(operations.includes("'"+path+"'"),path+' changes should trigger dedicated QA');
 for(const workflow of workflows){
  const source=read(workflow);
  assert.match(source,/php tests\/operations-ai-visibility\.php/);
  assert.match(source,/node --test tests\/ai-search-visibility-contract\.test\.mjs/);
 }
});
