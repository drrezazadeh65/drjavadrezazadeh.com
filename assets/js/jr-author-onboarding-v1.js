/* JR Publishing author onboarding. The existing verified account is authoritative. */
(()=>{'use strict';
const host=document.getElementById('jr-author-onboarding');if(!host)return;
const api='/api/publishing/author/onboarding';
const el=(tag,text,cls='')=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const state=el('p','برای تکمیل پرونده مؤلف، وارد حساب ایمیل‌تأییدشده شوید.','jp-status');
host.append(el('h2','پرونده خصوصی مؤلف و تسویه‌حساب'),state);
let author=null,selectedAuthorId=null;
const fa=n=>new Intl.NumberFormat('fa-IR').format(Number(n)||0);
function info(t){state.textContent=t}
function field(form,key,title,type='text',value='',required=false){
 const l=el('label',title,'jp-kyc-label'),n=document.createElement(type==='textarea'?'textarea':'input');
 n.name=key;if(type!=='textarea')n.type=type;n.value=value||'';
 n.required=required;if(type==='password'){n.autocomplete='off';n.spellcheck=false;}
 l.append(n);form.append(l);return n;
}
function pick(form,key,title,options){
 const l=el('label',title,'jp-kyc-label'),n=el('select');n.name=key;
 for(const [value,label] of options){const o=el('option',label);o.value=value;n.append(o);}
 l.append(n);form.append(l);return n;
}
function button(form,label){const b=el('button',label,'jp-button');b.type='submit';form.append(b);return b;}
async function jsonPost(path,payload,btn){
 btn.disabled=true;info('در حال ارسال امن اطلاعات...');
 try{
  const res=await fetch(api+path,{method:'POST',credentials:'same-origin',cache:'no-store',
   headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
  const data=await res.json();
  if(!res.ok||data.ok!==true)throw Error(data.error||'request_failed');
  info('اطلاعات ثبت شد و در صف بررسی مدیر قرار گرفت. ثبت به معنای تأیید نیست.');
  await load(true);
 }catch(e){info('ثبت تأیید نشد ('+String(e.message||'خطا')+'). وضعیت پرونده را پیش از تلاش مجدد بررسی کنید.');}
 finally{btn.disabled=false;}
}
function render(a,authorChoices){
 author=a;host.querySelectorAll('.jp-kyc-rendered').forEach(x=>x.remove());
 const wrap=el('div','','jp-kyc-rendered');
 if(authorChoices.length>1){
  const label=el('label','انتخاب پرونده مؤلف مجاز','jp-kyc-label');
  const selector=el('select');selector.setAttribute('aria-label','انتخاب پرونده مؤلف');
  for(const [index,entry] of authorChoices.entries()){
   const title=entry.profile?.legal_name_fa||entry.profile?.legal_name_en||'مؤلف '+(index+1);
   const option=el('option',title);option.value=entry.authorId;selector.append(option);
  }
  selector.value=a.authorId;
  selector.addEventListener('change',()=>{
   const selected=authorChoices.find(entry=>entry.authorId===selector.value);
   if(selected){selectedAuthorId=selected.authorId;render(selected,authorChoices);}
  });
  label.append(selector);wrap.append(label);
 }
 const profile=a.profile||{},bank=a.bank||{};
 const hint=el('p','وضعیت احراز پروفایل: '+(profile.review_state||'ثبت‌نشده')+
  ' | وضعیت اطلاعات بانکی: '+(bank.review_state||'ثبت‌نشده')+
  ' | آخرین ۴ رقم کارت: '+(bank.card_last4||'—')+
  ' | آخرین ۴ رقم شبا: '+(bank.iban_last4||'—'),'jp-small');
 wrap.append(hint,el('p','شماره کارت، شبا، شماره هویت و اسناد پس از ثبت دوباره نمایش داده نمی‌شوند؛ فقط وضعیت بررسی و چهار رقم انتهایی قابل مشاهده است. بدون تأیید مستقل مدیر، تسویه فعال نمی‌شود.','jp-small'));
 if(profile.review_note)wrap.append(el('p','پاسخ بررسی پروفایل: '+profile.review_note,'jp-status'));
 if(bank.review_note)wrap.append(el('p','پاسخ بررسی بانک: '+bank.review_note,'jp-status'));
 const pf=el('form','','jp-kyc-form');
 pf.append(el('h3','۱. مشخصات هویتی و حرفه‌ای'));
 field(pf,'legalNameFa','نام و نام خانوادگی قانونی (فارسی)','text',profile.legal_name_fa,true);
 field(pf,'legalNameEn','نام و نام خانوادگی لاتین مطابق مدرک','text',profile.legal_name_en,true);
 field(pf,'academicTitle','عنوان دانشگاهی مستند','text',profile.academic_title);
 field(pf,'affiliation','دانشگاه یا محل فعالیت','text',profile.affiliation);
 field(pf,'specialization','زمینه‌های تخصصی','text',profile.specialization);
 field(pf,'orcid','شناسه ORCID (در صورت وجود)','text',profile.orcid);
 field(pf,'professionalBio','شرح سوابق حرفه‌ای و علمی','textarea',profile.professional_bio);
 const kind=pick(pf,'identityKind','نوع مدرک هویتی',[['iran_national_id','کد ملی ایران'],['passport','گذرنامه']]);kind.value=profile.identity_kind||'iran_national_id';
 field(pf,'identityNumber','کد ملی یا شماره گذرنامه (برای بررسی مجدد لازم است)','password','',true);
 field(pf,'birthDate','تاریخ تولد میلادی (اختیاری)','date');
 field(pf,'mobile','شماره تماس خصوصی (اختیاری)','tel');
 field(pf,'postalAddress','نشانی ابلاغ قرارداد (اختیاری)','textarea');
 const visibility=el('label',' اجازه انتشار رزومه تأییدشده پس از بازبینی مدیر','jp-kyc-check');
 const pub=document.createElement('input');pub.type='checkbox';pub.name='cvPublicConsent';pub.checked=Number(profile.cv_public_consent)===1;visibility.prepend(pub);pf.append(visibility);
 const consent=el('label',' با ذخیره محرمانه اطلاعات برای احراز هویت و تسویه موافقم؛ انتشار عمومی این اطلاعات مجاز نیست.','jp-kyc-check');
 const consentBox=document.createElement('input');consentBox.type='checkbox';consentBox.required=true;consent.prepend(consentBox);pf.append(consent);
 const pb=button(pf,'ارسال پروفایل برای بررسی');
 pf.addEventListener('submit',e=>{e.preventDefault();if(!pf.reportValidity())return;const data=Object.fromEntries(new FormData(pf).entries());
 data.authorId=a.authorId;data.cvPublicConsent=pub.checked;data.privacyConsent='AUTHOR_PRIVATE_ONBOARDING_V1';
 jsonPost('/profile',data,pb);});
 wrap.append(pf);
 const bf=el('form','','jp-kyc-form');bf.append(el('h3','۲. حساب بانکی شخص مؤلف'));
 bf.append(el('p','شماره کارت ۱۶ رقمی و شبای IR با ۲۴ رقم باید به حساب متعلق به خود مؤلف مربوط باشند. ثبت آن‌ها درخواست بررسی است، نه مجوز پرداخت.','jp-small'));
 field(bf,'holderName','نام صاحب حساب','text',bank.holder_name,true);
 field(bf,'bankName','نام بانک','text',bank.bank_name,true);
 field(bf,'card','شماره کارت بدون فاصله','password','',true);
 field(bf,'iban','شماره شبا (IR + ۲۴ رقم)','password','',true);
 const bb=button(bf,'ارسال اطلاعات بانکی برای تأیید');
 bf.addEventListener('submit',e=>{e.preventDefault();if(bf.reportValidity()){
  const data=Object.fromEntries(new FormData(bf).entries());data.authorId=a.authorId;
  jsonPost('/bank',data,bb).then(()=>{bf.elements.card.value='';bf.elements.iban.value='';});
 }});
 wrap.append(bf);
 const df=el('form','','jp-kyc-form');df.enctype='multipart/form-data';
 df.append(el('h3','۳. بارگذاری مدارک پشتیبان'));
 pick(df,'kind','نوع مدرک',[['identity_front','تصویر روی مدرک هویتی'],['identity_back','تصویر پشت مدرک هویتی'],['academic_cv','رزومه علمی'],['bank_ownership','گواهی مالکیت حساب بانکی'],['other','سایر مستندات']]);
 const doc=field(df,'document','فایل PDF یا JPG یا PNG، حداکثر ۵ مگابایت','file','',true);
 doc.accept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
 const db=button(df,'بارگذاری محرمانه و ارسال برای بررسی');
 df.addEventListener('submit',async e=>{
  e.preventDefault();if(!df.reportValidity())return;
  if(!doc.files||doc.files.length!==1||doc.files[0].size>5242880){info('حجم فایل یا تعداد آن مجاز نیست.');return;}
  db.disabled=true;info('در حال بررسی و ذخیره امن مدرک...');
  try{const body=new FormData(df);body.set('authorId',a.authorId);
   const res=await fetch(api+'/document',{method:'POST',credentials:'same-origin',cache:'no-store',body});
   const result=await res.json();if(!res.ok||result.ok!==true)throw Error(result.error||'upload_failed');
   info('مدرک به‌صورت محرمانه ثبت شد؛ نتیجه بررسی مدیر در داشبورد نمایش داده می‌شود.');doc.value='';await load(true);
  }catch(e){info('ثبت مدرک تأیید نشد: '+String(e.message||'خطا'));}
  finally{db.disabled=false;}
 });
 wrap.append(df);
 const docs=el('ul','','jp-work-list');
 for(const d of a.documents||[]){const li=el('li',d.document_kind+' · '+d.review_state+' · '+(d.submitted_at||'')+
   (d.review_note?' · نظر مدیر: '+d.review_note:''));docs.append(li);}
 if(!docs.childElementCount)docs.append(el('li','هنوز مدرکی ثبت نشده است.'));
 wrap.append(el('h3','سوابق مستندات'),docs);
 host.append(wrap);
}
async function load(quiet=false){
 try{
  const res=await fetch(api,{credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'}});
  if(!res.ok)throw Error(res.status===503?'schema_not_installed':res.status===403?'author_role_not_verified':'login_required');
  const v=await res.json();if(v.ok!==true||!v.authors?.length)throw Error('no_author_record');
  const selected=v.authors.find(entry=>entry.authorId===selectedAuthorId)||v.authors[0];
  selectedAuthorId=selected.authorId;
  render(selected,v.authors);
  if(!quiet)info('پرونده انتخاب‌شده در محیط محرمانه متصل به حساب کاربری نمایش داده می‌شود.');
 }catch(e){info(e.message==='schema_not_installed'?
  'ثبت پرونده تا اجرای مهاجرت امن دیتابیس مادر در مرحله نهایی انتشار غیرفعال است؛ هیچ مدرکی اکنون جمع‌آوری نمی‌شود.':
  'برای دسترسی به پرونده مؤلف، ورود و تأیید نقش مؤلف لازم است.');}
}
load();
})();