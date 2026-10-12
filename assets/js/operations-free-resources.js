/* Catalogued free resources in the existing MFA-protected administrator workspace.
   Read-only, no external provider fetches, no visitor tracking or local persistence. */
(()=>{'use strict';
const panel=document.getElementById('ops-free-resources'), workspace=document.getElementById('ops-workspace'),
      list=document.getElementById('ops-resources-list'), status=document.getElementById('ops-resources-status'),
      select=document.getElementById('ops-resources-category'), reload=document.getElementById('ops-resources-refresh');
if(!panel||!workspace||!list||!status||!select||!reload)return;
const en=document.documentElement.lang==='en';
const tr=(fa,enText)=>en?enText:fa;
const groups={GROWTH:tr('رشد و بازاریابی','Growth and marketing'),TECHNICAL:tr('فنی و دسترس‌پذیری','Technical quality'),SCHOLARLY:tr('علمی و استنادی','Scholarly authority')};
const access={MANUAL_REFERENCE:tr('بررسی دستی','Manual reference'),READ_API_CANDIDATE:tr('API قابل بررسی؛ نامتصل','API candidate; not connected'),CI_OPEN_SOURCE_CANDIDATE:tr('متن‌باز؛ نیازمند نصب کنترل‌شده','Open-source; approved installation needed'),ACCOUNT_SETUP_REQUIRED:tr('نیازمند حساب و مجوز','Account authorization required'),CONDITIONAL_ELIGIBILITY:tr('وابسته به شرایط ارائه‌دهنده','Provider eligibility required')};
let items=null,request=null,generation=0;
const make=(tag,txt,cls)=>{const node=document.createElement(tag);if(txt!==undefined)node.textContent=txt;if(cls)node.className=cls;return node;};
function reset(){generation++;request?.abort();request=null;items=null;list.replaceChildren();status.textContent='';select.replaceChildren(make('option',tr('همه دسته‌ها','All categories')));select.firstChild.value='';}
function draw(){
 if(!items)return;list.replaceChildren();
 const category=select.value,shown=items.filter(item=>!category||item.category===category);
 for(const item of shown){
  const card=make('article',undefined,'ops-card');
  card.append(make('small',(groups[item.category]||item.category)+' · '+item.ownerEngine),make('h3',item.name),
    make('p',item.purpose),make('p',access[item.accessPath]||item.accessPath),
    make('small',tr('اتصال خارجی تأیید نشده','External connection not verified')));
  if(typeof item.url==='string'&&/^https:\/\/[^\s<>"']+$/.test(item.url)){
   const a=make('a',tr('وب‌سایت رسمی','Official website'));a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';card.append(a);
  }
  list.append(card);
 }
 status.textContent=tr('نمایش '+shown.length+' از '+items.length+' منبع. هیچ داده خارجی خودکاری دریافت نشده است.',
 'Showing '+shown.length+' of '+items.length+' references. No automated external data has been retrieved.');
}
async function load(){
 if(workspace.hidden||!panel.open)return;
 const id=++generation;request?.abort();request=new AbortController();
 list.replaceChildren();status.textContent=tr('در حال دریافت از سرور امن…','Loading from the protected server…');
 try{
  const response=await fetch('/api/admin/operations/free-resources',{credentials:'same-origin',cache:'no-store',signal:request.signal,headers:{Accept:'application/json'}});
  const data=await response.json();
  if(!response.ok||data.ok!==true||data.schema!=='operations-free-resources-v1'||!Array.isArray(data.resources)||data.verifiedExternalConnections!==0)throw Error('not_available');
  if(id!==generation||workspace.hidden||!panel.open)return;
  items=data.resources;
  const categories=[...new Set(items.map(item=>item.category))];
  select.replaceChildren(make('option',tr('همه دسته‌ها','All categories')));select.firstChild.value='';
  for(const category of categories){const option=make('option',groups[category]||category);option.value=category;select.append(option);}
  draw();
 }catch(error){
  if(id!==generation||workspace.hidden||!panel.open||error.name==='AbortError')return;
  items=null;list.replaceChildren();status.textContent=tr('دریافت فهرست ممکن نشد؛ اتصال خارجی تأیید نشده است.','Directory unavailable; no external connection is verified.');
 }
}
panel.addEventListener('toggle',()=>panel.open?load():reset());
reload.addEventListener('click',load);select.addEventListener('change',draw);
new MutationObserver(()=>{if(workspace.hidden){panel.open=false;reset();}}).observe(workspace,{attributes:true,attributeFilter:['hidden']});
})();
