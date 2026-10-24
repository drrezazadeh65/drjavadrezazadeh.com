/**
 * JREI News editor's desk for the EXISTING protected operations dashboard.
 * Source only: not mounted and never publishes a public article by itself.
 * No localStorage, no external network, no unreviewed HTML insertion.
 */
export function mountNewsOwnerPanel({root,csrfResolver,
  apiBase='/api/news/v1',locale='fa'}={}){
  if(!(root instanceof HTMLElement)||typeof csrfResolver!=='function'||
    !['fa','en'].includes(locale)||
    apiBase!=='/api/news/v1')throw Error('NEWS_OWNER_PANEL_SETUP_INVALID');
  const fa=locale==='fa';
  const say=(persian,english)=>fa?persian:english;
  const header=document.createElement('div');header.className='ni-admin-heading';
  const title=document.createElement('h2');
  title.textContent=say('تحریریه هوشمند JREI','JREI Newsroom');
  const info=document.createElement('p');
  info.textContent=say('هر نسخه خبری پیش از انتشار عمومی به تأیید شما نیاز دارد.',
    'Every exact news revision requires your approval before publication.');
  header.append(title,info);
  const refresh=document.createElement('button');refresh.type='button';
  refresh.className='ni-admin-refresh';
  refresh.textContent=say('دریافت پیش‌نویس‌های جدید','Load new drafts');
  const status=document.createElement('p');status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const list=document.createElement('div');list.className='ni-admin-queue';
  root.replaceChildren(header,refresh,status,list);
  const show=s=>{status.textContent=s;};
  const request=async (path,options)=>{
    const token=csrfResolver();
    if(typeof token!=='string'||token.length<8)throw Error('NEWS_CSRF_MISSING');
    const response=await fetch(apiBase+path,{
      credentials:'same-origin',cache:'no-store',redirect:'error',
      headers:{'Accept':'application/json',
        'Content-Type':'application/json','X-CSRF-Token':token},
      ...options});
    if(!response.ok)throw Error('NEWS_API_HTTP_'+response.status);
    const data=await response.json();
    if(!data||typeof data!=='object')throw Error('NEWS_API_RESPONSE_INVALID');
    return data;
  };
  const label=(value)=>{const node=document.createElement('span');
    node.textContent=String(value??'');return node;};
  async function decide(item,action,button){
    button.disabled=true;show(say('در حال ثبت تصمیم امن…','Recording verified decision…'));
    try{
      const data=await request('/owner/decision',{method:'POST',
        body:JSON.stringify({revisionId:item.revision_id,
          approvalDigest:item.approval_digest,action})});
      if(data.decision!==action||data.publiclyPublished!==false)
        throw Error('NEWS_OWNER_DECISION_RECEIPT_UNEXPECTED');
      show(say('تصمیم ثبت شد. انتشار عمومی هنوز انجام نشده است.',
        'Decision recorded. Public publishing has not occurred.'));
      await load();
    }catch(error){
      show(say('ثبت تصمیم انجام نشد؛ وضعیت سرور را بررسی کنید. ',
        'Decision was not confirmed. Verify server status. ')+error.message);
    }finally{button.disabled=false;}
  }
  async function load(){
    refresh.disabled=true;
    show(say('در حال دریافت صف خصوصی…','Loading private owner queue…'));
    try{
      const data=await request('/owner/queue',{method:'GET'});
      if(data.schema!=='jr.jrei.news-owner-review-queue.v1'||
        !Array.isArray(data.items))throw Error('NEWS_QUEUE_SHAPE_UNEXPECTED');
      list.replaceChildren();
      for(const item of data.items){
        const card=document.createElement('article');
        card.className='ni-admin-card';
        const h=document.createElement('h3');
        h.textContent=String(item.headline??'');
        const meta=document.createElement('p');
        meta.textContent=String(item.priority_code??'')+' · '+
          String(item.source_url??'');
        const actions=document.createElement('div');
        actions.className='ni-admin-actions';
        const reviewButtons=[];
        const fullPreview=document.createElement('section');
        fullPreview.className='ni-admin-full-preview';
        fullPreview.hidden=true;
        const view=document.createElement('button');view.type='button';
        view.textContent=say('مشاهده کامل خبر، تصویر و دو زبان',
          'Review full story in both languages');
        for(const [action,faLabel,enLabel] of [
          ['APPROVE','تأیید نسخه','Approve version'],
          ['REQUEST_REVISION','درخواست اصلاح','Request revision'],
          ['REJECT','رد خبر','Reject']]){
          const b=document.createElement('button');b.type='button';
          b.textContent=fa?faLabel:enLabel;
          b.disabled=true;reviewButtons.push(b);
          b.addEventListener('click',()=>decide(item,action,b));
          actions.append(b);
        }
        view.addEventListener('click',async()=>{
          view.disabled=true;show(say('در حال دریافت نسخه کامل…','Loading exact version…'));
          try{
            const data=await request('/owner/preview?revisionId='+
              encodeURIComponent(item.revision_id),{method:'GET'});
            if(data.schema!=='jr.jrei.news-owner-full-preview.v1'||
              data.approvalDigest!==item.approval_digest||
              data.revisionId!==item.revision_id||
              data.state!=='PENDING_OWNER_APPROVAL')
              throw Error('NEWS_PREVIEW_DIGEST_MISMATCH');
            fullPreview.replaceChildren();
            for(const lang of ['fa','en']){
              const section=document.createElement('div');
              section.dir=lang==='fa'?'rtl':'ltr';
              section.lang=lang;
              const titleEl=document.createElement('h4');
              titleEl.textContent=data[lang].headline;
              section.append(titleEl);
              for(const field of ['summary','body','nextSteps']){
                const paragraph=document.createElement('p');
                paragraph.textContent=data[lang][field];
                section.append(paragraph);
              }
              fullPreview.append(section);
            }
            const source=document.createElement('p');
            source.textContent='Official source: '+data.sourceUrl;
            const media=document.createElement('p');
            media.textContent='Approved media reference: '+
              String(data.imageAssetReference??'not available');
            fullPreview.prepend(source,media);
            fullPreview.hidden=false;
            reviewButtons.forEach(button=>{button.disabled=false;});
            show(say('نسخه کامل نمایش داده شد؛ تصمیم را ثبت کنید.',
              'Complete exact revision loaded for owner decision.'));
          }catch(error){
            show(say('نسخه کامل قابل تأیید نیست. ','Preview is not verified. ')+
              error.message);
          }finally{view.disabled=false;}
        });
        card.append(h,meta,view,fullPreview,actions);list.append(card);
      }
      show(data.items.length?say('پیش‌نویس‌های آماده بازبینی نمایش داده شدند.',
        'Drafts available for owner review are displayed.'):
        say('در حال حاضر پیش‌نویسی در صف نیست.','No drafts awaiting review.'));
    }catch(error){
      show(say('صف بررسی قابل دریافت نیست. ','Unable to load queue. ')+error.message);
    }finally{refresh.disabled=false;}
  }
  refresh.addEventListener('click',load);
  return Object.freeze({load,unmount(){root.replaceChildren();}});
}
