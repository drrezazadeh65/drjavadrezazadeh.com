/* RCAS Start: English translation PILOT of seven source domains and 28 items.
 * Educational reflection only; this translation is not psychometrically validated.
 * No request, raw storage, diagnostic score, item aggregation or automatic career decision. */
(()=>{'use strict';
const form=document.getElementById('rcasEnForm');
if(!form)return;
const accessList=[
 'A reasonably suitable study or thinking space','Internet access when needed',
 'A suitable digital device','Required books or learning materials',
 'Predictable study time','A person to ask academic questions',
 'A person to consult on an important decision','Transport needed for learning activities'
];
const groups=[
 {id:'A',title:'Direction and agency',scale:'C',items:[
  'I have one priority for the next eight weeks that I can state clearly in one sentence.',
  'I can explain why that priority matters to me personally.',
  'I can choose one specific action this week that directly supports this priority.',
  'If new evidence suggests my current plan or goal is unsuitable, I can revise it.'
 ]},
 {id:'B',title:'Learning strategies',scale:'B',items:[
  'Before studying, I identify what I should be able to explain, solve or do afterwards.',
  'Before rereading material, I try to recall what I remember without looking.',
  'After learning something, I try to explain it in my own words without referring to the source.',
  'I adapt my approach to the type of lesson or task.'
 ]},
 {id:'C',title:'Action and recovery',scale:'B',items:[
  'When it is time to begin an important task, I start without a long delay.',
  'When a task is large or unclear, I turn it into a small, specific first step.',
  'Before an important task, I reduce distractions within my control as far as possible.',
  'When a plan is disrupted, I return to it at the first realistic opportunity.'
 ]},
 {id:'D',title:'Monitoring and learning from errors',scale:'B',items:[
  'After studying, I test myself without looking at the material.',
  'When I make a mistake, I examine what kind of error occurred.',
  'After correcting an error, I test myself again with another question or problem.',
  'If evidence shows my current strategy is not working, I change it.'
 ]},
 {id:'E',title:'Energy and educational wellbeing',scales:['B','B','B','C'],items:[
  'On most study days, I have enough energy for my main thinking task.',
  'My sleep and waking patterns are predictable enough to identify better times for concentration.',
  'When study pressure increases, I use at least one healthy way to manage it.',
  'If pressure or fatigue affects my functioning for a while, I know an appropriate person to ask for help.'
 ]},
 {id:'F',title:'Digital and AI self-regulation',scale:'B',items:[
  'Before an important task, I adjust notifications and digital tools to reduce interruptions.',
  'Before opening an app, website or platform, I usually know what I intend to do there.',
  'Before relying on an important AI-generated answer, I check it.',
  'After using AI assistance, I check what I can now explain or do independently.'
 ]},
 {id:'G',title:'Golden Path and support',scale:'C',items:[
  'I have real evidence for at least one important ability I attribute to myself.',
  'I have explored at least one path that interests me through direct experience or reliable information.',
  'For an important educational difficulty, I know whom to ask and what question to raise.',
  'Support I receive helps me do more of the work independently next time.'
 ]}
];
const scales={
 B:['Never','Rarely','Sometimes','Often','Almost always','Not applicable','Unsure / not enough evidence'],
 C:['Not yet clear or possible','A little','To some extent','Well','Clear, with evidence','Not applicable','Unsure / not enough evidence']
};
const routes={D1:'Learning and self-regulation',D2:'Self-efficacy, wellbeing and recovery',D3:'Digital and AI self-regulation',D4:'Context, access and support',D5:'Golden Path',D6:'Critical thinking and decision quality'};
const main=document.getElementById('rcasEnCore'),availability=document.getElementById('rcasEnAccess');
const routing=document.getElementById('rcasEnRouting'),progress=document.getElementById('rcasEnProgress'),status=document.getElementById('rcasEnStatus');
const result=document.getElementById('rcasEnResult'),steps=[...form.querySelectorAll('.rcas-panel')];
const add=(parent,tag,value,cls)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;parent.append(el);return el;};
for(let i=0;i<accessList.length;i++){
 const label=add(availability,'label',undefined,'rcas-access-row');
 add(label,'span',accessList[i]);
 const sel=add(label,'select');sel.name='access'+i;sel.required=true;
 for(const [value,title] of [['','Choose'],['available','Available'],['limited','Limited'],['unavailable','Not currently available'],['unneeded','Not needed']]){
  const opt=add(sel,'option',title);opt.value=value;
 }
}
for(const group of groups){
 const section=add(main,'section',undefined,'rcas-domain');
 const heading=add(section,'div',undefined,'rcas-domain-title');
 add(heading,'b',group.id);add(heading,'h3',group.title);
 for(let i=0;i<group.items.length;i++){
  const scale=group.scales?.[i]||group.scale;
  const field=add(section,'fieldset',undefined,'rcas-item');
  add(field,'legend',group.id+(i+1)+' · '+group.items[i]);
  const choices=add(field,'div',undefined,'rcas-scale');
  for(let v=0;v<7;v++){
   const label=add(choices,'label');
   const input=add(label,'input');input.type='radio';input.name=group.id+(i+1);
   input.value=v===5?'NA':v===6?'UNKNOWN':String(v);
   add(label,'span',(v<5?v+' · ':'')+scales[scale][v]);
  }
 }
 const field=add(routing,'fieldset',undefined,'rcas-route-row');
 add(field,'legend',group.id+' · '+group.title);
 const opts=add(field,'div');
 for(const [key,description] of [['compatible','Compatible evidence'],['discrepant','Conflicting evidence'],['single','Single source only'],['insufficient','Not enough evidence']]){
  const label=add(opts,'label');
  const input=add(label,'input');input.type='radio';input.name='route_'+group.id;input.value=key;
  add(label,'span',description);
 }
}
let current=1;
const erase=()=>{try{sessionStorage.removeItem('gt_rcas_state');}catch(_){}result.hidden=true;result.replaceChildren();};
erase();
function advance(step){
 current=step;
 for(const section of steps){const open=Number(section.dataset.step)===step;section.hidden=!open;section.classList.toggle('active',open);}
 progress.textContent='Stage '+step+' of 3 · '+(step===1?'Context':step===2?'28 reflections':'Evidence and next step');
 status.textContent='';result.hidden=true;
 form.querySelector('.rcas-panel:not([hidden])')?.scrollIntoView({block:'start',behavior:'instant'});
}
function validateContext(){
 const education=form.elements.namedItem('edu'),question=form.elements.namedItem('mainQuestion');
 const anyReason=form.querySelector('input[name="reason"]:checked');
 const anyEvidence=form.elements.namedItem('evidence1').value.trim()||
  form.elements.namedItem('noEvidenceYet').checked;
 const missing=[
  [education.value,education,'Select your educational stage.'],
  [anyReason,form.querySelector('input[name="reason"]'),'Select at least one reason for starting.'],
  [question.value.trim(),question,'Describe your learning question or goal.'],
  [[...availability.querySelectorAll('select')].every(s=>!!s.value),availability.querySelector('select:not(:valid)'),'Select all eight access conditions.'],
  [anyEvidence,form.elements.namedItem('evidence1'),'Provide one example, or state that you do not yet have enough evidence.']
 ].find(row=>!row[0]);
 if(missing){status.textContent=missing[2];missing[1]?.focus();return false;}
 return true;
}
function validateCore(){
 const missing=groups.flatMap(g=>g.items.map((_,i)=>g.id+(i+1))).find(key=>!form.querySelector('input[name="'+key+'"]:checked'));
 if(missing){status.textContent='Please answer '+missing+' or select Not applicable / Unsure.';form.querySelector('input[name="'+missing+'"]')?.focus();return false;}
 return true;
}
function validateRoutes(){
 const missing=groups.find(g=>!form.querySelector('input[name="route_'+g.id+'"]:checked'));
 if(missing){status.textContent='Identify the evidence status for domain '+missing.id+'.';return false;}
 const domain=form.elements.namedItem('priorityDomain').value;
 if(!Object.prototype.hasOwnProperty.call(routes,domain)){status.textContent='Choose your own next area of inquiry.';return false;}
 if(!form.elements.namedItem('priorityWhy').value.trim()){
  status.textContent='Explain why you selected this area. Your own reason is not a diagnosis.';
  form.elements.namedItem('priorityWhy').focus();return false;
 }
 // Match the Persian formative safeguard: all-unknown responses or wholly
 // insufficient evidence cannot produce a completed exploratory pathway.
 const observed=groups.some(g=>g.items.some((_,i)=>{
  const checked=form.querySelector('input[name="'+g.id+(i+1)+'"]:checked');
  return checked&&/^[0-4]$/.test(checked.value);
 }));
 if(!observed){
  status.textContent='All 28 responses are not applicable or unsure. Gather one specific observation before completing a pathway.';
  return false;
 }
 if(groups.every(g=>form.querySelector('input[name="route_'+g.id+'"]:checked')?.value==='insufficient')){
  status.textContent='No domain has sufficient evidence yet. Gather evidence before completing a pathway.';
  return false;
 }
 return true;
}
form.addEventListener('input',erase);form.addEventListener('change',erase);
form.querySelector('[data-next="2"]').addEventListener('click',()=>{if(current===1&&validateContext())advance(2);});
form.querySelector('[data-next="3"]').addEventListener('click',()=>{if(current===2&&validateCore())advance(3);});
form.querySelector('[data-back="1"]').addEventListener('click',()=>advance(1));
form.querySelector('[data-back="2"]').addEventListener('click',()=>advance(2));
form.querySelector('[data-clear-summary]').addEventListener('click',erase);
form.querySelector('[data-show-route]').addEventListener('click',()=>{
 erase();if(current!==3||!validateContext()||!validateCore()||!validateRoutes())return;
 const chosen=form.elements.namedItem('priorityDomain').value;
 const evidence=groups.map(g=>g.id+': '+form.querySelector('input[name="route_'+g.id+'"]:checked').value).join(' · ');
 add(result,'h3',chosen+' · '+routes[chosen]);
 add(result,'p','This is your own selected focus, not a diagnostic or standardised talent result. Responses are not compared with norms. Contradictory, missing or single-source evidence needs further inquiry and human judgement.');
 add(result,'p','Your self-described evidence context: '+evidence);
 const why=form.elements.namedItem('priorityWhy').value.trim();
 if(why)add(result,'p','Your reason: '+why);
 add(result,'h4','One free, seven-day evidence activity');
 add(result,'p','Choose a small, safe activity in this area. Record what you tried, one observable result and one question to revisit at the end of the week. Ask a trusted adult or educator for support where appropriate.');
 add(result,'p','The English wording is an unvalidated translation pilot. No norm, diagnostic score, automatic purchase entitlement or professional report is generated.');
 const link=add(result,'a','Return to the Golden Talent pathway','button primary');link.href='/en/golden-talent/';
 const bahar=add(result,'a','Continue free: seven-day activity log in BAHAR (re-enter notes manually)','button');bahar.href='/en/bahar/';
 const age=Number(form.elements.namedItem('age').value);
 const stage=form.elements.namedItem('edu').value;
 const minor=(Number.isFinite(age)&&age>=10&&age<18)||
  ['Junior secondary','Upper secondary'].includes(stage);
 if(minor)add(result,'p','If you are under 18, seek a parent or guardian’s help before requesting a paid professional service.');
 result.hidden=false;progress.textContent='Stage 3 of 3 · Your own next inquiry';
 try{sessionStorage.setItem('gt_rcas_state',JSON.stringify({
  completed:true,rcasRevision:'start-en-pilot-1',completedItemCount:28,
  p0Validated:true,routingEvidenceCompleted:true,meaningfulCoreEvidence:true,
  route:chosen,routeCode:chosen,routeLabel:routes[chosen],
  routeBasis:'SELF_SELECTED_UNVALIDATED',updatedAt:new Date().toISOString()
 }));}catch(_){}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){/* raw answers remain browser memory only; no automatic transmission */}});
// Clear the actual P0/C1/R1 user entries, not merely the route-summary view.
// No marketing consent or account enrollment is required for this action.
document.getElementById('rcasEnClearAll')?.addEventListener('click',()=>{
 form.reset();
 erase();
 advance(1);
 status.textContent='All answers and the session route summary were cleared from this page. There is no saved copy to restore.';
 form.elements.namedItem('edu')?.focus({preventScroll:true});
});
advance(1);
})();
