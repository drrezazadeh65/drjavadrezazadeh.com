/* BAHAR eight-week learning compass — privacy-first, opt-in portable workbook.
 * No analytics, network, account storage, cookies or automatic persistence.
 * Evidence, constraints and plans remain memory-only until user explicitly exports JSON.
 * Research-stage human reflections; NOT a validated diagnostic instrument.
 */
(() => {
  'use strict';
  const root=document.getElementById('bahar-compass');
  if(!root) return;
  const en=document.documentElement.lang==='en';
  const messages=en?{
    required:'Complete your learning goal and the evidence you will review.',
    invalid:'Please use bounded entries, with a valid calendar date where required.',
    prepared:'Your eight-week compass is prepared locally. You can revise it at any time.',
    evidence:'The reflection was added only to this page.',
    limit:'A maximum of eight weekly reflections is supported here.',
    empty:'Create a plan or reflection before exporting.',
    exported:'The learning workbook file was prepared on this device. Keep it private.',
    imported:'The workbook was imported into this page only. No data was sent to the website.',
    badFile:'This is not a compatible BAHAR workbook, or it exceeds the size limit.',
    removed:'Your workbook has been cleared from this page.',
    week:'Reflection',date:'Date',decision:'Next step',note:'Observed evidence',
    draft:'Eight-week compass',goal:'Learning goal',success:'Observable evidence',
    context:'Context and constraints',weekly:'Weekly study plan',none:'Not yet prepared',
    disclosure:'Self-authored educational reflection. No diagnosis or prediction.'
  }:{
    required:'هدف یادگیری و شواهد قابل مشاهده را تکمیل کنید.',
    invalid:'ورودی‌ها باید در اندازه مجاز باشند و تاریخ معتبر وارد شود.',
    prepared:'قطب‌نمای هشت‌هفته‌ای در همین صفحه آماده شد و می‌توانید آن را بازنگری کنید.',
    evidence:'یادداشت بازنگری فقط به حافظه همین صفحه اضافه شد.',
    limit:'در این کاربرگ حداکثر هشت یادداشت هفتگی ثبت می‌شود.',
    empty:'پیش از خروجی گرفتن، برنامه یا یادداشت بازنگری ایجاد کنید.',
    exported:'پرونده کاربرگ روی دستگاه شما آماده شد. آن را محرمانه نگهداری کنید.',
    imported:'پرونده به همین صفحه وارد شد و هیچ داده‌ای به سایت ارسال نشد.',
    badFile:'پرونده با قالب BAHAR سازگار نیست یا از محدودیت حجم بیشتر است.',
    removed:'تمام داده‌های کاربرگ از این صفحه پاک شد.',
    week:'بازنگری',date:'تاریخ',decision:'گام بعدی',note:'شواهد مشاهده‌شده',
    draft:'قطب‌نمای هشت‌هفته‌ای',goal:'هدف یادگیری',success:'نشانه موفقیت قابل مشاهده',
    context:'شرایط و محدودیت‌ها',weekly:'برنامه هفتگی',none:'هنوز آماده نشده است',
    disclosure:'بازنگری آموزشی خودنوشته؛ بدون تشخیص یا پیش‌بینی.'
  };
  const $=id=>document.getElementById(id);
  const form=$('bahar-compass-form'),reflectionForm=$('bahar-reflection-form');
  const status=$('bahar-compass-status'),preview=$('bahar-compass-preview');
  const evidenceList=$('bahar-reflection-list');
  const fileInput=$('bahar-workbook-file');
  const entries=[];
  let compass=null;
  const text=(node,value)=>{node.textContent=value;};
  const bounded=(s,max=500)=>typeof s==='string'&&s.trim().length>0&&s.trim().length<=max;
  const optional=(s,max=500)=>typeof s==='string'&&s.length<=max;
  const dateOK=s=>{
    if(typeof s!=='string'||! /^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    const [year,month,day]=s.split('-').map(Number);
    const date=new Date(Date.UTC(year,month-1,day));
    return date.getUTCFullYear()===year&&date.getUTCMonth()+1===month&&date.getUTCDate()===day;
  };
  const choices=new Set(['CONTINUE','CHANGE','PAUSE','STOP','INVESTIGATE']);
  const fields={
    goal:'bahar-compass-goal',
    successEvidence:'bahar-compass-success',
    context:'bahar-compass-context'
  };
  const readCompass=()=>({
    goal:$(fields.goal).value.trim(),
    successEvidence:$(fields.successEvidence).value.trim(),
    context:$(fields.context).value.trim()
  });
  function notify(message,invalid=false){
    status.hidden=false;
    status.setAttribute('role',invalid?'alert':'status');
    text(status,message);
  }
  function entryValid(record){
    return record!==null && typeof record==='object'&&!Array.isArray(record)
      && dateOK(record.date)&&bounded(record.note,500)
      && choices.has(record.decision);
  }
  function compassValid(record){
    return record!==null&&typeof record==='object'&&!Array.isArray(record)
      && bounded(record.goal,500)&&bounded(record.successEvidence,500)
      && optional(record.context,500);
  }
  function weeklySnapshot(){
    const form=$('bahar-plan'),summary=$('plan-summary');
    if(!form||!summary||summary.hidden)return null;
    const date=$('week-start')?.value??'';
    const goal=$('learning-goal')?.value?.trim()??'';
    const action=$('learning-action')?.value?.trim()??'';
    const evidence=$('learning-evidence')?.value?.trim()??'';
    if(!dateOK(date)||!bounded(goal)||!bounded(action)||!bounded(evidence))return null;
    return {weekStart:date,goal,action,evidence};
  }
  function appendLine(container,label,value){
    const row=document.createElement('p');
    const strong=document.createElement('strong');
    strong.textContent=label+': ';
    row.append(strong,document.createTextNode(value||messages.none));
    container.append(row);
  }
  function render(){
    preview.replaceChildren();
    if(compass){
      const heading=document.createElement('h3');text(heading,messages.draft);preview.append(heading);
      appendLine(preview,messages.goal,compass.goal);
      appendLine(preview,messages.success,compass.successEvidence);
      if(compass.context)appendLine(preview,messages.context,compass.context);
    }
    if(entries.length){
      const heading=document.createElement('h3');
      text(heading,(en?'Weekly reflections':'بازنگری‌های هفتگی')+' ('+entries.length+'/8)');
      preview.append(heading);
      for(const [i,entry] of entries.entries()){
        appendLine(preview,messages.week+' '+(i+1)+' · '+messages.date+' '+entry.date,
          entry.note+' · '+messages.decision+': '+entry.decision);
      }
    }
    if(compass||entries.length){
      const note=document.createElement('p');note.className='hint';text(note,messages.disclosure);
      preview.append(note);preview.hidden=false;
    }else preview.hidden=true;
    evidenceList.replaceChildren();
    entries.forEach((entry,index)=>{
      const item=document.createElement('li');
      const strong=document.createElement('strong');
      text(strong,entry.date+' · '+entry.decision);
      item.append(strong,document.createTextNode(' — '+entry.note));
      const remove=document.createElement('button');
      remove.type='button';
      remove.className='secondary';
      remove.style.marginInlineStart='10px';
      remove.textContent=en?'Remove':'حذف';
      remove.setAttribute('aria-label',(en?'Remove reflection ':'حذف بازنگری ')+(index+1));
      remove.addEventListener('click',()=>{
        entries.splice(index,1);render();
        notify(en?'Reflection removed.':'یادداشت حذف شد.');
      });
      item.append(remove);evidenceList.append(item);
    });
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const value=readCompass();
    if(!value.goal||!value.successEvidence){notify(messages.required,true);return;}
    if(!compassValid(value)){notify(messages.invalid,true);return;}
    compass=value;render();notify(messages.prepared);
    preview.focus();
  });
  reflectionForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(entries.length>=8){notify(messages.limit,true);return;}
    const value={
      date:$('bahar-reflection-date').value,
      note:$('bahar-reflection-note').value.trim(),
      decision:$('bahar-reflection-decision').value
    };
    if(!entryValid(value)){notify(messages.invalid,true);return;}
    entries.push(value);reflectionForm.reset();render();notify(messages.evidence);
  });
  $('bahar-export-workbook').addEventListener('click',()=>{
    const weekly=weeklySnapshot();
    if(!compass&&entries.length===0&&!weekly){notify(messages.empty,true);return;}
    const workbook={
      schema:'jr.bahar.private-workbook.v1',
      version:'1.0.0',
      exportedAt:new Date().toISOString(),
      compass:compass?{...compass}:null,
      weeklyPlan:weekly,
      reflections:entries.map(item=>({...item})),
      status:'SELF_REPORTED_RESEARCH_STAGE',
      privacy:'User-controlled file; never uploaded by this webpage'
    };
    const blob=new Blob([JSON.stringify(workbook,null,2)],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='bahar-private-workbook.json';a.hidden=true;
    document.body.append(a);a.click();a.remove();
    URL.revokeObjectURL(url);
    notify(messages.exported);
  });
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];
    fileInput.value='';
    if(!file)return;
    if(file.size>30000||file.size===0){notify(messages.badFile,true);return;}
    try{
      const raw=JSON.parse(await file.text());
      if(!raw||typeof raw!=='object'||Array.isArray(raw)
        ||raw.schema!=='jr.bahar.private-workbook.v1'
        ||raw.version!=='1.0.0'
        ||(raw.compass!==null&&raw.compass!==undefined&&!compassValid(raw.compass))
        ||!Array.isArray(raw.reflections)||raw.reflections.length>8
        ||!raw.reflections.every(entryValid))throw new Error('invalid-workbook');
      const weekly=raw.weeklyPlan;
      if(weekly!==null&&weekly!==undefined
        &&(!(dateOK(weekly.weekStart))||!bounded(weekly.goal)
          ||!bounded(weekly.action)||!bounded(weekly.evidence)))throw new Error('invalid-weekly');
      // Validation completes before mutating the displayed workbook.
      compass=raw.compass?{
        goal:raw.compass.goal,successEvidence:raw.compass.successEvidence,
        context:raw.compass.context
      }:null;
      for(const id of Object.values(fields))$(id).value='';
      if(compass)for(const [key,id] of Object.entries(fields))$(id).value=compass[key]??'';
      entries.splice(0,entries.length,...raw.reflections.map(entry=>({
        date:entry.date,note:entry.note,decision:entry.decision
      })));
      if(weekly){
        $('week-start').value=weekly.weekStart;
        $('learning-goal').value=weekly.goal;
        $('learning-action').value=weekly.action;
        $('learning-evidence').value=weekly.evidence;
        $('bahar-plan').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
      }
      render();notify(messages.imported);preview.focus();
    }catch{notify(messages.badFile,true);}
  });
  $('bahar-clear-workbook').addEventListener('click',()=>{
    compass=null;entries.splice(0,entries.length);
    form.reset();reflectionForm.reset();
    render();notify(messages.removed);
    $(fields.goal).focus();
  });
  render();
})();