/* JHELA verified-account preliminary manuscript and reviewer workspace.
 * Actual availability comes from the secure server readiness endpoint. */
(()=>{'use strict';
const root=document.querySelector('[data-jhela-workspace]');if(!root)return;
const fa=document.documentElement.lang==='fa',t=(en,faText)=>fa?faText:en;
// No static calendar hold: the API's verified, fail-closed readiness is authoritative.
let manuscriptIntakeReady=false;
const find=s=>root.querySelector(s),status=find('[data-jhela-status]');
const message=(s,kind='info')=>{status.textContent=s;status.dataset.state=kind;};
const el=(tag,body)=>{const x=document.createElement(tag);if(body!==undefined)x.textContent=body;return x;};
const call=async(path,body)=>{
 const opt={method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}};
 if(body){if(body instanceof FormData)opt.body=body;else{opt.headers['Content-Type']='application/json';opt.body=JSON.stringify(body);}}
 const response=await fetch('/api/journal/'+path,opt);let data={};try{data=await response.json()}catch{}
 if(!response.ok||data.ok!==true)throw Error(data.error||'journal_unavailable');return data;
};
const collect=form=>Object.fromEntries(new FormData(form).entries());
const state=s=>({AWAITING_FILE:t('Awaiting a secure PDF upload','در انتظار بارگذاری امن PDF'),
 PRELIMINARY_RECEIVED:t('Received for preliminary screening','دریافت‌شده برای بررسی مقدماتی'),
 UNDER_SCREENING:t('Initial academic screening','بررسی اولیه علمی'),
 NEEDS_INFORMATION:t('Additional information requested','درخواست تکمیل اطلاعات'),
 AUTHOR_INFORMATION_RECEIVED:t('Author information received; editorial follow-up pending','اطلاعات تکمیلی نویسنده دریافت شد؛ در انتظار بررسی'),
 WITHDRAWN_BY_AUTHOR:t('Withdrawn by author (audit record retained)','انصراف نویسنده (سوابق محفوظ است)'),
 DESK_DECLINED:t('Declined at preliminary editorial screening (before peer review)','عدم پذیرش در بررسی مقدماتی سردبیری (پیش از داوری)'),
 NOT_INVOICED:t('No invoice issued; no payment is due','فاکتوری صادر نشده و پرداختی لازم نیست'),
 PENDING:t('Academic application under review','درخواست همکاری در حال بررسی'),
 APPROVED:t('Approved','تأییدشده')})[s]||t('Status awaiting editorial verification','وضعیت در انتظار تأیید تحریریه');
const view=async()=>{
 try{
  const d=await call('workspace');
  find('[data-jhela-signin]').hidden=true;find('[data-jhela-private]').hidden=false;
  const email=find('[data-jhela-email]');if(email)email.textContent=d.verifiedEmail;
  const form=find('[data-jhela-profile]');
  if(form&&d.profile)for(const [key,val] of Object.entries({name:d.profile.public_name,affiliation:d.profile.affiliation,country:d.profile.country,orcid:d.profile.orcid,interests:d.profile.research_interests})){
   if(form.elements.namedItem(key)&&!form.elements.namedItem(key).value)form.elements.namedItem(key).value=val||'';
  }
  const list=find('[data-jhela-articles]');if(list){list.replaceChildren();
  if(!d.manuscripts.length)list.append(el('p',t('No manuscripts submitted yet.','هنوز مقاله‌ای ثبت نشده است.')));
  for(const x of d.manuscripts){
   const card=el('article');card.className='jhela-intake-card';
   card.append(el('h3',x.title),el('p',t('Tracking code: ','کد پیگیری: ')+x.tracking_code),
    el('p',t('Editorial status: ','وضعیت علمی: ')+state(x.status)),
    el('p',t('Finance: ','امور مالی: ')+state(x.finance.state)+(x.finance.amount_chf!==null&&x.finance.amount_chf!==undefined?' · CHF '+x.finance.amount_chf:'')));
   const ol=el('ol');for(const event of x.events||[])ol.append(el('li',event.public_message));card.append(ol);
   if(x.status==='AWAITING_FILE'&&manuscriptIntakeReady){
    const form=el('form');form.className='jhela-intake-retry';
    const label=el('label',t('Complete submission with PDF (max 15 MB)','تکمیل ارسال با فایل PDF حداکثر ۱۵ مگابایت'));
    const file=el('input');file.type='file';file.accept='.pdf,application/pdf';file.required=true;label.append(file);
    const btn=el('button',t('Securely upload PDF','بارگذاری امن PDF'));form.append(label,btn);
    form.addEventListener('submit',async ev=>{
     ev.preventDefault();btn.disabled=true;
     try{const payload=new FormData();payload.append('manuscriptId',x.id);payload.append('manuscript',file.files[0]);
      await call('manuscripts/upload',payload);message(t('PDF received for initial screening.','PDF برای بررسی اولیه دریافت شد.'),'success');await view();
     }catch(err){message(err.message,'error')}finally{btn.disabled=false}
    });card.append(form);
   }
   if(x.status==='NEEDS_INFORMATION'){
    const form=el('form');form.className='jhela-intake-retry';
    const label=el('label',t('Reply to the editorial information request (20–500 characters)','پاسخ به درخواست تکمیل اطلاعات تحریریه (۲۰ تا ۵۰۰ نویسه)'));
    const answer=el('textarea');answer.required=true;answer.minLength=20;answer.maxLength=500;answer.rows=4;label.append(answer);
    const btn=el('button',t('Send secure reply','ارسال پاسخ امن'));form.append(label,btn);
    form.addEventListener('submit',async ev=>{
     ev.preventDefault();btn.disabled=true;
     try{
      await call('manuscripts/respond',{manuscriptId:x.id,message:answer.value});
      message(t('Response received; editorial screening will continue.','پاسخ دریافت شد و بررسی تحریریه ادامه خواهد یافت.'),'success');
      await view();
     }catch(err){message(t('Response not saved: ','پاسخ ذخیره نشد: ')+err.message,'error');}
     finally{btn.disabled=false;}
    });card.append(form);
   }
   // Author control: withdrawal before formal peer review; no file deletion.
   if(['AWAITING_FILE','PRELIMINARY_RECEIVED','UNDER_SCREENING',
       'NEEDS_INFORMATION','AUTHOR_INFORMATION_RECEIVED'].includes(x.status)){
    const form=el('form');form.className='jhela-intake-retry';
    const label=el('label',t('Reason for withdrawal (20–500 characters)',
      'دلیل انصراف از مقاله (۲۰ تا ۵۰۰ نویسه)'));
    const reason=el('textarea');reason.required=true;reason.minLength=20;reason.maxLength=500;reason.rows=3;
    label.append(reason);form.append(label);
    const btn=el('button',t('Withdraw this manuscript','انصراف از این مقاله'));
    btn.type='submit';form.append(btn);
    form.addEventListener('submit',async ev=>{
     ev.preventDefault();
     if(reason.value.trim().length<20)return;
     if(!window.confirm(t('Withdraw this preliminary submission? The audit record will be retained.',
       'از این پرونده انصراف می‌دهید؟ سوابق برای ممیزی حفظ خواهند شد.')))return;
     btn.disabled=true;
     try{
      await call('manuscripts/withdraw',{manuscriptId:x.id,reason:reason.value});
      message(t('Withdrawal recorded; manuscript is no longer in screening.',
        'انصراف ثبت شد و مقاله از فرایند بررسی خارج شد.'),'success');
      await view();
     }catch(err){message(t('Withdrawal failed: ','انصراف ثبت نشد: ')+err.message,'error')}
     finally{btn.disabled=false}
    });
    card.append(form);
   }
   list.append(card);
  }
  }
  const rev=find('[data-jhela-reviewer-state]');if(rev)rev.textContent=d.reviewerApplication?state(d.reviewerApplication.status):t('No academic reviewer application yet.','هنوز درخواست داوری ثبت نشده است.');
 }catch(err){
  find('[data-jhela-signin]').hidden=false;find('[data-jhela-private]').hidden=true;
  message(err.message==='verified_account_required'?t('Sign in to your verified account.','با حساب ایمیلی تأییدشده وارد شوید.'):
   t('The private author workspace is not ready on this server.','زیرساخت پرونده خصوصی نویسنده در این سرور هنوز آماده نیست.'),'warning');
 }
};
const profile=find('[data-jhela-profile]');if(profile)profile.addEventListener('submit',async ev=>{
 ev.preventDefault();const btn=profile.querySelector('button');btn.disabled=true;
 try{await call('profile',collect(profile));message(t('Academic profile saved.','پروفایل علمی ذخیره شد.'),'success');await view();}
 catch(err){message(t('Profile not saved: ','خطا در ذخیره پروفایل: ')+err.message,'error');}finally{btn.disabled=false}
});
const submit=find('[data-jhela-article-form]');if(submit)submit.addEventListener('submit',async ev=>{
 ev.preventDefault();const btn=submit.querySelector('button');btn.disabled=true;
 try{
  const data=collect(submit),pdf=submit.querySelector('input[type=file]')?.files?.[0];
  if(!pdf||pdf.size>15728640)throw Error(t('Select a PDF under 15 MB.','یک PDF کمتر از ۱۵ مگابایت انتخاب کنید.'));
  data.originalityConfirmed=!!submit.querySelector('[name=originalityConfirmed]:checked');
  const receipt=await call('manuscripts/create',data);
  message(t('Reference created: ','کد پیگیری ساخته شد: ')+receipt.trackingCode+t('. Uploading file…','. در حال ارسال فایل…'));
  const packet=new FormData();packet.append('manuscriptId',receipt.id);packet.append('manuscript',pdf);
  const ack=await call('manuscripts/upload',packet);
  if(ack.status!=='PRELIMINARY_RECEIVED')throw Error('receipt_not_verified');
  message(t('Received for initial screening: ','برای بررسی اولیه دریافت شد: ')+receipt.trackingCode,'success');submit.reset();await view();
 }catch(err){message(t('Upload incomplete: ','ثبت یا بارگذاری تکمیل نشد: ')+err.message+
  t('. If a reference was created, retry from My Articles.','. اگر کد پیگیری ساخته شد، بارگذاری را از «مقالات من» تکرار کنید.'),'error');await view();
 }finally{btn.disabled=false}
});
const review=find('[data-jhela-review-form]');if(review)review.addEventListener('submit',async ev=>{
 ev.preventDefault();const btn=review.querySelector('button');btn.disabled=true;
 try{const data=collect(review);
  data.privacyConsent=!!review.querySelector('[name=privacyConsent]:checked');
  data.publicProfileConsent=!!review.querySelector('[name=publicProfileConsent]:checked');
  await call('reviewer/apply',data);message(t('Application recorded; public biography requires separate approval and consent.','درخواست دریافت شد؛ انتشار رزومه فقط با تأیید علمی و رضایت شما انجام می‌شود.'),'success');await view();
 }catch(err){message(t('Application incomplete: ','درخواست تکمیل نشد: ')+err.message,'error')}finally{btn.disabled=false}
});
const directory=find('[data-jhela-directory]');
(async()=>{
 try{
  const h=await call('intake/health');
  manuscriptIntakeReady=h.manuscriptIntake===true;
  const article=find('[data-jhela-article-open]');if(article)article.hidden=!manuscriptIntakeReady;
  const reviewer=find('[data-jhela-review-open]');if(reviewer)reviewer.hidden=h.reviewerIntake!==true;
  const inactive=find('[data-jhela-not-ready]');
  if(inactive)inactive.hidden=article?manuscriptIntakeReady:h.reviewerIntake===true;
 }catch{const inactive=find('[data-jhela-not-ready]');if(inactive)inactive.hidden=false;}
 if(directory){try{const d=await call('reviewers');directory.replaceChildren();
  if(!d.reviewers?.length)directory.append(el('p',t('Verified reviewer profiles will appear after academic approval and consent.','رزومه‌های علمی پس از بررسی و رضایت پژوهشگران منتشر خواهند شد.')));
  for(const x of d.reviewers||[]){
   const card=el('article');card.className='jhela-intake-card';
   card.append(el('h3',x.academic_name),el('p',[x.academic_rank,x.institution,x.country].join(' · ')),el('p',x.cv_summary),
    el('p',t('Expertise: ','حوزه تخصصی: ')+x.expertise),el('p',t('Selected publications: ','آثار منتخب: ')+x.publications));
   if(x.institutional_page){const link=el('a',t('University profile','صفحه دانشگاهی'));link.href=x.institutional_page;link.rel='noopener noreferrer external';link.target='_blank';card.append(link);}
   directory.append(card);
  }
 }catch{directory.textContent=t('The verified reviewer directory is currently unavailable.','فهرست داوران تأییدشده در حال حاضر در دسترس نیست.');}}
 await view();
})();
})();