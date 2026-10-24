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
  const metrics=document.createElement('div');metrics.className='ni-admin-metrics';
  const sources=document.createElement('section');sources.className='ni-admin-sources';
  const list=document.createElement('div');list.className='ni-admin-queue';
  root.replaceChildren(header,refresh,status,metrics,sources,list);
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
  const decisionsInFlight=new Set();
  async function decide(item,action,buttons){
    const id=item.revision_id;
    if(decisionsInFlight.has(id))return;
    decisionsInFlight.add(id);
    buttons.forEach(button=>{button.disabled=true;});
    show(say('در حال ثبت تصمیم امن…','Recording verified decision…'));
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
    }finally{
      decisionsInFlight.delete(id);
      // A failed/uncertain receipt leaves all controls inert until a new
      // owner-reviewed preview. Never permit a second blind submission.
    }
  }
  let loadRevision=0;
  async function load(){
    const readVersion=++loadRevision;
    refresh.disabled=true;
    // A stale, previously authorized decision must not remain clickable
    // when the owner session expires or the next queue refresh fails.
    list.replaceChildren();
    metrics.replaceChildren();
    sources.replaceChildren();
    show(say('در حال دریافت صف خصوصی…','Loading private owner queue…'));
    try{
      const data=await request('/owner/queue',{method:'GET'});
      if(readVersion!==loadRevision)return;
      if(data.schema!=='jr.jrei.news-owner-review-queue.v1'||
        !Array.isArray(data.items))throw Error('NEWS_QUEUE_SHAPE_UNEXPECTED');
      list.replaceChildren();
      metrics.replaceChildren();
      try {
        const overview=await request('/owner/overview',{method:'GET'});
        if(readVersion!==loadRevision)return;
        if(overview.schema==='jr.jrei.news-owner-operations-overview.v1'&&
           overview.metrics){
          const labels={
            enabledMonitors:say('منابع در حال پایش','Enabled sources'),
            pendingEvidenceReview:say('در انتظار بررسی منبع','Awaiting evidence'),
            ownerApprovalQueue:say('در انتظار تأیید من','Awaiting owner approval'),
            actuallyPublishedBilingualItems:say('اخبار واقعاً منتشرشده','Published bilingual stories'),
            socialDeliveryFailures:say('خطاهای توزیع','Social delivery failures')
          };
          for(const [key,labelText] of Object.entries(labels)){
            const metric=overview.metrics[key]||{};
            const card=document.createElement('div');
            card.className='ni-admin-metric';
            const name=document.createElement('span');
            name.textContent=labelText;
            const value=document.createElement('strong');
            value.textContent=metric.status==='MEASURED'?
              String(metric.value):say('نامشخص','Unknown');
            card.append(name,value);metrics.append(card);
          }
        }
      }catch{
        const unavailable=document.createElement('p');
        unavailable.textContent=say(
          'شاخص‌های مدیریتی فعلاً از دیتابیس مادر قابل تأیید نیستند.',
          'Owner metrics are currently unavailable from the mother database.'
        );
        metrics.append(unavailable);
      }
      // Every inventory row is an actual original mother-DB monitor; a
      // stale or revoked source is rendered as blocked, never as online.
      try{
        const inventory=await request('/owner/source/monitors',{method:'GET'});
        if(readVersion!==loadRevision)return;
        if(inventory.schema!=='jr.jrei.news-owner-monitor-inventory.v1'||
           !Array.isArray(inventory.items))
          throw Error('NEWS_OWNER_MONITOR_INVENTORY_INVALID');
        const h=document.createElement('h3');
        h.textContent=say('کنترل منابع خبر','News source controls');
        sources.append(h);
        for(const source of inventory.items){
          if(typeof source.monitorId!=='string')continue;
          const line=document.createElement('div');
          line.className='ni-admin-source-row';
          const name=document.createElement('strong');
          name.textContent=source.sourceTitle||source.sourceReference||'';
          const state=document.createElement('span');
          state.textContent=source.enabled?
            say('پایش فعال','Monitoring enabled'):
            say('پایش متوقف','Monitoring paused');
          const authority=document.createElement('span');
          authority.textContent=source.originalPolicyCurrent===true?
            say('سیاست منبع معتبر','Original source policy current'):
            say('نیازمند بررسی مجوز اصلی','Original policy review needed');
          line.append(name,state,authority);
          if(source.enabled===true){
            const pause=document.createElement('button');
            pause.type='button';
            pause.textContent=say('توقف پایش','Pause monitoring');
            line.append(pause);
            pause.addEventListener('click',async()=>{
              pause.disabled=true;
              try{
                const receipt=await request('/owner/source/disable',{
                  method:'POST',
                  body:JSON.stringify({monitorId:source.monitorId})
                });
                if(receipt.enabled!==false||
                   receipt.schema!=='jr.jrei.news-owner-monitor-disabled.v1')
                  throw Error('NEWS_SOURCE_PAUSE_UNKNOWN');
                await load();
              }catch{
                show(say('توقف پایش تأیید نشد؛ وضعیت را تازه‌سازی کنید.',
                  'Pause outcome unknown. Refresh authoritative status.'));
              }
            });
          }
          if(source.enabled===false&&source.originalPolicyCurrent===true){
            const activate=document.createElement('button');
            activate.type='button';
            activate.textContent=say('درخواست فعال‌سازی','Request activation');
            line.append(activate);
            activate.addEventListener('click',async()=>{
              activate.disabled=true;
              try{
                const receipt=await request('/owner/source/enable',{
                  method:'POST',body:JSON.stringify({monitorId:source.monitorId})
                });
                if(receipt.enabled!==true||
                   receipt.originalSchedulerStillRequired!==true)
                  throw Error('NEWS_SOURCE_ACTIVATION_UNKNOWN');
                await load();
              }catch{
                show(say('مجوز فعال‌سازی تأیید نشد؛ وضعیت سرور را تازه‌سازی کنید.',
                  'Activation not confirmed. Refresh authoritative status.'));
              }
            });
          }
          sources.append(line);
        }
        if(inventory.items.length===0){
          const empty=document.createElement('p');
          empty.textContent=say('هنوز منبعی برای پایش ثبت نشده است.',
            'No source monitors are registered yet.');
          sources.append(empty);
        }
      }catch{
        const missing=document.createElement('p');
        missing.textContent=say('فهرست منابع در حال حاضر قابل تأیید نیست.',
          'Source monitor inventory is currently unavailable.');
        sources.append(missing);
      }
      // Only original JREI-KA approved and independently reviewed sources
      // may appear here. Staging creates a DISABLED news monitor, not a
      // crawling job. Owner must explicitly choose a category and priority.
      try{
        const available=await request('/owner/source/available',{method:'GET'});
        if(readVersion!==loadRevision)return;
        if(available.schema!=='jr.jrei.news-owner-stageable-original-sources.v1'||
           !Array.isArray(available.items))
          throw Error('NEWS_ORIGINAL_STAGEABLE_SOURCE_UNAVAILABLE');
        if(available.items.length){
          const section=document.createElement('section');
          section.className='ni-admin-source-staging';
          const heading=document.createElement('h3');
          heading.textContent=say('افزودن منبع معتبر به پایش اخبار',
            'Stage an approved source for news monitoring');
          section.append(heading);
          for(const original of available.items){
            if(typeof original.sourceId!=='string'||
               typeof original.title!=='string')continue;
            const entry=document.createElement('div');
            entry.className='ni-admin-source-row';
            const title=document.createElement('strong');
            title.textContent=original.title;
            const category=document.createElement('select');
            const priority=document.createElement('select');
            const addOptions=(select,options,placeholder)=>{
              const first=document.createElement('option');
              first.value='';
              first.textContent=placeholder;
              select.append(first);
              for(const [value,label] of options){
                const opt=document.createElement('option');
                opt.value=value;opt.textContent=label;
                select.append(opt);
              }
            };
            addOptions(category,[
              ['school',say('مدارس','Schools')],
              ['examinations',say('آزمون‌ها','Examinations')],
              ['universities',say('دانشگاه‌ها','Universities')],
              ['employment',say('استخدام','Employment')],
              ['language',say('زبان','Language')],
              ['international',say('بین‌الملل','International')],
              ['research',say('پژوهش','Research')]
            ],say('انتخاب حوزه','Choose category'));
            addOptions(priority,[
              ['P0',say('فوری P0','Urgent P0')],
              ['P1',say('مهم P1','High P1')],
              ['P2',say('عادی P2','Normal P2')]
            ],say('انتخاب اولویت','Choose priority'));
            category.setAttribute('aria-label',say('حوزه منبع '+original.title,
              'Source category '+original.title));
            priority.setAttribute('aria-label',say('اولویت منبع '+original.title,
              'Source priority '+original.title));
            const stage=document.createElement('button');
            stage.type='button';
            stage.textContent=say('ثبت غیرفعال منبع','Stage disabled source');
            const selectable=()=>{stage.disabled=!category.value||!priority.value;};
            category.addEventListener('change',selectable);
            priority.addEventListener('change',selectable);
            selectable();
            stage.addEventListener('click',async()=>{
              stage.disabled=true;
              show(say('در حال ثبت منبع بدون شروع خزش…',
                'Staging original source without acquisition…'));
              try{
                const receipt=await request('/owner/source/stage',{
                  method:'POST',body:JSON.stringify({
                    sourceId:original.sourceId,
                    category:category.value,priority:priority.value
                  })
                });
                if(receipt.schema!=='jr.jrei.news-source-monitor-stage.v1'||
                   receipt.monitorEnabled!==false||
                   receipt.crawlStarted!==false)
                  throw Error('NEWS_DISABLED_MONITOR_STAGE_UNCONFIRMED');
                await load();
                show(say('منبع به‌صورت غیرفعال ثبت شد؛ خزشی آغاز نشده است.',
                  'Source staged disabled; no crawl was started.'));
              }catch{
                show(say('نتیجه ثبت نامشخص است؛ وضعیت واقعی سرور را تازه‌سازی کنید.',
                  'Staging outcome is uncertain; refresh authoritative state.'));
              }
            });
            entry.append(title,category,priority,stage);
            section.append(entry);
          }
          sources.append(section);
        }
      }catch{
        const unavailable=document.createElement('p');
        unavailable.textContent=say('منابع واجد شرایط برای ثبت قابل دریافت نیستند.',
          'Eligible original sources are currently unavailable.');
        sources.append(unavailable);
      }
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
          b.addEventListener('click',()=>decide(item,action,reviewButtons));
          actions.append(b);
        }
        view.addEventListener('click',async()=>{
          view.disabled=true;
          reviewButtons.forEach(button=>{button.disabled=true;});
          fullPreview.replaceChildren();
          fullPreview.hidden=true;
          show(say('در حال دریافت نسخه کامل…','Loading exact version…'));
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
            const paths=document.createElement('p');
            const proposed=data.proposedBilingualRoutes||{};
            if(typeof proposed.fa!=='string'||typeof proposed.en!=='string'||
              !/^\/fa\/akhbar\/[a-z0-9-]+\/$/.test(proposed.fa)||
              !/^\/en\/news-insights\/[a-z0-9-]+\/$/.test(proposed.en))
              throw Error('NEWS_PROPOSED_ROUTES_NOT_REVIEWABLE');
            paths.textContent='Proposed URLs — '+proposed.fa+' | '+proposed.en;
            fullPreview.prepend(source,media,paths);
            if(typeof data.safeImagePreviewUrl==='string' &&
              /^\/assets\/images\/[a-zA-Z0-9_./-]+$/.test(data.safeImagePreviewUrl)){
              const image=document.createElement('img');
              image.src=data.safeImagePreviewUrl;
              image.alt=say('تصویر شاخص پیشنهادی خبر',
                'Proposed licensed featured image');
              image.loading='lazy';image.className='ni-admin-image';
              fullPreview.prepend(image);
            }
            if(Array.isArray(data.relatedInternalLinks)){
              const list=document.createElement('ul');
              for(const item of data.relatedInternalLinks){
                if(typeof item.anchor!=='string' ||
                  typeof item.path!=='string')continue;
                const li=document.createElement('li');
                li.textContent=item.anchor+' — '+item.path;
                list.append(li);
              }
              if(list.children.length)fullPreview.append(list);
            }
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
      if(readVersion===loadRevision)
        show(say('صف بررسی قابل دریافت نیست. ',
          'Unable to load queue. ')+error.message);
    }finally{
      if(readVersion===loadRevision)refresh.disabled=false;
    }
  }
  refresh.addEventListener('click',load);
  return Object.freeze({load,unmount(){
    ++loadRevision;
    root.replaceChildren();
  }});
}
