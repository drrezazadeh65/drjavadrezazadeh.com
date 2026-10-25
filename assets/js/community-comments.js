/* JR moderated academic commentary. Public Persian articles and opt-in bilingual services.
   The server feature flag keeps this surface invisible until operationally certified. */
(()=>{'use strict';
const page=location.pathname.replace(/index\.html$/,'');
const isArticle=/^\/fa\/(?:akhbar|rahnamaha)\/[a-z0-9-]+\/$/.test(page);
const isService=/^\/(?:fa|en)\/services\/[a-z][a-z0-9_]{1,59}\/$/.test(page);
if(!isArticle&&!isService)return;
const en=document.documentElement.lang==='en';
const locale=en?'en-US':'fa-IR';
const tr=(fa,english)=>en?english:fa;
const article=document.querySelector('main article');
if(!article||article.querySelector('[data-jr-community]'))return;
const api='/api/community/';
const el=(tag,cls,content)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(content!==undefined)n.textContent=content;return n;};
const host=el('section','jr-community');host.dataset.jrCommunity='1';
host.setAttribute('aria-labelledby','jr-community-title');
const identity=el('div','jr-community-heading');
const mark=el('img','jr-community-mark');mark.src='/favicon.svg';mark.width=54;mark.height=54;mark.alt='';mark.loading='lazy';mark.decoding='async';
const titleGroup=el('div','jr-community-title-group');
const eyebrow=el('p','jr-community-eyebrow',tr('ACADEMIC DIALOGUE · گفت‌وگوی علمی','ACADEMIC DIALOGUE · Scholarly conversation'));
const heading=el('h2','',tr(isService?'پرسش درباره این خدمت':'دیدگاه خوانندگان و امتیازدهی',isService?'Questions about this service':'Reader comments and article ratings'));heading.id='jr-community-title';
titleGroup.append(eyebrow,heading);identity.append(mark,titleGroup);
const explanation=el('p','jr-community-intro',tr(isService?'پرسش‌های مرتبط با شرایط این خدمت پس از بررسی مدیر منتشر می‌شوند. ثبت پرسش به معنای خرید یا دریافت خدمت نیست.':'دیدگاه‌ها پس از بررسی مدیر منتشر می‌شوند. پاسخ‌های رسمی مدیریت علمی در زیر هر دیدگاه تأییدشده مشخص هستند؛ امتیاز کاربران به معنای تأیید علمی محتوا نیست.',isService?'Relevant questions appear only after editorial review. Asking a question does not mean the service has been purchased or delivered.':'Comments appear only after editorial review. Official management replies appear under approved comments; reader ratings do not certify scientific validity.'));
const ratingSummary=el('p','jr-community-rating-summary','');
ratingSummary.setAttribute('aria-live','polite');
ratingSummary.hidden=true;
const listing=el('div','jr-community-list');
const status=el('p','jr-community-status',tr('در حال دریافت دیدگاه‌های تأییدشده…','Loading approved comments…'));
status.setAttribute('role','status');status.setAttribute('aria-live','polite');
host.append(identity,explanation,ratingSummary,listing,status);
const form=el('form','jr-community-form');
form.setAttribute('dir',en?'ltr':'rtl');
form.innerHTML='<h3>دیدگاه خود را ثبت کنید</h3><fieldset class="jr-community-rating"><legend>امتیاز اختیاری به این مقاله</legend><div class="jr-community-rating-options"><label><input type="radio" name="rating" value="" checked><span>بدون امتیاز</span></label><label><input type="radio" name="rating" value="1"><span aria-label="۱ از ۵ ستاره">★</span></label><label><input type="radio" name="rating" value="2"><span aria-label="۲ از ۵ ستاره">★★</span></label><label><input type="radio" name="rating" value="3"><span aria-label="۳ از ۵ ستاره">★★★</span></label><label><input type="radio" name="rating" value="4"><span aria-label="۴ از ۵ ستاره">★★★★</span></label><label><input type="radio" name="rating" value="5"><span aria-label="۵ از ۵ ستاره">★★★★★</span></label></div></fieldset><label>متن دیدگاه<textarea name="body" required minlength="12" maxlength="2000" rows="5" placeholder="دیدگاه خود را محترمانه و مرتبط با این مقاله بنویسید."></textarea></label><p class="jr-community-privacy">لطفاً اطلاعات خصوصی دانش‌آموزان یا اشخاص دیگر را وارد نکنید. متن دیدگاه و امتیاز، فقط پس از تأیید مدیر، برای عموم قابل مشاهده است. <a href="/fa/harim-khosusi/">سیاست حریم خصوصی</a></p><label class="jr-community-consent"><input type="checkbox" name="consent" required> با بررسی و انتشار عمومی احتمالی دیدگاه و امتیاز خود پس از تأیید مدیر موافقم.</label><button type="submit">ارسال برای بررسی مدیر</button><p class="jr-community-form-status" role="status" aria-live="polite"></p>';
if(isService){
 // Service Q&A is NOT a buyer-verified review. Never collect/display stars.
 const faq=tr('<h3>پرسش خود را درباره این خدمت مطرح کنید</h3><label>متن پرسش<textarea name="body" required minlength="12" maxlength="2000" rows="5" placeholder="پرسشی روشن و مرتبط با شرایط این خدمت بنویسید."></textarea></label><p class="jr-community-privacy">اطلاعات خصوصی یا محتوای محرمانه پژوهشی را درج نکنید. پرسش فقط پس از تأیید مدیر منتشر می‌شود. <a href="/fa/harim-khosusi/">سیاست حریم خصوصی</a></p><label class="jr-community-consent"><input type="checkbox" name="consent" required> با بررسی و انتشار احتمالی پرسش خود موافقم.</label><button type="submit">ارسال پرسش برای بررسی</button><p class="jr-community-form-status" role="status" aria-live="polite"></p>',
 '<h3>Ask a question about this service</h3><label>Your question<textarea name="body" required minlength="12" maxlength="2000" rows="5" placeholder="Ask a clear and relevant question about this service."></textarea></label><p class="jr-community-privacy">Do not share private personal data or confidential manuscripts. Questions become public only after approval. <a href="/privacy/">Privacy notice</a></p><label class="jr-community-consent"><input type="checkbox" name="consent" required> I agree to review and possible public publication of my question.</label><button type="submit">Submit question for moderation</button><p class="jr-community-form-status" role="status" aria-live="polite"></p>');
 form.innerHTML=faq;
}
// A quiet honeypot supplements verified accounts, server CSRF and rate limits.
const honeypot=el('label','jr-community-honeypot',tr('این قسمت باید خالی بماند','Leave this field blank'));
honeypot.setAttribute('aria-hidden','true');
const honeypotInput=el('input','');honeypotInput.type='text';honeypotInput.name='website';
honeypotInput.autocomplete='off';honeypotInput.tabIndex=-1;
honeypot.append(honeypotInput);form.append(honeypot);
const formPanel=el('details','jr-community-compose');
formPanel.append(el('summary','',tr('ثبت دیدگاه یا پرسش علمی','Submit a scholarly comment or question')));
formPanel.append(form);
form.hidden=true;formPanel.hidden=true;host.append(formPanel);
const login=el('p','jr-community-login');
const signIn=el('a','',tr('برای ارسال دیدگاه، وارد حساب تأییدشده خود شوید.','Sign in to your verified account to submit a comment or question.'));
signIn.href=en?'/en/login/':'/fa/login/';login.append(signIn);login.hidden=true;host.append(login);
// Do not mount a community UI before the server confirms the gated feature.
async function request(url,options={}){
 const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
 let body=null;try{body=await r.json();}catch(_){}
 return {status:r.status,ok:r.ok,body};
}
async function load(){
 let result;try{result=await request(api+'comments?page='+encodeURIComponent(page));}catch(_){host.remove();return;}
 // Fail closed: do not advertise a feature until the backend + DB + owner flags are actually live.
 if(!result.ok||result.body?.schema!=='community-comments-v1'||!Array.isArray(result.body.comments)){host.remove();return;}
 host.setAttribute('dir',en?'ltr':'rtl');
 article.append(host);
 const summary=result.body.ratingSummary;
 const count=summary?.count;
 const mean=summary?.mean;
 if(Number.isInteger(count)&&count>0&&count<=100000000 &&
    typeof mean==='number'&&Number.isFinite(mean)&&mean>=1&&mean<=5){
  ratingSummary.textContent=tr('میانگین امتیازهای تأییدشده: ','Mean of approved article ratings: ')+mean.toLocaleString(en?'en-US':'fa-IR',
    {minimumFractionDigits:1,maximumFractionDigits:1})+tr(' از ۵ · ',' / 5 · ')+count.toLocaleString(en?'en-US':'fa-IR')+tr(' رأی',' ratings');
  ratingSummary.hidden=false;
 }else{ratingSummary.hidden=true;ratingSummary.textContent='';}
 listing.replaceChildren();
 if(!result.body.comments.length)listing.append(el('p','jr-community-empty',tr('هنوز دیدگاه تأییدشده‌ای ثبت نشده است.','No approved comments have been published.')));
 for(const c of result.body.comments.slice(0,20)){
  if(!c||typeof c.body!=='string')continue;
  // Native details/summary: accessible, keyboard-operable academic dialogue accordion.
  // Only server-approved comments and published replies are ever rendered here.
  const box=el('details','jr-community-comment');
  const meta=el('summary','jr-community-comment-meta',tr('پرسش یا دیدگاه خواننده تأییدشده','Question or comment from a verified reader'));
  if(Number.isInteger(c.rating)&&c.rating>=1&&c.rating<=5)meta.textContent+=tr(' · '+String(c.rating)+' از ۵ ستاره',' · '+String(c.rating)+' / 5 stars');
  const body=el('p','jr-community-body',c.body);
  box.append(meta,body);
  const replies=Array.isArray(c.replies)?c.replies.slice(0,30):[];
  if(replies.length){
   const replyList=el('div','jr-community-official-replies');
   replyList.setAttribute('aria-label',tr('پاسخ‌های رسمی مدیریت علمی سایت','Official academic management replies'));
   for(const reply of replies){
    if(!reply||typeof reply.body!=='string')continue;
    const block=el('blockquote','jr-community-official-reply');
    block.append(el('p','jr-community-official-label',tr('پاسخ رسمی مدیریت علمی سایت','Official reply from academic management')));
    block.append(el('p','jr-community-official-body',reply.body));
    replyList.append(block);
   }
   box.append(replyList);
  }
  listing.append(box);
 }
 status.textContent=tr('فقط دیدگاه‌های تأییدشده مدیر نمایش داده می‌شوند.','Only moderator-approved comments are displayed.');
 const token=await request(api+'csrf').catch(()=>({ok:false}));
 if(token.ok&&typeof token.body?.csrfToken==='string'&&/^[a-f0-9]{64}$/i.test(token.body.csrfToken)){
  login.hidden=true;form.hidden=false;formPanel.hidden=false;
  form.addEventListener('submit',async e=>{
   e.preventDefault();
   if(!form.reportValidity())return;
   const button=form.querySelector('button[type="submit"]'),feedback=form.querySelector('.jr-community-form-status');
   const field=form.elements.body,choice=form.elements.rating;
   const value=String(field.value||'').trim(),rating=!isService&&choice?.value?Number(choice.value):null;
   const consentToPublication=form.elements.consent.checked===true;
   if(!consentToPublication){feedback.textContent=tr('برای ارسال دیدگاه باید با بررسی و انتشار احتمالی آن موافقت کنید.','Consent to review and possible publication is required.');return;}
   button.disabled=true;feedback.textContent=tr('در حال ثبت امن…','Submitting securely…');
   try{
    const r=await request(api+'comments',{method:'POST',headers:{'Content-Type':'application/json','X-JR-Community-CSRF':token.body.csrfToken},body:JSON.stringify({page,body:value,rating,consentToPublication,website:String(form.elements.website?.value||'')})});
    if(r.status===202&&r.body?.state==='pending'){feedback.textContent=tr('دیدگاه شما برای بررسی مدیر ثبت شد و هنوز عمومی نیست.','Your submission is awaiting moderation and is not public.');form.reset();button.disabled=false;}
    else {feedback.textContent=r.status===409?tr('برای این صفحه قبلاً دیدگاه ثبت کرده‌اید.','You have already submitted a question or comment on this page.'):r.status===429?tr('لطفاً بعداً دوباره تلاش کنید.','Please try again later.'):tr('ثبت دیدگاه ممکن نشد. لطفاً دوباره تلاش کنید.','Your submission could not be saved. Please try again.');button.disabled=false;}
   }catch(_){feedback.textContent=tr('ارتباط برقرار نشد. دوباره تلاش کنید.','Could not connect. Please try again.');button.disabled=false;}
  });
 }else {form.hidden=true;formPanel.hidden=true;login.hidden=false;}
}
load();
})();