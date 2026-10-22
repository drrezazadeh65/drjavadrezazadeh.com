/* Stage 13 owner review UI. Server state only: no credentials in browser storage. */
(() => {
  'use strict';
  const workspace=document.getElementById('ops-workspace');
  const panel=document.getElementById('ops-social-review');
  const status=document.getElementById('ops-social-review-status');
  const list=document.getElementById('ops-social-review-items');
  const reload=document.getElementById('ops-social-review-refresh');
  if(!workspace||!panel||!status||!list||!reload)return;
  const fa=document.documentElement.lang==='fa';
  const t=(a,b)=>fa?a:b;
  let generation=0,working=false;
  const node=(tag,text,klass)=>{
    const element=document.createElement(tag);
    if(text!==undefined)element.textContent=String(text);
    if(klass)element.className=klass;
    return element;
  };
  const destroy=()=>{
    generation++;list.replaceChildren();
    status.textContent='';
  };
  new MutationObserver(()=>{if(workspace.hidden)destroy();})
    .observe(workspace,{attributes:true,attributeFilter:['hidden']});
  workspace.addEventListener('jr:operations-locked',()=>{
    panel.open=false;destroy();
  });
  async function request(path,options={}){
    const response=await fetch('/api/admin/operations/'+path,{
      method:'GET',credentials:'same-origin',cache:'no-store',
      headers:{Accept:'application/json'},...options
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok||!data?.ok)throw Error(data?.error||'HTTP '+response.status);
    return data;
  }
  async function decide(item,kind){
    if(working||workspace.hidden||!item.reviewable||!item.digest)return;
    if(!window.confirm(kind==='approve'
      ?t('این نسخهٔ مشخص برای صف تأیید شود؟ این عمل به معنای انتشار فوری نیست.',
        'Approve this exact version for scheduling? This is not an immediate publication.')
      :t('این پیش‌نویس از صف خارج شود؟','Remove this draft from the queue?')))return;
    working=true;reload.disabled=true;
    const attempt=++generation;
    status.textContent=t('در حال ثبت تصمیم امن…','Submitting protected review decision…');
    try{
      const session=await request('session');
      if(workspace.hidden||attempt!==generation)return;
      if(session.mfaRequired||typeof session.csrfToken!=='string')throw Error('admin_mfa_required');
      const result=await request('social/'+kind,{
        method:'POST',
        headers:{Accept:'application/json','Content-Type':'application/json',
          'X-CSRF-Token':session.csrfToken},
        body:JSON.stringify({deliveryId:item.deliveryId,digest:item.digest})
      });
      if(workspace.hidden||attempt!==generation)return;
      status.textContent=result.status==='scheduled'
        ?t('در صف ثبت شد؛ هنوز هیچ پستی منتشر نشده است.',
          'Scheduled in the database. No post was published.')
        :t('پیش‌نویس با ثبت ممیزی رد شد.','Draft rejected with an audit record.');
    }catch(error){
      if(!workspace.hidden&&attempt===generation)
        status.textContent=t('ثبت تصمیم انجام نشد: ','Review failed: ')+String(error.message||'unknown');
    }finally{
      working=false;reload.disabled=false;
      // Re-read authoritative database; stale previews must not remain actionable.
      if(!workspace.hidden&&panel.open)await load();
    }
  }
  function render(record){
    const card=node('section',undefined,'ops-card');
    card.append(node('h3',(record.campaignTitle||t('پیش‌نویس','Draft'))+' · '+record.provider));
    card.append(node('p',t('حساب مقصد: ','Target account: ')+String(record.accountLabel||'—'),'ops-muted'));
    const scheduled=Number.isSafeInteger(record.scheduledAt)
      ?new Date(record.scheduledAt*1000).toLocaleString(fa?'fa-IR':'en-US')
      :t('بدون زمان','No time');
    card.append(node('p',t('زمان برنامه‌ریزی‌شده: ','Scheduled: ')+scheduled,'ops-muted'));
    const link=node('a',record.sourceCanonical);
    link.href=record.sourceCanonical;link.rel='noopener noreferrer';link.target='_blank';
    card.append(link);
    const label=node('label',t('متن دقیق برای بازبینی','Exact draft to review'));
    const copy=node('textarea');
    copy.readOnly=true;copy.rows=6;copy.value=record.body||'';
    copy.style.cssText='display:block;width:100%;max-width:100%;min-height:145px';
    label.append(copy);card.append(label);
    card.append(node('p',t('منبع، رسانه و دسترسی شبکه باید پیش از فعال‌سازی انتشار زنده مستقلاً بررسی شوند.',
      'Source, media and provider access require independent verification before live publishing.'),
      'ops-muted'));
    if(record.reviewable){
      const controls=node('div',undefined,'ops-toolbar');
      const approve=node('button',t('تأیید برای صف','Approve for queue'));
      approve.type='button';approve.addEventListener('click',()=>decide(record,'approve'));
      const reject=node('button',t('رد پیش‌نویس','Reject draft'));
      reject.type='button';reject.addEventListener('click',()=>decide(record,'reject'));
      controls.append(approve,reject);card.append(controls);
    }else card.append(node('p',t('بازبینی مسدود: ','Review blocked: ')+
      (Array.isArray(record.blockers)?record.blockers.join('، '):'unknown'),'ops-muted'));
    return card;
  }
  async function load(){
    if(working||workspace.hidden||!panel.open)return;
    const epoch=++generation;
    reload.disabled=true;list.replaceChildren();
    status.textContent=t('در حال بارگیری پیش‌نویس‌های تأییدنشده…','Loading unapproved drafts…');
    try {
      const result=await request('social/review');
      if(epoch!==generation||workspace.hidden)return;
      if(result.schema!=='social-review-v1'||!Array.isArray(result.drafts))throw Error('invalid_response');
      if(result.drafts.length===0)list.append(node('p',
        t('پیش‌نویسی برای بازبینی در دیتابیس وجود ندارد.',
          'No drafts are awaiting review in the database.'),'ops-muted'));
      else for(const r of result.drafts)list.append(render(r));
      status.textContent=t('فقط پیش‌نویس‌های سرور نمایش داده می‌شوند؛ ارسال خودکار انجام نمی‌شود.',
        'Showing server-owned drafts only; no automatic publication occurs.');
    }catch(e){
      if(epoch===generation&&!workspace.hidden)
        status.textContent=t('بازبینی در دسترس نیست: ','Review unavailable: ')+String(e.message||'unknown');
    }finally{reload.disabled=false;}
  }
  reload.addEventListener('click',load);
  panel.addEventListener('toggle',()=>{if(panel.open)load();else destroy();});
})();
