/* Moderated comments queue for existing MFA-protected Operations Dashboard.
   Never loads pending text before server confirms administrator role + fresh MFA. */
(()=>{'use strict';
const workspace=document.getElementById('ops-workspace');
if(!workspace)return;
const fa=document.documentElement.lang==='fa',t=(a,b)=>fa?a:b;
const elt=(tag,klass,txt)=>{const n=document.createElement(tag);if(klass)n.className=klass;if(txt!==undefined)n.textContent=txt;return n;};
const panel=elt('section','ops-panel jr-community-admin');panel.id='jr-community-admin';
const header=elt('div','jr-community-admin-header');
const logo=elt('img','jr-community-admin-logo');logo.src='/favicon.svg';logo.width=54;logo.height=54;logo.alt='';logo.loading='lazy';
const titles=elt('div','jr-community-admin-titles');
const kicker=elt('p','jr-community-admin-kicker','JR · EDITORIAL GOVERNANCE');
const heading=elt('h2','',t('مرکز داوری دیدگاه‌ها و امتیازها','Reader Commentary & Rating Review Center'));
heading.id='jr-community-admin-heading';panel.setAttribute('aria-labelledby','jr-community-admin-heading');
titles.append(kicker,heading);header.append(logo,titles);
const note=elt('p','ops-muted',t('دیدگاه‌های در انتظار و منتشرشده جداگانه نمایش داده می‌شوند. هیچ متنی بدون تأیید مدیر منتشر نمی‌شود.','Pending and published commentary are shown separately; nothing becomes public without approval.'));
const status=elt('p','ops-muted','');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
const reload=elt('button','',t('تازه‌سازی صف بررسی','Refresh moderation queue'));reload.type='button';
const list=elt('div','jr-community-admin-list');
panel.append(header,note,reload,status,list);
workspace.append(panel);
let generation=0,csrf=null;
async function json(path,opts={}){
 const res=await fetch(path,{credentials:'same-origin',cache:'no-store',...opts});
 let body=null;try{body=await res.json();}catch(_){}
 return {ok:res.ok,status:res.status,body};
}
function lock(){
 generation++;csrf=null;list.replaceChildren();status.textContent=t('برای مشاهده صف، ورود امن مدیر و تأیید دومرحله‌ای لازم است.','Fresh administrator MFA is required to view the queue.');
}
async function load(){
 if(workspace.hidden){lock();return;}
 const active=++generation;
 reload.disabled=true;list.replaceChildren();
 status.textContent=t('در حال دریافت صف بررسی از سرور امن…','Fetching the private moderation queue…');
 try{
  const response=await json('/api/community/moderation');
  if(active!==generation||workspace.hidden)return;
  if(!response.ok){
   status.textContent=response.status===503?t('این قابلیت هنوز فعال نشده و دیتابیس آن باید تأیید شود.','Community moderation is not activated or provisioned yet.'):t('دسترسی مدیر یا نشست دومرحله‌ای معتبر نیست.','Administrator or MFA authorization is not valid.');
   return;
  }
  const pending=Array.isArray(response.body?.pending)?response.body.pending:[];
  const approved=Array.isArray(response.body?.approved)?response.body.approved:[];
  status.textContent=t('دیدگاه در انتظار تأیید: ','Pending comments: ')+pending.length;
  if(!pending.length)list.append(elt('p','',t('صف بررسی خالی است.','No pending comments.')));
  for(const [kind,items] of [['pending',pending.slice(0,30)],['approved',approved.slice(0,20)]]){
   if(kind==='approved'&&items.length)list.append(elt('h3','',t('دیدگاه‌های منتشرشده — امکان حذف','Published comments — removal control')));
   for(const c of items){
   if(!c||typeof c.id!=='string'||typeof c.body!=='string'||typeof c.page!=='string')continue;
   const row=elt('article','jr-community-admin-item');
   const meta=elt('p','',c.page+(c.rating?' · '+c.rating+'/5':''));
   const message=elt('p','',c.body);message.style.whiteSpace='pre-wrap';message.style.overflowWrap='anywhere';
   const actions=elt('div','jr-community-admin-actions');
   for(const [decision,label] of (kind==='pending'?[['approved',t('تأیید و انتشار','Approve and publish')],['rejected',t('رد دیدگاه','Reject')]]:[['removed',t('حذف از نمایش عمومی','Remove from public display')]])){
    const button=elt('button','',label);button.type='button';
    button.addEventListener('click',async()=>{
     if(workspace.hidden)return;
     button.disabled=true;status.textContent=t('در حال ثبت تصمیم…','Recording decision…');
     try{
      if(!csrf){
       const token=await json('/api/community/csrf');
       if(!token.ok||!token.body?.csrfToken)throw Error('token');
       csrf=token.body.csrfToken;
      }
      const r=await json('/api/community/moderation',{method:'POST',headers:{'Content-Type':'application/json','X-JR-Community-CSRF':csrf},body:JSON.stringify({id:c.id,decision})});
      if(r.ok&&r.body?.state===decision)await load();
      else{status.textContent=t('تأیید سرور دریافت نشد؛ وضعیت تغییر نکرد.','Server did not confirm the decision.');button.disabled=false;}
     }catch(_){status.textContent=t('ثبت تصمیم ممکن نشد.','Could not record moderation decision.');button.disabled=false;}
    });
    actions.append(button);
   }
   row.append(meta,message,actions);list.append(row);
   }
  }
 }catch(_){if(active===generation&&!workspace.hidden)status.textContent=t('اتصال به سرور برقرار نشد.','Server connection failed.');}
 finally{if(active===generation&&!workspace.hidden)reload.disabled=false;}
}
reload.addEventListener('click',load);
const observer=new MutationObserver(()=>workspace.hidden?lock():load());
observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
if(!workspace.hidden)load();else lock();
})();