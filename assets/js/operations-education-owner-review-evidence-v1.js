/* JR owner evidence custody: both documents remain on the owner's device.
 * Server receives ONLY SHA-256 digests after MFA and explicit review.
 * No science, privacy compliance or live storage certification is inferred.
 */
(() => {
  'use strict';
  const section=document.querySelector('[data-jr-owner-review-evidence]');
  const workspace=document.getElementById('ops-workspace');
  const parent=document.getElementById('ops-education-readiness');
  if(!section||!workspace||!parent)return;
  const fa=document.documentElement.lang==='fa';
  const T=(a,b)=>fa?a:b;
  const $=key=>section.querySelector('[data-jr-owner-evidence-'+key+']');
  const scientificFile=$('science-file'),privacyFile=$('privacy-file');
  const scientificHash=$('science-hash'),privacyHash=$('privacy-hash');
  const affirmation=$('affirm'),record=$('record'),notices=$('notices');
  const noticePreview=$('notice-preview'),status=$('status');
  if(!scientificFile||!privacyFile||!scientificHash||!privacyHash||
    !affirmation||!record||!notices||!noticePreview||!status)return;
  const usable=()=>!workspace.hidden&&parent.open&&section.open&&!document.hidden;
  let requestId=0,controller=null,busy=false,previewLoaded=false,reviewRecorded=false;
  const hashes={science:'',privacy:''};
  const setStatus=value=>{status.textContent=value;};
  function buttons(){
    const both=/^[a-f0-9]{64}$/.test(hashes.science)&&
      /^[a-f0-9]{64}$/.test(hashes.privacy)&&
      hashes.science!==hashes.privacy&&affirmation.checked;
    record.disabled=busy||!usable()||!both;
    notices.disabled=busy||!usable()||!both||
      !reviewRecorded||!previewLoaded;
    scientificFile.disabled=busy;
    privacyFile.disabled=busy;
  }
  function reset(){
    requestId++;controller?.abort();controller=null;busy=false;
    previewLoaded=false;reviewRecorded=false;
    hashes.science='';hashes.privacy='';
    scientificHash.textContent='';privacyHash.textContent='';
    affirmation.checked=false;
    scientificFile.value='';privacyFile.value='';
    noticePreview.replaceChildren();
    setStatus(T('تا درخواست مدیر، هیچ متنی خوانده و هیچ فایل محرمانه‌ای ارسال نمی‌شود.',
      'No notice is read or confidential document transmitted until the owner opens the panel.'));
    buttons();
  }
  const span=(tag,textValue,cls)=>{
    const node=document.createElement(tag);
    node.textContent=String(textValue);
    if(cls)node.className=cls;
    return node;
  };
  async function readNotices(){
    if(!usable()||busy)return false;
    const generation=++requestId;
    controller?.abort();controller=new AbortController();busy=true;buttons();
    setStatus(T('در حال خواندن متن دقیق رضایت از منبع سرور…',
      'Reading exact bilingual consent text from the owner source…'));
    try{
      const response=await fetch('/api/admin/operations/education-workbook-notices',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!response.ok)throw Error('AUTH_REQUIRED');
      const data=await response.json();
      if(generation!==requestId||!usable())return false;
      if(data?.ok!==true||
        data.schema!=='jr.bahar-consent-notice-preview.v1'||
        data.readOnly!==true||data.canApprove!==false||
        data.consentNotGranted!==true||
        data.humanLegalReviewRequired!==true||
        !data.notices||typeof data.notices!=='object')
        throw Error('UNTRUSTED_NOTICE');
      for(const locale of ['fa','en']){
        const n=data.notices[locale];
        if(!n||typeof n.text!=='string'||n.text.length>3000||
          typeof n.version!=='string'||n.version.length>32||
          !/^[a-f0-9]{64}$/.test(n.sha256||'')||
          typeof n.publishedAsCurrent!=='boolean')
          throw Error('NOTICE_FIELD');
      }
      noticePreview.replaceChildren();
      for(const locale of ['fa','en']){
        const n=data.notices[locale];
        const block=span('article','');
        block.lang=locale;block.dir=locale==='fa'?'rtl':'ltr';
        block.className='jr-edu-evidence-review__notice-block';
        block.append(span('strong',locale==='fa'?'فارسی · '+n.version:
          'English · '+n.version));
        block.append(span('p',n.text));
        block.append(span('small',n.publishedAsCurrent
          ?T('نسخه متن حاضر در دیتابیس ثبت شده است.',
            'Exact current notice recorded in the mother database.')
          :T('هنوز برای دریافت رضایت ثبت نشده است.',
            'Not yet registered for collection of consent.')));
        noticePreview.append(block);
      }
      previewLoaded=true;
      setStatus(T('متن دقیق برای بررسی نمایش داده شد؛ امضای حقوقی و علمی را جداگانه ثبت کنید.',
        'Exact source text is shown. Independent privacy and scientific review evidence is still required.'));
      return true;
    }catch(e){
      if(generation!==requestId||e?.name==='AbortError')return false;
      previewLoaded=false;noticePreview.replaceChildren();
      setStatus(T('متن رضایت از منبع مجاز دریافت نشد؛ هیچ امضای تأیید مجاز نیست.',
        'Unable to retrieve current authorized notice; no notice approval is available.'));
      return false;
    }finally{
      if(generation===requestId){controller=null;busy=false;buttons();}
    }
  }
  async function hashLocal(fileInput,key,destination){
    const file=fileInput.files?.[0];
    hashes[key]='';destination.textContent='';
    reviewRecorded=false;buttons();
    if(!file)return;
    const generation=++requestId;
    if(file.size<1||file.size>10485760||!crypto?.subtle){
      fileInput.value='';
      setStatus(T('هر مدرک محلی باید حداکثر ۱۰ مگابایت باشد و مرورگر از SHA-256 پشتیبانی کند.',
        'Each local evidence document must be at most 10 MB and SHA-256 must be available.'));
      return;
    }
    setStatus(T('در حال محاسبه SHA-256 سند محلی، بدون ارسال به سایت…',
      'Calculating local document SHA-256 without sending the file…'));
    try{
      const buffer=await file.arrayBuffer();
      const digest=await crypto.subtle.digest('SHA-256',buffer);
      if(generation!==requestId||!usable())return;
      hashes[key]=Array.from(new Uint8Array(digest))
        .map(b=>b.toString(16).padStart(2,'0')).join('');
      destination.textContent=hashes[key];
      setStatus(T('اثر انگشت سند در مرورگر محاسبه شد؛ فایل آپلود نشد.',
        'Document digest was calculated on-device; no file was uploaded.'));
    }catch(_){
      if(generation!==requestId)return;
      hashes[key]='';destination.textContent='';
      setStatus(T('محاسبه اثر انگشت انجام نشد؛ ثبت مدرک غیرفعال است.',
        'Unable to hash the document; evidence registration remains disabled.'));
    }finally{buttons();}
  }
  scientificFile.addEventListener('change',()=>hashLocal(scientificFile,'science',scientificHash));
  privacyFile.addEventListener('change',()=>hashLocal(privacyFile,'privacy',privacyHash));
  affirmation.addEventListener('change',buttons);
  async function ownerPost(path,payload){
    const session=await fetch('/api/admin/operations/session',{
      method:'GET',credentials:'same-origin',cache:'no-store',
      headers:{Accept:'application/json'}
    });
    if(!session.ok)throw Error('MFA_REQUIRED');
    const auth=await session.json();
    if(auth?.ok!==true||auth.mfaRequired!==false||
      !/^[a-f0-9]{64}$/i.test(auth.csrfToken||''))
      throw Error('MFA_REQUIRED');
    const response=await fetch('/api/admin/operations/'+path,{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{Accept:'application/json','Content-Type':'application/json',
        'X-CSRF-Token':auth.csrfToken},
      body:JSON.stringify(payload)
    });
    if(!response.ok)throw Error('NOT_APPROVED');
    return response.json();
  }
  async function act(kind){
    buttons();
    if(!usable()||busy||
      (kind==='reviews'&&record.disabled)||
      (kind==='notices'&&notices.disabled))return;
    const summaryText=kind==='reviews'
      ?T('دو سند مستقل واقعاً بررسی شده‌اند و اثرانگشت آن‌ها ثبت شود؟ این کار ذخیره خصوصی را فعال نمی‌کند.',
        'Have two independent documents genuinely been reviewed? Recording their fingerprints does not activate private storage.')
      :T('متن دقیق فارسی و انگلیسی نمایش‌داده‌شده را پس از بازبینی حقوقی برای دریافت رضایت ثبت می‌کنید؟',
        'After lawful review, register the exact displayed Persian and English notices for future user consent?');
    if(!window.confirm(summaryText))return;
    const generation=++requestId;busy=true;buttons();
    setStatus(T('در حال بررسی احراز دومرحله‌ای و ثبت تصمیم مدیر…',
      'Verifying MFA and recording the owner review decision…'));
    try{
      const result=kind==='reviews'
        ?await ownerPost('education-workbook-evidence',{
            scientificReviewSha256:hashes.science,
            privacyReviewSha256:hashes.privacy,
            confirmation:'I REVIEWED TWO INDEPENDENT BAHAR RELEASE DOCUMENTS'
          })
        :await ownerPost('education-workbook-notices',{
            privacyReviewSha256:hashes.privacy,
            confirmation:'I APPROVE THE CURRENT BILINGUAL BAHAR PRIVACY NOTICES'
          });
      if(generation!==requestId||!usable())return;
      if(kind==='reviews'){
        if(result?.ok!==true||
          result.schema!=='jr.bahar-owner-review-evidence.v1'||
          result.ownerEvidenceRecorded!==true||
          result.privatelyStoredRawDocuments!==false||
          result.privateStorageStillOff!==true||
          result.scientificValidationCertified!==false)
          throw Error('UNCONFIRMED');
        reviewRecorded=true;
        setStatus(T('اثر انگشت اسناد مستقل ثبت شد؛ کلید ذخیره همچنان خاموش است. متن رضایت را جداگانه بررسی کنید.',
          'Owner evidence digests recorded. Storage remains off; review the exact bilingual privacy notices separately.'));
      }else{
        if(result?.ok!==true||
          result.schema!=='jr.bahar-reviewed-notices.v1'||
          result.fa!==true||result.en!==true||
          result.newConsentGranted!==false||
          result.workbookStorageAutoEnabled!==false)
          throw Error('UNCONFIRMED_NOTICE');
        setStatus(T('دو متن رضایت نسخه جاری در دیتابیس مادر ثبت شد؛ هیچ رضایت کاربر یا ذخیره‌سازی جدید خودکار فعال نشده است.',
          'Both current notices were registered in the mother DB. No user consent or storage was activated.'));
      }
    }catch(_){
      if(generation!==requestId)return;
      setStatus(T('ثبت رسمی تأیید نشد؛ عملیات را انجام‌شده فرض نکنید. احراز دومرحله‌ای و مدارک را بررسی کنید.',
        'Server did not confirm owner registration. Recheck MFA and supporting evidence.'));
    }finally{
      if(generation===requestId){busy=false;buttons();}
    }
  }
  record.addEventListener('click',()=>act('reviews'));
  notices.addEventListener('click',()=>act('notices'));
  section.addEventListener('toggle',()=>{if(section.open)readNotices();else reset();});
  parent.addEventListener('toggle',()=>{if(!parent.open)reset();});
  const observer=new MutationObserver(()=>{if(workspace.hidden)reset();});
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  window.addEventListener('pagehide',()=>{reset();observer.disconnect();},{once:true});
  reset();
})();