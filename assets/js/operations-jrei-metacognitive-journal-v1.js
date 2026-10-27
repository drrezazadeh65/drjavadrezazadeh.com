/* JREI metacognitive proposal journal — original MFA workspace only.
 * Additive to the unified RTL/mobile command deck; never repositions tabs,
 * alters session life, creates a second dashboard, or claims AI learning.
 * Server owner identity, role and TOTP remain the sole authority.
 */
(()=>{
  'use strict';
  const root=document.getElementById('ops-jrei-learning');
  const workspace=document.getElementById('ops-workspace');
  if(!root||!workspace||document.getElementById('jr-meta-journal'))return;
  const fa=document.documentElement.lang==='fa';
  const tr=(persian,english)=>fa?persian:english;
  const node=(tag,text)=>{
    const element=document.createElement(tag);
    if(text!==undefined)element.textContent=text;
    return element;
  };
  const section=node('details');
  section.id='jr-meta-journal';
  section.className='jr-jrei-apex-command-room';
  const title=node('summary',tr('دفتر واقعی چرخه‌های یادگیریِ یادگیری',
    'Actual learning-to-learn cycle ledger'));
  section.append(title);
  section.append(node('p',tr(
    'فقط رسیدهای موجود در دیتابیس مادر نمایش داده می‌شوند. ثبت پیشنهاد به معنای آموزش مدل، بهبود اثبات‌شده یا اجرای مأموریت نیست.',
    'Only existing mother-database receipts are displayed. A proposed cycle is not model training, measured improvement, or a completed mission.'
  )));
  const toolbar=node('div');toolbar.className='jr-jrei-apex-tools';
  const refresh=node('button',tr('خواندن رسیدهای ثبت‌شده','Read recorded receipts'));
  refresh.type='button';
  const note=node('p',tr('تا زمان دریافت پاسخ معتبر، وضعیت نامعلوم است.',
    'Status is unknown until a valid server response arrives.'));
  note.setAttribute('role','status');note.setAttribute('aria-live','polite');
  const results=node('ol');results.className='jr-jrei-apex-history';
  results.setAttribute('aria-label',tr('آخرین پیشنهادهای پایدار','Recent durable proposals'));
  toolbar.append(refresh);section.append(toolbar,note,results);root.append(section);
  let controller=null,sequence=0;
  const current=()=>root.open&&section.open&&!workspace.hidden&&!document.hidden;
  function clear(){
    sequence+=1;
    if(controller)controller.abort();
    controller=null;refresh.disabled=false;
    results.replaceChildren();
  }
  function timestamp(sec){
    return Number.isSafeInteger(sec)&&sec>0
      ?new Date(sec*1000).toLocaleString(fa?'fa-IR':'en-US')
      :tr('زمان نامشخص','Unknown time');
  }
  async function load(){
    if(!current())return;
    clear();const token=sequence;const pending=new AbortController();
    controller=pending;refresh.disabled=true;
    note.textContent=tr('در حال خواندن گزارش معتبر…','Reading authoritative receipts…');
    try{
      const response=await fetch('/api/admin/operations/jrei-metacognitive-journal',{
        credentials:'same-origin',cache:'no-store',signal:pending.signal,
        headers:{Accept:'application/json'}
      });
      if(response.status===401||response.status===403){
        throw new Error('MFA_OR_SESSION_REQUIRED');
      }
      if(!response.ok)throw new Error('MOTHER_DATABASE_OR_FEATURE_UNAVAILABLE');
      const data=await response.json();
      if(!current()||sequence!==token)return;
      if(data?.ok!==true||data.schema!=='jr.jrei.metacognitive-owner-journal-list.v1'||
          !Array.isArray(data.items)||data.publicLearningOrTrainingActive!==false||
          data.independentScientificAttestation!==false){
        throw new Error('UNEXPECTED_PROVENANCE_CONTRACT');
      }
      const items=data.items.slice(0,25);
      for(const item of items){
        if(typeof item?.cycleId!=='string'||!/^[a-f0-9-]{36}$/i.test(item.cycleId)||
            typeof item.policyVersion!=='string'||typeof item.state!=='string'||
            !/^[a-f0-9]{64}$/i.test(item.outcomeSha256||'')||
            item.knowledgePromoted!==false||item.modelWeightsChanged!==false||
            item.workerJobExecuted!==false)throw new Error('UNTRUSTED_JOURNAL_RECEIPT');
        const li=node('li');li.className='jr-jrei-apex-mission';
        li.append(node('strong',tr('پیشنهاد یادگیری','Learning proposal')));
        li.append(node('p',tr('وضعیت: ','State: ')+item.state));
        li.append(node('small',timestamp(item.recordedAt)));
        li.append(node('p',tr('سیاست: ','Policy: ')+item.policyVersion));
        const code=node('code',item.cycleId);
        li.append(code);
        results.append(li);
      }
      note.textContent=items.length
        ?tr('رسیدها از دیتابیس مادر دریافت شدند؛ بهبود خودکار تأیید نشده است.',
            'Mother-DB receipts received; autonomous improvement is not attested.')
        :tr('هنوز هیچ چرخهٔ ثبت‌شده‌ای تأیید نشده است.',
            'No registered learning cycle was returned.');
    }catch(err){
      if(!current()||sequence!==token||err?.name==='AbortError')return;
      results.replaceChildren();
      note.textContent=err?.message==='MFA_OR_SESSION_REQUIRED'
        ?tr('برای مشاهده، نشست مدیریت و MFA معتبر لازم است.',
            'A valid administrator MFA session is required.')
        :tr('دیتابیس یا قابلیت خصوصی آماده نیست؛ هیچ یادگیری موفقی فرض نمی‌شود.',
            'Private journal or database unavailable; no learning success is inferred.');
    }finally{
      if(controller===pending)controller=null;
      if(sequence===token)refresh.disabled=false;
    }
  }
  refresh.addEventListener('click',load);
  section.addEventListener('toggle',()=>{if(current())load();else clear();});
  root.addEventListener('toggle',()=>{if(!root.open)clear();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
  document.addEventListener('jr:account-logout',clear);
  window.addEventListener('pagehide',clear);
})();
