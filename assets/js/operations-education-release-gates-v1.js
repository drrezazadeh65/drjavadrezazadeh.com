/* JR owner educational release PREPARATION ledger — 12 offers x 6 gates.
 * The source of truth is the private Bertina mother DB, read after each
 * explicit owner edit under fresh MFA. No activation, checkout, claims or PII.
 */
(() => {
  'use strict';
  const host=document.getElementById('ops-education-offers');
  const workspace=document.getElementById('ops-workspace');
  const root=host?.querySelector('[data-edu-release-preparation]');
  if(!host||!workspace||!root)return;
  const en=document.documentElement.lang==='en';
  const T=(fa,eng)=>en?eng:fa;
  const $=part=>root.querySelector('[data-edu-release-'+part+']');
  const refresh=$('refresh'),exportCsv=$('export'),summary=$('summary'),cards=$('cards'),form=$('form');
  const offerSelect=$('offer'),gateSelect=$('gate'),review=$('state');
  const note=$('note'),digest=$('digest'),save=$('save'),status=$('status');
  if(!refresh||!exportCsv||!summary||!cards||!form||!offerSelect||!gateSelect||
    !review||!note||!digest||!save||!status)return;
  const number=new Intl.NumberFormat(en?'en-US':'fa-IR');
  const STATES=['NOT_STARTED','IN_PROGRESS','NEEDS_REVISION','READY_FOR_REVIEW'];
  const STATE_LABELS={
    NOT_STARTED:T('شروع نشده','Not started'),
    IN_PROGRESS:T('در حال انجام','In progress'),
    NEEDS_REVISION:T('نیازمند اصلاح','Needs revision'),
    READY_FOR_REVIEW:T('منتظر بازبینی مستقل','Pending independent review'),
    NOT_APPLICABLE:T('برای خدمت رایگان مطرح نیست','Not applicable to free service')
  };
  let controller=null,busy=false,serial=0,observed=null,rows=new Map();
  const active=()=>!workspace.hidden&&host.open&&!document.hidden;
  const element=(tag,cls,value)=>{
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(value!==undefined)n.textContent=String(value);
    return n;
  };
  const entryKey=(offerId,gateCode)=>offerId+'|'+gateCode;
  function editable(allowed){
    for(const input of [offerSelect,gateSelect,review,note,digest])
      input.disabled=!allowed;
    save.disabled=!allowed;
  }
  function reset(){
    ++serial;controller?.abort();controller=null;
    observed=null;rows=new Map();busy=false;refresh.disabled=false;
    exportCsv.disabled=true;
    editable(false);
    cards.replaceChildren();offerSelect.replaceChildren();gateSelect.replaceChildren();
    summary.textContent='';
    status.textContent=T('هنوز گزارش آماده‌سازی خدمات دریافت نشده است.',
      'No preparation data has been requested.');
  }
  async function fetchOverview(signal){
    const response=await fetch('/api/admin/operations/educational-release-gates',{
      method:'GET',credentials:'same-origin',cache:'no-store',
      headers:{Accept:'application/json'},signal
    });
    if(!response.ok)throw Error(response.status===403?'MFA':'UNAVAILABLE');
    const data=await response.json();
    if(data?.ok!==true||data.schema!=='jr.education-release-gate-owner.v1'||
      data.canActivate!==false||data.canPublish!==false||
      data.actualBankSettlementVerified!==false||
      data.entitlementsLive!==false||data.sourceDataOnly!==true||
      !Number.isSafeInteger(data.sourceOfferCount)||
      data.sourceOfferCount<1||data.sourceOfferCount>30||
      !Array.isArray(data.drafts)||
      data.drafts.length>180||data.drafts.length===0||
      typeof data.storageAvailable!=='boolean'||
      data.drafts.some(item=>!item||
        typeof item.offerId!=='string'||typeof item.gateCode!=='string'||
        typeof item.offerNameFa!=='string'||typeof item.offerNameEn!=='string'||
        typeof item.gateNameFa!=='string'||typeof item.gateNameEn!=='string'||
        typeof item.requirementFa!=='string'||typeof item.requirementEn!=='string'||
        typeof item.applicable!=='boolean'||
        item.customerServiceActivated!==false||
        item.independentlyValidated!==false||
        !Number.isSafeInteger(item.revision)||item.revision<0))
      throw Error('INVALID_SOURCE');
    return data;
  }
  function drawOfferCards(){
    cards.replaceChildren();
    const grouped=new Map();
    for(const entry of rows.values()){
      if(!grouped.has(entry.offerId)){
        grouped.set(entry.offerId,{
          label:en?entry.offerNameEn:entry.offerNameFa,
          freeIntro:entry.freeIntro,states:[]
        });
      }
      grouped.get(entry.offerId).states.push(entry);
    }
    for(const [id,item] of grouped){
      const applicable=item.states.filter(v=>v.applicable);
      const ready=applicable.filter(v=>v.state==='READY_FOR_REVIEW').length;
      const revision=applicable.filter(v=>v.state==='NEEDS_REVISION').length;
      const card=element('article','jr-edu-release__card');
      card.append(element('strong','jr-edu-release__title',item.label));
      card.append(element('small','jr-edu-release__code',id));
      const chip=element('p','jr-edu-release__progress',
        T('برای بازبینی آماده: ','Prepared for review: ')+
        number.format(ready)+' / '+number.format(applicable.length));
      card.append(chip);
      if(revision)card.append(element('p','jr-edu-release__attention',
        T('بخش‌های نیازمند اصلاح: ','Needs revision: ')+number.format(revision)));
      card.append(element('p','jr-edu-release__notice',
        T('بازبینی مستقل و اجازه انتشار: تأیید نشده',
          'Independent approval and publication: NOT GRANTED')));
      const jump=element('button','jr-edu-release__jump',T(
        'مدیریت این بسته','Edit preparation'));
      jump.type='button';
      jump.addEventListener('click',()=>{
        if(!observed)return;
        offerSelect.value=id;renderGates();
        form.scrollIntoView({block:'start',behavior:'auto'});
        gateSelect.focus({preventScroll:true});
      });
      card.append(jump);cards.append(card);
    }
  }
  function renderGates(){
    const selected=offerSelect.value;
    const available=[...rows.values()].filter(item=>
      item.offerId===selected&&item.applicable);
    const old=gateSelect.value;
    gateSelect.replaceChildren();
    for(const item of available){
      const option=element('option',null,
        (en?item.gateNameEn:item.gateNameFa)+' · '+
        (STATE_LABELS[item.state]||item.state));
      option.value=item.gateCode;gateSelect.append(option);
    }
    if(available.some(item=>item.gateCode===old))gateSelect.value=old;
    renderEditor();
  }
  function renderEditor(keepStatus=false){
    const selected=rows.get(entryKey(offerSelect.value,gateSelect.value));
    if(!selected||!selected.applicable){
      editable(false);
      if(!keepStatus)status.textContent=T('بخش قابل ویرایش انتخاب نشده است.',
        'Select a preparation area to edit.');
      return;
    }
    review.value=STATES.includes(selected.state)?selected.state:'NOT_STARTED';
    note.value=selected.ownerNote||'';
    digest.value=selected.evidenceReferenceSha256||'';
    save.dataset.revision=String(selected.revision);
    editable(observed?.storageAvailable===true&&observed.canEdit===true&&!busy);
    if(!keepStatus){
      status.textContent=(en?selected.requirementEn:selected.requirementFa)+' '+
        T('این وضعیت فقط یادداشت مدیر است و اجازه فروش ایجاد نمی‌کند.',
          'This is owner preparation, not permission to sell.');
    }
  }
  function draw(data){
    observed=data;
    exportCsv.disabled=false;
    rows=new Map(data.drafts.map(entry=>[
      entryKey(entry.offerId,entry.gateCode),entry
    ]));
    const previously=offerSelect.value;
    offerSelect.replaceChildren();
    const unique=new Set();
    for(const entry of data.drafts){
      if(unique.has(entry.offerId))continue;
      unique.add(entry.offerId);
      const option=element('option',null,
        en?entry.offerNameEn:entry.offerNameFa);
      option.value=entry.offerId;offerSelect.append(option);
    }
    if(unique.has(previously))offerSelect.value=previously;
    summary.textContent=T('پیشنهادهای واقعی در فهرست: ','Listed proposals: ')+
      number.format(data.sourceOfferCount)+' · '+
      T('بخش‌های آماده برای بازبینی مستقل: ','Prepared for independent review: ')+
      number.format(data.ownerMarkedReadyForReview)+' / '+
      number.format(data.applicablePreparationGates)+' · '+
      T('مجوز انتشار: صادر نشده','Publication authority: NOT GRANTED');
    drawOfferCards();renderGates();
    if(!data.storageAvailable){
      editable(false);
      status.textContent=T(
        'ثبت پیشرفت در دیتابیس مادر هنوز آماده نیست. فهرست برنامه از منبع خوانده می‌شود ولی ذخیره فعال نشده است.',
        'The additive mother-database ledger is not provisioned. Planning requirements are readable; saving is unavailable.');
    }
  }
  async function load(){
    if(!active()||busy)return false;
    const generation=++serial;controller?.abort();
    controller=new AbortController();busy=true;refresh.disabled=true;
    editable(false);
    status.textContent=T('در حال دریافت پیشرفت واقعی از دیتابیس مادر…',
      'Reading real owner preparation from the mother database…');
    try{
      const value=await fetchOverview(controller.signal);
      if(generation!==serial||!active())return false;
      busy=false;draw(value);return true;
    }catch(error){
      if(generation!==serial||error?.name==='AbortError')return false;
      observed=null;rows.clear();editable(false);exportCsv.disabled=true;
      cards.replaceChildren();summary.textContent='';
      status.textContent=error?.message==='MFA'
        ?T('برای مشاهده و تغییر وضعیت، کد دومرحله‌ای معتبر مدیر لازم است.',
          'Recent administrator MFA is required.')
        :T('اطلاعات منبع قابل تأیید نیست. هیچ بخشی آماده یا فعال فرض نمی‌شود.',
          'Source unavailable. No preparation or activation is assumed.');
      return false;
    }finally{
      if(generation===serial){
        busy=false;controller=null;refresh.disabled=false;
        if(observed)renderEditor(true);
      }
    }
  }
  async function ownerSession(signal){
    const response=await fetch('/api/admin/operations/session',{
      credentials:'same-origin',cache:'no-store',
      headers:{Accept:'application/json'},signal
    });
    if(!response.ok)throw Error('MFA');
    const data=await response.json();
    if(data?.ok!==true||data.mfaRequired!==false||
      !/^[a-f0-9]{64}$/i.test(data.csrfToken||''))
      throw Error('MFA');
    return data.csrfToken;
  }
  exportCsv.addEventListener('click',()=>{
    if(!active()||!observed||busy||!Array.isArray(observed.drafts))return;
    const columns=[
      'offer_id','offer_name','preparation_gate','preparation_name',
      'requirement','owner_work_state','evidence_reference_recorded',
      'revision','independently_approved','publicly_purchasable'
    ];
    // Every field derives from allowlisted, MFA-authorized proposal metadata.
    // Do not export owner notes, PII, financial records or source documents.
    const safeCell=value=>{
      let v=String(value??'');
      // Prevent Excel/LibreOffice formula injection from untrusted metadata.
      if(/^\s*[=+\-@]/.test(v))v="'"+v;
      return '"'+v.replaceAll('"','""')+'"';
    };
    const rowsForFile=[columns.map(safeCell).join(',')];
    for(const item of observed.drafts){
      rowsForFile.push([
        item.offerId,
        en?item.offerNameEn:item.offerNameFa,
        item.gateCode,
        en?item.gateNameEn:item.gateNameFa,
        en?item.requirementEn:item.requirementFa,
        item.state,
        item.evidenceReferenceRecorded===true?'YES':'NO',
        item.revision,
        'NOT_VERIFIED','NOT_PURCHASABLE'
      ].map(safeCell).join(','));
    }
    const content='\uFEFF'+rowsForFile.join('\r\n')+'\r\n';
    const blob=new Blob([content],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='jr-education-12-offer-owner-worklist-NOT-APPROVED.csv';
    a.hidden=true;document.body.append(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),10000);
    status.textContent=T(
      'کاربرگ مرحله‌بندی ۱۲ خدمت آماده دریافت است؛ هیچ وضعیت آن به معنی تأیید علمی یا اجازه فروش نیست.',
      'The owner worklist is ready. No entry grants scientific approval or permission to sell.'
    );
  });
  refresh.addEventListener('click',load);
  offerSelect.addEventListener('change',renderGates);
  gateSelect.addEventListener('change',()=>renderEditor());
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy||!active()||observed?.storageAvailable!==true||
      observed.canEdit!==true||save.disabled)return;
    const id=offerSelect.value,gate=gateSelect.value;
    const selected=rows.get(entryKey(id,gate));
    const state=review.value;
    const text=note.value.trim(),sha=digest.value.trim().toLowerCase();
    const revision=Number(save.dataset.revision);
    if(!selected||!selected.applicable||!STATES.includes(state)||
      !Number.isSafeInteger(revision)||revision<0||
      text.length>350||(state==='READY_FOR_REVIEW'&&!text)||
      (sha.length>0&&!/^[a-f0-9]{64}$/.test(sha))){
      status.textContent=T('وضعیت، توضیح یا اثرانگشت سند معتبر نیست.',
        'Status, note or evidence digest is invalid.');
      return;
    }
    const generation=++serial;controller?.abort();
    controller=new AbortController();busy=true;refresh.disabled=true;editable(false);
    status.textContent=T('در حال ذخیره پیشرفت مدیر پس از بررسی احراز دومرحله‌ای…',
      'Saving preparation after fresh MFA verification…');
    try{
      const csrf=await ownerSession(controller.signal);
      if(generation!==serial||!active())return;
      const response=await fetch('/api/admin/operations/educational-release-gates',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json','Content-Type':'application/json',
          'X-CSRF-Token':csrf},signal:controller.signal,
        body:JSON.stringify({
          offerId:id,gateCode:gate,reviewState:state,
          expectedRevision:revision,ownerNote:text,
          evidenceReferenceSha256:sha||null
        })
      });
      if(!response.ok)throw Error(response.status===409?'CONFLICT':'NOT_SAVED');
      const write=await response.json();
      if(generation!==serial||!active())return;
      if(write?.ok!==true||
        write.schema!=='jr.education-release-gate-change.v1'||
        write.offerId!==id||write.gateCode!==gate||
        write.revision!==revision+1||
        write.canActivate!==false||write.canPublish!==false||
        write.checkoutEnabled!==false)
        throw Error('UNCONFIRMED');
      const fresh=await fetchOverview(controller.signal);
      if(generation!==serial||!active())return;
      const updated=fresh.drafts.find(item=>
        item.offerId===id&&item.gateCode===gate);
      if(!updated||updated.revision!==write.revision||
        updated.state!==state||updated.ownerNote!==text||
        updated.evidenceReferenceSha256!==(sha||null))
        throw Error('REREAD_MISMATCH');
      busy=false;draw(fresh);
      offerSelect.value=id;renderGates();gateSelect.value=gate;
      renderEditor(true);
      status.textContent=T(
        'پیشرفت از دیتابیس مادر دوباره خوانده و تأیید شد؛ فروش و انتشار همچنان غیرفعال هستند.',
        'Owner preparation was independently reread from the mother database. Sales and publication remain OFF.'
      );
    }catch(error){
      if(generation!==serial||error?.name==='AbortError')return;
      status.textContent=error?.message==='CONFLICT'
        ?T('این بخش هم‌زمان تغییر کرده است؛ اطلاعات را بازخوانی و سپس ذخیره کنید.',
          'This gate changed concurrently. Refresh before saving again.')
        :T('ذخیره یا بازخوانی مستقل تأیید نشد. موفقیت فرض نمی‌شود؛ پیش از ادامه وضعیت را بازخوانی کنید.',
          'Save or independent reread was not confirmed. Refresh before proceeding.');
      observed=null;editable(false);
    }finally{
      if(generation===serial){
        busy=false;controller=null;refresh.disabled=false;
        if(observed)renderEditor(true);
      }
    }
  });
  host.addEventListener('toggle',()=>{
    if(host.open)load();else reset();
  });
  const watcher=new MutationObserver(()=>{if(workspace.hidden)reset();});
  watcher.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.addEventListener('pagehide',()=>{reset();watcher.disconnect();},{once:true});
  reset();
})();