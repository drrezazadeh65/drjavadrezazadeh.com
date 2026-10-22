/* V5 owner commerce monitor; private no-store GET only, no payment initiation. */
(()=>{
  'use strict';
  const panel=document.getElementById('ops-commerce');
  if(!panel)return;
  const en=document.documentElement.lang==='en';
  const text=(fa,eng)=>en?eng:fa;
  const status=document.getElementById('ops-commerce-status');
  const results=document.getElementById('ops-commerce-results');
  const refresh=document.getElementById('ops-commerce-refresh');
  const workspace=document.getElementById('ops-workspace');
  const readiness=document.createElement('section');
  readiness.className='ops-grid';
  readiness.setAttribute('aria-label',text('آمادگی فعال‌سازی فروش','Commerce activation readiness'));
  status.after(readiness);
  let seq=0;
  function node(tag,value,cls){
    const n=document.createElement(tag);
    if(value!==undefined)n.textContent=String(value);
    if(cls)n.className=cls;
    return n;
  }
  function toman(value){
    if(value===null||value===undefined||!/^\d+$/.test(String(value)))
      return text('نامشخص','Unknown');
    try{return new Intl.NumberFormat(en?'en-GB':'fa-IR').format(BigInt(String(value)))+
      text(' تومان',' toman');}
    catch{return text('نامشخص','Unknown');}
  }
  const NEXT_SERVICE_STATE={
    awaiting_contact:'scheduling',scheduling:'booked',booked:'in_progress'
  };
  const MODE_LABELS={
    PHONE:text('تلفنی','Telephone'),
    VOICE:text('تماس صوتی آنلاین','Online voice call'),
    VIDEO:text('آنلاین تصویری','Online video'),
    IN_PERSON:text('حضوری ویژه','In person (eligible VIP)')
  };
  const CITY_LABELS={
    TEHRAN:text('تهران','Tehran'),
    KASHAN:text('کاشان','Kashan')
  };
  const timezone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
  function utcLabel(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value))return null;
    const d=new Date(value.replace(' ','T')+'Z');
    if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,19)!==value.replace(' ','T'))return null;
    return new Intl.DateTimeFormat(en?'en-GB':'fa-IR',
      {dateStyle:'medium',timeStyle:'short',timeZone:timezone}).format(d);
  }
  function bookingField(label){
    const wrapper=node('label',label,'ops-muted');
    const input=document.createElement('input');
    input.type='datetime-local';input.step='60';input.required=true;
    wrapper.append(input);
    return {wrapper,input};
  }
  function bookingUtc(input){
    if(!input.value)return null;
    const parsed=new Date(input.value);
    if(!Number.isFinite(parsed.getTime()))return null;
    return parsed.toISOString().replace('T',' ').slice(0,19);
  }
  async function advanceService(entry,button,begin,end){
    if(workspace.hidden||!panel.open||document.hidden)return;
    const next=NEXT_SERVICE_STATE[entry.status];
    if(!next||entry.orderPaidState!==true||entry.providerClaimMatchesOrder!==true)return;
    // UI reflects server authority; it never overrides missing buyer consent.
    if(next==='booked'&&(entry.customerPreferenceRecorded!==true||
       !Object.hasOwn(MODE_LABELS,String(entry.deliveryMode||'')))){
      status.textContent=text('ابتدا مشتری باید روش جلسه را در حساب خود ثبت کند.',
        'The buyer must choose a valid session format in their account before booking.');
      return;
    }
    const bookingStart=next==='booked'?bookingUtc(begin):null;
    const bookingEnd=next==='booked'?bookingUtc(end):null;
    if(next==='booked'&&(!bookingStart||!bookingEnd||
      new Date(bookingEnd.replace(' ','T')+'Z')<=new Date(bookingStart.replace(' ','T')+'Z'))){
      status.textContent=text('بازه زمان معتبر را وارد کنید.','Enter a valid booking time window.');
      return;
    }
    if(!window.confirm(text(
       'تأیید تغییر وضعیت خدمت '+String(entry.sku||'')+' از '+String(entry.status)+' به '+next+'؟ ظرفیت تقویم خارجی، اطلاع‌رسانی به خریدار، تحویل خدمت و تسویه بانکی با این اقدام تأیید نمی‌شوند.',
       'Confirm '+String(entry.sku||'')+' transition from '+String(entry.status)+' to '+next+'? This does not verify external availability, customer notification, service delivery or bank settlement.'
    )))return;
    const stamp=seq;
    button.disabled=true;
    status.textContent=text('در حال ثبت کنترل‌شده وضعیت خدمت…','Submitting authorised service update…');
    try{
      const session=await fetch('/api/admin/operations/session',{
        method:'GET',credentials:'same-origin',cache:'no-store'
      });
      if(!session.ok)throw Error('authorization');
      const mfa=await session.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(mfa.ok!==true||mfa.mfaRequired===true||
        !/^[a-f0-9]{64}$/i.test(String(mfa.csrfToken||'')))throw Error('authorization');
      const response=await fetch('/api/admin/operations/commerce/service-advance',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','X-CSRF-Token':mfa.csrfToken},
        body:JSON.stringify({orderId:entry.orderId,sku:entry.sku,
          expectedState:entry.status,nextState:next,
          bookingStart,bookingEnd})
      });
      const result=await response.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(!response.ok||result?.ok!==true||
        result?.schema!=='commerce-service-transition-v1')throw Error('conflict');
      await load(); // Refresh private, current state after the server commits.
    }catch(_error){
      if(stamp===seq&&!workspace.hidden&&panel.open){
        status.textContent=text('ثبت انجام نشد یا اعتبار مدیر منقضی شده است. وضعیت قبلی را بررسی و گزارش را تازه‌سازی کنید.',
          'No confirmed change. Verify MFA, payment evidence and current state, then refresh.');
      }
    }finally{
      if(stamp===seq)button.disabled=false;
    }
  }
  async function confirmRealServiceDelivery(entry,button,kindInput,referenceInput,acknowledgement){
    if(workspace.hidden||!panel.open||document.hidden)return;
    if(entry.status!=='in_progress'||entry.orderPaidState!==true||
       entry.providerClaimMatchesOrder!==true)return;
    const kind=kindInput.value;
    const reference=referenceInput.value.trim();
    if(!['session_completed','document_handed_over'].includes(kind)||
       !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}$/.test(reference)||
       acknowledgement.checked!==true){
      status.textContent=text(
        'نوع شاهد، شناسه ارجاع واقعی (۸ تا ۹۶ نویسه انگلیسی) و تأیید آگاهانه تحویل الزامی است.',
        'Select evidence type, enter a real 8–96 character reference, and confirm the actual handover.');
      return;
    }
    if(!window.confirm(text(
      'آیا این خدمت واقعاً ارائه شده و سند ارجاع ثبت‌شده در پرونده خصوصی موجود است؟ این اقدام فقط تحویلِ گواهی‌شده توسط مدیر را ثبت می‌کند، نه تأیید مشتری یا تسویه بانکی.',
      'Was this service actually delivered, with the referenced evidence already in private custody? This records the owner attestation, not independent customer acceptance or bank settlement.'
    )))return;
    const stamp=seq;
    button.disabled=true;
    status.textContent=text('در حال تطبیق پرداخت و ثبت سند تحویل…','Verifying payment claim and recording handover…');
    try{
      const session=await fetch('/api/admin/operations/session',{method:'GET',
        credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
      if(!session.ok)throw Error('authorization');
      const auth=await session.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(auth?.ok!==true||auth.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(String(auth.csrfToken||'')))throw Error('authorization');
      const response=await fetch('/api/admin/operations/commerce/service-delivery',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','Accept':'application/json','X-CSRF-Token':auth.csrfToken},
        body:JSON.stringify({orderId:entry.orderId,sku:entry.sku,
          expectedState:'in_progress',evidenceKind:kind,
          evidenceReference:reference,ownerConfirmed:true})
      });
      const result=await response.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(!response.ok||result?.ok!==true||
        result.schema!=='commerce-service-delivery-attestation-v1'||
        result.change?.state!=='delivered')throw Error('not_confirmed');
      referenceInput.value='';
      acknowledgement.checked=false;
      await load();
    }catch(_){
      if(stamp===seq&&!workspace.hidden&&panel.open){
        status.textContent=text(
          'تحویل ثبت نشد؛ ابتدا وجود شاهد واقعی، تأیید درگاه، دسترسی مالک و مهاجرت پایگاه داده را بررسی کنید.',
          'Delivery was not recorded. Verify real evidence, matched payment, owner MFA and the evidence migration.');
      }
    }finally{
      if(stamp===seq)button.disabled=false;
    }
  }
  function ownerServiceFileWorkspace(entry,item){
    const disclosure=node('details');
    disclosure.className='ops-service-private-files';
    disclosure.style.cssText='border:1px solid rgba(212,175,55,.34);border-radius:12px;padding:12px;margin-top:10px;max-width:100%';
    disclosure.append(node('summary',text('اسناد رمزنگاری‌شده و خروجی قابل تحویل — فقط مالک',
      'Private input documents and deliverables — owner MFA only')));
    const region=node('div');region.style.cssText='display:grid;gap:12px;margin-top:12px';
    const notice=node('p',text(
      'فایل‌های PDF و DOCX پس از بررسی امنیتی خارج از فضای عمومی رمزنگاری می‌شوند. خروجی مشتری فقط بعد از ثبت تحویل مستند در دسترس خریدار قرار می‌گیرد.',
      'PDF/DOCX files are scanned and encrypted outside the public web root. A professional output is withheld from the client until documented delivery is approved.'
    ),'ops-muted');
    const statusLine=node('p');statusLine.setAttribute('role','status');
    const list=node('ul');list.style.cssText='padding:0;list-style:none;display:grid;gap:9px';
    const form=node('form');form.style.cssText='display:grid;gap:10px';
    const label=node('label',text('فایل گزارش یا خروجی واقعی (PDF / DOCX تا ۱۲ مگابایت)',
      'Actual professional deliverable (PDF / DOCX, up to 12MB)'),'ops-muted');
    label.style.cssText='display:grid;gap:8px';
    const file=document.createElement('input');file.type='file';file.name='document';file.required=true;
    file.accept='.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    label.append(file);form.append(label);
    const submit=node('button',text('ثبت امن خروجی در پرونده','Scan and privately register deliverable'),'button');
    submit.type='submit';form.append(submit);
    if(entry.status!=='in_progress'){
      form.hidden=true;
      form.style.display='none';
    }
    region.append(notice,statusLine,list,form);disclosure.append(region);
    let loading=false;
    const valid=()=>!workspace.hidden&&panel.open&&!document.hidden&&disclosure.open;
    async function reload(){
      if(!valid()||loading)return;
      loading=true;statusLine.textContent=text('در حال بررسی سندهای واقعی…','Retrieving private file records…');
      try{
        const response=await fetch('/api/admin/operations/commerce/service-files?order='+
          encodeURIComponent(entry.orderId)+'&sku='+encodeURIComponent(entry.sku),{
          method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
        if(!response.ok)throw Error('owner_storage_unavailable');
        const data=await response.json();
        if(data?.ok!==true||data.schema!=='private-service-files-v1'||!Array.isArray(data.files))throw Error('private_file_response_invalid');
        if(!valid())return;
        list.replaceChildren();
        for(const record of data.files){
          if(!/^[0-9a-f-]{36}$/i.test(String(record.id||'')))continue;
          const row=node('li');row.style.cssText='padding:12px;border:1px solid rgba(212,175,55,.22);border-radius:10px;display:flex;gap:9px;align-items:center;flex-wrap:wrap';
          row.append(node('span',(record.kind==='professional_output'?
            text('خروجی تخصصی','Professional output'):text('مدرک مشتری','Customer document'))+
            ' · '+String(record.file_extension||'').toUpperCase()+' · '+String(record.id)));
          const link=node('a',text('دریافت محرمانه','Private download'));
          link.href='/api/admin/operations/commerce/service-file?id='+encodeURIComponent(record.id);
          link.rel='nofollow';link.style.cssText='color:#f2d993;text-decoration:underline';
          row.append(link);
          if(record.kind==='professional_output'){
            const state=record.releasedToBuyer===true?
              (record.buyerReceiptConfirmed===true?
                text('دریافت صریحاً توسط مشتری اعلام شده؛ تأیید کیفیت یا تسویه نیست',
                  'Buyer self-attested receipt; neither satisfaction nor settlement verified'):
                text('این خروجی آزاد شده؛ مشتری هنوز دریافت را اعلام نکرده است',
                  'This output is released; buyer receipt not yet acknowledged')):
              text('خروجی داخلی، هنوز برای مشتری آزاد نشده است',
                'Internal output, not released to buyer');
            row.append(node('small',state,'ops-muted'));
          }
          if(record.kind==='professional_output'&&entry.status==='in_progress'){
            const use=node('button',text('انتخاب این فایل برای ثبت تحویل','Use this real file as handover evidence'),'button');
            use.type='button';
            use.addEventListener('click',()=>{
              item.dispatchEvent(new CustomEvent('jr:deliverable-selected',{detail:{id:record.id}}));
              statusLine.textContent=text('شناسه این فایل در فرم ثبت تحویل قرار گرفت؛ تأیید و ثبت نهایی همچنان لازم است.',
                'The file identifier was placed in the delivery attestation; final review and confirmation are still required.');
            });
            row.append(use);
          }
          list.append(row);
        }
        statusLine.textContent=data.files.length?text(
          'اسناد ثبت‌شده برای این پرونده خوانده شد.','This service case has private file records.'):
          text('هیچ فایل محرمانه‌ای در این پرونده ثبت نشده است.','No private documents are recorded for this case.');
      }catch(_){
        if(valid())statusLine.textContent=text(
          'دسترسی به اسناد محرمانه تأیید نشد؛ وضعیت احراز هویت دومرحله‌ای، تنظیمات رمزنگاری و محل ذخیره را بررسی کنید.',
          'Owner file access is unavailable. Verify MFA, encrypted storage and the approved migration.');
      }finally{loading=false;}
    }
    disclosure.addEventListener('toggle',()=>{
      if(!disclosure.open){list.replaceChildren();file.value='';return;}
      reload();
    });
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(loading||!valid()||entry.status!=='in_progress'||!file.files?.length)return;
      const selected=file.files[0];
      if(selected.size>12582912||!/(\\.pdf|\\.docx)$/i.test(selected.name)){
        statusLine.textContent=text('فقط PDF یا DOCX حداکثر ۱۲ مگابایت پذیرفته می‌شود.',
          'Only PDF or DOCX up to 12MB is accepted.');return;
      }
      if(!window.confirm(text(
        'آیا این فایل واقعاً خروجی قابل ارائه همین پرونده است؟ آپلود به معنای تحویل نهایی نیست.',
        'Is this a genuine professional output for this specific case? Upload does not mark it delivered.'
      )))return;
      loading=true;submit.disabled=true;
      statusLine.textContent=text('در حال دریافت مجوز مالک و اسکن محرمانه…','Checking owner MFA and scanning the encrypted file…');
      try{
        const session=await fetch('/api/admin/operations/session',{
          method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
        if(!session.ok)throw Error('authorization');
        const auth=await session.json();
        if(auth?.ok!==true||auth.mfaRequired!==false||
          !/^[a-f0-9]{64}$/i.test(String(auth.csrfToken||'')))throw Error('authorization');
        const payload=new FormData();payload.append('orderId',entry.orderId);
        payload.append('sku',entry.sku);payload.append('document',selected,selected.name);
        const response=await fetch('/api/admin/operations/commerce/service-files',{
          method:'POST',credentials:'same-origin',cache:'no-store',
          headers:{Accept:'application/json','X-CSRF-Token':auth.csrfToken},body:payload});
        const data=await response.json();
        if(!response.ok||data?.ok!==true||data.schema!=='private-service-files-v1'||
          data.file?.kind!=='professional_output'||data.file?.registered!==true)
          throw Error('upload_not_confirmed');
        file.value='';
        statusLine.textContent=text('فایل رمزنگاری شد؛ شناسه آن برای ثبت تحویل در فهرست قرار می‌گیرد.',
          'Encrypted output stored. Select its verified identifier to record actual handover.');
      }catch(_){
        statusLine.textContent=text('آپلود تأیید نشد؛ سند محرمانه را از مسیر عمومی ارسال نکنید.',
          'Secure upload could not be verified. Do not send the confidential output through public channels.');
      }finally{loading=false;submit.disabled=false;reload();}
    });
    return disclosure;
  }
  function ownerServiceIntakeViewer(entry){
    const disclosure=node('details');
    disclosure.className='ops-intake-private-viewer';
    disclosure.style.cssText='border:1px solid rgba(212,175,55,.34);border-radius:12px;padding:12px;margin-top:10px;max-width:100%';
    const summary=node('summary',text('مشاهده محرمانه شرح مشتری — ویژه مالک',
      'View encrypted client brief — owner only'));
    const content=node('div');content.setAttribute('aria-live','polite');
    disclosure.append(summary,content);
    let loading=false;
    disclosure.addEventListener('toggle',async()=>{
      if(!disclosure.open){
        // Avoid retaining decrypted personal research or student notes in a
        // hidden DOM or the normal read-only admin commerce snapshot.
        content.replaceChildren();return;
      }
      if(loading||workspace.hidden||!panel.open||document.hidden)return;
      loading=true;
      content.replaceChildren(node('p',text('در حال خواندن ایمن پرونده خصوصی…',
        'Securely retrieving the private service brief…'),'ops-muted'));
      try{
        const response=await fetch('/api/admin/operations/commerce/service-intake?order='+
          encodeURIComponent(entry.orderId)+'&sku='+encodeURIComponent(entry.sku),{
            credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
          });
        if(!response.ok)throw Error('owner_mfa_or_intake_unavailable');
        const data=await response.json();
        if(data?.ok!==true||data.schema!=='private-service-intake-v1')
          throw Error('invalid_private_intake');
        if(!disclosure.open||workspace.hidden||!panel.open||document.hidden)return;
        content.replaceChildren();
        if(!data.intake){
          content.append(node('p',text('در این پرونده شرحی ثبت نشده است.',
            'No private client brief is currently recorded.')));return;
        }
        const fields=[
          ['subject',text('موضوع و مسئله','Subject and key question')],
          ['background',text('زمینه و شواهد','Background and evidence')],
          ['objectives',text('هدف و خروجی','Objectives and deliverables')]
        ];
        for(const [key,label] of fields){
          const section=node('section');section.style.cssText='margin-block:12px;white-space:pre-wrap;overflow-wrap:anywhere';
          section.append(node('strong',label),node('p',String(data.intake[key]||''),'ops-muted'));
          content.append(section);
        }
        content.append(node('p',text(
          'نسخه ثبت‌شده: ','Saved revision: ')+String(data.revision),'ops-muted'));
        if(data.intake.isMinor===true)
          content.append(node('p',text(
            'تأیید خوداظهاری سرپرست: ','Self-declared guardian acknowledgement: ')+
            (data.guardianAcknowledged===true?text('ثبت شده؛ احراز مستقل نشده','recorded; not independently verified'):
             text('نامشخص','unverified')),'ops-muted'));
      }catch(_){
        if(disclosure.open)content.replaceChildren(node('p',text(
          'دسترسی به شرح خصوصی تأیید نشد؛ نقش مالک، اعتبار MFA و آماده‌بودن دیتابیس را بررسی کنید.',
          'Private service brief could not be read. Check owner privilege, MFA and database readiness.'),'ops-muted'));
      }finally{loading=false;}
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden&&disclosure.open)disclosure.open=false;
    });
    return disclosure;
  }
  function card(label,value,detail){
    const n=node('article',undefined,'ops-card');
    n.append(node('small',label),node('div',value??text('نامشخص','Unknown'),'ops-number'));
    if(detail)n.append(node('p',detail,'ops-muted'));
    results.append(n);
  }

  // Translate Tehran wall-clock selections to UTC using the IANA zone, never
  // the administrator's device time zone or a fixed offset.
  function tehranWallToUtc(day,time){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(day||'');
    const tm=/^(\d{2}):00$/.exec(time||'');
    if(!match||!tm)return null;
    const year=Number(match[1]),month=Number(match[2]),date=Number(match[3]),hour=Number(tm[1]);
    if(hour>23)return null;
    const target=Date.UTC(year,month-1,date,hour,0,0);
    if(!Number.isFinite(target))return null;
    const f=new Intl.DateTimeFormat('en-GB',{
      timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',
      day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    });
    const wall=t=>{
      const bits=f.formatToParts(new Date(t)),part=n=>bits.find(x=>x.type===n)?.value;
      return [Number(part('year')),Number(part('month')),Number(part('day')),
        Number(part('hour')),Number(part('minute'))];
    };
    let guess=target;
    for(let attempt=0;attempt<3;attempt++){
      const [y,m,d,h,min]=wall(guess);
      guess+=target-Date.UTC(y,m-1,d,h,min,0);
    }
    const [y,m,d,h,min]=wall(guess);
    if(y!==year||m!==month||d!==date||h!==hour||min!==0)return null;
    return guess;
  }
  async function changeAvailability(action,windowId,startUtc,endUtc,submit){
    if(workspace.hidden||!panel.open||document.hidden)return;
    const stamp=seq;
    if(!window.confirm(action==='open'
      ?text('این ساعت‌ها واقعاً در برنامه شما قابل ارائه‌اند و برای درخواست عمومی منتشر شوند؟',
        'Publish these genuinely available internal hours for public requests?')
      :text('این بازه از تقویم درخواست برداشته شود؟ رزرو موجود در سرور محافظت می‌شود.',
        'Close this published window? Existing bookings remain protected by the server.')))return;
    submit.disabled=true;
    status.textContent=text('در حال اعمال تغییر ظرفیت با تأیید سرور…',
      'Authorising and updating published capacity…');
    try{
      const response=await fetch('/api/admin/operations/session',{
        method:'GET',credentials:'same-origin',cache:'no-store'
      });
      if(!response.ok)throw Error('owner_auth_required');
      const auth=await response.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(auth.ok!==true||auth.mfaRequired!==false||
        !/^[a-f0-9]{64}$/i.test(String(auth.csrfToken||'')))throw Error('owner_mfa_required');
      const changed=await fetch('/api/admin/operations/commerce/availability',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','Accept':'application/json',
          'X-CSRF-Token':auth.csrfToken},
        body:JSON.stringify({action,windowId,startUtc,endUtc})
      });
      const result=await changed.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(!changed.ok||result?.ok!==true||
        result?.schema!=='commerce-consultation-capacity-v1')
        throw Error('capacity_not_confirmed');
      await load();
    }catch{
      if(stamp===seq&&!workspace.hidden&&panel.open)
        status.textContent=text('تغییر ظرفیت تأیید نشد. احراز هویت دومرحله‌ای، سقف چهار ساعت هر روز و تداخل ساعات را بررسی کنید.',
        'Capacity change not confirmed. Check MFA, the four-hour daily limit and overlaps.');
    }finally{if(stamp===seq)submit.disabled=false;}
  }
  function renderCapacity(capacity){
    const wrapper=node('details');wrapper.className='ops-calendar ops-capacity';
    wrapper.append(node('summary',text('تنظیم ظرفیت هفتگی مشاوره',
      'Manage published consultation hours')));
    const note=node('p',text(
      'برای هر روز فقط ساعت‌هایی را منتشر کنید که خودتان واقعاً برای مشاوره اختصاص داده‌اید؛ جمع زمان‌های منتشرشده هر روز حداکثر چهار ساعت است. ساعت ورودی به وقت تهران است. خریدار با انتخاب ساعت رزرو قطعی نمی‌کند؛ تداخل در سمت سرور دوباره کنترل می‌شود.',
      'Publish only genuinely reserved consulting hours (at most four hours per Tehran day). Times entered here use Tehran time. A visitor request is not a reservation; the server rechecks overlaps.'),'ops-muted');
    wrapper.append(note);
    if(capacity?.schemaReady!==true){
      wrapper.append(node('p',text(
        'جدول ظرفیت در پایگاه‌داده برتینا تأیید نشده است؛ انتشار ساعت فعلاً غیرفعال است.',
        'The Bertina capacity table is not verified; publishing hours is disabled.'
      ),'ops-muted'));
      results.append(wrapper);return;
    }
    const editor=node('div',undefined,'ops-capacity-editor');
    const label=(caption,type)=>{
      const container=node('label',caption,'ops-muted');
      const input=document.createElement('input');input.type=type;
      container.append(input);editor.append(container);
      return input;
    };
    const date=label(text('تاریخ روز (تقویم میلادی)','Date (Gregorian)'),'date');
    const start=label(text('ساعت شروع، به وقت تهران','Start hour, Tehran'),'time');
    // Owner preference: 17:00–18:00 Tehran is a draft, not auto-published.
    start.step='3600';start.value='17:00';
    const lengthLabel=node('label',text('ساعت قابل انتشار در این روز','Hours to publish on this day'),'ops-muted');
    const duration=document.createElement('select');
    for(const hours of [1,2,3,4]){
      const option=document.createElement('option');option.value=String(hours);
      option.textContent=String(hours)+text(' ساعت',' hours');duration.append(option);
    }
    duration.value='1';lengthLabel.append(duration);editor.append(lengthLabel);
    const hourPreset=node('button',text('انتخاب ساعت ۱۷ تا ۱۸','Select 17:00–18:00'),'button');
    hourPreset.type='button';
    hourPreset.dataset.consultationEveningPreset='1700-1800';
    hourPreset.addEventListener('click',()=>{
      // Preserve the owner's selected Gregorian day; require a separate save.
      start.value='17:00';duration.value='1';
      status.textContent=text(
        'بازهٔ ۱۷ تا ۱۸ به وقت تهران انتخاب شد. روز موردنظر را مشخص و انتشار را جداگانه تأیید کنید؛ هنوز ساعتی منتشر نشده است.',
        '17:00–18:00 Tehran time selected. Choose a date and confirm publication separately; no hour has been published.'
      );
    });
    editor.append(hourPreset);
    const publish=node('button',text('انتشار این بازه','Publish genuine capacity'),'button');
    publish.type='button';editor.append(publish);
    const hint=node('p',text(
      'برای روزهای مختلف، جداگانه بازه ثبت کنید: مثلاً شنبه دو ساعت، یکشنبه چهار ساعت. امکان افزودن بازه دوم به همان روز فقط تا سقف چهار ساعت وجود دارد.',
      'Set each day independently, for example two hours Saturday and four Sunday. A second window is allowed only within the four-hour daily maximum.'),'ops-muted');
    editor.append(hint);
    // A seven-day planner is an owner convenience only: choosing a day fills
    // the editor; NOTHING is published before explicit owner confirmation.
    const planner=node('section',undefined,'ops-week-planner');
    planner.append(node('h4',text('برنامهٔ هفت روز آینده','Next seven days')));
    planner.append(node('p',text(
      'برای هر روز فقط زمان‌های واقعاً قابل ارائه را منتشر کنید؛ آمار زیر ساعات منتشرشده است، نه تعداد مشتریان یا رزروهای واقعی.',
      'Publish only actual consulting hours. Counts below are owner-published hours, not purchases, bookings or live external availability.'),'ops-muted'));
    const weekGrid=node('div',undefined,'ops-week-grid');
    const zoneParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tehran',
      year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const part=key=>Number(zoneParts.find(p=>p.type===key)?.value);
    const year=part('year'),month=part('month'),day=part('day');
    const midnight=Date.UTC(year,month-1,day);
    const goodWindows=Array.isArray(capacity.windows)&&capacity.truncated!==true;
    for(let i=0;i<7;i++){
      const utcDay=new Date(midnight+i*86400000);
      const key=utcDay.toISOString().slice(0,10);
      const nextKey=new Date(midnight+(i+1)*86400000).toISOString().slice(0,10);
      const dayName=new Intl.DateTimeFormat(en?'en-GB':'fa-IR',
        {timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(utcDay);
      const card=node('div',undefined,'ops-week-day');
      card.append(node('strong',dayName));
      const begin=tehranWallToUtc(key,'00:00');
      const end=tehranWallToUtc(nextKey,'00:00');
      if(goodWindows&&begin!==null&&end!==null){
        const count=capacity.windows.reduce((total,w)=>{
          const start=utcLabel(w?.startUtc)?new Date(w.startUtc.replace(' ','T')+'Z').getTime():NaN;
          const finish=utcLabel(w?.endUtc)?new Date(w.endUtc.replace(' ','T')+'Z').getTime():NaN;
          if(!Number.isFinite(start)||!Number.isFinite(finish))return total;
          return total+Math.max(0,Math.min(finish,end)-Math.max(start,begin));
        },0)/3600000;
        card.append(node('p',text('ساعت منتشرشده: ','Published hours: ')+
          String(Math.round(count*100)/100)+' / 4','ops-muted'));
      }else card.append(node('p',text('آمار این روز قابل تأیید نیست',
        'Daily published hours unverified'),'ops-muted'));
      const selectDay=node('button',text('تنظیم ساعت این روز','Set hours for this day'),'button');
      selectDay.type='button';
      selectDay.addEventListener('click',()=>{
        date.value=key;date.focus();
        editor.scrollIntoView({behavior:'smooth',block:'nearest'});
      });
      card.append(selectDay);weekGrid.append(card);
    }
    planner.append(weekGrid);wrapper.append(planner,editor);
    publish.addEventListener('click',()=>{
      const t=tehranWallToUtc(date.value,start.value);
      const hours=Number(duration.value);
      if(t===null||!Number.isInteger(hours)||hours<1||hours>4){
        status.textContent=text('تاریخ و ساعت شروع معتبر و کامل انتخاب کنید.',
          'Choose a valid Tehran date and whole-hour start time.');return;
      }
      const from=new Date(t).toISOString().slice(0,19).replace('T',' ');
      const to=new Date(t+hours*3600000).toISOString().slice(0,19).replace('T',' ');
      changeAvailability('open',null,from,to,publish);
    });
    const list=node('ul',undefined,'ops-queue');
    const windows=Array.isArray(capacity.windows)?capacity.windows:[];
    for(const w of windows.slice(0,100)){
      if(typeof w?.id!=='string'||typeof w.startUtc!=='string'||typeof w.endUtc!=='string')continue;
      const a=utcLabel(w.startUtc),b=utcLabel(w.endUtc);
      if(!a||!b)continue;
      const item=node('li');item.append(node('span',a+' – '+b));
      const close=node('button',text('بستن ظرفیت','Close window'),'button');
      close.type='button';
      close.addEventListener('click',()=>changeAvailability('close',w.id,null,null,close));
      item.append(close);list.append(item);
    }
    wrapper.append(node('p',text(
      'بازه‌های آیندهٔ منتشرشده: ','Published upcoming windows: ')+
      String(capacity.openWindowCount??'—'),'ops-muted'));
    if(capacity.truncated===true)wrapper.append(node('p',text(
      'فهرست خلاصه است؛ تا بررسی همه ساعت‌ها، از بازنویسی برنامه خودداری کنید.',
      'List is truncated; review all published hours before changing the programme.'),'ops-muted'));
    if(list.childElementCount)wrapper.append(list);
    else wrapper.append(node('p',text('هنوز ساعتی منتشر نشده است.',
      'No hours have been published.'),'ops-muted'));
    results.append(wrapper);
  }

  function present(data){
    results.replaceChildren();
    if(!data.available){
      status.textContent=text(
        'داده‌های ساختار مرحلهٔ ۹ هنوز از سرور قابل تأیید نیستند؛ نبود داده به معنای صفر سفارش نیست.',
        'Stage 9 database data is unavailable; unknown is not zero orders.');
      return;
    }
    const orders=data.orders||{},claims=data.claims||{},stock=data.stock||{},
      notices=data.notifications||{},fulfilment=data.fulfilment||{};
    // Owner-only, non-sensitive explanation of why encrypted file intake is
    // not yet live on Bertina. Never expose private paths or key material.
    const privateChecks=fulfilment.privateServiceFilesActivationChecks||null;
    if(privateChecks&&typeof privateChecks==='object'
       &&!Array.isArray(privateChecks)&&Object.keys(privateChecks).length){
      const checks=[
        ['explicitlyEnabled','فعال‌سازی صریح مدیر سرور','Server-side feature enabled'],
        ['verifiedHttps','تأیید HTTPS قابل اعتماد','Trusted HTTPS confirmation'],
        ['commerceSchema','ساختار سفارش و پرونده خدمات','Commerce and service case schema'],
        ['privateFileSchema','مهاجرت جدول اسناد محرمانه','Private file schema migration'],
        ['privateStorage','فضای خصوصی خارج از پوشه عمومی','Private storage outside public web'],
        ['antivirus','اسکنر ضدبدافزار فعال','Working malware scanner'],
        ['cryptoAndKey','رمزنگاری و کلید خصوصی معتبر','Encryption and protected key'],
        ['documentParsers','پشتیبانی PDF و DOCX','Document format parsers'],
        ['phpUploadCapacity','ظرفیت امن ارسال فایل ۱۲ مگابایتی','PHP upload limits for 12 MB'],
        ['phpMemoryCapacity','حافظه کافی PHP برای رمزنگاری فایل تا ۱۲ مگابایت','PHP memory headroom for encrypted 12 MB documents'],
        ['phpExecutionCapacity','زمان اجرای کافی PHP (حداقل ۹۰ ثانیه)','PHP max_execution_time ≥ 90 seconds'],
        ['phpInputTimeCapacity','زمان دریافت کافی داده PHP (حداقل ۹۰ ثانیه)','PHP max_input_time ≥ 90 seconds'],
        ['ownerDeliverySchema','مهاجرت ثبت مستند تحویل مدیر','Owner delivery evidence migration'],
        ['buyerReceiptSchema','مهاجرت تأیید دریافت مشتری','Buyer receipt acknowledgment migration']
      ];
      const missing=checks.filter(([key])=>privateChecks[key]!==true);
      const section=node('section',undefined,'ops-card');
      section.style.cssText='grid-column:1/-1;border:1px solid rgba(212,175,55,.33);background:linear-gradient(140deg,#201e1b,#131312)';
      section.append(node('h3',text('آمادگی عملیاتی پرونده محرمانه خدمات',
        'Encrypted service files — deployment prerequisites')));
      section.append(node('p',missing.length
         ?text('پیش‌نیازهای زیر هنوز روی سرور به‌صورت معتبر تأیید نشده‌اند؛ هیچ فایل محرمانه‌ای نباید از راه عمومی ارسال شود.',
             'At least one required server prerequisite remains unverified. Do not accept private documents through public channels.')
         :text('همه پیش‌نیازهای فنی گزارش‌شده برقرارند؛ آزمون واقعی خرید، ارسال فایل و دریافت توسط دو حساب مستقل همچنان پیش از تأیید نهایی لازم است.',
             'All reported configuration checks pass. Real buyer/owner acceptance tests are still required before declaring production complete.'),
         'ops-muted'));
      const list=node('ul');
      list.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:7px 17px;margin-top:12px;padding-inline-start:20px';
      for(const [key,fa,enLabel] of checks){
        const ok=privateChecks[key]===true;
        const line=node('li',text(fa,enLabel)+' — '+(ok
          ?text('تأیید شده','Ready'):text('نیازمند اقدام','Needs setup')));
        line.style.cssText='color:'+(ok?'#d9dfc5':'#f0d597')+';line-height:1.8';
        list.append(line);
      }
      if(privateChecks.phpUploadCapacity!==true){
        const guide=node('p',text(
          'اقدام در cPanel → MultiPHP INI Editor: مقدار upload_max_filesize را 16M و post_max_size را 24M قرار دهید، ذخیره کنید و سپس این پنل را تازه‌سازی کنید. محدودیت فعلی در همان سرور باید دوباره خوانده شود؛ ذخیره تنظیمات به‌تنهایی به معنای رفع اشکال نیست.',
          'cPanel → MultiPHP INI Editor: set upload_max_filesize to 16M and post_max_size to 24M, save and refresh this panel. Read the effective PHP settings again; merely saving a form does not certify an upload.'
        ),'ops-muted');
        guide.style.cssText='margin-top:12px;padding:12px;border:1px solid rgba(212,175,55,.36);border-radius:10px;background:#29241b;color:#f1dfb3';
        section.append(guide);
      }
      if(privateChecks.phpMemoryCapacity!==true){
        section.append(node('p',text(
          'در همان تنظیمات cPanel، memory_limit را حداقل 128M و ترجیحاً 256M بگذارید؛ مقدار مؤثر PHP باید در همین پنل تأیید شود.',
          'In the same PHP editor, set memory_limit to at least 128M, preferably 256M, and verify the effective setting here.'
        ),'ops-muted'));
      }
      section.append(list);results.append(section);
    }
    card(text('سفارش‌های معلق','Pending orders'),orders.pendingRecords);
    card(text('ردیف‌های پرداخت‌شده','Paid-state records'),orders.paidStateRecords,
      text('تسویهٔ بانکی از این تعداد قابل استنتاج نیست.','This does not prove bank settlement.'));
    // Server-side gateway verification is mandatory. A panel claim,
    // transaction number or screenshot alone never changes order state.
    const donationRecovery=data.donationRecovery||null;
    if(donationRecovery?.schema==='commerce-donation-recovery-review-v1' &&
       Array.isArray(donationRecovery.pendingReviewQueue)){
      const section=node('section',undefined,'ops-card');
      section.style.cssText='grid-column:1/-1;border:1px solid rgba(212,175,55,.38);padding:14px;display:grid;gap:12px';
      section.append(node('h3',text('بازیابی کمک‌های مالی موفق با بازگشت ناقص درگاه',
        'Recover donations with interrupted gateway callbacks')));
      section.append(node('p',text(
        'نمایش pending به معنای عدم پرداخت نیست. ابتدا در پنل BitPay شناسه تراکنش واقعی (trans_id) و شناسه درخواست را پیدا کنید. سامانه قبل از هر تغییری هر دو را مستقلاً در سرور نزد درگاه تأیید می‌کند.',
        'Pending is not proof of non-payment. Obtain the real BitPay trans_id and request ID from the merchant dashboard. The server independently verifies the transaction before any change.'
      ),'ops-muted'));
      for(const entry of donationRecovery.pendingReviewQueue){
        if(!/^[a-f0-9-]{36}$/i.test(String(entry.orderId||''))||
           !/^\d+$/.test(String(entry.amountToman||'')))continue;
        const item=node('div',undefined,'ops-card');
        item.style.cssText='display:grid;gap:10px;border:1px solid rgba(212,175,55,.22);padding:12px';
        item.append(node('p',text('سفارش','Order')+' '+entry.orderId+
          text(' · مبلغ: ',' · amount: ')+toman(entry.amountToman)+
          text(' · چهار رقم آخر درگاه: ',' · gateway suffix: ')+
          String(entry.gatewayReferenceSuffix||'—'),'ops-muted'));
        const form=node('form');form.style.cssText='display:grid;gap:10px;max-width:540px';
        const refLabel=node('label',text('شناسه درخواست BitPay (id_get)',
          'BitPay gateway request ID (id_get)'));
        const ref=document.createElement('input');ref.type='text';ref.inputMode='numeric';
        ref.pattern='[1-9][0-9]*';ref.required=true;ref.autocomplete='off';
        refLabel.append(ref);form.append(refLabel);
        const transLabel=node('label',text('شناسه تراکنش موفق BitPay (trans_id)',
          'Verified BitPay transaction ID (trans_id)'));
        const trans=document.createElement('input');trans.type='text';
        trans.inputMode='numeric';trans.pattern='[1-9][0-9]*';trans.required=true;
        trans.autocomplete='off';transLabel.append(trans);form.append(transLabel);
        const ownerLabel=node('label');
        const ownerCheck=document.createElement('input');ownerCheck.type='checkbox';ownerCheck.required=true;
        ownerLabel.append(ownerCheck,node('span',text(
          'این شناسه‌ها را از پنل واقعی BitPay برای همین سفارش بررسی کرده‌ام.',
          'I checked these identifiers against this exact order in the real BitPay merchant dashboard.'
        )));form.append(ownerLabel);
        const submit=node('button',text('استعلام امن و تطبیق سفارش',
          'Verify with BitPay and reconcile order'));submit.type='submit';form.append(submit);
        form.addEventListener('submit',async event=>{
          event.preventDefault();
          const gatewayId=ref.value.trim(),transactionId=trans.value.trim();
          if(!/^[1-9][0-9]{0,79}$/.test(gatewayId)||
             !/^[1-9][0-9]{0,79}$/.test(transactionId)||
             !gatewayId.endsWith(String(entry.gatewayReferenceSuffix||''))||
             !ownerCheck.checked)return;
          if(!window.confirm(text(
            'فقط در صورت تأیید مستقل مبلغ، شناسه تراکنش و عامل سفارش از سوی BitPay، پرداخت ثبت می‌شود. ادامه می‌دهید؟',
            'A payment will be recorded only after BitPay independently verifies amount, transaction and order factor. Continue?'
          )))return;
          const stamp=seq;submit.disabled=true;
          status.textContent=text('در حال استعلام امن از BitPay…',
            'Requesting independent BitPay verification…');
          try{
            const authResponse=await fetch('/api/admin/operations/session',{
              method:'GET',credentials:'same-origin',cache:'no-store'
            });
            if(!authResponse.ok)throw Error('authorization');
            const auth=await authResponse.json();
            if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
            if(auth?.ok!==true||auth.mfaRequired!==false||
              !/^[a-f0-9]{64}$/i.test(String(auth.csrfToken||'')))throw Error('authorization');
            const response=await fetch('/api/admin/operations/commerce/donation-reconcile',{
              method:'POST',credentials:'same-origin',cache:'no-store',
              headers:{'Content-Type':'application/json','Accept':'application/json',
                'X-CSRF-Token':auth.csrfToken},
              body:JSON.stringify({orderId:entry.orderId,gatewayId,transactionId,
                ownerConfirmedPanelTransaction:true})
            });
            const body=await response.json();
            if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
            if(!response.ok||body?.ok!==true||
               body.schema!=='commerce-donation-recovery-v1'||
               body.change?.providerClaimRecorded!==true||
               body.change?.state!=='paid')throw Error('verification_failed');
            trans.value='';ref.value='';ownerCheck.checked=false;
            await load();
          }catch{
            if(stamp===seq&&!workspace.hidden&&panel.open)
              status.textContent=text(
                'تأیید درگاه کامل نشد یا اطلاعات منطبق نبود. وضعیت سفارش تغییر نکرده است؛ دوباره بررسی کنید.',
                'Gateway verification failed or references did not match. Recheck the payment status.'
              );
          }finally{if(stamp===seq)submit.disabled=false;}
        });
        item.append(form);section.append(item);
      }
      if(donationRecovery.pendingReviewQueue.length===0)
        section.append(node('p',text('کمک مالی معلقِ قابل بررسی وجود ندارد.',
          'No pending donation recovery cases in the bounded review queue.'),'ops-muted'));
      results.append(section);
    }
    const giving=data.donations||null;
    if(giving&&giving.scope==='all_time_internal_donation_ledger'){
      const h=node('h3',text('حمایت مالی تحصیلی — گزارش مستقل','Student support — separate ledger'));
      h.style.gridColumn='1 / -1';results.append(h);
      card(text('کمک‌های در انتظار پرداخت (تمام سوابق)','Pending donations (all time)'),giving.pendingOrders);
      card(text('کمک‌های دارای وضعیت پرداخت‌شده (تمام سوابق)','Paid-state donations (all time)'),giving.paidStateOrders);
      card(text('کمک‌های تطبیق‌یافته با سند درگاه (تمام سوابق)','Provider-claim-matched donations (all time)'),giving.claimMatchedOrders);
      card(text('مبلغ کمک‌های تطبیق‌یافته با درگاه (تمام سوابق)','Provider-claim-matched donation value (all time)'),
        toman(giving.claimMatchedAmountToman),
        text('صرفاً شواهد داخلی؛ تسویه بانکی و تخصیص کمک تأیید نشده است.',
          'Internal evidence only; bank settlement and allocation are not verified.'));
    }
    const expiry=data.bookExpiry||null;
    if(expiry?.schema==='commerce-book-expiry-review-v1'){
      const block=node('section',undefined,'ops-card');
      block.style.cssText='grid-column:1/-1;border:1px solid rgba(212,175,55,.42);border-radius:12px;padding:14px;display:grid;gap:12px';
      block.append(node('h3',text('رزرو کتاب‌های بدون تأیید پرداخت پس از ۲۴ ساعت',
        'Book reservations awaiting payment reconciliation after 24 hours')));
      block.append(node('p',text(
        'پس از ۲۴ ساعت، رزرو فقط وقتی آزاد می‌شود که لغو قطعی یا عدم موفقیت نهایی همان شناسه در پنل BitPay مستقلاً بررسی شده باشد. سفارش معلق یا نبود رسید داخلی، به‌تنهایی مدرک عدم پرداخت نیست.',
        'After 24 hours, release a book only when the exact gateway reference has independently been confirmed terminally failed or cancelled. A pending order or missing local claim is not proof of non-payment.'
      ),'ops-muted'));
      block.append(node('p',text(
        'استعلام خودکار منفی درگاه هنوز معتبرسازی نشده است. در صورت نامشخص‌بودن وضعیت، هیچ رزروی آزاد نمی‌شود.',
        'Automated negative gateway verification is not yet certified. Uncertain payments will not release stock.'
      ),'ops-muted'));
      const review=expiry.pendingReviewQueue||[];
      for(const entry of review){
        if(!/^[a-f0-9-]{36}$/i.test(String(entry.orderId||''))||
           !Number.isInteger(entry.reservedUnits)||entry.reservedUnits<1)continue;
        const item=node('div',undefined,'ops-card');
        item.style.cssText='border:1px solid rgba(200,172,112,.26);padding:12px;display:grid;gap:9px;min-width:0';
        item.append(node('p',text('پرونده رزرو','Reservation record')+' · '+
          String(entry.orderId).slice(0,8)+'…'+
          text(' | جلد: ',' | units: ')+entry.reservedUnits+
          text(' | انتهای شناسه درگاه: ',' | gateway suffix: ')+
          String(entry.gatewayReferenceSuffix||'—'),'ops-muted'));
        const form=node('form');
        form.style.cssText='display:grid;gap:10px;max-width:540px';
        const gatewayLabel=node('label',text('شناسه کامل درگاه، فقط پس از بررسی در BitPay',
          'Full gateway reference, only after checking BitPay'));
        const gateway=document.createElement('input');
        gateway.type='text';gateway.inputMode='numeric';gateway.pattern='[1-9][0-9]*';
        gateway.autocomplete='off';gateway.required=true;
        gatewayLabel.append(gateway);form.append(gatewayLabel);
        const typeLabel=node('label',text('نتیجه نهایی درگاه','Final provider status'));
        const decision=document.createElement('select');
        for(const [value,title] of [
          ['',text('انتخاب کنید','Choose verified status')],
          ['cancelled',text('لغوشده و غیرقابل پرداخت','Cancelled, no longer payable')],
          ['failed',text('ناموفق و غیرقابل پرداخت','Failed, no longer payable')]
        ]){const option=node('option',title);option.value=value;decision.append(option);}
        decision.required=true;typeLabel.append(decision);form.append(typeLabel);
        const verification=node('label');
        const check=document.createElement('input');check.type='checkbox';check.required=true;
        verification.append(check,node('span',text(
          'شناسه، مبلغ و وضعیت قطعی درگاه را مستقلاً بررسی کردم.',
          'I independently verified gateway reference, amount and terminal status.'
        )));form.append(verification);
        const risk=node('label');
        const riskCheck=document.createElement('input');riskCheck.type='checkbox';riskCheck.required=true;
        risk.append(riskCheck,node('span',text(
          'می‌دانم پرداخت دیرهنگام احتمالی به بررسی و استرداد جداگانه نیاز دارد.',
          'I acknowledge that a late payment may require separate investigation and refund.'
        )));form.append(risk);
        const submit=node('button',text('آزادسازی کنترل‌شده رزرو','Release verified reservation'));
        submit.type='submit';form.append(submit);
        form.addEventListener('submit',async event=>{
          event.preventDefault();
          const idGet=gateway.value.trim();
          if(!/^[1-9][0-9]{0,79}$/.test(idGet)||!idGet.endsWith(String(entry.gatewayReferenceSuffix||''))||
            !['cancelled','failed'].includes(decision.value)||
            !check.checked||!riskCheck.checked)return;
          if(!window.confirm(text(
            'آیا لغو نهایی درگاه برای همین سفارش با شناسه منطبق را تایید می‌کنید؟ آزادسازی موجودی و لغو سفارش قابل بازگشت خودکار نیست.',
            'Confirm the exact provider transaction is terminally unpaid. Stock release and order cancellation will not automatically undo themselves.'
          )))return;
          const stamp=seq;submit.disabled=true;
          try{
            const authResponse=await fetch('/api/admin/operations/session',{
              method:'GET',credentials:'same-origin',cache:'no-store'
            });
            if(!authResponse.ok)throw Error('mfa');
            const auth=await authResponse.json();
            if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
            if(auth?.ok!==true||auth.mfaRequired!==false||
              !/^[a-f0-9]{64}$/i.test(String(auth.csrfToken||'')))throw Error('mfa');
            const reply=await fetch('/api/admin/operations/commerce/book-expire',{
              method:'POST',credentials:'same-origin',cache:'no-store',
              headers:{'Content-Type':'application/json','Accept':'application/json',
                'X-CSRF-Token':auth.csrfToken},
              body:JSON.stringify({orderId:entry.orderId,gatewayId:idGet,
                providerStatus:decision.value,ownerVerifiedGateway:true,
                acknowledgeLatePaymentRisk:true})
            });
            const changed=await reply.json();
            if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
            if(!reply.ok||changed?.ok!==true||
              changed.schema!=='commerce-book-expiry-owner-v1'||
              changed.change?.reserveReleased!==true)throw Error('recheck');
            gateway.value='';check.checked=false;riskCheck.checked=false;
            await load();
          }catch{
            if(stamp===seq&&!workspace.hidden&&panel.open){
              status.textContent=text(
                'آزادسازی تأیید نشد. درگاه، احراز هویت دومرحله‌ای یا وضعیت سفارش را دوباره بررسی کنید.',
                'Release not confirmed; recheck the provider status, MFA and current order.'
              );
            }
          }finally{if(stamp===seq)submit.disabled=false;}
        });
        item.append(form);block.append(item);
      }
      if(!review.length)block.append(node('p',text(
        'سفارش کتاب واجد بررسی در این بازه وجود ندارد.',
        'There are no overdue book holds in this bounded review queue.'
      ),'ops-muted'));
      results.append(block);
    }
    const sales=data.salesPipeline||null;
    if(sales && sales.status==='INTERNAL_ORDER_LEDGER_ONLY'){
      const heading=node('h3',text('مسیر فروش و پیگیری درآمد','Sales pipeline and revenue follow-up'));
      heading.style.gridColumn='1 / -1';results.append(heading);
      card(text('ارزش سفارش‌های دارای وضعیت پرداخت‌شده','Paid-state order value'),
        toman(sales.paidStateAmountToman),
        text('جمع ثبت داخلی، نه مبلغ تسویه بانکی.','Internal ledger total, not bank-settled revenue.'));
      card(text('ارزش دارای تطبیق ادعای درگاه','Provider-claim-matched order value'),
        toman(sales.providerClaimMatchedAmountToman),
        text('تطبیق فنی درگاه؛ تسویه بانکی همچنان نامشخص است.',
          'Gateway claim match only; bank settlement remains unverified.'));
      card(text('ارزش ۳۰ روز اخیر با وضعیت پرداخت‌شده','Last 30 days paid-state order value'),
        toman(sales.paidStateAmountLast30DaysToman),
        text('مبنای تاریخ پرداخت ثبت‌شده، نه رسید بانکی.',
          'Based on recorded paid date, not bank statements.'));
      card(text('سفارش‌های دارای وضعیت پرداخت‌شده در ۳۰ روز','Paid-state orders in 30 days'),
        sales.paidStateOrdersLast30Days);
      if(typeof sales.recordedOrderPaidStateSharePercent==='number' &&
         Number.isFinite(sales.recordedOrderPaidStateSharePercent)){
        card(text('سهم وضعیت پرداخت‌شده از سفارش‌های ثبت‌شده',
            'Paid-state share among recorded orders'),
          sales.recordedOrderPaidStateSharePercent.toFixed(1)+'%',
          text('این نرخ تبدیل بازدیدکننده به خریدار نیست؛ فقط سهم وضعیت سفارش‌های ثبت‌شده است.',
            'Not visitor-to-buyer conversion; only the recorded order-state share.'));
      }
      const popularity=sales.popularOffers;
      if(popularity?.status==='internal_provider_claim_matches_only'){
        const block=node('section',undefined,'ops-panel');
        block.append(node('h4',text('محصولات پرتقاضا بر اساس دفتر داخلی',
          'Popular offers by internal matched claims')));
        block.append(node('p',text(
          'مبنای رتبه‌بندی تعداد واحد در سفارش‌های دارای تطبیق ادعای درگاه است؛ نه تحویل یا تسویه قطعی.',
          'Ranked by units in orders with provider-claim matches, not fulfilment or bank settlement.'),'ops-muted'));
        const list=node('ol');
        for(const offer of popularity.offers||[]){
          const li=node('li');
          li.append(node('strong',offer.sku),
            node('span',' · '+text('واحد: ','Units: ')+offer.units+
              ' · '+text('سفارش‌ها: ','Orders: ')+offer.matchedOrders));
          list.append(li);
        }
        if(!list.children.length)list.append(node('li',text(
          'رکورد واجد شرایطی در دفتر موجود گزارش نشده است.',
          'No eligible ledger records were returned.')));
        block.append(list);results.append(block);
      }
      card(text('پرداخت‌های معلق بیش از ۲۴ ساعت','Pending payments older than 24 hours'),
        sales.pendingOlderThan24Hours,
        text('برای بررسی فنی؛ مجوز ارسال پیام بازاریابی نیست.',
          'Operational review only; not permission for marketing outreach.'));
      if(Number.isInteger(sales.pendingBookOrdersWithReservationsOlderThan24Hours) &&
         Number.isInteger(sales.pendingBookUnitsReservedOlderThan24Hours)){
        card(text('سفارش کتاب معلق با رزرو بیش از ۲۴ ساعت',
            'Pending book orders holding stock over 24 hours'),
          sales.pendingBookOrdersWithReservationsOlderThan24Hours,
          text('پیش از آزادسازی رزرو، وضعیت لغو پرداخت باید مستقلاً نزد درگاه تأیید شود.',
            'Never release the hold without independent payment-provider cancellation confirmation.'));
        card(text('جلد کتاب محبوس در رزرو معلق بیش از ۲۴ ساعت',
            'Book units held by pending orders over 24 hours'),
          sales.pendingBookUnitsReservedOlderThan24Hours,
          text('این عدد گزارش موجودی است، نه مجوز لغو سفارش یا تغییر دستی دیتابیس.',
            'Inventory observation only; no authorization to cancel or edit the database.'));
      }
      card(text('پرداخت‌های معلق بیش از ۷ روز','Pending payments older than 7 days'),
        sales.pendingOlderThan7Days);
      card(text('سفارش‌های ایجادشده بیش از ۲۴ ساعت','Unpaid created orders older than 24 hours'),
        sales.createdOlderThan24Hours);
      card(text('درخواست‌های بازپرداخت نیازمند اقدام','Refund requests awaiting action'),
        sales.refundRequestsAwaitingAction,
        text('وضعیت درخواست، دلیل بر بازگشت وجه نیست.',
          'A refund request status is not evidence of a bank disbursement.'));
    }
    card(text('پرداخت‌های نیازمند تطبیق مستقل','Paid records requiring review'),
      claims.paidRowsRequiringIndependentProviderReconciliation);
    card(text('مغایرت دفتر رزرو کتاب','Book reservation ledger discrepancies'),
      stock.ledgerDiscrepancies);
    card(text('موجودی‌های فاقد تاریخ تطبیق','Stock rows without reconciliation date'),
      stock.rowsWithoutReconciliationTimestamp);
    card(text('رسیدهای ایمیلی فاقد زمان ثبت‌شده','Receipts without recorded email timestamp'),
      notices.paidOrderRowsWithoutReceiptEmailTimestamp);
    const orderStates=orders.states||{},outbox=notices.outboxStates||{},
      service=fulfilment.serviceCaseStates||{},parcels=fulfilment.parcelStates||{};
    card(text('کل سفارش‌های ثبت‌شده','Recorded order rows'),orders.totalRows);
    card(text('اعلان‌های در انتظار یا نامطمئن','Pending / failed outbox events'),
      (outbox.pending||0)+(outbox.failed||0)+(outbox.processing||0),
      text('ارسال واقعی ایمیل جداگانه بررسی می‌شود.','Actual email delivery requires separate verification.'));
    card(text('پرونده‌های خدمات در انتظار تماس','Service cases awaiting contact'),
      service.awaiting_contact??0);
    card(text('پرونده‌های فعال نیازمند پیگیری','Active service cases awaiting action'),
      fulfilment.activeServiceCaseCount??null);
    if(fulfilment.customerPreferenceSchemaReady===false){
      card(text('وضعیت انتخاب روش مشاوره','Consultation preference availability'),
        text('جداول انتخاب روش قابل تأیید نیستند','Preference database not verified'),
        text('تا تأیید ساختار دیتابیس، ثبت نوبت جدید مجاز نیست.',
          'New appointment booking is not permitted until the schema is verified.'));
    }
    card(text('مرسوله‌های در حال آماده‌سازی','Parcels being prepared'),
      parcels.preparing??0);
    card(text('مرسوله‌های دارای وضعیت باز','Open parcel fulfilment records'),
      fulfilment.activeParcelCount??null,
      text('این تعداد به معنای ارسال یا تحویل تأییدشده نیست.',
        'Open records do not prove shipping or delivery.'));
    card(text('مرسوله‌های آماده‌سازی معطل بیش از ۴۸ ساعت','Parcels preparing for over 48 hours'),
      fulfilment.preparingOlderThan48Hours??null,
      text('نیازمند بررسی کارشناس ارسال، بدون اعلان خودکار به مشتری.',
        'Dispatch follow-up only; no automatic customer notification.'));
    card(text('مرسوله‌های ارسال‌شده با عدم تغییر وضعیت بیش از ۷ روز',
      'Dispatched / in-transit records unchanged for over 7 days'),
      fulfilment.inShippingOlderThan7Days??null);
    if(Array.isArray(fulfilment.parcelActionQueue)&&fulfilment.parcelActionQueue.length){
      const detail=node('details');
      detail.append(node('summary',text('فهرست مرسوله‌های نیازمند پیگیری',
        'View pending parcel fulfilment worklist')));
      detail.append(node('p',text(
        'شناسه سفارش و وضعیت ثبت‌شده فقط برای مدیر است. نشانی، کد رهگیری و اطلاعات خریدار نمایش داده نمی‌شوند؛ تطبیق فنی درگاه تسویه بانکی را اثبات نمی‌کند.',
        'Order identifiers and ledger status are owner-only. No delivery address, tracking code or customer data is shown; provider claim equality does not prove settlement.'
      ),'ops-muted'));
      if(fulfilment.parcelQueueTruncated)detail.append(node('p',text(
        'فقط ۵۰ مورد با قدیمی‌ترین زمان به‌روزرسانی نمایش داده شده است.',
        'Only the 50 least recently updated parcels are shown.'
      ),'ops-muted'));
      const list=node('ul',undefined,'ops-queue');
      list.style.maxHeight='20rem';list.style.overflowY='auto';
      for(const entry of fulfilment.parcelActionQueue){
        const item=node('li');
        const id=String(entry.orderId||'').slice(0,8);
        const match=entry.providerClaimMatchesOrder===true?
          text('ادعای پرداخت تطبیق دارد؛ تسویه نامشخص',
               'Provider claim matches; settlement unknown'):
          text('نیازمند بررسی مستقل اصالت پرداخت',
               'Independent payment evidence review required');
        item.append(node('span',id+'… · '+String(entry.state||'')+
          ' · '+String(entry.updatedAt||'')+' · '+match));
        list.append(item);
      }
      detail.append(list);results.append(detail);
    }
    if(fulfilment.internalAvailability)renderCapacity(fulfilment.internalAvailability);
    const calendar=fulfilment.internalCalendar||null;
    if(calendar && Array.isArray(calendar.windows)){
      const calendarSection=node('details');
      calendarSection.className='ops-calendar';
      calendarSection.append(node('summary',
        text('تقویم داخلی نوبت‌های ثبت‌شده ('+String(calendar.totalUpcoming??'?')+')',
          'Internal confirmed appointment windows ('+String(calendar.totalUpcoming??'?')+')')));
      calendarSection.append(node('p',text(
        'زمان‌ها براساس منطقه زمانی مرورگر شما ('+timezone+') نمایش داده می‌شوند. این فقط نوبت‌های ثبت‌شده در سامانه داخلی است؛ همگام‌سازی با تقویم خارجی یا اعلام ظرفیت انجام نشده است.',
        'Times use your browser time zone ('+timezone+'). This is the internal booked-case ledger only; no external calendar sync or availability claim.'),'ops-muted'));
      if(calendar.truncated===true)calendarSection.append(node('p',text(
        'فقط صد نوبت اول نمایش داده شده‌اند؛ برای ثبت زمان، کنترل قطعی تداخل در سرور انجام می‌شود.',
        'Only the first 100 windows are visible; the server makes the final conflict decision.'),'ops-muted'));
      const calList=node('ul',undefined,'ops-queue');
      for(const w of calendar.windows.slice(0,100)){
        if(!['booked','in_progress'].includes(w?.state))continue;
        const a=utcLabel(w.startUtc),b=utcLabel(w.endUtc);
        if(a&&b)calList.append(node('li',
          a+' – '+b+' · '+(w.state==='booked'?
           text('رزرو قطعی داخلی','Internally booked'):
           text('خدمت در حال ارائه','Service in progress'))));
      }
      if(calList.childElementCount)calendarSection.append(calList);
      else calendarSection.append(node('p',text(
        'نوبت آینده‌ای در دفتر داخلی نمایش داده نمی‌شود؛ این به معنای آزادبودن قطعی زمان نیست.',
        'No upcoming internal window is shown; this does not confirm an available slot.'),'ops-muted'));
      results.append(calendarSection);
    }
    if(Array.isArray(fulfilment.serviceActionQueue)&&fulfilment.serviceActionQueue.length){
      const detail=node('details'),label=node('summary',
        text('مشاهدهٔ فهرست پرونده‌های قابل پیگیری','View service fulfilment worklist'));
      detail.className='ops-service-queue';
      detail.append(label);
      const note=node('p',text(
        'شناسه‌ها فقط ارجاع داخلی مدیر هستند؛ تطبیق درگاه با سفارش به معنای تسویهٔ بانکی یا ارائهٔ خدمت نیست.',
        'Internal case references only. Matching payment claims does not prove bank settlement or service delivery. Progress changes require fresh MFA; a distinct owner-attested evidence step records real delivery.'),'ops-muted');
      detail.append(note);
      if(fulfilment.queueTruncated)detail.append(node('p',text(
        'فقط ۵۰ پروندهٔ قدیمی‌تر نشان داده شده‌اند؛ برای باقی پرونده‌ها گزارش بعدی لازم است.',
        'Only the oldest 50 cases are shown; further cases require a separate review.'),'ops-muted'));
      const list=node('ul',undefined,'ops-queue');
      list.style.maxHeight='20rem';list.style.overflowY='auto';
      for(const entry of fulfilment.serviceActionQueue){
        const item=node('li');
        const id=String(entry.orderId||'').slice(0,8);
        const claim=entry.providerClaimMatchesOrder===true?
          text('تطبیق ثبت داخلی: دارد؛ تسویه نامشخص','Internal claim matches; settlement unknown'):
          text('نیازمند بررسی اصالت پرداخت','Payment evidence needs review');
        item.append(node('span',String(entry.sku||'')+' · '+String(entry.status||'')+
          ' · '+id+'… · '+claim));
        if(Object.hasOwn(MODE_LABELS,String(entry.deliveryMode||'')) &&
           entry.customerPreferenceRecorded===true){
          const mode=MODE_LABELS[entry.deliveryMode];
          const city=entry.deliveryMode==='IN_PERSON'&&Object.hasOwn(CITY_LABELS,entry.meetingCity)
            ?' · '+CITY_LABELS[entry.meetingCity]:'';
          item.append(node('p',text('انتخاب ثبت‌شده خریدار: ','Buyer-selected format: ')+mode+city,'ops-muted'));
        }else if(entry.status==='awaiting_contact'||entry.status==='scheduling'){
          item.append(node('p',text(
            'روش جلسه توسط مشتری ثبت یا تأیید نشده؛ ثبت زمان مجاز نیست.',
            'Buyer format is absent or unverified; a booking cannot be made.'),'ops-muted'));
        }
        if(entry.bookingStart&&entry.bookingEnd){
          const a=utcLabel(entry.bookingStart),b=utcLabel(entry.bookingEnd);
          if(a&&b)item.append(node('p',text('نوبت داخلی: ','Internal booking: ')+a+' – '+b,'ops-muted'));
        }
        if(entry.intakeSubmitted===true){
          item.append(node('p',text('شرح محرمانه مشتری ثبت شده — نسخه ',
            'Encrypted client brief submitted — revision ')+String(entry.intakeRevision||1),'ops-muted'));
          item.append(ownerServiceIntakeViewer(entry));
        }else if(fulfilment.serviceIntakeSchemaReady===true && entry.orderPaidState===true){
          item.append(node('p',text(
            'شرح تکمیلی مشتری هنوز ارسال نشده است.',
            'The client has not yet supplied the optional service brief.'),'ops-muted'));
        }
        if(entry.orderPaidState===true&&entry.providerClaimMatchesOrder===true){
          if(fulfilment.privateServiceFilesReady===true){
            item.append(ownerServiceFileWorkspace(entry,item));
          }else{
            item.append(node('p',text(
              'محل نگهداری اسناد رمزنگاری‌شده هنوز آماده و تأیید نشده است. ابتدا مهاجرت، فضای خصوصی و اسکنر روی سرور را آماده کنید؛ هیچ فایل عمومی ارسال نکنید.',
              'Private encrypted document custody is not currently ready. Verify the migration, private storage and antivirus before requesting files.'
            ),'ops-muted'));
          }
        }
        const next=NEXT_SERVICE_STATE[entry.status];
        if(next && entry.orderPaidState===true && entry.providerClaimMatchesOrder===true
          && (next!=='booked'||entry.customerPreferenceRecorded===true)){
          const action=node('button',text('ثبت مرحله: ','Advance to: ')+next);
          action.type='button';action.className='button';
          let begin=null,end=null;
          if(next==='booked'){
            item.append(node('small',text('منطقه زمانی مرورگر: ','Browser timezone: ')+timezone));
            const start=bookingField(text('شروع جلسه (زمان محلی)','Start (local time)'));
            const finish=bookingField(text('پایان جلسه (زمان محلی)','End (local time)'));
            item.append(start.wrapper,finish.wrapper);
            begin=start.input;end=finish.input;
          }
          item.append(action);
          action.addEventListener('click',()=>advanceService(entry,action,begin,end));
        }
        if(entry.status==='in_progress'&&entry.orderPaidState===true
           &&entry.providerClaimMatchesOrder===true){
          const proofReady=fulfilment.serviceDeliveryEvidenceSchemaReady===true;
          if(!proofReady){
            item.append(node('p',text(
              'ثبت تحویل مستند پس از اجرای مهاجرت امن پایگاه داده در دسترس خواهد بود؛ پرونده اکنون به‌صورت محافظت‌شده در جریان می‌ماند.',
              'Evidence-backed delivery awaits its safe database migration; the case stays in progress.'),'ops-muted'));
          }else{
            const form=node('details');form.className='ops-delivery-attestation';
            form.style.cssText='display:block;width:100%;margin-block:12px;padding:12px;border:1px solid rgba(212,175,55,.34);border-radius:12px';
            form.append(node('summary',text('ثبت تحویل واقعی با سند محرمانه','Record actual delivery with private evidence')));
            form.append(node('p',text(
              'تنها پس از ارائه واقعی خدمت، شناسه ارجاع از پرونده محرمانه را درج کنید؛ متن فایل، مشخصات مشتری یا مدرک خصوصی را در این فرم وارد نکنید.',
              'After genuine handover, enter an opaque reference from the private evidence ledger; do not type customer identity or document contents.'),'ops-muted'));
            const kindLabel=node('label',text('نوع شاهد تحویل','Delivery evidence type'),'ops-muted');
            kindLabel.style.cssText='display:grid;gap:7px;margin-block:10px';
            const kind=document.createElement('select');
            for(const [value,fa,en] of [
              ['session_completed','جلسه واقعاً انجام شده','Session actually completed'],
              ['document_handed_over','خروجی واقعی تحویل شده','Document or report handed over']
            ]){const option=node('option',text(fa,en));option.value=value;kind.append(option);}
            kindLabel.append(kind);form.append(kindLabel);
            item.addEventListener('jr:deliverable-selected',ev=>{
              const selectedId=String(ev.detail?.id||'');
              if(/^[0-9a-f-]{36}$/i.test(selectedId)){
                kind.value='document_handed_over';
                reference.value=selectedId;
              }
            });
            const refLabel=node('label',text('شناسه ارجاع واقعی (بدون داده شخصی)','Real evidence reference (no personal data)'),'ops-muted');
            refLabel.style.cssText='display:grid;gap:7px;margin-block:10px';
            const reference=document.createElement('input');
            reference.type='text';reference.minLength=8;reference.maxLength=96;
            reference.autocomplete='off';reference.spellcheck=false;
            reference.placeholder='DELIVERY-2026-0001';
            reference.style.cssText='width:100%;min-height:46px;padding:8px 12px;font:inherit';
            refLabel.append(reference);form.append(refLabel);
            const acknowledgementLabel=node('label',undefined,'ops-muted');
            acknowledgementLabel.style.cssText='display:flex;gap:9px;align-items:start;margin-block:12px';
            const acknowledgement=document.createElement('input');
            acknowledgement.type='checkbox';acknowledgement.style.cssText='width:20px;height:20px;flex:none;margin-top:5px';
            acknowledgementLabel.append(acknowledgement,node('span',text(
              'تأیید می‌کنم خدمت واقعاً ارائه شده و شاهد قابل مراجعه در پرونده محرمانه موجود است.',
              'I attest that service delivery actually occurred and the referenced evidence exists in private custody.')));
            form.append(acknowledgementLabel);
            const submit=node('button',text('ثبت تحویل مستند','Record evidenced delivery'),'button');
            submit.type='button';form.append(submit);
            submit.addEventListener('click',()=>confirmRealServiceDelivery(entry,submit,kind,reference,acknowledgement));
            item.append(form);
          }
        }
        list.append(item);
      }
      detail.append(list);results.append(detail);
    }
    // Completed cases are kept out of the open-service worklist, but the
    // owner must still be able to inspect actual buyer receipt afterward.
    if(Array.isArray(fulfilment.deliveredServiceActionQueue)
       &&fulfilment.deliveredServiceActionQueue.length){
      const completed=node('section',undefined,'ops-card');
      completed.append(node('h3',text(
        'تحویل‌های ثبت‌شده و تأیید دریافت مشتری',
        'Completed services and buyer receipt declarations'
      )));
      completed.append(node('p',text(
        'این فهرست صرفاً وضعیت داخلی تحویل و اعلام دریافت خریدار را نشان می‌دهد؛ رضایت از کیفیت خدمت یا تسویه بانکی از آن نتیجه نمی‌شود.',
        'These records distinguish owner handover from buyer self-attested receipt; neither buyer satisfaction nor bank settlement is implied.'
      ),'ops-muted'));
      if(fulfilment.deliveredServiceQueueTruncated===true)
        completed.append(node('p',text(
          '۵۰ پروندهٔ تحویل‌شدهٔ اخیر نمایش داده شده‌اند؛ پرونده‌های قدیمی‌تر در این نمای محدود نیستند.',
          'Only the 50 most recently recorded deliveries are shown in this bounded worklist.'
        ),'ops-muted'));
      const list=node('ul',undefined,'ops-queue');
      list.style.cssText='max-height:25rem;overflow-y:auto';
      for(const entry of fulfilment.deliveredServiceActionQueue){
        const item=node('li');
        item.append(node('span',String(entry.sku||'')+' · '+
          String(entry.orderId||'').slice(0,8)+'… · '+
          text('تحویل ثبت شده','Owner handover recorded')));
        if(entry.orderPaidState===true&&entry.providerClaimMatchesOrder===true
           &&fulfilment.privateServiceFilesReady===true){
          item.append(ownerServiceFileWorkspace(entry,item));
        }else{
          item.append(node('small',text(
            'برای بررسی اسناد، تطبیق واقعی ادعای پرداخت و آمادگی سامانه محرمانه لازم است.',
            'Private file review requires a matched provider claim and the configured secure storage.'
          ),'ops-muted'));
        }
        list.append(item);
      }
      completed.append(list);results.append(completed);
    }
    for(const row of stock.rows||[]){
      const drift=row.ledgerDiscrepancy;
      card(row.sku,
        text('موجودی ثبت‌شده: ','Recorded available: ')+row.availableRecorded,
        text('رزرو ثبت‌شده: ','Stock holds: ')+row.reservedRecorded+
        text('؛ رزروهای واقعی: ','; ledger units: ')+row.reservationUnitsHeld+
        (drift?text('؛ مغایرت نیازمند بررسی','; DISCREPANCY NEEDS REVIEW'):''));
    }
    status.textContent=text(
      'گزارش فقط‌خواندنی پایگاه داده؛ هیچ پرداخت، تسویه، شمارش فیزیکی یا تحویلی از این اعداد تأیید نمی‌شود.',
      'Read-only database report. These counts do not certify payment settlement, physical inventory or delivery.');
  }
  // Capability diagnostics are public booleans from the canonical API, not
  // an attempted payment, a secret dump or a verified bank transaction.
  async function loadReadiness(stamp){
    try{
      const response=await fetch('/api/commerce/health',{
        method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
      });
      const data=await response.json();
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      if(!response.ok||data.ok!==true||data.service!=='commerce'||typeof data.checkout!=='boolean'
        ||!data.requirements||!data.capabilities)throw new Error('unavailable');
      readiness.replaceChildren();
      const title=node('h3',text('وضعیت فعال‌سازی فروش واقعی','Live checkout activation readiness'));
      title.style.gridColumn='1 / -1';readiness.append(title);
      const state=ok=>ok===true?text('آماده (طبق API)','Ready (API)'):ok===false?
        text('مسدود / غیرفعال','Blocked / disabled'):text('نامشخص','Unknown');
      const add=(label,value)=>{const c=node('article',undefined,'ops-card');
        c.append(node('small',label),node('div',state(value),'ops-number'));readiness.append(c);};
      add(text('دریافت پرداخت','Checkout'),data.checkout);
      const caps=data.capabilities;
      add(text('فروش خدمات','Services checkout'),caps.services);
      add(text('فروش خدمات ویژه','VIP checkout'),caps.vip);
      add(text('فروش کتاب','Books checkout'),caps.books);
      const flags=[
        ['database',text('اتصال دیتابیس','Database')],
        ['schema',text('جداول سفارش','Commerce schema')],
        ['paymentClaimSchemaReady',text('ساختار امن پرداخت','Payment integrity schema')],
        ['publicTlsConfirmed',text('گواهی و TLS عمومی','Public TLS')],
        ['commerceEnabled',text('فعال‌سازی فروش در سرور','Server commerce switch')],
        ['gatewayKeyConfigured',text('پیکربندی کلید درگاه','Payment gateway key configured')],
        ['amountMultiplierValid',text('واحد مبلغ درگاه','Payment amount unit')],
        ['orderEmailFulfilmentConfirmed',text('ارسال و پیگیری سفارش','Order email and fulfilment')],
        ['inventoryReconciled',text('دفتر موجودی کتاب','Book inventory ledger')],
        ['bookShippingConfirmed',text('آمادگی ارسال کتاب','Book shipping')],
        ['serviceBookingConfirmed',text('آمادگی ارائه خدمات','Service booking')],
        ['vipBookingConfirmed',text('آمادگی خدمات ویژه','VIP booking')],
        ['receiptAccessReady',text('دسترسی امن رسید','Secure receipt access')]
      ];
      const blockers=flags.filter(([key])=>data.requirements[key]===false);
      if(blockers.length){
        const detail=node('details');detail.style.gridColumn='1 / -1';
        detail.append(node('summary',text('موانع و تنظیمات نیازمند بررسی','Checkout prerequisites requiring review')));
        const list=node('ul');
        for(const [key,label] of blockers)list.append(node('li',label));
        detail.append(list);readiness.append(detail);
      }
      const note=node('p',text(
        'این وضعیت از API سایت خوانده شده است؛ «آماده» به معنای موفقیت پرداخت آزمایشی، تسویه بانکی یا تحویل واقعی نیست.',
        'These are server API flags, not a verified test payment, bank settlement or fulfilment.'),'ops-muted');
      note.style.gridColumn='1 / -1';readiness.append(note);
    }catch{
      if(stamp!==seq||workspace.hidden||!panel.open||document.hidden)return;
      readiness.replaceChildren(node('p',text(
        'آمادگی فروش از API قابل تأیید نیست؛ فعال‌بودن درگاه را فرض نکنید.',
        'Commerce readiness API unavailable; checkout activation is unverified.'),'ops-muted'));
    }
  }
  async function load(){
    if(workspace.hidden||!panel.open)return;
    const stamp=++seq;refresh.disabled=true;
    readiness.replaceChildren();
    void loadReadiness(stamp);
    status.textContent=text('در حال دریافت شواهد سرور…','Reading server evidence…');
    try{
      const response=await fetch('/api/admin/operations/commerce',{
        method:'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}
      });
      const data=await response.json();
      // A request may finish after the owner closes the panel or TOTP expires.
      // Never paint old protected order references back into a locked DOM.
      if(stamp!==seq||workspace.hidden||!panel.open)return;
      if(!response.ok||data.ok!==true||data.schema!=='operations-commerce-evidence-v1')
        throw new Error('unauthorized_or_unavailable');
      present(data);
    }catch{
      if(stamp!==seq||workspace.hidden||!panel.open)return;
      results.replaceChildren();
      status.textContent=text('دسترسی دومرحله‌ای منقضی شده یا گزارش قابل دریافت نیست؛ هیچ عددی فرض نشد.',
        'MFA access expired or evidence is unavailable. No counts were assumed.');
    }finally{if(stamp===seq)refresh.disabled=false;}
  }
  // The main MFA controller locks this workspace immediately on expiry or
  // page hide. Commerce readiness is a sibling of #ops-commerce-results, so
  // clearing only the result cards would leave previously read state in DOM.
  workspace.addEventListener('jr:operations-locked',()=>{
    seq++;panel.open=false;results.replaceChildren();readiness.replaceChildren();
    status.textContent='';refresh.disabled=false;
  });
  panel.addEventListener('toggle',()=>{if(panel.open)load();else{seq++;results.replaceChildren();readiness.replaceChildren();}});
  refresh.addEventListener('click',load);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){seq++;results.replaceChildren();readiness.replaceChildren();
    status.textContent=text('برای دریافت شواهد جدید، بخش را دوباره باز کنید.','Reopen to refresh protected evidence.');}});
})();
