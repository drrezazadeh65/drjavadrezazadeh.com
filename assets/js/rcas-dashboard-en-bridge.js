(()=>{
'use strict';
const root=document.querySelector('[data-resource="student-dashboard"]');
if(!root)return;
let state=null;
try{state=JSON.parse(sessionStorage.getItem('gt_rcas_state')||'null')}catch(_){}
if(!state||state.rcasRevision!=='start-en-pilot-1'||state.completed!==true||
state.completedItemCount!==28||state.routeBasis!=='SELF_SELECTED_UNVALIDATED')return;
const code=String(state.route||'');
if(!['D1','D2','D3','D4','D5','D6'].includes(code))return;
const hero=root.querySelector('.student-dash-hero');
if(!hero)return;
root.querySelector('[data-onboard="rcas"]')?.classList.add('is-complete');
root.querySelector('[data-onboard="route"]')?.classList.add('is-complete');
const section=document.createElement('section');section.className='gt-private-note';
const title=document.createElement('h2');title.textContent='Your current-tab RCAS reflection';
const message=document.createElement('p');
message.textContent='English translation pilot completed. Your self-selected next inquiry is '+code+'. No ability score, professional interpretation or secure learner record has been produced.';
section.append(title,message);hero.insertAdjacentElement('afterend',section);
})();