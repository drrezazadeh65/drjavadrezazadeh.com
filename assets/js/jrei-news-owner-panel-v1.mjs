/* JREI News — missing owner newsroom module, original MFA session only.
 * It calls ONLY registered /owner/admin-sources endpoints. No browser
 * authority to confirm news accuracy, source reuse rights, crawler status,
 * publication receipt, public content or paid services.
 * Module loading is read-only. Every mutation requires a real owner click.
 */
export function mountNewsOwnerPanel({root,csrfResolver,apiBase,locale='fa'}={}){
  if(!(root instanceof Element)||
     typeof csrfResolver!=='function'||
     apiBase!=='/api/admin/operations/jrei-news')
    throw new Error('JREI_OWNER_NEWS_MOUNT_DENIED');
  const fa=locale!=='en';
  const tr=(a,b)=>fa?a:b;
  const sourceRoot='/owner/admin-sources';
  const labels={
    refresh:tr('بازخوانی وضعیت واقعی','Refresh actual status'),
    workers:tr('ثبت یک‌جای Workerهای خبری در دیتابیس مادر (غیرفعال)',
      'Register all newsroom workers in mother DB (disabled)'),
    seed:tr('ثبت مراجع رسمی شناخته‌شده به‌عنوان منابع بررسی‌نشده',
       'Discover recognized institutions as unreviewed sources'),
    title:tr('نام نهاد صادرکننده','Issuing institution'),
    url:tr('نشانی HTTPS رسمی','Official HTTPS address'),
    category:tr('حوزه','Desk'),
    priority:tr('اولویت پیگیری','Priority'),
    submit:tr('ثبت پیشنهاد منبع','Submit source for review'),
    pending:tr('منبع منتظر بررسی است؛ این اقدام مجوز انتشار نیست.',
       'Source is pending review; this does not grant publication rights.'),
    rights:tr('فقط منابعی که مجوز، منشأ، شواهد و تاریخ اعتبار آن‌ها مستقلاً تأیید شده باشد، در موتور اصلی قابل استفاده‌اند.',
       'Only independently verified source rights, provenance, evidence and current validity can enter the original publishing pipeline.'),
    unavailable:tr('سامانهٔ اصلی ثبت منابع در دسترس نیست؛ هیچ تأییدی فرض نشده است.',
       'Original source registry unavailable; nothing has been approved.'),
    discover:tr('تأیید صرفاً برای ثبت منبع جهت بررسی','Approve discovery only'),
    reconcile:tr('تطبیق با منابع از پیش مجاز JREI','Reconcile already authorized source'),
    disable:tr('غیرفعال‌سازی این منبع','Disable this submission')
  };
  let disposed=false,serial=0,active=null,pending=false;
  const create=(tag,text,cls)=>{const el=document.createElement(tag);
    if(text!==undefined&&text!==null)el.textContent=String(text);
    if(cls)el.className=cls;return el;};
  const makeButton=(label,action)=>{const b=create('button',label,'jr-news-owner-action');
    b.type='button';b.addEventListener('click',action);return b;};
  const notice=create('p','', 'jr-news-owner-state');notice.setAttribute('role','status');
  notice.setAttribute('aria-live','polite');
  const head=create('div',null,'jr-news-owner-toolbar');
  const title=create('h3',tr('مدیریت منابع اصلی JREI News',
    'Original JREI News source administration'));
  const actions=create('div',null,'jr-news-owner-actions');
  const activation=create('section',null,'jr-news-owner-activation');
  activation.setAttribute('aria-label',tr('فعال‌سازی کنترل‌شدهٔ موتور خبر',
      'Controlled newsroom activation'));
  const readiness=create('div',null,'jr-news-owner-readiness');
  const standing=create('div',null,'jr-news-owner-standing');
  const cronStatus=create('div',null,'jr-news-owner-cron-status');
  activation.append(readiness,standing,cronStatus);
  const list=create('div',null,'jr-news-owner-sources');
  const suggestions=create('div',null,'jr-news-owner-suggested');
  const form=create('form',null,'jr-news-owner-source-form');
  const explanatory=create('p',labels.rights,'jr-news-owner-disclosure');
  const field=(label,name,type='text')=>{const shell=create('label');
    shell.append(create('span',label));
    const input=create('input');input.name=name;input.type=type;input.required=true;
    if(type==='url'){input.maxLength=1000;input.placeholder='https://';}
    else input.maxLength=200;
    shell.append(input);return {shell,input};
  };
  const name=field(labels.title,'title');
  const url=field(labels.url,'url','url');
  const category=create('select');
  category.name='category';category.required=true;
  const desks=[
    ['examinations',tr('کنکور و آزمون‌ها','Examinations')],
    ['universities',tr('دانشگاه‌ها','Universities')],
    ['school',tr('مدارس','Schools')],
    ['employment',tr('استخدام','Employment')],
    ['language',tr('زبان','Language')],
    ['international',tr('بین‌الملل','International')],
    ['research',tr('پژوهش','Research')]
  ];
  for(const [v,l] of desks){const opt=create('option',l);opt.value=v;category.append(opt);}
  const categoryLabel=create('label');categoryLabel.append(create('span',labels.category),category);
  const priority=create('select');priority.name='priority';
  for(const p of ['P2','P1','P0']){const opt=create('option',p);opt.value=p;priority.append(opt);}
  const priorityLabel=create('label');priorityLabel.append(create('span',labels.priority),priority);
  const submit=create('button',labels.submit);submit.type='submit';
  form.append(name.shell,url.shell,categoryLabel,priorityLabel,submit);
  function state(message){if(!disposed)notice.textContent=message;}
  function safeOrigin(value){
    if(typeof value!=='string'||value.length>1000)return null;
    try{const u=new URL(value);
      if(u.protocol!=='https:'||u.username||u.password||u.hash||
         u.port&&u.port!=='443'||!/^[a-z0-9.-]+$/i.test(u.hostname)||
         !u.hostname.includes('.')||/^(?:localhost|.+\.localhost|.+\.internal|.+\.local)$/i.test(u.hostname)||
         /^(?:\d{1,3}\.){3}\d{1,3}$/.test(u.hostname))return null;
      return u.href;
    }catch{return null;}
  }
  async function request(route,body){
    if(disposed)throw Error('PANEL_UNMOUNTED');
    if(pending)throw Error('REQUEST_IN_PROGRESS');
    const csrf=csrfResolver();
    if(typeof csrf!=='string'||!/^[a-f0-9]{64}$/i.test(csrf))
      throw Error('JREI_OWNER_SESSION_REQUIRED');
    const id=++serial;
    active?.abort();
    const abort=new AbortController();active=abort;pending=true;
    try{
      const headers={'Accept':'application/json','X-CSRF-Token':csrf};
      const opt={method:body?'POST':'GET',headers,credentials:'same-origin',
        cache:'no-store',redirect:'error',signal:abort.signal};
      if(body){headers['Content-Type']='application/json';opt.body=JSON.stringify(body);}
      const resp=await fetch(apiBase+route,opt);
      if(!resp.ok)throw Error('OWNER_NEWS_NOT_AVAILABLE');
      const data=await resp.json();
      if(!data||typeof data!=='object'||Array.isArray(data)||
         id!==serial||disposed)throw Error('STALE_OWNER_NEWS_RESPONSE');
      return data;
    }finally{
      if(active===abort)active=null;
      pending=false;
    }
  }
  // Original read-only SUPER_ADMIN/MFA integration status. This is metadata
  // from the real mother DB, not a claim of actual Cron execution, publication
  // rights, AI drafting or public release. No speculative success defaults.
  function drawReadiness(data){
    if(data?.schema!=='jr.jrei.news-owner-integration-readiness.v1')
      throw Error('JREI_NEWS_READINESS_CONTRACT');
    readiness.replaceChildren(create('h4',tr('پیش‌نیازهای موتور خبری',
      'News engine release prerequisites')));
    const signals=[
      [data.schemaMetadataProbeSucceeded===true,
        tr('بررسی ساختار دیتابیس مادر','Mother-DB schema metadata')],
      [data.requiredMotherSchemaAvailable===true,
        tr('جدول‌ها و قیود مصوب خبر','Reviewed news tables and constraints')],
      [data.standingOfficialPolicySchemaAvailable===true,
        tr('ساختار مجوز دائمی انتشار رسمی','Standing official publication policy schema')],
      [data.packagedPrivateNewsLibraryAvailable===true,
        tr('بستهٔ خصوصی موتور خبر','Private newsroom engine package')],
      [data.integratedReleaseAccepted===true,
        tr('تأیید انتشار یکپارچه','Integrated release acceptance')],
      [data.explicitOriginalApiFlagEnabled===true,
        tr('درگاه اصلی خبر','Original news API gate')],
      [data.firstPartyModelAndEvidencePortReadiness?.originalCmsPublishingPipelinePackaged===true,
        tr('پایپ‌لاین CMS اصلی','Original CMS publication pipeline')]
    ];
    const ul=create('ul',null,'jr-news-owner-preflight-list');
    for(const [ok,label] of signals)ul.append(
      create('li',(ok?'✓ ':'× ')+label,ok?'jr-news-ready':'jr-news-held')
    );
    readiness.append(ul);
    const actual=Number.isInteger(data.verifiedMotherTableCount)
      ?data.verifiedMotherTableCount:null;
    const expected=Number.isInteger(data.requiredMotherTableCount)
      ?data.requiredMotherTableCount:null;
    if(actual!==null&&expected!==null)readiness.append(create('p',
      tr('جدول‌های تأییدشده: ','Verified tables: ')+actual+' / '+expected));
    if(data.schemaBlockers&&typeof data.schemaBlockers==='object'&&
      !Array.isArray(data.schemaBlockers)){
      const tableNames=Object.keys(data.schemaBlockers).slice(0,20);
      if(tableNames.length)readiness.append(create('p',tr(
        'موارد نیازمند اصلاح ساختار: ','Schema review needed for: ')+
        tableNames.join(' · ')));
    }
    readiness.append(create('p',tr(
      'این بررسی، اجرای Cron، کسب مجوز منبع یا انتشار خبر را تأیید نمی‌کند.',
      'This view does not attest host Cron runs, source licences, or real publication.'
    ),'jr-news-owner-disclosure'));
    return data.standingOfficialPolicySchemaAvailable===true;
  }
  function drawStanding(data){
    if(data?.schema!=='jr.jrei.news-owner-standing-policies.v1'||
      !Array.isArray(data.policies))throw Error('JREI_NEWS_POLICY_CONTRACT');
    standing.replaceChildren(create('h4',tr(
      'مجوز دائمی انتشار اطلاعیه‌های رسمی تأییدشده',
      'Standing consent for independently verified official notices')));
    const now=Math.floor(Date.now()/1000);
    const activePolicies=data.policies.filter(row=>
      row?.revoked_at===null && Number(row.effective_at)<=now &&
      Number(row.expires_at)>now && /^[a-f0-9-]{36}$/i.test(String(row.policy_id||'')));
    standing.append(create('p',activePolicies.length?tr(
      'مجوز معتبر در دیتابیس ثبت شده است؛ فعال‌بودن انتشار باید جداگانه احراز شود.',
      'A mother-DB authorization exists; live publishing still requires separate evidence.'
    ):tr(
      'مجوز فعالی ثبت نشده است؛ اخبار حتی با منبع معتبر خودکار منتشر نمی‌شوند.',
      'No active standing policy is recorded; verified sources alone cannot auto-publish.'
    )));
    const grant=makeButton(tr('ثبت مجوز ۹۰روزهٔ انتشار خودکار فقط منابع رسمی احراز‌شده',
      'Authorize 90-day publication of independently verified official notices'),()=>{
      if(disposed||pending)return;
      const sure=window.confirm(tr(
        'مجوز ثبت شود؟ این مجوز فقط اطلاعیه‌های رسمی با شواهد، حقوق نشر، بررسی مستقل و رسید CMS معتبر را شامل می‌شود؛ حق انتشار خبر تأییدنشده ایجاد نمی‌کند.',
        'Record standing consent? Only independently verified, licensed official notices with valid CMS receipts qualify; no unverified news is authorized.'
      ));
      if(!sure)return;
      mutateStanding('/owner/standing-policy/grant',{
        confirmation:'AUTHORIZE_VERIFIED_PRIMARY_OFFICIAL_NEWS',durationDays:90
      });
    });
    if(activePolicies.length===0)standing.append(grant);
    for(const row of activePolicies.slice(0,4)){
      const revoke=makeButton(tr('لغو مجوز و جلوگیری از انتشار جدید',
        'Revoke standing consent; prevent new publications'),()=>{
        if(disposed||pending)return;
        if(!window.confirm(tr('مجوز دائمی برای انتشارهای آتی لغو شود؟',
            'Revoke this policy for future publications?')))return;
        mutateStanding('/owner/standing-policy/revoke',{policyId:row.policy_id});
      });
      standing.append(revoke);
    }
  }
  async function mutateStanding(route,body){
    if(disposed||pending)return;
    state(tr('در حال ثبت دستور محدود در دیتابیس مادر…',
      'Recording bounded authorization in mother database…'));
    try{
      const result=await request(route,body);
      if(!result||!(result.schema==='jr.jrei.news-standing-policy-receipt.v1'||
          result.revoked===true))throw Error('NEWS_STANDING_MUTATION_NOT_CONFIRMED');
      state(tr('رسید ثبت شد. بررسی‌های مستقل منابع و انتشار همچنان الزامی است.',
        'Authorization receipt recorded. Independent source and publication gates remain mandatory.'));
      await load();
    }catch{error();}
  }
  async function loadCronReadiness(){
    cronStatus.replaceChildren(create('h4',tr(
      'کارکرد واقعی Cron و Workerهای خبری',
      'Actual Cron and newsroom worker runtime')));
    const csrf=csrfResolver();
    if(typeof csrf!=='string'||!/^[a-f0-9]{64}$/i.test(csrf)){
      cronStatus.append(create('p',tr(
        'نشست امن مدیریت در دسترس نیست.', 'Owner MFA session is unavailable.')));
      return;
    }
    try{
      const response=await fetch('/api/admin/operations/cron-master',{
        method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',
        headers:{Accept:'application/json','X-CSRF-Token':csrf}
      });
      if(!response.ok)throw Error('NEWS_CRON_OWNER_QUERY_FAILED');
      const data=await response.json();
      if(disposed)return;
      if(data?.schema!=='jr.operations-cron-owner.v1'||!Array.isArray(data.jobs))
        throw Error('NEWS_CRON_CONTRACT_MISMATCH');
      const jobs=data.jobs.filter(row=>typeof row?.jobId==='string'&&
        row.jobId.startsWith('jrei_news_original_'));
      const registered=jobs.filter(row=>row.registered===true).length;
      const enabled=jobs.filter(row=>row.enabled===true).length;
      const completed=jobs.filter(row=>row.lastState==='success'||
        row.lastState==='SUCCESS').length;
      const messages=[
        [data.schemaReady===true,tr('ساختار Cron','Cron mother schema')],
        [data.masterEnabled===true,tr('مجوز اجرای Cron اصلی','Original Cron master switch')],
        [data.serverCronVerified===true,tr('اجرای Cron برتینا احراز شده','Bertina Cron execution attested')],
        [registered===jobs.length&&jobs.length>0,
          tr('همهٔ Workerهای خبر ثبت شده‌اند','All news workers registered')]
      ];
      const list=create('ul',null,'jr-news-owner-preflight-list');
      for(const [ok,title] of messages)list.append(create('li',
        (ok?'✓ ':'× ')+title,ok?'jr-news-ready':'jr-news-held'));
      cronStatus.append(list,create('p',tr(
        'Workerهای ثبت‌شده/فعال: ','Registered/enabled workers: ')+
        registered+' / '+enabled+' ('+jobs.length+tr(' کل',' total')+')'));
      const rows=create('ul');
      for(const job of jobs){
        const last=job.lastFinishedAt===null?
          tr('هرگز ثبت نشده','not recorded'):
          new Date(Number(job.lastFinishedAt)*1000).toLocaleString(fa?'fa-IR':'en-GB');
        rows.append(create('li',String(job.jobId)+
          ' · '+(job.enabled?'ON':'OFF')+
          ' · '+String(job.lastState||'UNKNOWN')+
          ' · '+last));
      }
      cronStatus.append(rows);
      cronStatus.append(create('p',tr(
        'تعداد Workerهای دارای نتیجهٔ موفقِ ثبت‌شده: ',
        'Workers with a recorded success state: ')+completed));
      cronStatus.append(create('p',tr(
        'پایگاه داده ممکن است آخرین اجرای موفق را نشان دهد؛ این به‌تنهایی اثبات انتشار مقاله نیست.',
        'A recorded Cron success does not prove a real published article or rights clearance.'
      ),'jr-news-owner-disclosure'));
    }catch{
      if(!disposed)cronStatus.append(create('p',tr(
        'وضعیت Cron قابل استعلام نیست؛ اجرای آن تأیید نمی‌شود.',
        'Cron state unavailable; runtime activation is not attested.'
      )));
    }
  }
  async function loadActivation(){
    if(disposed||pending)return;
    readiness.replaceChildren(create('p',tr(
      'در حال بررسی آمادگی واقعی موتور خبر…','Reading actual newsroom readiness…')));
    standing.replaceChildren();
    try{
      const data=await request('/owner/integration-readiness');
      if(disposed)return;
      const canRead=drawReadiness(data);
      if(!canRead){
        standing.append(create('p',tr(
          'جدول مجوز انتشار رسمی هنوز تأیید نشده؛ فعال‌سازی ممنوع است.',
          'Standing authorization schema is unverified; activation is blocked.'
        )));
        return;
      }
      const policies=await request('/owner/standing-policy');
      if(!disposed)drawStanding(policies);
    }catch{
      if(!disposed)readiness.replaceChildren(create('p',tr(
        'آمادگی واقعی قابل استعلام نیست؛ هیچ مرحله‌ای فعال فرض نمی‌شود.',
        'Readiness is unavailable; no component is presumed active.'
      )));
    }
  }
  function error(){state(labels.unavailable);}
  async function mutation(route,body){
    if(disposed||pending)return;
    state(tr('در حال ثبت درخواست در دیتابیس اصلی…',
      'Writing the requested action to the original database…'));
    try{
      await request(route,body);
      state(labels.pending);
      await load();
    }catch{error();}
  }
  async function registerWorkersDisabled(){
    if(disposed||pending)return;
    const csrf=csrfResolver();
    if(typeof csrf!=='string'||!/^[a-f0-9]{64}$/i.test(csrf)){
      error();return;
    }
    pending=true;
    const abort=new AbortController();active=abort;
    state(tr('در حال ثبت Workerهای اخبار در Cron اصلی، بدون اجرای آن‌ها…',
       'Registering disabled news workers in the original Cron…'));
    try{
      const response=await fetch('/api/admin/operations/cron-master',{
        method:'POST',credentials:'same-origin',redirect:'error',
        cache:'no-store',signal:abort.signal,
        headers:{Accept:'application/json','Content-Type':'application/json',
          'X-CSRF-Token':csrf},
        body:JSON.stringify({action:'register_news_bundle',
          confirmation:'REGISTER_NEWS_WORKERS_DISABLED'})
      });
      if(!response.ok)throw Error('CRON_MASTER_UNAVAILABLE');
      const result=await response.json();
      if(disposed||result?.ok!==true||
         result?.allNewsWorkersInitiallyDisabled!==true)
        throw Error('CRON_WORKERS_NOT_CONFIRMED');
      state(tr('Workerهای خبری در دیتابیس اصلی ثبت شدند اما غیرفعال‌اند؛ فعال‌سازی نیازمند تأیید منابع و مجوزهای موتور است.',
         'News workers registered but remain disabled until source rights and engine policy are approved.'));
    }catch{error();}
    finally{if(active===abort)active=null;pending=false;}
  }
  function drawEntries(rows){
    list.replaceChildren(create('h4',tr('منابع ثبت‌شده','Registered source suggestions')));
    if(!rows.length){
      list.append(create('p',tr('هنوز پیشنهادی ثبت نشده است.',
        'No source suggestions have been recorded.')));return;
    }
    const ul=create('ul');
    for(const item of rows.slice(0,50)){
      if(!item||typeof item!=='object')continue;
      const id=String(item.submission_id||'');
      if(!/^[0-9a-f-]{36}$/i.test(id))continue;
      const li=create('li',null,'jr-news-owner-source');
      const heading=create('strong',String(item.source_title||'').slice(0,220));
      const source=safeOrigin(item.source_url);
      li.append(heading);
      if(source){const a=create('a',source);a.href=source;a.target='_blank';
        a.rel='noopener noreferrer external';li.append(a);}
      li.append(create('small',String(item.submission_state||'UNKNOWN').slice(0,60)));
      const commands=create('div',null,'jr-news-owner-source-actions');
      const status=String(item.submission_state||'');
      if(status==='PENDING_ADMIN_APPROVAL'){
        commands.append(makeButton(labels.discover,()=>{
          mutation(sourceRoot+'/approve',{
            submissionId:id,confirmation:'APPROVE_OFFICIAL_SOURCE_DISCOVERY'
          });
        }));
      }
      if(status==='APPROVED_DISCOVERY'||status==='APPROVED_SOURCE_PENDING_POLICY'){
        commands.append(makeButton(labels.reconcile,()=>{
          mutation(sourceRoot+'/reconcile',{submissionId:id});
        }));
      }
      if(status!=='DISABLED'){
        commands.append(makeButton(labels.disable,()=>{
          mutation(sourceRoot+'/disable',{submissionId:id});
        }));
      }
      li.append(commands);ul.append(li);
    }
    list.append(ul);
  }
  function drawSuggested(rows){
    suggestions.replaceChildren(create('h4',tr('فهرست اولیهٔ مراجع رسمی',
      'Suggested primary institutions')));
    if(!rows.length)return;
    const ul=create('ul');
    for(const item of rows.slice(0,30)){
      if(!item||typeof item!=='object'||
        !/^[A-Za-z0-9._:-]{3,100}$/.test(String(item.institutionId||'')))continue;
      const li=create('li');
      li.append(create('span',String(fa?item.titleFa:item.titleEn||item.titleFa||'').slice(0,180)));
      const origin=safeOrigin(item.origin);
      if(origin){const a=create('a',tr('وب‌سایت رسمی','Official website'));
        a.href=origin;a.target='_blank';a.rel='noopener noreferrer external';li.append(a);}
      li.append(makeButton(labels.discover,()=>{
        mutation(sourceRoot+'/suggested-approve',{
          institutionId:String(item.institutionId),
          confirmation:'APPROVE_OFFICIAL_SOURCE_DISCOVERY'
        });
      }));
      ul.append(li);
    }
    suggestions.append(ul);
  }
  async function load(){
    if(disposed||pending)return;
    state(tr('در حال خواندن اطلاعات واقعی منابع…','Loading original source records…'));
    try{
      const result=await request(sourceRoot);
      if(result.schema!=='jr.jrei.news-admin-source-list.v1'||
         !Array.isArray(result.entries)||!Array.isArray(result.suggestedInstitutions))
        throw Error('SOURCE_SCHEMA_INVALID');
      drawEntries(result.entries);drawSuggested(result.suggestedInstitutions);
      await loadActivation();
      await loadCronReadiness();
      state(tr('نمایش وضعیت واقعی از دیتابیس مادر؛ این فهرست تأیید حقوق انتشار نیست.',
        'Actual mother-DB records; these entries do not constitute publishing licences.'));
    }catch{error();}
  }
  const refresh=makeButton(labels.refresh,load);
  const seed=makeButton(labels.seed,()=>{
    mutation(sourceRoot+'/seed-official',{confirmation:'DISCOVER_KNOWN_OFFICIAL_ORIGINS'});
  });
  const registerWorkers=makeButton(labels.workers,registerWorkersDisabled);
  actions.append(refresh,seed,registerWorkers);head.append(title,actions);
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const official=safeOrigin(url.input.value.trim());
    if(!official){state(tr('لینک رسمی باید HTTPS و عمومی باشد.',
      'Source must be a public official HTTPS address.'));return;}
    mutation(sourceRoot+'/submit',{
      title:name.input.value.trim(),url:official,
      category:category.value,priority:priority.value
    });
  });
  root.append(head,activation,explanatory,notice,form,list,suggestions);
  return {load,unmount(){
    disposed=true;serial++;active?.abort();active=null;
    root.replaceChildren();
  }};
}
