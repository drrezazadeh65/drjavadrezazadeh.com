/* JR Academic Editorial Governance — existing MFA-controlled Operations workspace.
 * All private text is rendered with textContent, never unsanitized HTML.
 * Owner's five provisioned mother-database tables; no duplicate dashboard or API. */
(()=>{'use strict';
const workspace=document.getElementById('ops-workspace');if(!workspace)return;
const fa=document.documentElement.lang==='fa',t=(a,b)=>fa?a:b;
const elt=(tag,klass,content)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(content!==undefined)n.textContent=content;return n;};
const panel=elt('section','ops-panel jr-community-admin');panel.id='jr-community-admin';
panel.setAttribute('aria-labelledby','jr-community-admin-heading');
const header=elt('div','jr-community-admin-header');
const logo=elt('img','jr-community-admin-logo');logo.src='/favicon.svg';logo.alt='';logo.width=54;logo.height=54;logo.loading='lazy';
const titleWrap=elt('div','jr-community-admin-titles');
titleWrap.append(elt('p','jr-community-admin-kicker','JR · EDITORIAL GOVERNANCE'));
const heading=elt('h2','',t('مرکز مدیریت گفت‌وگوی علمی','Academic Dialogue & Editorial Moderation'));
heading.id='jr-community-admin-heading';titleWrap.append(heading);header.append(logo,titleWrap);
const note=elt('p','ops-muted',t('دیدگاه‌ها فقط بعد از تأیید مدیر منتشر می‌شوند. پاسخ رسمی ابتدا پیش‌نویس است؛ حذف دائمی پس از خارج‌کردن نظر از نمایش عمومی امکان‌پذیر است.','Only approved comments are public. Official replies start as drafts. Permanent erasure requires prior removal.'));
const toolbar=elt('div','jr-community-admin-toolbar');
const stateLabel=elt('label','',t('وضعیت دیدگاه‌ها','Comment status'));
const stateSelect=elt('select','jr-community-admin-state');
const states=[
 ['pending',t('در انتظار تأیید','Pending review')],
 ['approved',t('منتشرشده','Published')],
 ['rejected',t('ردشده','Rejected')],
 ['removed',t('حذف‌شده از نمایش','Hidden from public')]
];
for(const [value,label] of states){const option=elt('option','',label);option.value=value;stateSelect.append(option);}
stateLabel.append(stateSelect);
const reload=elt('button','',t('تازه‌سازی','Refresh'));reload.type='button';
toolbar.append(stateLabel,reload);
const status=elt('p','ops-muted','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const list=elt('div','jr-community-admin-list');
const older=elt('button','jr-community-admin-more',t('نمایش دیدگاه‌های قدیمی‌تر','Load older comments'));
older.type='button';older.hidden=true;
panel.append(header,note,toolbar,status,list,older);workspace.append(panel);
let generation=0,csrf=null,loading=false,nextCursor=null,canErase=false;
async function json(path,opts={}){
 const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...opts});
 let body=null;try{body=await res.json();}catch(_){}
 return {ok:res.ok,status:res.status,body};
}
function lock(){
 generation++;csrf=null;nextCursor=null;loading=false;canErase=false;
 list.replaceChildren();older.hidden=true;
 status.textContent=t('برای دسترسی به دیدگاه‌ها، احراز هویت مدیر و تأیید دومرحله‌ای لازم است.','Administrator authorization and fresh MFA are required.');
}
async function token(){
 if(csrf)return csrf;
 const active=generation;
 const r=await json('/api/community/csrf');
 if(workspace.hidden||active!==generation)throw Error('locked');
 if(!r.ok||!r.body?.csrfToken||!/^[a-f0-9]{64}$/i.test(r.body.csrfToken))throw Error('csrf');
 csrf=r.body.csrfToken;return csrf;
}
async function mutate(endpoint,payload){
 if(workspace.hidden)throw Error('locked');
 const key=await token();
 if(workspace.hidden)throw Error('locked');
 const result=await json(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-JR-Community-CSRF':key},body:JSON.stringify(payload)});
 if(!result.ok||result.body?.ok!==true)throw Error('server '+result.status);
 return result.body;
}
function actionButton(label,handler,klass=''){
 const button=elt('button',klass,label);button.type='button';
 button.addEventListener('click',async()=>{
  if(workspace.hidden)return;
  button.disabled=true;
  try{await handler();}catch(_){status.textContent=t('درخواست تأیید نشد؛ لطفاً وضعیت و دسترسی مدیر را بررسی کنید.','Request was not confirmed; check current status and MFA.');}
  finally{if(!workspace.hidden)button.disabled=false;}
 });
 return button;
}
function metadata(c){
 const line=c.page+(c.rating?' · '+c.rating+'/5':'');
 const p=elt('span','jr-community-admin-meta',line);
 p.dir='ltr';return p;
}
function replyForm(comment,container,active){
 const form=elt('form','jr-community-admin-reply-form');
 const label=elt('label','',t('پاسخ رسمی مدیر — ابتدا پیش‌نویس','Official reply — saved as a draft'));
 const textarea=elt('textarea','');textarea.name='officialReply';textarea.required=true;
 textarea.maxLength=6000;textarea.rows=4;
 textarea.placeholder=t('پاسخی روشن، مستند و محترمانه بنویسید…','Write a clear and professionally grounded response…');
 label.append(textarea);
 const save=elt('button','',t('ذخیره پیش‌نویس پاسخ','Save reply draft'));save.type='submit';
 const result=elt('p','jr-community-admin-reply-status','');result.setAttribute('role','status');
 form.append(label,save,result);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(workspace.hidden||active!==generation)return;
  const body=textarea.value.trim();
  if(!body||body.length>6000){result.textContent=t('متن پاسخ معتبر نیست.','Reply text is invalid.');return;}
  save.disabled=true;
  try{
   await mutate('/api/community/admin/replies',{action:'create',commentId:comment.id,body});
   textarea.value='';
   result.textContent=t('پیش‌نویس ثبت شد؛ هنوز منتشر نشده است.','Draft saved; not yet public.');
   await loadReplies(comment,container,active);
  }catch(_){result.textContent=t('ذخیره پیش‌نویس انجام نشد.','Unable to save draft.');}
  finally{if(!workspace.hidden)save.disabled=false;}
 });
 return form;
}
function replyActions(reply,container,comment,active){
 const actions=elt('div','jr-community-admin-actions');
 const transitions={
  draft:[['publish',t('انتشار پاسخ رسمی','Publish official reply')],['remove',t('حذف از چرخه انتشار','Remove draft')]],
  published:[['hide',t('پنهان‌سازی پاسخ','Hide reply')],['remove',t('حذف از نمایش','Remove reply')]],
  hidden:[['publish',t('انتشار مجدد','Publish again')],['remove',t('حذف از چرخه انتشار','Remove reply')]],
  removed:[['restore',t('بازیابی به پیش‌نویس','Restore as draft')]]
 };
 for(const [action,label] of transitions[reply.state]||[]){
  actions.append(actionButton(label,async()=>{
   await mutate('/api/community/admin/replies',{action,replyId:reply.id,expectedRevision:reply.revision});
   await loadReplies(comment,container,active);
  },action==='remove'?'jr-community-admin-danger':''));
 }
 if(reply.state!=='removed'){
  const edit=elt('details','jr-community-admin-editor');
  edit.append(elt('summary','',t('ویرایش متن پاسخ','Edit official reply')));
  const form=elt('form','');
  const textarea=elt('textarea','',reply.body);textarea.rows=4;textarea.maxLength=6000;
  const save=elt('button','',t('ذخیره ویرایش','Save revision'));save.type='submit';
  const feedback=elt('p','',t('هر ویرایش در تاریخچه ثبت می‌شود.','Every edit is recorded in the revision history.'));
  form.append(textarea,save,feedback);edit.append(form);
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(workspace.hidden||active!==generation)return;
   save.disabled=true;
   try{
    await mutate('/api/community/admin/replies',{action:'edit',replyId:reply.id,expectedRevision:reply.revision,body:textarea.value.trim()});
    await loadReplies(comment,container,active);
   }catch(_){feedback.textContent=t('ویرایش ثبت نشد؛ نسخه فعلی را تازه‌سازی کنید.','Edit rejected. Reload the current version.');}
   finally{if(!workspace.hidden)save.disabled=false;}
  });
  actions.append(edit);
 }
 const history=elt('details','jr-community-admin-history');
 history.append(elt('summary','',t('تاریخچه پاسخ','Reply revision history')));
 const historyList=elt('ol','');
 history.append(historyList);
 let seen=false;
 history.addEventListener('toggle',async()=>{
  if(!history.open||seen||workspace.hidden||active!==generation)return;
  seen=true;
  try{
   const r=await json('/api/community/admin/revisions?reply='+encodeURIComponent(reply.id));
   if(!r.ok||!Array.isArray(r.body?.items))throw Error('history');
   for(const h of r.body.items){
    const li=elt('li','',String(h.revision)+' · '+String(h.event)+' · '+new Date(h.createdAt*1000).toLocaleString(fa?'fa-IR':'en-US'));
    if(typeof h.body==='string')li.append(elt('p','',h.body));
    historyList.append(li);
   }
  }catch(_){historyList.append(elt('li','',t('تاریخچه در دسترس نیست.','History unavailable.')));}
 });
 actions.append(history);
 if(reply.state==='removed'&&canErase)actions.append(erasureControl('admin_reply',reply.id,()=>loadReplies(comment,container,active)));
 return actions;
}
async function loadReplies(comment,container,active){
 if(workspace.hidden||active!==generation)return;
 container.replaceChildren(elt('p','ops-muted',t('در حال دریافت پاسخ‌ها…','Loading official replies…')));
 try{
  const r=await json('/api/community/admin/replies?comment='+encodeURIComponent(comment.id));
  if(!r.ok||!Array.isArray(r.body?.items))throw Error('replies');
  if(workspace.hidden||active!==generation)return;
  container.replaceChildren();
  for(const reply of r.body.items){
   const item=elt('article','jr-community-admin-reply');
   item.append(elt('p','jr-community-admin-meta',t('پاسخ رسمی · وضعیت: ','Official reply · State: ')+reply.state));
   item.append(elt('p','jr-community-admin-reply-body',reply.body));
   item.append(replyActions(reply,container,comment,active));
   container.append(item);
  }
  if(comment.state==='approved')container.append(replyForm(comment,container,active));
  if(!r.body.items.length&&comment.state!=='approved')
   container.append(elt('p','ops-muted',t('پاسخی برای این دیدگاه ثبت نشده است.','No replies for this comment.')));
 }catch(_){if(active===generation&&!workspace.hidden)container.replaceChildren(elt('p','ops-muted',t('بارگذاری پاسخ‌ها ممکن نشد.','Official replies unavailable.')));}
}
function erasureControl(kind,id,completed){
 const group=elt('details','jr-community-admin-erasure');
 group.append(elt('summary','',t('حذف دائمی با ثبت سابقه','Permanent erasure with audit')));
 const form=elt('form','');
 const instruction=elt('p','ops-muted',t('این عمل برگشت‌ناپذیر است. برای تأیید، ERASE را بنویسید.','Irreversible operation. Type ERASE to confirm.'));
 const reasonLabel=elt('label','',t('دلیل حذف','Erasure reason'));
 const reason=elt('select','');
 for(const [code,title] of [['owner_request',t('درخواست صاحب داده','Data subject request')],['spam',t('اسپم','Spam')],['abuse',t('سوءاستفاده','Abuse')],['privacy',t('حریم خصوصی','Privacy')],['retention',t('پایان دوره نگهداری','Retention')],['other',t('سایر','Other')]]){
  const option=elt('option','',title);option.value=code;reason.append(option);
 }
 reasonLabel.append(reason);
 const confirmLabel=elt('label','',t('تأیید دستی حذف','Type confirmation'));
 const confirm=elt('input','');confirm.autocomplete='off';confirm.required=true;confirm.placeholder='ERASE';
 confirmLabel.append(confirm);
 const send=elt('button','jr-community-admin-danger',t('حذف دائمی و ثبت حسابرسی','Permanently erase and audit'));send.type='submit';
 const result=elt('p','','');form.append(instruction,reasonLabel,confirmLabel,send,result);group.append(form);
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(workspace.hidden||confirm.value!=='ERASE'){result.textContent=t('عبارت ERASE را دقیق وارد کنید.','Type ERASE exactly.');return;}
  send.disabled=true;
  try{await mutate('/api/community/admin/erase',{targetKind:kind,targetId:id,reasonCode:reason.value,confirmation:confirm.value});await completed();}
  catch(_){result.textContent=t('حذف دائمی تأیید نشد؛ وضعیت قبلی حفظ شده است.','Permanent erasure was not confirmed.');}
  finally{if(!workspace.hidden)send.disabled=false;}
 });
 return group;
}
function render(c,kind,active){
 if(!c||typeof c.id!=='string'||typeof c.body!=='string'||typeof c.page!=='string')return;
 const row=elt('details','jr-community-admin-item');
 const summary=elt('summary','jr-community-admin-summary');
 summary.append(metadata(c));
 summary.append(elt('span','jr-community-admin-summary-state',states.find(s=>s[0]===kind)?.[1]||kind));
 row.append(summary);
 const content=elt('div','jr-community-admin-item-content');
 content.append(elt('p','jr-community-admin-message',c.body.trim()
   ?c.body
   :c.rating&&Number.isInteger(c.rating)
     ?t('ثبت امتیاز بدون دیدگاه متنی؛ ابتدا عدد رأی و شرایط انتشار را بررسی کنید.','Rating submitted without written commentary; review the vote and publication conditions.')
     :t('متن دیدگاه موجود نیست؛ پیش از تأیید بررسی شود.','Comment text is absent; review before approval.')));
 const actions=elt('div','jr-community-admin-actions');
 for(const [decision,label] of (kind==='pending'
  ?[['approved',t('تأیید و انتشار','Approve and publish')],['rejected',t('رد دیدگاه','Reject')]]
  :kind==='approved'?[['removed',t('حذف از نمایش عمومی','Remove from public display')]]:[])){
  actions.append(actionButton(label,async()=>{
   const result=await mutate('/api/community/moderation',{id:c.id,decision});
   if(result.state!==decision)throw Error('decision');
   await load();
  },decision==='removed'?'jr-community-admin-danger':''));
 }
 if(actions.children.length)content.append(actions);
 if(kind==='approved'){
  const replies=elt('details','jr-community-admin-replies-panel');
  replies.append(elt('summary','',t('پاسخ رسمی و تاریخچه','Official replies & history')));
  const host=elt('div','jr-community-admin-replies-host');replies.append(host);
  let loaded=false;
  replies.addEventListener('toggle',()=>{if(replies.open&&!loaded){loaded=true;loadReplies(c,host,active);}});
  content.append(replies);
 }
 if(canErase&&(kind==='removed'||kind==='rejected'))content.append(erasureControl('comment',c.id,load));
 row.append(content);list.append(row);
}
async function load(cursor=null){
 if(workspace.hidden){lock();return;}
 if(loading)return;
 const active=cursor?generation:++generation;loading=true;reload.disabled=true;older.disabled=true;
 if(!cursor)list.replaceChildren();
 const kind=stateSelect.value;
 status.textContent=t('در حال دریافت داده‌های محرمانه…','Loading private moderation records…');
 try{
  const params=new URLSearchParams({state:kind});
  if(cursor){params.set('beforeCreatedAt',String(cursor.createdAt));params.set('beforeId',cursor.id);}
  const result=await json('/api/community/moderation?'+params.toString());
  if(active!==generation||workspace.hidden)return;
  if(!result.ok){
   status.textContent=result.status===503?t('این قابلیت هنوز برای استفاده عمومی فعال نشده است.','Community platform remains disabled.'):t('دسترسی مدیر یا MFA معتبر نیست.','Administrator authentication or MFA is invalid.');
   return;
  }
  const body=result.body||{};
  canErase=body.canErase===true;
  const legacy=kind==='approved'?(body.approved||[]):(body.pending||[]);
  const items=Array.isArray(body.items)?body.items:legacy;
  nextCursor=body.nextCursor&&typeof body.nextCursor.id==='string'?body.nextCursor:null;
  for(const c of items)render(c,kind,active);
  older.hidden=!nextCursor;
  if(!items.length&&!cursor)list.append(elt('p','ops-muted',t('در این بخش دیدگاهی وجود ندارد.','No comments in this category.')));
  status.textContent=t('دیدگاه‌های بارگذاری‌شده: ','Loaded comments: ')+list.querySelectorAll('.jr-community-admin-item').length;
 }catch(_){if(active===generation&&!workspace.hidden)status.textContent=t('اتصال به سرور برقرار نشد.','Server connection failed.');}
 finally{if(active===generation&&!workspace.hidden){loading=false;reload.disabled=false;older.disabled=false;}}
}
reload.addEventListener('click',()=>{generation++;loading=false;load();});
stateSelect.addEventListener('change',()=>{generation++;loading=false;nextCursor=null;load();});
older.addEventListener('click',()=>{if(nextCursor)load(nextCursor);});
const observer=new MutationObserver(()=>workspace.hidden?lock():load());
observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
if(!workspace.hidden)load();else lock();
})();