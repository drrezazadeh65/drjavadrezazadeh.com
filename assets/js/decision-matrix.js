/* Decision matrix worksheet — private in-memory tool for one published guide. */
(()=> {
  'use strict';
  const root=document.querySelector('[data-decision-matrix]');
  if(!root)return;
  const form=root.querySelector('[data-dm-form]');
  const status=root.querySelector('[data-dm-status]');
  const output=root.querySelector('[data-dm-result]');
  const table=root.querySelector('[data-dm-table]');
  if(!form||!status||!output||!table)return;
  const criteria=[
    ['feasibility','امکان و ضوابط پذیرش'],
    ['knowledge','شناخت واقعی از رشته'],
    ['interest','علاقه و معنا'],
    ['strengths','شواهد توانایی و رشد'],
    ['conditions','شرایط زندگی'],
    ['flexibility','انعطاف مسیر'],
    ['questions','ابهام و پرسش بعدی']
  ];
  form.hidden=false;
  const announce=message=>{status.textContent=message};
  const optionNodes=[...form.querySelectorAll('.dm-option')];
  function readOptions(){
    return optionNodes.map(node=>{
      const name=node.querySelector('[data-dm-name]').value.trim();
      const values={};
      for(const [key] of criteria)values[key]=node.querySelector('[data-dm-key="'+key+'"]').value.trim();
      return {name,values};
    }).filter(o=>o.name);
  }
  function ready(){
    const options=readOptions();
    if(options.length<2){
      output.hidden=true;
      announce('برای مقایسه، نام حداقل دو رشته را وارد کنید.');
      return null;
    }
    if(new Set(options.map(x=>x.name.toLocaleLowerCase('fa'))).size!==options.length){
      output.hidden=true;
      announce('برای جلوگیری از اشتباه، نام گزینه‌ها را متفاوت وارد کنید.');
      return null;
    }
    return options;
  }
  function cell(tag,value,scope){
    const el=document.createElement(tag);
    el.textContent=value||'—';
    if(scope)el.scope=scope;
    return el;
  }
  function render(options){
    const caption=document.createElement('caption');
    caption.textContent='مقایسه کیفی دو یا سه مسیر تحصیلی؛ بدون امتیازدهی خودکار';
    const thead=document.createElement('thead');
    const header=document.createElement('tr');
    header.appendChild(cell('th','معیار','col'));
    for(const item of options)header.appendChild(cell('th',item.name,'col'));
    thead.appendChild(header);
    const tbody=document.createElement('tbody');
    for(const [key,label] of criteria){
      const row=document.createElement('tr');
      row.appendChild(cell('th',label,'row'));
      for(const item of options)row.appendChild(cell('td',item.values[key]||'ثبت نشده'));
      tbody.appendChild(row);
    }
    table.replaceChildren(caption,thead,tbody);
    output.hidden=false;
    announce('مقایسه '+new Intl.NumberFormat('fa-IR').format(options.length)+' رشته آماده شد. جدول در همین صفحه نمایش داده شده است.');
  }
  // Never let Enter submit worksheet values to the hosting origin or put them in a URL.
  form.addEventListener('submit',event=>{event.preventDefault();const options=ready();if(options)render(options)});
  form.querySelector('[data-dm-render]').addEventListener('click',()=>{
    const options=ready();
    if(options)render(options);
  });
  function safeCsvValue(value){
    let s=String(value??'');
    if(/^[\s\uFEFF]*[=+\-@]/.test(s))s="'"+s; // prevent spreadsheet formula execution
    return '"'+s.replace(/"/g,'""')+'"';
  }
  form.querySelector('[data-dm-export]').addEventListener('click',()=>{
    const options=ready();
    if(!options)return;
    const rows=[['معیار',...options.map(x=>x.name)]];
    for(const [key,label] of criteria)rows.push([label,...options.map(x=>x.values[key]||'ثبت نشده')]);
    const csv='\uFEFF'+rows.map(row=>row.map(safeCsvValue).join(',')).join('\r\n')+'\r\n';
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');
    a.href=url;
    a.download='comparison-of-study-paths.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),2000);
    announce('فایل CSV برای ذخیره روی دستگاه آماده شد. داده‌ها به سایت ارسال نشده‌اند.');
  });
  form.addEventListener('input',()=>{
    if(!output.hidden){output.hidden=true;announce('اطلاعات تغییر کرده است؛ برای نمایش مقایسه تازه، دوباره دکمه جدول را بزنید.')}
  });
  form.addEventListener('change',()=>{if(!output.hidden)output.hidden=true});
  form.addEventListener('reset',()=>{
    output.hidden=true;
    table.replaceChildren();
    window.setTimeout(()=>announce('تمام داده‌های کاربرگ از صفحه پاک شدند.'),0);
  });
})();
