/* Private bilingual editorial workbench: existing ENG-08/09 modules, no public publishing. */
(()=>{'use strict';
const workspace=document.getElementById('ops-workspace');
if(!workspace)return;
const en=document.documentElement.lang==='en';
const t=(fa,eng)=>en?eng:fa;
const el=(name,text,cls)=>{const node=document.createElement(name);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
const api='/api/admin/operations/editor';
const client=async(endpoint='',options={})=>{
 const r=await fetch(api+endpoint,{credentials:'same-origin',cache:'no-store',
   headers:{Accept:'application/json',...(options.headers||{})},...options});
 const body=await r.json();
 if(!r.ok||body.ok!==true)throw Error(body.error||'network_error');
 return body;
};
let csrf='',hasAccess=false,generation=0,selected=null,version=0,media=null,expanded=false;
const state={id:'',language:'fa',contentType:'article',title:'',bodyMarkdown:'',
 seoTitle:'',seoDescription:'',mediaPath:'',status:'draft'};
let activeForm=null,activeNotice=null,activeDrafts=null,activeMedia=null,activePreview=null;
function note(message,isError=false){
 if(!activeNotice)return;
 activeNotice.textContent=message;
 activeNotice.classList.toggle('ops-error',isError);
}
function renderMarkdownText(body){
 const output=el('div',undefined,'ops-editor-preview-body');
 const lines=body.split('\n').slice(0,600);
 for(const line of lines){
   const heading=line.match(/^(#{1,4})\s+(.+)$/);
   if(heading){
     output.append(el('h'+Math.min(4,heading[1].length+1),heading[2]));
   }else if(/^\s*[-*]\s+/.test(line)){
     output.append(el('p','• '+line.replace(/^\s*[-*]\s+/,'')));
   }else output.append(el('p',line||' '));
 }
 return output;
}
function resetState(){
 Object.assign(state,{id:'',language:'fa',contentType:'article',title:'',
   bodyMarkdown:'',seoTitle:'',seoDescription:'',mediaPath:'',status:'draft'});
 selected=null;version=0;media=null;activeForm=null;activeNotice=null;
 activeDrafts=null;activeMedia=null;activePreview=null;
}
function lock(){
 generation++;csrf='';hasAccess=false;expanded=false;
 resetState();
 const node=document.getElementById('ops-editor-workbench');if(node)node.remove();
}
async function authenticate(){
 const id=++generation;
 try{
   const session=await fetch('/api/admin/operations/session',{credentials:'same-origin',
     cache:'no-store'}).then(r=>r.json());
   if(id!==generation||workspace.hidden||session.ok!==true||session.mfaRequired){
     lock();return false;
   }
   csrf=session.csrfToken;hasAccess=true;return true;
 }catch{lock();return false;}
}
const updateState=()=>{if(!activeForm)return;
 for(const key of ['language','contentType','title','bodyMarkdown','seoTitle','seoDescription','mediaPath','status']){
   const node=activeForm.elements.namedItem(key);if(node)state[key]=node.value;
 }
};
async function listDrafts(){
 const id=generation;
 try{
  const data=await client();
  if(id!==generation||workspace.hidden)return;
  activeDrafts?.replaceChildren();
  if(!data.drafts.length){activeDrafts?.append(el('p',t('هنوز پیش‌نویسی ثبت نشده است.','No saved drafts.')));return;}
  for(const draft of data.drafts){
   const button=el('button',draft.language.toUpperCase()+' · '+draft.title+
     ' · v'+draft.version+' · '+draft.status);
   button.type='button';button.addEventListener('click',()=>openDraft(draft.id));
   activeDrafts?.append(button);
  }
 }catch(e){note(t('دریافت فهرست پیش‌نویس ممکن نشد: ','Could not load drafts: ')+e.message,true);}
}
async function openDraft(id){
 const gen=generation;
 try{
  const data=await client('/draft?id='+encodeURIComponent(id));
  if(gen!==generation||workspace.hidden)return;
  Object.assign(state,data.draft,{id:data.draft.id});
  version=data.draft.version;
  render();
  const history=document.getElementById('ops-editor-revisions');
  if(history){
    history.replaceChildren();
    for(const record of data.revisions||[])history.append(el('li','v'+record.version+
      ' · '+new Date(record.createdAt*1000).toLocaleString(en?'en-US':'fa-IR')));
  }
  note(t('پیش‌نویس و نسخه‌های آن دریافت شد.','Draft and revision history loaded.'));
 }catch(e){note(t('بازکردن پیش‌نویس ناموفق بود: ','Could not open draft: ')+e.message,true);}
}
async function saveDraft(){
 if(!hasAccess||workspace.hidden)return;
 updateState();
 const gen=generation;
 if(!state.title.trim()){note(t('عنوان الزامی است.','A title is required.'),true);return;}
 const body={id:state.id,baseVersion:version,language:state.language,
   contentType:state.contentType,title:state.title,bodyMarkdown:state.bodyMarkdown,
   seoTitle:state.seoTitle,seoDescription:state.seoDescription,
   mediaPath:state.mediaPath,status:state.status};
 try{
  const data=await client('/save',{method:'POST',headers:{
   'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});
  if(gen!==generation||workspace.hidden)return;
  state.id=data.id;version=data.version;
  note(t('نسخه '+version+' در دیتابیس ذخیره شد؛ هیچ صفحه‌ای منتشر نشده است.',
    'Version '+version+' saved to the private database; nothing was published.'));
  await listDrafts();
 }catch(e){if(gen===generation)note(e.message==='draft_version_conflict'
  ?t('نسخه روی سرور تغییر کرده است. برای جلوگیری از بازنویسی، ابتدا پیش‌نویس را دوباره باز کنید.',
    'The server draft has changed. Reopen it before saving to prevent overwriting.')
  :t('ذخیره انجام نشد: ','Save failed: ')+e.message,true);}
}
async function showMedia(){
 const gen=generation;
 try{
  if(!media){const response=await client('/media');if(gen!==generation||workspace.hidden)return;media=response.assets;}
  const panel=activeMedia;if(!panel)return;panel.replaceChildren();
  const search=el('input');search.type='search';
  search.placeholder=t('نام یا کاربرد تصویر…','Find an image by name or role…');
  const grid=el('div',undefined,'ops-editor-gallery');
  const count=el('small');
  const paint=()=>{
   grid.replaceChildren();
   const q=search.value.toLocaleLowerCase();
   const items=media.filter(a=>(a.path+' '+a.role+' '+a.altFa+' '+a.altEn).toLocaleLowerCase().includes(q));
   count.textContent=t('تصاویر تأییدشده: ','Approved images: ')+items.length;
   for(const asset of items.slice(0,36)){
    const card=el('button',undefined,'ops-editor-media');
    card.type='button';
    const image=el('img');image.loading='lazy';image.decoding='async';
    image.src='/'+asset.path;image.alt=en?asset.altEn:asset.altFa;
    card.append(image,el('span',asset.role||asset.path));
    card.addEventListener('click',()=>{
      state.mediaPath=asset.path;const field=activeForm?.elements.namedItem('mediaPath');
      if(field)field.value=asset.path;
      note(t('تصویر در پیش‌نویس انتخاب شد؛ هنوز منتشر نشده است.',
        'Approved image selected for the draft; not published.'));
    });grid.append(card);
   }
   if(items.length>36)grid.append(el('small',
     t('فقط ۳۶ نتیجه نخست نمایش داده شد. برای یافتن تصویر دقیق‌تر جستجو کنید.',
       'Showing the first 36 results. Refine the search to find a specific asset.')));
  };search.addEventListener('input',paint);
  panel.append(search,count,grid);paint();
 }catch(e){note(t('دریافت آلبوم ناموفق بود: ','Gallery unavailable: ')+e.message,true);}
}
function mkField(form,key,label,tag='input',options=null){
 const wrap=el('label',label);
 const input=el(tag);
 input.name=key;
 if(tag==='input')input.type='text';
 if(tag==='textarea'){input.rows=12;input.maxLength=60000;}
 if(options)for(const [value,caption] of options){
   const option=el('option',caption);option.value=value;input.append(option);
 }
 input.value=state[key]||'';
 input.addEventListener('input',()=>{state[key]=input.value;});
 wrap.append(input);form.append(wrap);return input;
}
function render(){
 if(workspace.hidden||!hasAccess)return;
 let section=document.getElementById('ops-editor-workbench');
 if(!section){
  section=el('details',undefined,'ops-panel');section.id='ops-editor-workbench';
  const cards=document.getElementById('ops-cards');if(cards)workspace.insertBefore(section,cards);
  else workspace.append(section);
 }
 section.open=expanded;
 section.addEventListener('toggle',()=>{expanded=section.open;});
 section.replaceChildren();
 section.append(el('summary',t('استودیوی حرفه‌ای محتوا و آلبوم تصاویر',
   'Editorial studio and approved image library')));
 section.append(el('p',t(
  'مدیریت نسخه‌دار مقالات، اخبار، صفحات، کتاب و خبرنامه. ویرایش در محیط امن؛ انتشار عمومی جداگانه و غیرفعال تا تأیید نهایی.',
  'Versioned articles, news, pages, books and newsletters. Private editing only; public publishing remains separately gated.')));
 const actions=el('div',undefined,'ops-toolbar');
 const fresh=el('button',t('پیش‌نویس تازه','New draft'));fresh.type='button';
 fresh.addEventListener('click',()=>{resetState();render();});
 const refresh=el('button',t('بارگیری پیش‌نویس‌ها','Load drafts'));refresh.type='button';
 refresh.addEventListener('click',listDrafts);
 const gallery=el('button',t('آلبوم تصاویر','Image library'));gallery.type='button';
 gallery.addEventListener('click',showMedia);
 actions.append(fresh,refresh,gallery);section.append(actions);
 activeNotice=el('p','', 'ops-muted');activeNotice.setAttribute('role','status');activeNotice.setAttribute('aria-live','polite');
 section.append(activeNotice);
 const drafts=el('details');drafts.append(el('summary',t('پیش‌نویس‌های ثبت‌شده','Saved drafts')));
 activeDrafts=el('div',undefined,'ops-editor-draft-list');drafts.append(activeDrafts);section.append(drafts);
 const form=el('form',undefined,'ops-editor-form');activeForm=form;
 mkField(form,'title',t('عنوان','Title'));
 mkField(form,'language',t('زبان','Language'),'select',[['fa','فارسی'],['en','English']]);
 mkField(form,'contentType',t('نوع محتوا','Content type'),'select',[
  ['article',t('مقاله','Article')],['news',t('خبر','News')],
  ['page',t('صفحه','Page')],['newsletter',t('خبرنامه','Newsletter')],
  ['book-description',t('معرفی کتاب','Book description')]]);
 const writing=mkField(form,'bodyMarkdown',t('متن (Markdown ایمن)','Content (safe Markdown)'),'textarea');
 writing.setAttribute('dir','auto');
 const toolbar=el('div',undefined,'ops-toolbar');
 for(const [label,before,after] of [['H2','## ',''],['B','**','**'],['I','*','*'],['Link','[','](https://)']]){
  const button=el('button',label);button.type='button';
  button.addEventListener('click',()=>{
   const start=writing.selectionStart,end=writing.selectionEnd,txt=writing.value;
   const selectedText=txt.slice(start,end);
   writing.value=txt.slice(0,start)+before+selectedText+after+txt.slice(end);
   state.bodyMarkdown=writing.value;writing.focus();
  });toolbar.append(button);
 }
 form.append(toolbar);
 mkField(form,'seoTitle',t('عنوان سئو','SEO title'));
 mkField(form,'seoDescription',t('توضیح متای سئو','SEO meta description'),'textarea');
 const mediaField=mkField(form,'mediaPath',t('مسیر تصویر تأییدشده','Approved media path'));
 mediaField.readOnly=true;
 mkField(form,'status',t('وضعیت','State'),'select',[
  ['draft',t('پیش‌نویس','Draft')],['archived',t('بایگانی','Archived')]]);
 const preview=el('button',t('پیش‌نمایش امن','Safe preview'));preview.type='button';
 preview.addEventListener('click',()=>{
   updateState();activePreview?.replaceChildren(el('h3',state.title),
     renderMarkdownText(state.bodyMarkdown));
 });
 const save=el('button',t('ذخیره نسخه تازه','Save new revision'));save.type='submit';
 form.addEventListener('submit',event=>{event.preventDefault();saveDraft();});
 form.append(preview,save);
 section.append(form);
 activePreview=el('div',undefined,'ops-editor-preview');
 section.append(activePreview);
 section.append(el('h3',t('تاریخچه نسخه‌ها','Version history')));
 const versions=el('ul',undefined,'ops-queue');versions.id='ops-editor-revisions';section.append(versions);
 activeMedia=el('div',undefined,'ops-editor-media-panel');
 section.append(activeMedia);
 section.append(el('small',t(
  'تصاویر فقط از مخزن دارای مجوز انتخاب می‌شوند؛ آپلود، تبدیل و انتشار تصویر به این مرحله اضافه نشده‌اند.',
  'Only approved registered images may be selected. Upload, transformation and publication are not enabled in this stage.')));
}
document.addEventListener('jr:open-editor-workbench',async()=>{
 if(workspace.hidden)return;
 if(!hasAccess&&!await authenticate())return;
 expanded=true;render();
 document.getElementById('ops-editor-workbench')?.scrollIntoView({block:'start'});
});
workspace.addEventListener('jr:operations-locked',lock);
new MutationObserver(()=>{if(workspace.hidden)lock();}).observe(workspace,{attributes:true,attributeFilter:['hidden']});
})();
