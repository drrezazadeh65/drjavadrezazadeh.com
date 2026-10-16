/* JR moderated Persian article comments. No external dependencies, no review schema.
   The server feature flag keeps this surface invisible until operationally certified. */
(()=>{'use strict';
const page=location.pathname.replace(/index\.html$/,'');
if(!/^\/fa\/akhbar\/[a-z0-9-]+\/$/.test(page))return;
const article=document.querySelector('main article');
if(!article||article.querySelector('[data-jr-community]'))return;
const api='/api/community/';
const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n;};
const host=el('section','jr-community');host.dataset.jrCommunity='1';
host.setAttribute('aria-labelledby','jr-community-title');
const heading=el('h2','', 'دیدگاه خوانندگان و امتیازدهی');heading.id='jr-community-title';
const explanation=el('p','jr-community-intro','دیدگاه‌ها پس از بررسی مدیر منتشر می‌شوند. امتیازها صرفاً تجربه خوانندگان هستند و به معنای تأیید علمی محتوا نیستند.');
const listing=el('div','jr-community-list');
const status=el('p','jr-community-status','در حال دریافت دیدگاه‌های تأییدشده…');
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
host.append(heading,explanation,listing,status);
const form=el('form','jr-community-form');
form.innerHTML='<h3>دیدگاه خود را ثبت کنید</h3><label>امتیاز اختیاری<select name="rating"><option value="">بدون امتیاز</option><option value="5">۵ ستاره</option><option value="4">۴ ستاره</option><option value="3">۳ ستاره</option><option value="2">۲ ستاره</option><option value="1">۱ ستاره</option></select></label><label>متن دیدگاه<textarea name="body" required minlength="12" maxlength="2000" rows="5" placeholder="دیدگاه خود را محترمانه و مرتبط با این مقاله بنویسید."></textarea></label><p class="jr-community-privacy">لطفاً اطلاعات خصوصی دانش‌آموزان یا اشخاص دیگر را وارد نکنید. متن دیدگاه و امتیاز، فقط پس از تأیید مدیر، برای عموم قابل مشاهده است. <a href="/fa/harim-khosusi/">سیاست حریم خصوصی</a></p><label class="jr-community-consent"><input type="checkbox" name="consent" required> با بررسی و انتشار عمومی احتمالی دیدگاه و امتیاز خود پس از تأیید مدیر موافقم.</label><button type="submit">ارسال برای بررسی مدیر</button><p class="jr-community-form-status" role="status" aria-live="polite"></p>';
form.hidden=true;host.append(form);
const login=el('p','jr-community-login');
const signIn=el('a','','برای ارسال دیدگاه، وارد حساب تأییدشده خود شوید.');
signIn.href='/fa/login/';login.append(signIn);login.hidden=true;host.append(login);
article.append(host);
async function request(url,options={}){
 const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
 let body=null;try{body=await r.json();}catch(_){}
 return {status:r.status,ok:r.ok,body};
}
async function load(){
 let result;try{result=await request(api+'comments?page='+encodeURIComponent(page));}catch(_){host.remove();return;}
 // Fail closed: do not advertise a feature until the backend + DB + owner flags are actually live.
 if(!result.ok||result.body?.schema!=='community-comments-v1'||!Array.isArray(result.body.comments)){host.remove();return;}
 listing.replaceChildren();
 if(!result.body.comments.length)listing.append(el('p','jr-community-empty','هنوز دیدگاه تأییدشده‌ای ثبت نشده است.'));
 for(const c of result.body.comments.slice(0,20)){
  if(!c||typeof c.body!=='string')continue;
  const box=el('article','jr-community-comment');
  const meta=el('p','jr-community-comment-meta','خواننده تأییدشده');
  if(Number.isInteger(c.rating)&&c.rating>=1&&c.rating<=5)meta.textContent+=' · '+String(c.rating)+' از ۵ ستاره';
  const body=el('p','jr-community-body',c.body);
  box.append(meta,body);listing.append(box);
 }
 status.textContent='فقط دیدگاه‌های تأییدشده مدیر نمایش داده می‌شوند.';
 const token=await request(api+'csrf').catch(()=>({ok:false}));
 if(token.ok&&typeof token.body?.csrfToken==='string'&&/^[a-f0-9]{64}$/i.test(token.body.csrfToken)){
  login.hidden=true;form.hidden=false;
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(!form.reportValidity())return;
   const button=form.querySelector('button[type="submit"]'),feedback=form.querySelector('.jr-community-form-status');
   const field=form.elements.body,choice=form.elements.rating;
   const value=String(field.value||'').trim(),rating=choice.value?Number(choice.value):null;
   const consentToPublication=form.elements.consent.checked===true;
   if(!consentToPublication){feedback.textContent='برای ارسال دیدگاه باید با بررسی و انتشار احتمالی آن موافقت کنید.';return;}
   button.disabled=true;feedback.textContent='در حال ثبت امن…';
   try{
    const r=await request(api+'comments',{method:'POST',headers:{'Content-Type':'application/json','X-JR-Community-CSRF':token.body.csrfToken},body:JSON.stringify({page,body:value,rating,consentToPublication})});
    if(r.status===202&&r.body?.state==='pending'){feedback.textContent='دیدگاه شما برای بررسی مدیر ثبت شد و هنوز عمومی نیست.';form.reset();button.disabled=true;}
    else {feedback.textContent=r.status===409?'برای این مقاله قبلاً دیدگاه ثبت کرده‌اید.':r.status===429?'لطفاً بعداً دوباره تلاش کنید.':'ثبت دیدگاه ممکن نشد. لطفاً دوباره تلاش کنید.';button.disabled=false;}
   }catch(_){feedback.textContent='ارتباط برقرار نشد. دوباره تلاش کنید.';button.disabled=false;}
  });
 }else {form.hidden=true;login.hidden=false;}
}
load();
})();