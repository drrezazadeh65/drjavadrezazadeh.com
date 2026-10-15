/* MFA-protected scientific schema inventory. Private, on-demand, text-only. */
(()=>{
'use strict';
const root=document.getElementById('ops-scientific-schema');
const workspace=document.getElementById('ops-workspace');
if(!root||!workspace)return;
const status=root.querySelector('[data-scientific-schema-status]');
const results=root.querySelector('[data-scientific-schema-results]');
const refresh=root.querySelector('[data-scientific-schema-refresh]');
if(!status||!results||!refresh)return;
const en=document.documentElement.lang==='en';
const text=en?{
  idle:'No database structure has been inspected in this session.',
  checking:'Checking table and column compatibility…',
  complete:'All required table/column projections are compatible.',
  incomplete:'Some modules are missing required tables or columns.',
  missing:'Unverified or structurally incompatible',
  ready:'Required columns found (structure only)',
  failed:'The private schema check is unavailable. No readiness was assumed.',
  expired:'Administrator verification may have expired. Recheck access and MFA.',
  foot:'Read-only structural evidence; not instrument validation, legal consent, migration approval, backup proof or a live-service certification.',
  table:'Incompatible table(s):',
  empty:'No incompatible tables found in this domain.',
  names:{consent_guardian:'Identity, guardians and consent',assessment:'Assessment and reports',bahar:'BAHAR longitudinal records'}
}:{
  idle:'در این نشست، ساختار پایگاه داده هنوز بررسی نشده است.',
  checking:'در حال بررسی سازگاری جدول‌ها و ستون‌ها…',
  complete:'ستون‌های ضروری در همهٔ بخش‌ها شناسایی شدند؛ فقط از نظر ساختاری.',
  incomplete:'برخی جدول‌ها یا ستون‌های ضروری هنوز در دسترس نیستند.',
  missing:'تأییدنشده یا ناسازگار',
  ready:'ستون‌های ضروری یافت شدند (صرفاً ساختاری)',
  failed:'بررسی خصوصی ساختار در دسترس نیست؛ هیچ آمادگی‌ای تأیید نشد.',
  expired:'ممکن است اعتبار دومرحله‌ای مدیر منقضی شده باشد. دسترسی را دوباره بررسی کنید.',
  foot:'این بررسی فقط ساختار را نشان می‌دهد؛ نه روایی علمی، رضایت معتبر، مجوز مهاجرت، سلامت بکاپ یا آمادگی عملیاتی.',
  table:'جدول‌های ناسازگار:',
  empty:'در این حوزه جدول ناسازگاری شناسایی نشد.',
  names:{consent_guardian:'هویت، سرپرستی و رضایت',assessment:'ارزیابی و گزارش',bahar:'سوابق رشد طولی BAHAR'}
};
const domains=[['consent_guardian',4],['assessment',8],['bahar',5]];
let current=null,generation=0;
function clear(message=text.idle){
  generation++;
  if(current){current.abort();current=null;}
  results.replaceChildren();
  status.textContent=message;
  refresh.disabled=false;
}
function validate(data){
  if(!data||data.ok!==true||data.schema!=='scientific-structural-preflight-v1'||
     data.readOnly!==true||data.adminMfaRequired!==true||
     data.inspection!=='TABLE_AND_COLUMN_PROJECTIONS_ONLY'||
     data.personalRowsRead!==false||data.realProductionCertified!==false||
     data.operationalWriteApproved!==false||typeof data.modules!=='object'||!data.modules)
    return false;
  return domains.every(([key,count])=>{
    const part=data.modules[key];
    return part&&typeof part.columnProjectionReady==='boolean'&&
      part.requiredTables===count&&Array.isArray(part.incompatibleTables)&&
      part.incompatibleTables.length<=count&&
      part.incompatibleTables.every(name=>typeof name==='string'&&/^eco_[a-z0-9_]{2,80}$/.test(name))&&
      (part.columnProjectionReady===(part.incompatibleTables.length===0));
  });
}
function element(tag,content,className){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(content!==undefined)node.textContent=content;
  return node;
}
function render(data){
  if(!validate(data))throw Error('invalid_schema_projection');
  const fragment=document.createDocumentFragment();
  for(const [key] of domains){
    const part=data.modules[key];
    const card=element('article',undefined,'ops-card');
    card.append(element('h3',text.names[key]));
    card.append(element('p',part.columnProjectionReady?text.ready:text.missing,
      part.columnProjectionReady?'ops-pass':'ops-fail'));
    card.append(element('small',part.incompatibleTables.length?
      text.table+' '+part.incompatibleTables.join('، '):text.empty));
    fragment.append(card);
  }
  fragment.append(element('p',text.foot,'ops-muted'));
  results.replaceChildren(fragment);
  status.textContent=domains.every(([key])=>data.modules[key].columnProjectionReady)
    ?text.complete:text.incomplete;
}
async function load(){
  if(workspace.hidden||!root.open)return;
  clear(text.checking);
  const token=generation;
  const controller=new AbortController();
  current=controller;
  refresh.disabled=true;
  try{
    const response=await fetch('/api/admin/operations/scientific/schema-readiness',{
      method:'GET',credentials:'same-origin',cache:'no-store',
      headers:{Accept:'application/json'},signal:controller.signal
    });
    if(token!==generation||workspace.hidden||!root.open)return;
    if(!response.ok){
      if(response.status===401||response.status===403)
        throw Error('expired_mfa');
      throw Error('unavailable');
    }
    const data=await response.json();
    if(token!==generation||workspace.hidden||!root.open)return;
    render(data);
  }catch(error){
    if(token!==generation||workspace.hidden||!root.open)return;
    results.replaceChildren();
    status.textContent=error?.message==='expired_mfa'?text.expired:text.failed;
  }finally{
    if(token===generation){current=null;refresh.disabled=false;}
  }
}
const observer=new MutationObserver(()=>{
  if(workspace.hidden){
    clear();
    root.open=false;
  }
});
observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
root.addEventListener('toggle',()=>{if(root.open&&!workspace.hidden)load();else clear();});
refresh.addEventListener('click',()=>load());
status.textContent=text.idle;
})();
