/* JREI News administrator panel — existing operations MFA/CSRF only. */
export function mountNewsOwnerPanel({root,csrfResolver,apiBase,locale='fa'}){
 if(!(root instanceof HTMLElement)||apiBase!=='/api/admin/operations/jrei-news')
   throw Error('NEWS_OWNER_UI_CONTEXT_INVALID');
 const en=locale==='en', t=(fa,enText)=>en?enText:fa;
 let live=true,writing=false;
 const make=(tag,txt)=>{const node=document.createElement(tag);
   if(txt!==undefined)node.textContent=txt;return node;};
 root.replaceChildren();
 const wrap=make('section');wrap.className='jrei-news-source-manager';
 const title=make('h3',t('مدیریت منابع خبری رسمی','Manage official news sources'));
 const intro=make('p',t('ثبت و تأیید مدیر، منبع را به صف پایش اضافه می‌کند. شروع خزش نیازمند سیاست منبع معتبر در JREI است.',
   'Manager approval adds a source to discovery. Crawling requires its original JREI acquisition policy.'));
 const status=make('p','');status.setAttribute('role','status');
 const form=make('form');
 const inputs={};
 for(const [key,label,type,max] of [
  ['title',t('نام پایگاه یا دانشگاه','Institution name'),'text',200],
  ['url',t('نشانی HTTPS رسمی','Official HTTPS URL'),'url',1000]]){
  const holder=make('label',label),field=make('input');
  field.name=key;field.type=type;field.required=true;field.maxLength=max;
  field.autocomplete='off';holder.append(field);form.append(holder);inputs[key]=field;
 }
 const choices=(name,options)=>{
  const select=make('select');select.name=name;
  for(const [val,label] of options){const o=make('option',label);o.value=val;select.append(o);}
  form.append(select);return select;
 };
 const category=choices('category',[
  ['universities',t('دانشگاه','University')],['examinations',t('آزمون','Examination')],
  ['school',t('مدرسه','School')],['research',t('پژوهش','Research')],
  ['employment',t('استخدام','Employment')],['language',t('زبان','Language')],
  ['international',t('بین‌الملل','International')]]);
 const priority=choices('priority',[['P2','P2'],['P1','P1'],['P0','P0']]);
 const add=make('button',t('ثبت منبع جدید','Submit source'));add.type='submit';form.append(add);
 const reload=make('button',t('بروزرسانی فهرست','Refresh list'));reload.type='button';
 const list=make('div');list.className='jrei-news-source-list';
 wrap.append(title,intro,form,reload,status,list);root.append(wrap);
 async function call(path,body){
  if(!live)throw Error('UNMOUNTED');
  const csrf=csrfResolver();
  if(!/^[a-f0-9]{64}$/i.test(csrf))throw Error('NO_MFA');
  const response=await fetch(apiBase+path,{
   method:body?'POST':'GET',credentials:'same-origin',redirect:'error',cache:'no-store',
   headers:{'Accept':'application/json','X-CSRF-Token':csrf,
    ...(body?{'Content-Type':'application/json'}:{})},
   ...(body?{body:JSON.stringify(body)}:{})
  });
  if(!response.ok)throw Error('NEWS_SOURCE_API_'+response.status);
  return response.json();
 }
 async function update(path,body){
  if(writing)return;writing=true;add.disabled=true;reload.disabled=true;
  try{await call(path,body);status.textContent=t('درخواست ثبت شد.','Request recorded.');
    await load();
  }catch(e){status.textContent=t(
    'ثبت انجام نشد؛ نشست مدیر، مجوز منبع و مهاجرت دیتابیس را بررسی کنید.',
    'Request failed; verify admin session, source policy and database migration.');
  }finally{writing=false;add.disabled=false;reload.disabled=false;}
 }
 function button(label,path,body){
  const node=make('button',label);node.type='button';
  node.addEventListener('click',()=>update(path,body));return node;
 }
 async function load(){
  if(!live)return;
  try{
   const data=await call('/owner/admin-sources');
   list.replaceChildren();
   const rows=Array.isArray(data.entries)?data.entries:[];
   if(!rows.length)list.append(make('p',t('منبع سفارشی ثبت نشده است.','No custom sources yet.')));
   for(const row of rows){
    const item=make('article');item.className='jrei-news-source-entry';
    item.append(make('h4',row.source_title),make('p',row.source_url),
      make('p',t('وضعیت: ','State: ')+row.submission_state));
    if(row.last_issue_code)item.append(make('p',row.last_issue_code));
    const id=row.submission_id;
    if(row.submission_state==='PENDING_ADMIN_APPROVAL')
      item.append(button(t('تأیید و افزودن','Approve and add'),
        '/owner/admin-sources/approve',{
         submissionId:id,confirmation:'APPROVE_OFFICIAL_SOURCE_DISCOVERY'}));
    if(['APPROVED_DISCOVERY','ORIGINAL_POLICY_PENDING','MONITOR_STAGED'].includes(row.submission_state))
      item.append(button(t('اتصال به پایشگر','Link monitor'),
        '/owner/admin-sources/reconcile',{submissionId:id}));
    if(row.submission_state!=='DISABLED')
      item.append(button(t('توقف منبع','Disable source'),
        '/owner/admin-sources/disable',{submissionId:id}));
    list.append(item);
   }
  }catch(e){status.textContent=t('پنل منابع هنوز فعال نیست یا مهاجرت دیتابیس باقی مانده است.',
    'Sources are not active yet or the database migration is pending.');}
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();
  update('/owner/admin-sources/submit',{title:inputs.title.value.trim(),
   url:inputs.url.value.trim(),category:category.value,priority:priority.value});
 });
 reload.addEventListener('click',load);
 return {load,unmount(){live=false;root.replaceChildren();}};
}
