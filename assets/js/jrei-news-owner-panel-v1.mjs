/**
 * JREI News editor's desk for the EXISTING protected operations dashboard.
 * Source only: not mounted and never publishes a public article by itself.
 * No localStorage, no external network, no unreviewed HTML insertion.
 */
export function mountNewsOwnerPanel({root,csrfResolver,
  apiBase='/api/admin/operations/jrei-news',locale='fa'}={}){
  if(!(root instanceof HTMLElement)||typeof csrfResolver!=='function'||
    !['fa','en'].includes(locale)||
    apiBase!=='/api/admin/operations/jrei-news')throw Error('NEWS_OWNER_PANEL_SETUP_INVALID');
  const fa=locale==='fa';
  const say=(persian,english)=>fa?persian:english;
  const header=document.createElement('div');header.className='ni-admin-heading';
  const title=document.createElement('h2');
  title.textContent=say('تحریریه هوشمند JREI','JREI Newsroom');
  const info=document.createElement('p');
  info.textContent=say('اخبار رسمیِ تأییدشده به‌طور خودکار پردازش می‌شوند؛ فقط استثناها نیازمند بررسی مدیرند.',
    'Verified official news uses standing authorization; only exceptions require owner review.');
  header.append(title,info);
  const refresh=document.createElement('button');refresh.type='button';
  refresh.className='ni-admin-refresh';
  refresh.textContent=say('دریافت پیش‌نویس‌های جدید','Load new drafts');
  const status=document.createElement('p');status.setAttribute('role','status');
  status.setAttribute('aria-live','polite');
  const metrics=document.createElement('div');metrics.className='ni-admin-metrics';
  const sources=document.createElement('section');sources.className='ni-admin-sources';
  const articles=document.createElement('section');
  articles.className='ni-admin-unbound-articles';
  const acquisition=document.createElement('section');
  acquisition.className='ni-admin-acquisition';
  const integration=document.createElement('section');
  integration.className='ni-admin-integration-readiness';
  const publications=document.createElement('section');
  publications.className='ni-admin-publication-backlog';
  const list=document.createElement('div');list.className='ni-admin-queue';
  const customSources=document.createElement('section');
  customSources.className='ni-admin-custom-source-manager';
  const delegatedControls=document.createElement('section');
  delegatedControls.className='ni-admin-custom-source-manager';
  const standingControls=document.createElement('section');
  standingControls.className='ni-admin-custom-source-manager';
  const exceptionDesk=document.createElement('section');
  exceptionDesk.className='ni-admin-custom-source-manager';
  const cronControls=document.createElement('section');
  cronControls.className='ni-admin-custom-source-manager';
  root.replaceChildren(header,refresh,status,standingControls,customSources,
    delegatedControls,exceptionDesk,cronControls,integration,metrics,sources,articles,
    acquisition,publications,list);
  const show=s=>{status.textContent=s;};
  const request=async (path,options)=>{
    const token=csrfResolver();
    if(typeof token!=='string'||!/^[a-f0-9]{64}$/i.test(token))throw Error('NEWS_CSRF_MISSING');
    const response=await fetch(apiBase+path,{
      credentials:'same-origin',cache:'no-store',redirect:'error',
      headers:{'Accept':'application/json',
        'Content-Type':'application/json','X-CSRF-Token':token},
      ...options});
    if(response.status===409)throw Error('NEWS_OWNER_APPROVAL_PENDING');
    if(!response.ok)throw Error('NEWS_API_HTTP_'+response.status);
    const data=await response.json();
    if(!data||typeof data!=='object')throw Error('NEWS_API_RESPONSE_INVALID');
    return data;
  };
  const label=(value)=>{const node=document.createElement('span');
    node.textContent=String(value??'');return node;};

  // The original Cron registry is the only scheduler. This panel reads
  // actual mother-DB job states; there is no inference of live host execution
  // from source presence or a previous success receipt. Registration is a
  // separate owner-click operation and ALWAYS creates DISABLED jobs.
  const cronHeading=document.createElement('h3');
  cronHeading.textContent=say('وضعیت موتور اجرایی اخبار',
    'Original newsroom automation');
  const cronDisclosure=document.createElement('p');
  cronDisclosure.textContent=say(
    'این جدول وضعیت واقعی Workerها و Cron ثبت‌شده در دیتابیس مادر را نمایش می‌دهد؛ ثبت تسک به معنی اجازهٔ خزش، تأیید حقوق نشر یا انتشار خبر نیست.',
    'Actual mother-DB Cron and worker states. Registering a task never grants crawl rights, source licensing or publication.');
  const cronStatus=document.createElement('p');
  cronStatus.setAttribute('role','status');
  const cronRows=document.createElement('ul');
  const cronRefresh=document.createElement('button');
  cronRefresh.type='button';
  cronRefresh.textContent=say('بازخوانی Cron','Refresh Cron');
  const cronRegister=document.createElement('button');
  cronRegister.type='button';
  cronRegister.textContent=say('ثبت تمام Workerهای خبر (غیرفعال)',
    'Register all News workers (disabled)');
  const cronActivate=document.createElement('button');
  cronActivate.type='button';
  cronActivate.textContent=say('فعال‌سازی یکپارچهٔ ۸ Worker خبر',
    'Activate 8 verified original News workers');
  cronActivate.title=say('فقط در صورت تکمیل سیاست رسمی، مجوز منابع، دیتابیس و پشتیبان',
    'Requires live reviewed sources, original CMS, verified backup and standing owner policy');
  let cronActionInFlight=false;
  cronControls.append(cronHeading,cronDisclosure,cronRefresh,cronRegister,
    cronActivate,cronStatus,cronRows);
  async function originalCronRequest(method='GET',body=null){
    const csrf=csrfResolver();
    if(typeof csrf!=='string'||!/^[a-f0-9]{64}$/i.test(csrf))
      throw Error('JREI_NEWS_OWNER_CSRF_REQUIRED');
    const response=await fetch('/api/admin/operations/cron-master',{
      method,credentials:'same-origin',cache:'no-store',redirect:'error',
      headers:{Accept:'application/json','Content-Type':'application/json',
        'X-CSRF-Token':csrf},
      ...(body===null?{}:{body:JSON.stringify(body)})
    });
    if(!response.ok)throw Error('JREI_NEWS_ORIGINAL_CRON_UNAVAILABLE');
    return response.json();
  }
  async function refreshOriginalCronStatus(){
    if(cronActionInFlight)return;
    cronStatus.textContent=say('در حال استعلام وضعیت ثبت‌شدهٔ Cron…',
      'Reading recorded Cron state…');
    cronRows.replaceChildren();
    try{
      const snapshot=await originalCronRequest();
      if(snapshot?.schema!=='jr.operations-cron-owner.v1'||
        !Array.isArray(snapshot.jobs))throw Error('JREI_NEWS_CRON_CONTRACT');
      const jobs=snapshot.jobs.filter(job=>
        typeof job?.jobId==='string'&&
        job.jobId.startsWith('jrei_news_'));
      const registered=jobs.filter(j=>j.registered===true).length;
      const enabled=jobs.filter(j=>j.enabled===true).length;
      cronStatus.textContent=say('ثبت‌شده: ','Registered: ')+registered+
        ' / '+jobs.length+' · '+say('فعال: ','Enabled: ')+enabled+
        ' · '+(snapshot.masterEnabled===true?'MASTER ON':'MASTER OFF')+
        ' · '+(snapshot.serverCronVerified===true?
          say('Cron میزبانی تأییدشده','Host Cron verified'):
          say('اجرای Cron میزبانی اثبات نشده','Host Cron unverified'));
      for(const job of jobs){
        const li=document.createElement('li');
        const when=(Number.isSafeInteger(job.lastFinishedAt)&&
          job.lastFinishedAt>0)?
          new Date(job.lastFinishedAt*1000).toLocaleString(fa?'fa-IR':'en-GB'):
          say('بدون اجرای ثبت‌شده','no recorded execution');
        li.textContent=job.jobId+' · '+(job.registered?'REGISTERED':'MISSING')+
          ' · '+(job.enabled?'ON':'OFF')+' · '+
          String(job.lastState??'UNKNOWN').slice(0,44)+' · '+when;
        cronRows.append(li);
      }
    }catch{
      cronStatus.textContent=say('وضعیت Cron قابل احراز نیست؛ اجرای موتور تأیید نشده است.',
        'Original Cron unavailable; engine execution remains unverified.');
    }
  }
  cronRefresh.addEventListener('click',refreshOriginalCronStatus);
  cronRegister.addEventListener('click',async()=>{
    if(cronActionInFlight)return;
    cronActionInFlight=true;cronRegister.disabled=true;
    try{
      const receipt=await originalCronRequest('POST',{
        action:'register_news_bundle',
        confirmation:'REGISTER_NEWS_WORKERS_DISABLED'
      });
      if(receipt?.ok!==true||receipt.allNewsWorkersInitiallyDisabled!==true)
        throw Error('NEWS_CRON_REGISTRATION_NOT_CONFIRMED');
      cronStatus.textContent=say(
        'Workerها ثبت شدند، اما غیرفعال باقی ماندند؛ حقوق نشر و مجوز انتشار جداگانه‌اند.',
        'News workers registered but remain disabled; rights and publishing gates are independent.');
    }catch{
      cronStatus.textContent=say(
        'ثبت Workerها تأیید نشد؛ دیتابیس و نشست MFA را بررسی کنید.',
        'Worker registration was not confirmed; inspect mother DB and owner MFA.');
    }finally{
      cronActionInFlight=false;cronRegister.disabled=false;
    }
    await refreshOriginalCronStatus();
  });

  cronActivate.addEventListener('click',async()=>{
    if(cronActionInFlight)return;
    const authorization=say(
      'فعال‌سازی ۸ Worker اصلی JREI News در زمان‌بند موجود برتینا، با کنترل کامل مجوز منبع، صحت خبر، ممیزی مستقل، رسید CMS و امکان توقف. این عمل به‌تنهایی خبری منتشر نمی‌کند. ادامه می‌دهید؟',
      'Activate eight original JREI News workers through the existing Bertina scheduler? Source rights, fact review, independent QA and real CMS receipts remain mandatory; this action alone publishes nothing. Continue?');
    if(!window.confirm(authorization))return;
    cronActionInFlight=true;cronActivate.disabled=true;
    try{
      const receipt=await originalCronRequest('POST',{
        action:'activate_news_pipeline',
        confirmation:'ACTIVATE_ORIGINAL_VERIFIED_NEWS_PIPELINE'
      });
      if(receipt?.ok!==true||receipt.newsPipelineScheduledWorkers!==8||
         receipt.sourcePolicyAndStandingAuthorityChecked!==true||
         receipt.publicationExecutedByActivation!==false)
        throw Error('JREI_NEWS_ORIGINAL_PIPELINE_ACTIVATION_NOT_CONFIRMED');
      cronStatus.textContent=say(
        'فعال‌سازی صف اجرایی اخبار در دیتابیس ثبت شد؛ انتشار واقعی فقط پس از تکمیل فرایند و دریافت رسید CMS اثبات می‌شود.',
        'Original News job schedules activated. A genuine bilingual CMS receipt is still required to prove publication.');
    }catch{
      cronStatus.textContent=say(
        'فعال‌سازی انجام نشد: یکی از مجوزهای خصوصی، سیاست ماندگار، جداول مادر، Workerها یا وضعیت بررسی اجرای قبلی ناقص است. فهرست موانع پایین صفحه را مشاهده کنید.',
        'News activation not accepted: check private release switches, signed standing policy, mother schema, worker sources and prior-job reconciliation below.');
    }finally{
      cronActionInFlight=false;cronActivate.disabled=false;
    }
    await refreshOriginalCronStatus();
  });

  // The current owner directive supersedes per-story manual confirmation
  // for independently verified original official-source announcements.
  const standingTitle=document.createElement('h3');
  standingTitle.textContent=say('مجوز دائمی اخبار رسمی',
    'Standing authorization for verified official news');
  const standingDescription=document.createElement('p');
  standingDescription.textContent=say(
    'اخبار رسمی پس از صحت‌سنجی، بدون تأیید هر خبر منتشر می‌شوند. مدیر می‌تواند سیاست انتشار را فعال یا لغو کند. این اقدام به‌تنهایی Cron یا ناشر را روشن نمی‌کند.',
    'Verified official notices require no per-story approval. The owner can grant or revoke a bounded policy; this does not itself start Cron or enable CMS.');
  const standingForm=document.createElement('form');
  const standingDuration=document.createElement('select');
  for(const [days,text] of [[30,say('۳۰ روز','30 days')],[60,say('۶۰ روز','60 days')],
      [90,say('۹۰ روز','90 days')]]){
    const option=document.createElement('option');
    option.value=String(days);option.textContent=text;standingDuration.append(option);
  }
  const grantStanding=document.createElement('button');
  grantStanding.type='submit';
  grantStanding.textContent=say('فعال‌سازی سیاست انتشار اخبار رسمی',
    'Grant official-news standing authorization');
  standingForm.append(standingDuration,grantStanding);
  const standingStatus=document.createElement('p');
  standingStatus.setAttribute('role','status');
  const standingRows=document.createElement('div');
  standingRows.className='ni-admin-custom-source-items';
  standingControls.append(standingTitle,standingDescription,
    standingForm,standingStatus,standingRows);
  let standingPending=false;
  async function refreshStandingPolicy(){
    try{
      const data=await request('/owner/standing-policy',{method:'GET'});
      if(data.schema!=='jr.jrei.news-owner-standing-policies.v1'||
         !Array.isArray(data.policies))
        throw Error('NEWS_STANDING_POLICY_RESPONSE_INVALID');
      standingRows.replaceChildren();
      if(data.policies.length===0){
        const info=document.createElement('p');
        info.textContent=say('هنوز مجوز دائمی ثبت نشده است.','No standing policy registered yet.');
        standingRows.append(info);
      }
      for(const row of data.policies){
        const item=document.createElement('section');
        const title=document.createElement('strong');
        title.textContent=say('مجوز نسخه ','Policy revision ')+String(row.revision_number);
        const state=document.createElement('p');
        const epoch=Number(row.expires_at);
        const active=row.revoked_at===null&&Number.isFinite(epoch)&&
          epoch>Math.floor(Date.now()/1000);
        state.textContent=active?
          say('فعال تا: ','Active until: ')+new Date(epoch*1000).toLocaleDateString(fa?'fa-IR':'en-US'):
          say('منقضی یا لغوشده','Expired or revoked');
        item.append(title,state);
        if(active&&/^[a-f0-9-]{36}$/i.test(String(row.policy_id))){
          const revoke=document.createElement('button');
          revoke.type='button';
          revoke.textContent=say('لغو فوری مجوز','Revoke standing policy');
          revoke.addEventListener('click',async()=>{
            if(standingPending)return;
            standingPending=true;revoke.disabled=true;
            try{
              await request('/owner/standing-policy/revoke',{
                method:'POST',body:JSON.stringify({policyId:row.policy_id})});
              standingStatus.textContent=say('مجوز لغو شد.','Policy revoked.');
              await refreshStandingPolicy();
            }catch(error){
              standingStatus.textContent=say(
                'لغو هنوز تأیید نشده است. نشست مدیریت را بررسی کنید.',
                'Revocation not confirmed. Check owner session.');
            }finally{standingPending=false;revoke.disabled=false;}
          });
          item.append(revoke);
        }
        standingRows.append(item);
      }
      return true;
    }catch(error){
      standingStatus.textContent=say(
        'مهاجرت مجوز دائمی یا اتصال آن به سرور باقی مانده است.',
        'Standing authorization migration or server integration is not yet available.');
      return false;
    }
  }
  standingForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(standingPending)return;
    standingPending=true;grantStanding.disabled=true;
    try{
      await request('/owner/standing-policy/grant',{method:'POST',
        body:JSON.stringify({
          confirmation:'AUTHORIZE_VERIFIED_PRIMARY_OFFICIAL_NEWS',
          durationDays:Number(standingDuration.value)
        })});
      standingStatus.textContent=say(
        'مجوز ثبت شد؛ اتصال ناشر و آزمون نهایی همچنان ضروری است.',
        'Authorization recorded; publisher activation still requires acceptance.');
      await refreshStandingPolicy();
    }catch(error){
      standingStatus.textContent=say(
        'ثبت مجوز انجام نشد؛ وضعیت MFA یا مهاجرت را بررسی کنید.',
        'Grant not confirmed; verify MFA or migration.');
    }finally{standingPending=false;grantStanding.disabled=false;}
  });

  // A single precise ORIGINAL JREI source + /news/ prefix authorization
  // replaces individual article approvals. It is not a blanket domain trust
  // or a workaround for transport, media rights or scientific verification.
  const delegatedTitle=document.createElement('h3');
  delegatedTitle.textContent=say('تفویض مسیر رسمی؛ بدون تأیید تک‌تک خبرها',
    'Delegate an exact official-news path, not individual articles');
  const delegatedIntro=document.createElement('p');
  delegatedIntro.textContent=say(
    'شناسهٔ منبع تأییدشده JREI و مسیر دقیق اعلامیه‌ها (مانند /news/) را یک‌بار ثبت کنید. فقط لینک‌های همان دامنه و مسیر، با مجوز معتبر منبع، خودکار به صف دریافت اصلی اضافه می‌شوند.',
    'Approve the exact JREI source ID and a bounded path such as /news/ once. Only links under that host and path, with current primary-source permissions, can enter the original acquisition queue.');
  const delegatedForm=document.createElement('form');
  const scopeSource=document.createElement('input');
  scopeSource.type='text';scopeSource.required=true;scopeSource.maxLength=36;
  scopeSource.pattern='[a-fA-F0-9-]{36}';
  scopeSource.placeholder=say('شناسه منبع اصلی JREI (UUID)',
    'Verified original JREI source UUID');
  const scopePrefix=document.createElement('input');
  scopePrefix.type='text';scopePrefix.required=true;scopePrefix.maxLength=220;
  scopePrefix.value='/news/';scopePrefix.placeholder='/news/';
  const scopeDays=document.createElement('select');
  for(const days of [7,30,60,90]){
    const opt=document.createElement('option');
    opt.value=String(days);opt.textContent=say('اعتبار '+days+' روز',
      days+' days');if(days===30)opt.selected=true;scopeDays.append(opt);
  }
  const scopeLimit=document.createElement('select');
  for(const maximum of [5,10,20,40]){
    const opt=document.createElement('option');
    opt.value=String(maximum);opt.textContent=say('حداکثر '+maximum+' مقاله در هر چرخه',
      maximum+' articles per cycle');
    if(maximum===20)opt.selected=true;scopeLimit.append(opt);
  }
  const scopeGrant=document.createElement('button');
  scopeGrant.type='submit';
  scopeGrant.textContent=say('تأیید مسیر رسمی برای دریافت خودکار',
    'Delegate official path for autonomous discovery');
  delegatedForm.append(scopeSource,scopePrefix,scopeDays,scopeLimit,scopeGrant);
  const delegatedStatus=document.createElement('p');
  delegatedStatus.setAttribute('role','status');
  const delegatedItems=document.createElement('div');
  delegatedItems.className='ni-admin-custom-source-items';
  delegatedControls.append(delegatedTitle,delegatedIntro,
    delegatedForm,delegatedStatus,delegatedItems);
  let scopeWritePending=false;
  async function refreshDelegatedScopes(){
    try{
      const data=await request('/owner/delegated-source-scopes',{method:'GET'});
      if(data.schema!=='jr.jrei.news-delegated-source-scopes.v1'||
         !Array.isArray(data.scopes))
        throw Error('NEWS_DELEGATED_SCOPES_RESPONSE_INVALID');
      delegatedItems.replaceChildren();
      if(data.scopes.length===0){
        const blank=document.createElement('p');
        blank.textContent=say('هنوز مسیر تفویض‌شده‌ای وجود ندارد.',
          'No approved path scope exists yet.');
        delegatedItems.append(blank);
      }
      for(const item of data.scopes){
        const card=document.createElement('section');
        const heading=document.createElement('h4');
        heading.textContent=String(item.approved_host??'')+
          String(item.approved_path_prefix??'');
        const expires=Number(item.expires_at);
        const active=item.revoked_at===null &&
          Number.isFinite(expires)&&expires>Math.floor(Date.now()/1000);
        const note=document.createElement('p');
        note.textContent=active?
          say('دریافت در محدودهٔ مجاز؛ معتبر تا ',
            'Scoped acquisition; valid through ')+
          new Date(expires*1000).toLocaleDateString(fa?'fa-IR':'en-US'):
          say('لغوشده یا منقضی','Revoked or expired');
        card.append(heading,note);
        if(active&&/^[a-f0-9-]{36}$/i.test(String(item.scope_id??''))){
          const revoke=document.createElement('button');revoke.type='button';
          revoke.textContent=say('لغو فوری محدوده','Revoke source scope');
          revoke.addEventListener('click',async()=>{
            if(scopeWritePending)return;
            scopeWritePending=true;revoke.disabled=true;
            try{
              await request('/owner/delegated-source-scopes/revoke',{
                method:'POST',body:JSON.stringify({scopeId:item.scope_id})
              });
              delegatedStatus.textContent=say('محدوده لغو شد.',
                'Scope revoked.');await refreshDelegatedScopes();
            }catch(err){
              delegatedStatus.textContent=say(
                'لغو تأیید نشد؛ اتصال مدیریت را بررسی کنید.',
                'Revocation unconfirmed; review admin connection.');
            }finally{scopeWritePending=false;revoke.disabled=false;}
          });
          card.append(revoke);
        }
        delegatedItems.append(card);
      }
      return true;
    }catch(err){
      delegatedStatus.textContent=say(
        'فعال‌سازی محدودۀ خبری یا مهاجرت اختصاصی آن هنوز انجام نشده است.',
        'Delegated scope switch or its database migration is not yet active.');
      return false;
    }
  }
  delegatedForm.addEventListener('submit',async event=>{
    event.preventDefault();
    if(scopeWritePending)return;
    scopeWritePending=true;scopeGrant.disabled=true;
    try{
      await request('/owner/delegated-source-scopes/grant',{
        method:'POST',body:JSON.stringify({
          sourceId:scopeSource.value.trim(),
          pathPrefix:scopePrefix.value.trim(),
          validDays:Number(scopeDays.value),
          maxArticlesPerCycle:Number(scopeLimit.value),
          confirmation:'APPROVE_EXACT_ORIGINAL_OFFICIAL_NEWS_PATH'
        })
      });
      delegatedStatus.textContent=say('محدوده تأیید شد.',
        'Delegated source path recorded.');
      await refreshDelegatedScopes();
    }catch(err){
      delegatedStatus.textContent=say(
        'محدوده ثبت نشد؛ وضعیت تأیید منبع، حقوق و مهاجرت را بررسی کنید.',
        'Not registered; verify source approval, rights and migration.');
    }finally{scopeWritePending=false;scopeGrant.disabled=false;}
  });

  // Manager source intake is intentionally available before live publishing:
  // it adds a discoverable official source, but never fabricates crawl rights.
  const customTitle=document.createElement('h3');
  customTitle.textContent=say('افزودن و مدیریت منابع دلخواه مدیر',
    'Add and manage administrator-approved news sources');
  const customInfo=document.createElement('p');
  customInfo.textContent=say(
    'مدیر نشانی رسمی را ثبت و تأیید می‌کند. منبع در فهرست کشف ثبت می‌شود؛ فعال‌سازی پایش تنها پس از اعتبار سیاست اصلی JREI ممکن است.',
    'Approve new official sources here. They join discovery immediately; monitoring requires an existing verified JREI source and rights policy.');
  const officialSeed=document.createElement('button');
  officialSeed.type='button';
  officialSeed.textContent=say(
    'افزودن خودکار فهرست شناخته‌شدهٔ دانشگاه‌ها و سازمان سنجش',
    'Register the known university and Sanjesh source catalogue');
  officialSeed.title=say(
    'فقط منابع را به رجیستری اصلی اضافه می‌کند؛ مجوز دسترسی، خزش یا انتشار جعل نمی‌شود.',
    'Registers source origins only; never grants crawling, reuse or publishing permissions.');
  const customForm=document.createElement('form');
  const fields={};
  for(const [key,caption,type,max] of [
    ['title',say('نام مؤسسه','Institution name'),'text',200],
    ['url',say('نشانی HTTPS رسمی','Official HTTPS URL'),'url',1000]]){
    const wrapper=document.createElement('label');
    wrapper.textContent=caption;
    const input=document.createElement('input');
    input.type=type;input.name=key;input.required=true;
    input.autocomplete='off';input.maxLength=max;
    fields[key]=input;
    wrapper.append(input);customForm.append(wrapper);
  }
  const category=document.createElement('select');
  for(const [code,caption] of [
    ['universities',say('دانشگاه','University')],
    ['examinations',say('سنجش و آزمون','Exams and admissions')],
    ['school',say('مدرسه','School')],
    ['research',say('پژوهش','Research')],
    ['employment',say('استخدام','Employment')],
    ['language',say('زبان','Language')],
    ['international',say('بین‌الملل','International')]]){
    const option=document.createElement('option');
    option.value=code;option.textContent=caption;category.append(option);
  }
  const priority=document.createElement('select');
  for(const code of ['P2','P1','P0']){
    const option=document.createElement('option');
    option.value=code;option.textContent=code;priority.append(option);
  }
  const addSource=document.createElement('button');
  addSource.type='submit';
  addSource.textContent=say('ثبت منبع','Submit source');
  customForm.append(category,priority,addSource);
  const customState=document.createElement('p');
  customState.setAttribute('role','status');
  const customSuggestions=document.createElement('div');
  customSuggestions.className='ni-admin-custom-source-items';
  const customRows=document.createElement('div');
  customRows.className='ni-admin-custom-source-items';
  customSources.append(customTitle,customInfo,officialSeed,customForm,
    customState,customSuggestions,customRows);
  let sourceActionPending=false;
  async function mutateCustomSource(route,payload){
    if(sourceActionPending)return;
    sourceActionPending=true;addSource.disabled=true;
    customState.textContent=say('در حال ثبت درخواست مدیر…','Saving administrator request…');
    try{
      await request(route,{method:'POST',body:JSON.stringify(payload)});
      customState.textContent=say('درخواست ثبت شد.','Request recorded.');
      await refreshCustomSources();
    }catch(err){
      customState.textContent=say(
        'این درخواست هنوز انجام نشد؛ نشست مدیر، تنظیمات یا مهاجرت دیتابیس را بررسی کنید.',
        'Not completed. Verify the administrator session, configuration and database migration.');
    }finally{sourceActionPending=false;addSource.disabled=false;}
  }
  officialSeed.addEventListener('click',()=>{
    mutateCustomSource('/owner/admin-sources/seed-official',{
      confirmation:'DISCOVER_KNOWN_OFFICIAL_ORIGINS'
    });
  });
  function customSourceButton(text,route,body){
    const btn=document.createElement('button');btn.type='button';btn.textContent=text;
    btn.addEventListener('click',()=>mutateCustomSource(route,body));
    return btn;
  }
  async function refreshCustomSources(){
    try{
      const data=await request('/owner/admin-sources',{method:'GET'});
      customRows.replaceChildren();
      if(data.schema!=='jr.jrei.news-admin-source-list.v1'||!Array.isArray(data.entries))
        throw Error('NEWS_ADMIN_SOURCE_RESPONSE_INVALID');
      customSuggestions.replaceChildren();
      const suggested=Array.isArray(data.suggestedInstitutions)?
        data.suggestedInstitutions.slice(0,30):[];
      if(suggested.length){
        const heading=document.createElement('h4');
        heading.textContent=say('فهرست پیشنهادی نهادهای آموزشی رسمی',
          'Suggested institutional source directory');
        customSuggestions.append(heading);
      }
      const existingOrigins=new Set(data.entries.map(x=>String(x.source_url??'')));
      for(const institution of suggested){
        if(!institution||typeof institution.institutionId!=='string'||
           !/^[a-z0-9-]{2,50}$/.test(institution.institutionId)||
           typeof institution.origin!=='string')continue;
        const item=document.createElement('section');
        const name=document.createElement('h4');
        name.textContent=fa?String(institution.titleFa??''):
          String(institution.titleEn??'');
        const origin=document.createElement('p');
        origin.textContent=institution.origin;
        const state=document.createElement('p');
        state.textContent=say(
          'مبدأ پیشنهادی؛ صحت، ربات‌ها و مجوز استفاده جداگانه بررسی می‌شوند.',
          'Discovery candidate; publisher identity, robots and rights are checked separately.');
        item.append(name,origin,state);
        if(!existingOrigins.has(institution.origin)){
          item.append(customSourceButton(
            say('تأیید و ثبت در JREI','Approve and register with JREI'),
            '/owner/admin-sources/suggested-approve',{
              institutionId:institution.institutionId,
              confirmation:'APPROVE_OFFICIAL_SOURCE_DISCOVERY'
            }));
        }else{
          const existing=document.createElement('p');
          existing.textContent=say('قبلاً ثبت شده است.','Already registered.');
          item.append(existing);
        }
        customSuggestions.append(item);
      }
      if(data.entries.length===0){
        const empty=document.createElement('p');
        empty.textContent=say('هنوز منبع سفارشی ثبت نشده است.','No custom source recorded yet.');
        customRows.append(empty);
      }
      for(const item of data.entries){
        const section=document.createElement('section');
        const heading=document.createElement('h4');
        heading.textContent=String(item.source_title??'');
        const url=document.createElement('p');
        url.textContent=String(item.source_url??'');
        const state=document.createElement('p');
        state.textContent=say('وضعیت: ','State: ')+String(item.submission_state??'');
        section.append(heading,url,state);
        const id=item.submission_id;
        if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id))continue;
        if(['PENDING_ADMIN_APPROVAL','APPROVED_DISCOVERY',
            'ORIGINAL_POLICY_PENDING'].includes(item.submission_state)){
          const edit=document.createElement('button');
          edit.type='button';edit.textContent=say('ویرایش مشخصات','Edit details');
          edit.addEventListener('click',()=>{
            if(section.querySelector('form'))return;
            const inline=document.createElement('form');
            const name=document.createElement('input');
            name.type='text';name.required=true;name.maxLength=200;
            name.value=String(item.source_title??'');
            const cat=document.createElement('select');
            for(const c of ['universities','examinations','school','research',
                'employment','language','international']){
              const o=document.createElement('option');
              o.value=c;o.textContent=c;if(c===item.source_category)o.selected=true;
              cat.append(o);
            }
            const pri=document.createElement('select');
            for(const p of ['P0','P1','P2']){
              const o=document.createElement('option');
              o.value=p;o.textContent=p;if(p===item.news_priority)o.selected=true;
              pri.append(o);
            }
            const save=document.createElement('button');
            save.type='submit';save.textContent=say('ذخیره ویرایش','Save changes');
            inline.append(name,cat,pri,save);section.append(inline);
            inline.addEventListener('submit',event=>{
              event.preventDefault();
              mutateCustomSource('/owner/admin-sources/edit',{
                submissionId:id,title:name.value.trim(),category:cat.value,
                priority:pri.value
              });
            });
          });
          section.append(edit);
        }
        if(item.submission_state==='PENDING_ADMIN_APPROVAL')
          section.append(customSourceButton(say('تأیید و افزودن','Approve and add'),
            '/owner/admin-sources/approve',{
              submissionId:id,confirmation:'APPROVE_OFFICIAL_SOURCE_DISCOVERY'}));
        if(['APPROVED_DISCOVERY','ORIGINAL_POLICY_PENDING','MONITOR_STAGED'].includes(item.submission_state))
          section.append(customSourceButton(say('بررسی اتصال به پایشگر','Reconcile monitor'),
            '/owner/admin-sources/reconcile',{submissionId:id}));
        if(item.submission_state!=='DISABLED')
          section.append(customSourceButton(say('توقف منبع','Disable source'),
            '/owner/admin-sources/disable',{submissionId:id}));
        else
          section.append(customSourceButton(say('بازگرداندن منبع','Restore source'),
            '/owner/admin-sources/restore',{submissionId:id}));
        if(item.last_issue_code){
          const reason=document.createElement('p');
          reason.textContent=String(item.last_issue_code);section.append(reason);
        }
        customRows.append(section);
      }
      return true;
    }catch(error){
      customState.textContent=say(
        'مدیریت منابع سفارشی در نسخهٔ فعلی یا دیتابیس هنوز آماده نیست.',
        'Custom source management is unavailable in this version or database.');
      return false;
    }
  }
  customForm.addEventListener('submit',event=>{
    event.preventDefault();
    mutateCustomSource('/owner/admin-sources/submit',{
      title:fields.title.value.trim(),url:fields.url.value.trim(),
      category:category.value,priority:priority.value
    });
  });

  // Only contested official source/claims appear here. No owner's action
  // on this desk can fabricate article approval or suppress source policy.
  const exceptionTitle=document.createElement('h3');
  exceptionTitle.textContent=say('اخبار دارای ابهام واقعی','Genuinely disputed news');
  const exceptionInfo=document.createElement('p');
  exceptionInfo.textContent=say(
    'فقط ابهام منبع، مجوز استفاده یا تناقض ادعا به این بخش می‌رسد. تأیید خبرهای رسمی عادی خودکار است.',
    'Only uncertain source identity, reuse rights or contradicted claims appear here. Normal verified official news does not require article-by-article approval.');
  const exceptionStatus=document.createElement('p');
  exceptionStatus.setAttribute('role','status');
  const exceptionItems=document.createElement('div');
  exceptionItems.className='ni-admin-custom-source-items';
  exceptionDesk.append(exceptionTitle,exceptionInfo,exceptionStatus,exceptionItems);
  let exceptionWritePending=false;
  async function updateEvidenceException(id,state){
    if(exceptionWritePending)return;
    exceptionWritePending=true;
    exceptionStatus.textContent=say('در حال ثبت تصمیم…','Saving review…');
    try{
      const result=await request('/owner/evidence-exceptions/resolve',{
        method:'POST',body:JSON.stringify({exceptionId:id,state})
      });
      if(result.articleApproved!==false||result.published!==false)
        throw Error('NEWS_OWNER_EXCEPTION_UNEXPECTED_PUBLICATION');
      await refreshEvidenceExceptions();
      exceptionStatus.textContent=say(
        'نتیجهٔ بررسی ثبت شد؛ این اقدام مجوز انتشار نیست.',
        'Review recorded; this action did not authorize publication.');
    }catch(err){
      exceptionStatus.textContent=say(
        'عملیات بررسی انجام نشد. نشست مدیریت و مهاجرت را بررسی کنید.',
        'Review failed. Check the owner session and database migration.');
    }finally{exceptionWritePending=false;}
  }
  async function refreshEvidenceExceptions(){
    try{
      const result=await request('/owner/evidence-exceptions',{method:'GET'});
      if(result.schema!=='jr.jrei.news-owner-evidence-queue.v1'||
         !Array.isArray(result.items))throw Error('NEWS_EXCEPTION_SCHEMA_INVALID');
      exceptionItems.replaceChildren();
      if(result.items.length===0){
        const none=document.createElement('p');
        none.textContent=say('خبر مشکوکِ در انتظار بررسی وجود ندارد.',
          'No genuinely disputed news waiting for review.');
        exceptionItems.append(none);
      }
      for(const row of result.items){
        if(typeof row.exception_id!=='string'||
           !/^[a-f0-9-]{36}$/i.test(row.exception_id))continue;
        const card=document.createElement('article');
        const title=document.createElement('h4');
        title.textContent=String(row.headline??'');
        const issue=document.createElement('p');
        issue.textContent=say('علت بررسی: ','Review reason: ')+String(row.issue_code??'');
        const source=document.createElement('p');
        source.textContent=String(row.source_url??'');
        card.append(title,issue,source);
        for(const [code,fa,en] of [
          ['ACKNOWLEDGED','مشاهده شد','Acknowledge'],
          ['RESOLVED','بستن هشدار','Close alert']]){
          const btn=document.createElement('button');btn.type='button';
          btn.textContent=say(fa,en);
          btn.addEventListener('click',()=>updateEvidenceException(
            row.exception_id,code));
          card.append(btn);
        }
        exceptionItems.append(card);
      }
      return true;
    }catch(err){
      exceptionStatus.textContent=say(
        'صف استثناها در این نسخه یا دیتابیس هنوز در دسترس نیست.',
        'The owner exception desk is not available in this version or database.');
      return false;
    }
  }
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
      if(await load()!==true)return;
      show(say('تصمیم ثبت شد. انتشار عمومی هنوز انجام نشده است.',
        'Decision recorded. Public publishing has not occurred.'));
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
    articles.replaceChildren();
    acquisition.replaceChildren();
    publications.replaceChildren();
    integration.replaceChildren();
    await Promise.all([
      refreshCustomSources(),refreshStandingPolicy(),
      refreshEvidenceExceptions(),refreshDelegatedScopes(),
      refreshOriginalCronStatus()
    ]);
    if(readVersion!==loadRevision)return false;
    show(say('در حال بررسی وضعیت یکپارچگی…','Checking existing integrations…'));
    try{
      const readiness=await request('/owner/integration-readiness',{method:'GET'});
      if(readVersion!==loadRevision)return;
      if(readiness.schema!=='jr.jrei.news-owner-integration-readiness.v1')
        throw Error('NEWS_READINESS_SCHEMA_UNKNOWN');
      const heading=document.createElement('strong');
      heading.textContent=say('وضعیت اتصال تحریریه و ناشر اصلی',
        'Original newsroom and publisher integration status');
      const statusLine=document.createElement('p');
      statusLine.textContent=readiness.ownerQueueAccessible?
        say('صف خصوصی تحریریه قابل بررسی است؛ ناشر عمومی هنوز به تأیید جداگانه نیاز دارد.',
          'Private editorial queue can be read; original public publisher remains unverified.'):
        say('تحریریه هنوز فعال نشده: بستهٔ خصوصی، دیتابیس یا مجوز انتشار یکپارچه ناقص است.',
          'Newsroom not activated: private package, mother schema, or explicit release acceptance is missing.');
      const publishing=document.createElement('p');
      publishing.textContent=say('اتصال انتشار عمومی: تأییدنشده. هیچ خبری با این بررسی منتشر نمی‌شود.',
        'Public publishing: not connected. This diagnostic cannot publish.');
      const blockerDetails=document.createElement('p');
      // Read only server-reported structural reason codes; never render
      // raw SQL, table contents, diagnostic exceptions or private evidence.
      const reasonMap=readiness.schemaBlockers||{};
      const missing=Object.entries(readiness.originalNewsTables||{})
        .filter(([name,state])=>/^[a-z0-9_]{3,60}$/.test(name)&&
          state!=='AVAILABLE').slice(0,8).map(([name])=>{
          const codes=Array.isArray(reasonMap[name])?
            reasonMap[name].filter(code=>typeof code==='string'&&
              /^[A-Z_]{5,48}$/.test(code)).slice(0,5):[];
          return name+(codes.length?' ['+codes.join(', ')+']':'');
        });
      const messages=[];
      if(readiness.packagedPrivateNewsLibraryAvailable!==true)
        messages.push(say('بستهٔ خصوصی ماژول یافت نشد','Private news library is missing'));
      if(readiness.schemaMetadataProbeSucceeded===false)
        messages.push(say('دسترسی خواندن ساختار دیتابیس مادر قابل تأیید نیست',
          'Mother database schema metadata could not be read'));
      if(readiness.requiredMotherSchemaAvailable!==true)
        messages.push(say('ساختار دیتابیس مادر یا روابط آن ناقص است: ',
          'Missing or incompatible mother-database structures: ')+
          (missing.join('، ')||say('نامشخص','Unknown')));
      if(readiness.explicitOriginalApiFlagEnabled!==true)
        messages.push(say('مجوز API اصلی فعال نشده','Original API activation not approved'));
      if(readiness.integratedReleaseAccepted!==true)
        messages.push(say('پذیرش نهایی یکپارچه ثبت نشده','Final integrated acceptance not recorded'));
      const ports=readiness.firstPartyModelAndEvidencePortReadiness||{};
      const portNames=[
        ['firstPartySourceFactsModulePackaged',
          'ماژول شواهد اصلی','Original source-evidence module'],
        ['independentQaVerifierModulePackaged',
          'ممیز مستقل خبر','Independent reviewer module'],
        ['modelDraftWorkerPackaged',
          'موتور زمان‌بندی مدل','Scheduled model worker'],
        ['originalJreiDraftAdapterPackaged',
          'اتصال مدل اصلی JREI','Original JREI model adapter'],
        ['englishApprovedCorpusDigestConfigured',
          'سبک معتبر انگلیسی','Approved English author corpus'],
        ['persianApprovedCorpusDigestConfigured',
          'سبک معتبر فارسی','Approved Persian author corpus'],
        ['originalFactSignatureSecretConfigured',
          'امضای خصوصی شواهد','Private fact-signature configuration'],
        ['separateIndependentQaSignatureSecretConfigured',
          'امضای مستقل ممیزی','Independent QA-signature configuration'],
        ['originalCmsPublishingPipelinePackaged',
          'مسیر ناشر اصلی','Original publisher pipeline']
      ];
      const modelStatus=document.createElement('section');
      modelStatus.className='ni-admin-model-readiness';
      const modelTitle=document.createElement('h4');
      modelTitle.textContent=say('آمادگی اجزای هوش مصنوعی و انتشار',
        'AI and publishing component readiness');
      modelStatus.append(modelTitle);
      const requiredSwitches=readiness.operationalActivationSwitches||{};
      const switchHeading=document.createElement('h4');
      switchHeading.textContent=say('موانع مشخص راه‌اندازی اجرایی اخبار',
        'Exact live newsroom configuration gates');
      modelStatus.append(switchHeading);
      const gateLabels=[
        ['masterCronConfigured','زمان‌بند مادر برتینا','Bertina original master scheduler'],
        ['integratedNewsAccepted','پذیرش انتشار یکپارچه','Integrated newsroom release acceptance'],
        ['sourceActivationAuthorized','مجوز پایش منابع','Original source-monitoring authorization'],
        ['independentPrimaryEvidenceEnabled','ممیزی مستقل اصل اطلاعیه','Independent primary-source news evidence'],
        ['kaSourceSchedulingEnabled','برنامه‌ریزی منابع مجاز JREI-KA','JREI-KA approved source scheduler'],
        ['kaAcquisitionEnabled','گردآوری مجاز اصل منابع','JREI-KA lawful original acquisition'],
        ['liveAiTransportEnabled','مدل خصوصی آماده‌سازی خبر','Authorised live first-party AI transport'],
        ['automaticOfficialCatalogueSeedEnabled','کشف اولیهٔ وبگاه‌های نهادی','Discover original institutional origins'],
        ['officialFeedProjectionEnabled','دریافت شواهد RSS مجاز','Approved feed receipt projection'],
        ['officialArticleIntakeEnabled','ورود شواهد مقالهٔ اصلی','Original article evidence intake'],
        ['modelDraftEnabled','آماده‌سازی پیش‌نویس مدل','Bounded model drafting'],
        ['originalCmsWriterEnabled','ناشر اصلی دوزبانه','Original bilingual CMS writer'],
        ['standingOfficialPublisherEnabled','مجوز ماندگار انتشار رسمی','Standing verified-official publication'],
        ['restoreAcceptanceRecorded','پشتیبان و بازیابی تأییدشده','Verified restore prerequisite'],
        ['publisherReceiptsAccepted','تأیید رسید واقعی انتشار','Actual publication receipt acceptance'],
        ['verifiedPublicSearchEnabled','آرشیو جست‌وجوی دارای رسید','Receipt-backed public archive']
      ];
      const gateList=document.createElement('ul');
      gateList.className='ni-admin-launch-gates';
      for(const [key,faLabel,enLabel] of gateLabels){
        const item=document.createElement('li');
        const configured=requiredSwitches[key]===true;
        item.textContent=(configured?'✓ ':'○ ')+say(faLabel,enLabel)+
          (configured?say(' — تنظیم شده',' — configured'):
            say(' — هنوز فعال نشده',' — not enabled'));
        gateList.append(item);
      }
      modelStatus.append(gateList);
      const noAttestation=document.createElement('p');
      noAttestation.textContent=say(
        'این وضعیت از تنظیمات خصوصی خوانده می‌شود؛ گزینه‌های فعال، اثبات اجرای Cron یا صحت علمی اخبار نیستند. مجوز حقوق نشر و بررسی مستقل منبع همچنان جداگانه لازم است.',
        'These are private configuration states, not proof of Cron runs or scientific news validity. Source rights and independent review remain distinct mandatory gates.');
      modelStatus.append(noAttestation);
      for(const [key,faText,enText] of portNames){
        const item=document.createElement('p');
        item.textContent=(ports[key]===true?'✓ ':'○ ')+
          say(faText,enText)+' — '+
          (ports[key]===true?say('کد/تنظیمات موجود است','Present'):
            say('نیازمند تکمیل','Not configured'));
        modelStatus.append(item);
      }
      const warning=document.createElement('p');
      warning.textContent=say(
        'وجود این اجزا به معنی اجرای مدل، ممیزی واقعی یا انتشار خبر روی سایت نیست.',
        'Component presence does not prove actual model review or live publication.');
      modelStatus.append(warning);
      // Release flags are NOT live status. Expose exactly which autonomous
      // manager-to-JREI and CMS safety functions are configured without
      // suggesting that source permissions or publication have been granted.
      const automation=readiness.sourceAdministrationAutomation||{};
      const flowTitle=document.createElement('h4');
      flowTitle.textContent=say('وضعیت اتصال خودکار منابع و بازیابی انتشار',
        'Automatic source linking and publisher recovery');
      modelStatus.append(flowTitle);
      for(const [key,faText,enText] of [
        ['approvedSourceAutolinkConfigured',
          'اتصال خودکار منابع تأییدشدهٔ مدیر',
          'Automatic manager-approved source linkage'],
        ['newMonitorAutomaticStartConfigured',
          'شروع خودکار پایشگر جدید، پس از تأیید سیاست اصلی',
          'First-time monitor activation under original policy'],
        ['originalSourceActivationAccepted',
          'مجوز اصلی شروع پایش',
          'Original acquisition activation authorization'],
        ['crashRecoveryModulePackaged',
          'بازیابی صفحات دوزبانه پس از قطع ناگهانی',
          'Signed bilingual publication recovery module']]){
        const line=document.createElement('p');
        line.textContent=(automation[key]===true?'✓ ':'○ ')+
          say(faText,enText)+' — '+
          (automation[key]===true?say('تنظیم/کد آماده','Configured/source present'):
            say('غیرفعال یا آماده‌نشده','Disabled or unavailable'));
        modelStatus.append(line);
      }
      const batch=document.createElement('p');
      const capacity=Number(automation.privatePublisherTickCapacity);
      batch.textContent=say('حد پردازش امن در هر نوبت: ','Bounded per-tick publication capacity: ')+
        (Number.isInteger(capacity)&&capacity>=1&&capacity<=8?
          String(capacity):say('تنظیم‌نشده','Not configured'))+
        say('؛ بدون سهمیهٔ روزانه','; no daily editorial quota');
      modelStatus.append(batch);
      blockerDetails.textContent=messages.length?messages.join(' · '):
        say('اتصال صف بررسی آماده است؛ اتصال ناشر عمومی هنوز اثبات نشده.',
          'Review queue is configured; original publisher acceptance is still missing.');
      integration.append(heading,statusLine,blockerDetails,publishing,modelStatus);
      if(readiness.ownerQueueAccessible!==true){
        show(say('تحریریه هنوز غیرفعال است؛ جزئیات اتصال در همین صفحه نمایش داده شد.',
          'Newsroom remains disabled; integration blockers are shown above.'));
        return false;
      }
      show(say('در حال دریافت نمای یکپارچهٔ صف خصوصی…',
        'Loading the authenticated owner snapshot…'));
      const snapshot=await request('/owner/snapshot',{method:'GET'});
      if(readVersion!==loadRevision)return;
      if(snapshot.schema!=='jr.jrei.news-owner-bounded-snapshot.v1'||
         !snapshot.views||!snapshot.viewStatus)
        throw Error('NEWS_SNAPSHOT_NOT_AUTHENTICATED');
      const readView=(name)=>{
        if(snapshot.viewStatus[name]!=='AVAILABLE'||!snapshot.views[name])
          throw Error('NEWS_SNAPSHOT_SECTION_UNAVAILABLE_'+name);
        return snapshot.views[name];
      };
      const data=readView('queue');
      if(readVersion!==loadRevision)return;
      if(data.schema!=='jr.jrei.news-owner-review-queue.v1'||
        !Array.isArray(data.items))throw Error('NEWS_QUEUE_SHAPE_UNEXPECTED');
      list.replaceChildren();
      metrics.replaceChildren();
      try {
        const overview=readView('overview');
        if(readVersion!==loadRevision)return;
        if(overview.schema==='jr.jrei.news-owner-operations-overview.v1'&&
           overview.metrics){
          const labels={
            enabledMonitors:say('منابع فعال‌شده در تنظیمات','Configured enabled sources'),
            eligibleOriginalSourcesNow:say(
              'منابع فعال با مجوز اصلی معتبر','Enabled sources with current original permissions'),
            pendingEvidenceReview:say('در انتظار بررسی منبع','Awaiting evidence'),
            ownerApprovalQueue:say('پرونده‌های استثنایی نیازمند بررسی','Evidence exceptions requiring review'),
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
        if(readVersion!==loadRevision)return;
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
        const inventory=readView('monitors');
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
                if(await load()!==true)return;
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
                if(await load()!==true)return;
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
        if(readVersion!==loadRevision)return;
        const missing=document.createElement('p');
        missing.textContent=say('فهرست منابع در حال حاضر قابل تأیید نیست.',
          'Source monitor inventory is currently unavailable.');
        sources.append(missing);
      }
      // Only original JREI-KA approved and independently reviewed sources
      // may appear here. Staging creates a DISABLED news monitor, not a
      // crawling job. Owner must explicitly choose a category and priority.
      try{
        const available=readView('available');
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
                if(await load()!==true)return;
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
        if(readVersion!==loadRevision)return;
        const unavailable=document.createElement('p');
        unavailable.textContent=say('منابع واجد شرایط برای ثبت قابل دریافت نیستند.',
          'Eligible original sources are currently unavailable.');
        sources.append(unavailable);
      }
      // A feed headline is unverified metadata. Only an independently
      // owner-approved ORIGINAL JREI article source ID may be bound here.
      try{
        const suggestions=readView('suggestions');
        if(readVersion!==loadRevision)return;
        if(suggestions.schema!=='jr.jrei.news-owner-unbound-articles.v1'||
           !Array.isArray(suggestions.items))
          throw Error('NEWS_ARTICLE_APPROVAL_INBOX_UNAVAILABLE');
        const title=document.createElement('h3');
        title.textContent=say('پیوندهای خبری نیازمند تأیید منبع اصلی',
          'Discovered article links awaiting original source approval');
        articles.append(title);
        for(const candidate of suggestions.items){
          if(typeof candidate.discoveryId!=='string'||
             typeof candidate.proposedArticleUrl!=='string')continue;
          const row=document.createElement('article');
          row.className='ni-admin-unbound-row';
          const headline=document.createElement('strong');
          headline.textContent=candidate.feedClaimedTitle||'';
          const url=document.createElement('p');
          url.textContent=candidate.proposedArticleUrl;
          const note=document.createElement('p');
          note.textContent=say(
            'ابتدا همین نشانی را در دفتر اصلی منابع JREI تأیید کنید؛ سپس شناسه منبع تأییدشده را وارد کنید.',
            'Approve this exact URL in the original JREI source registry first, then enter that source ID.');
          const id=document.createElement('input');
          id.type='text';id.maxLength=36;
          id.autocomplete='off';id.spellcheck=false;
          id.placeholder=say('شناسه منبع اصلی JREI',
            'Approved original JREI source UUID');
          id.setAttribute('aria-label',id.placeholder);
          const bind=document.createElement('button');
          bind.type='button';bind.disabled=true;
          bind.textContent=say('اتصال تأیید منبع','Bind approved original source');
          id.addEventListener('input',()=>{
            bind.disabled=!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id.value.trim());
          });
          bind.addEventListener('click',async()=>{
            bind.disabled=true;
            show(say('در حال تطبیق مجوز مستقل منبع…',
              'Verifying original JREI source approval…'));
            try{
              const receipt=await request('/owner/article/bind',{
                method:'POST',body:JSON.stringify({
                  discoveryId:candidate.discoveryId,
                  originalArticleSourceId:id.value.trim()
                })
              });
              if(receipt.schema!=='jr.jrei.news-original-article-source-bound.v1'||
                 receipt.newsPublished!==false||
                 receipt.articleDownloaded!==false||
                 receipt.discoveryId!==candidate.discoveryId)
                throw Error('NEWS_ARTICLE_BINDING_UNCONFIRMED');
              if(await load()!==true)return;
              show(say('مجوز منبع اصلی متصل شد؛ هیچ مقاله‌ای دانلود یا منتشر نشد.',
                'Original source linked; no article download or publication occurred.'));
            }catch{
              show(say('نتیجه تطبیق تأیید نشد؛ وضعیت واقعی را دوباره دریافت کنید.',
                'Original source binding unconfirmed; refresh authoritative state.'));
            }
          });
          row.append(headline,url,note,id,bind);
          articles.append(row);
        }
        if(!suggestions.items.length){
          const empty=document.createElement('p');
          empty.textContent=say('پیوند نیازمند تأیید جدید وجود ندارد.',
            'No newly discovered article links need review.');
          articles.append(empty);
        }
      }catch{
        if(readVersion!==loadRevision)return;
        const missing=document.createElement('p');
        missing.textContent=say('فهرست پیوندهای نیازمند تأیید در دسترس نیست.',
          'Original article approval inbox unavailable.');
        articles.append(missing);
      }
      // These receipts come only from the ORIGINAL JREI-KA tables. They
      // distinguish a queued download from an actual verified observation.
      // The panel does not start or repeat an acquisition job.
      try{
        const jobs=readView('jobs');
        if(readVersion!==loadRevision)return;
        if(jobs.schema!=='jr.jrei.news-original-jrei-queue-observability.v1'||
           !Array.isArray(jobs.items))
          throw Error('NEWS_ORIGINAL_JREI_QUEUE_UNAVAILABLE');
        const heading=document.createElement('h3');
        heading.textContent=say('صف اصلی جمع‌آوری JREI-KA',
          'Original JREI-KA acquisition activity');
        acquisition.append(heading);
        for(const job of jobs.items.slice(0,30)){
          if(typeof job.jobId!=='string')continue;
          const line=document.createElement('div');
          line.className='ni-admin-acquisition-row';
          const source=document.createElement('strong');
          source.textContent=String(job.sourceTitle??'');
          const state=document.createElement('span');
          state.textContent=say('وضعیت صف اصلی: ','Original queue state: ')+
            String(job.originalJobState??'UNKNOWN');
          const receipt=document.createElement('span');
          receipt.textContent=job.privateObservationReceiptMatches===true?
            say('رسید فایل خصوصی تأیید شد؛ بررسی علمی جداگانه است',
              'Private acquisition digest matched; science review pending'):
            say('دریافت واقعی هنوز با رسید مستقل تأیید نشده',
              'No matching independent acquisition receipt');
          line.append(source,state,receipt);
          acquisition.append(line);
        }
        if(jobs.items.length===0){
          const empty=document.createElement('p');
          empty.textContent=say('کاری از زمان‌بند اصلی ثبت نشده است.',
            'No original acquisition jobs are recorded for these sources.');
          acquisition.append(empty);
        }
      }catch{
        if(readVersion!==loadRevision)return;
        const unknown=document.createElement('p');
        unknown.textContent=say('وضعیت واقعی صف اصلی در دسترس نیست.',
          'Authoritative original JREI queue status is unavailable.');
        acquisition.append(unknown);
      }
      // An APPROVE decision is not a publication. Reconcile separately
      // against the original CMS policy and immutable bilingual routes.
      try{
        const backlog=readView('backlog');
        if(readVersion!==loadRevision)return;
        if(backlog.schema!=='jr.jrei.news-owner-publication-backlog.v1'||
           !Array.isArray(backlog.items))
          throw Error('NEWS_OWNER_PUBLISHING_BACKLOG_UNAVAILABLE');
        const heading=document.createElement('h3');
        heading.textContent=say('پیگیری خبرهای تأییدشده تا انتشار واقعی',
          'Approved stories awaiting original CMS publication');
        publications.append(heading);
        for(const record of backlog.items){
          if(typeof record.revisionId!=='string'||
             typeof record.state!=='string')continue;
          const item=document.createElement('article');
          item.className='ni-admin-publication-row';
          const name=document.createElement('strong');
          name.textContent=String(record.headline??'');
          const state=document.createElement('span');
          state.textContent=record.state==='APPROVED_NOT_STAGED'?
            say('تأیید سردبیری؛ هنوز در صف ناشر ثبت نشده',
              'Editorial approval recorded; CMS queue not yet staged'):
            say('در انتظار رسید انتشار واقعی CMS',
              'Awaiting verified original CMS publication receipt');
          item.append(name,state);
          const preflight=document.createElement('button');
          preflight.type='button';
          preflight.textContent=say('بررسی موانع انتشار','Check publication blockers');
          preflight.addEventListener('click',async()=>{
            preflight.disabled=true;
            const details=document.createElement('p');
            details.setAttribute('role','status');
            details.textContent=say('در حال بررسی وضعیت واقعی منبع و ناشر…',
              'Checking original source and publisher integration…');
            item.append(details);
            try{
              const result=await request('/owner/publication/preflight?revisionId='+
                encodeURIComponent(record.revisionId),{method:'GET'});
              if(result.schema!=='jr.jrei.news-owner-publication-readiness.v1'||
                 result.publisherReady!==false||
                 !Array.isArray(result.blockers))
                throw Error('NEWS_ORIGINAL_PUBLISHER_READINESS_UNKNOWN');
              const reasons=result.blockers.filter(v=>
                typeof v==='string'&&/^[A-Z0-9_]{5,90}$/.test(v)).slice(0,8);
              details.textContent=say(
                'انتشار هنوز مجاز نیست. موانع: ',
                'Publication remains blocked. Gates: ')+reasons.join(' · ');
            }catch{
              details.textContent=say(
                'بررسی وضعیت ناشر فعلاً در دسترس نیست؛ انتشار تأیید نشده.',
                'Publisher preflight unavailable; publication unverified.');
            }finally{preflight.disabled=false;}
          });
          item.append(preflight);
          if(record.state==='APPROVED_NOT_STAGED'){
            const stage=document.createElement('button');
            stage.type='button';
            stage.textContent=say('ثبت در صف ناشر اصلی','Stage original CMS publication');
            stage.addEventListener('click',async()=>{
              stage.disabled=true;
              show(say('در حال بررسی مجوز و ثبت صف انتشار…',
                'Rechecking original publisher approval…'));
              try{
                const receipt=await request('/owner/publication/stage',{
                  method:'POST',body:JSON.stringify({
                    revisionId:record.revisionId
                  })
                });
                if(receipt.schema!=='jr.jrei.news-publishing-stage.v1'||
                   receipt.state!=='WAITING_FOR_PUBLISHER'||
                   receipt.publishedByThisCall!==false||
                   typeof receipt.publicationId!=='string')
                  throw Error('NEWS_PUBLICATION_STAGE_NOT_CONFIRMED');
                if(await load()!==true)return;
                show(say('خبر صرفاً در صف ناشر ثبت شد؛ انتشار عمومی تأیید نشده.',
                  'CMS staging confirmed; public publication remains unverified.'));
              }catch{
                show(say('نتیجه ثبت صف ناشر مشخص نیست؛ وضعیت اصلی را تازه‌سازی کنید.',
                  'CMS stage outcome unknown; refresh the authoritative queue.'));
              }
            });
            item.append(stage);
          }
          publications.append(item);
        }
        if(!backlog.items.length){
          const empty=document.createElement('p');
          empty.textContent=say('مورد تأییدشدهٔ در انتظار انتشار وجود ندارد.',
            'No owner-approved stories await original CMS publication.');
          publications.append(empty);
        }
      }catch{
        if(readVersion!==loadRevision)return;
        const uncertain=document.createElement('p');
        uncertain.textContent=say('صف انتشار اصلی قابل تأیید نیست.',
          'Original CMS publication queue is currently unavailable.');
        publications.append(uncertain);
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
          const previewReadVersion=loadRevision;
          view.disabled=true;
          reviewButtons.forEach(button=>{button.disabled=true;});
          fullPreview.replaceChildren();
          fullPreview.hidden=true;
          show(say('در حال دریافت نسخه کامل…','Loading exact version…'));
          try{
            const data=await request('/owner/preview?revisionId='+
              encodeURIComponent(item.revision_id),{method:'GET'});
            if(previewReadVersion!==loadRevision)return;
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
            if(previewReadVersion===loadRevision)
              show(say('نسخه کامل قابل تأیید نیست. ',
                'Preview is not verified. ')+error.message);
          }finally{
            if(previewReadVersion===loadRevision)view.disabled=false;
          }
        });
        card.append(h,meta,view,fullPreview,actions);list.append(card);
      }
      show(data.items.length?say('پیش‌نویس‌های آماده بازبینی نمایش داده شدند.',
        'Drafts available for owner review are displayed.'):
        say('در حال حاضر پیش‌نویسی در صف نیست.','No drafts awaiting review.'));
      return true;
    }catch(error){
      if(readVersion===loadRevision)
        show(error.message==='NEWS_OWNER_APPROVAL_PENDING'?
          say('تحریریه تا زمان پذیرش نهایی و فعال‌سازی رسمی مدیر غیرفعال است.',
            'Newsroom activation awaits final verified owner acceptance.'):
          say('صف بررسی قابل دریافت نیست. ',
            'Unable to load queue. ')+error.message);
      return false;
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
