/* JR 1405 official-admissions source review: MFA-only historical evidence UI.
 * No candidate data, approval toggles, crawler, payment, schedule or background polling.
 */
(() => {
  'use strict';
  const panel=document.getElementById('ops-education-source-review');
  const workspace=document.getElementById('ops-workspace');
  if(!panel||!workspace)return;
  const fa=document.documentElement.lang==='fa';
  const T=(a,b)=>fa?a:b;
  const summary=panel.querySelector('[data-source-review-summary]');
  const status=panel.querySelector('[data-source-review-status]');
  const guides=panel.querySelector('[data-source-review-guides]');
  const gaps=panel.querySelector('[data-source-review-gaps]');
  const reload=panel.querySelector('[data-source-review-refresh]');
  const exportCsv=panel.querySelector('[data-source-review-export]');
  const localCsv=panel.querySelector('[data-source-review-local-csv]');
  const localSummary=panel.querySelector('[data-source-review-local-summary]');
  const localBreakdown=panel.querySelector('[data-source-review-local-breakdown]');
  const numeral=new Intl.NumberFormat(fa?'fa-IR':'en-US');
  let controller=null,serial=0,busy=false,loaded=false,snapshot=null,localGeneration=0;
  const node=(name,className,content)=>{
    const el=document.createElement(name);
    if(className)el.className=className;
    if(content!==undefined)el.textContent=String(content);
    return el;
  };
  const categoryLabels={
    HUMANITIES:[ 'علوم انسانی','Humanities' ],
    EXPERIMENTAL_SCIENCES:[ 'علوم تجربی','Experimental sciences' ],
    MATHEMATICS:[ 'ریاضی و فنی','Mathematics' ],
    ARTS:[ 'هنر','Arts' ],
    INSTITUTIONAL_APPENDICES:[ 'پیوست‌های مؤسسه‌ها','Institutional appendices' ],
    RECORDS_BASED_ADMISSION:[ 'پذیرش صرفاً بر اساس سوابق تحصیلی','Records-based admission' ],
    FOREIGN_LANGUAGES:[ 'راهنمای زبان‌های خارجی','Foreign languages guide' ],
    OFFICIAL_AMENDMENTS:[ 'اصلاحیه‌های رسمی','Official amendments' ],
    TEACHER_TRAINING_SUPPLEMENTS:[ 'پیوست‌های تربیت معلم','Teacher-training supplements' ]
  };
  function label(key){
    const names=categoryLabels[key];
    return names?(fa?names[0]:names[1]):key.replaceAll('_',' ');
  }
  const clear=()=>{
    serial++;
    controller?.abort();controller=null;loaded=false;busy=false;
    reload.disabled=false;if(exportCsv)exportCsv.disabled=true;
    localGeneration++;
    if(localCsv){localCsv.value='';localCsv.disabled=true;}
    if(localSummary)localSummary.textContent='';
    localBreakdown?.replaceChildren();
    snapshot=null;guides.replaceChildren();gaps.replaceChildren();
    summary.textContent='';
    status.textContent=T('هنوز اطلاعاتی درخواست نشده است.','No source inventory has been requested.');
  };
  function render(data){
    guides.replaceChildren();gaps.replaceChildren();
    summary.textContent=T('راهنماهای شناخته‌شده: ','Identified guides: ')+numeral.format(data.summary.guideCount)+
      T(' · صفحات PDF ثبت‌شده: ',' · inventoried PDF pages: ')+numeral.format(data.summary.sourcePdfPages)+
      T(' · ردیف رشته‌محل تأییدشده: ',' · approved programme rows: ')+numeral.format(0);
    for(const row of data.guides){
      const card=node('article','jr-edu-offers__card');
      card.append(node('strong','jr-edu-offers__title',label(row.category)));
      card.append(node('p','jr-edu-offers__price',
        T('تعداد صفحه ثبت‌شده: ','Recorded pages: ')+numeral.format(row.pdfPageCount)));
      card.append(node('p','jr-edu-offers__warning',
        T('بررسی جدول‌ها: ','Table review: ')+row.criticalTablesReview));
      card.append(node('small','jr-edu-offers__warning',
        T('صرفاً شناسایی منبع؛ مجوز انتشار یا ارزیابی قبولی وجود ندارد.',
          'Source inventory only; admission use and publication remain disabled.')));
      guides.append(card);
    }
    for(const row of data.gaps){
      const card=node('li','jr-edu-offers__card');
      card.append(node('strong','jr-edu-offers__title',label(row.kind)));
      card.append(node('p','jr-edu-offers__warning',row.status));
      gaps.append(card);
    }
    status.textContent=T(
      'این گزارش از مانيفستِ بازبینی‌نشده ساخته شده است؛ نتیجه بررسی زنده پایگاه داده یا اعتبارسنجی دفترچه‌ها نیست.',
      'This comes from an unreviewed source manifest, not a live database audit or verified admissions dataset.'
    );
  }
  async function load(){
    if(busy||workspace.hidden||!panel.open)return;
    const id=++serial;
    controller?.abort();
    controller=new AbortController();
    busy=true;reload.disabled=true;
    status.textContent=T('در حال دریافت وضعیت خصوصی منابع…','Retrieving private source-review state…');
    try{
      const result=await fetch('/api/admin/operations/educational-source-review',{
        method:'GET',credentials:'same-origin',cache:'no-store',
        headers:{Accept:'application/json'},signal:controller.signal
      });
      if(!result.ok)throw Error('not-available');
      const data=await result.json();
      if(id!==serial||!panel.open||workspace.hidden)return;
      if(data?.ok!==true||data.schema!=='jr-1405-official-guides-admin-readonly-v1'
        ||data.readonly!==true||data.canApprove!==false
        ||data.canActivate!==false||data.state!=='SOURCE_METADATA_UNREVIEWED'
        ||!Array.isArray(data.guides)||!Array.isArray(data.gaps)
        ||data.guides.length>60||data.gaps.length>30
        ||data.summary?.officialAdmissionsActive!==false
        ||data.summary?.admissionProbabilitiesAvailable!==false
        ||data.summary?.approvedProgrammeRows!==0)throw Error('untrusted-data');
      loaded=true;snapshot=data;
      if(exportCsv)exportCsv.disabled=false;
      if(localCsv)localCsv.disabled=false;
      render(data);
    }catch(e){
      if(id!==serial||e?.name==='AbortError')return;
      loaded=false;snapshot=null;if(exportCsv)exportCsv.disabled=true;
      localGeneration++;
      if(localCsv){localCsv.disabled=true;localCsv.value='';}
      if(localSummary)localSummary.textContent='';
      localBreakdown?.replaceChildren();
      guides.replaceChildren();gaps.replaceChildren();summary.textContent='';
      status.textContent=T('گزارش منابع در دسترس نیست؛ همه نتایج رسمی همچنان تأییدنشده تلقی می‌شوند.',
        'Source report is unavailable; official admission evidence remains unverified.');
    }finally{
      if(id===serial){busy=false;reload.disabled=false;controller=null;}
    }
  }
  if(exportCsv)exportCsv.addEventListener('click',()=>{
    if(!snapshot||!loaded||workspace.hidden||!panel.open)return;
    const count=snapshot.guides.reduce((n,row)=>n+row.pdfPageCount,0);
    if(count<1||count>20000||
       snapshot.guides.some(row=>!Number.isSafeInteger(row.pdfPageCount)||
         row.pdfPageCount<1||row.pdfPageCount>5000||
         typeof row.key!=='string'||!/^[a-z_]{2,80}$/.test(row.key)||
         typeof row.originalPdfSha256!=='string'||
         !/^[a-f0-9]{64}$/.test(row.originalPdfSha256))){
      status.textContent=T(
        'اطلاعات اثرانگشت و صفحات برای تهیه کاربرگ معتبر نیست؛ فایلی ساخته نشد.',
        'Guide page counts or fingerprints could not be verified; no worksheet was created.'
      );
      return;
    }
    const header=['cycle','guide_key','guide_category','original_pdf_sha256',
      'pdf_page_ordinal','human_review_status','human_reviewer_id',
      'human_reviewed_on','actual_table_pages_checked','amendment_checked',
      'programme_code_rows_verified','source_notes'];
    const esc=value=>'"'+String(value??'').replaceAll('"','""')+'"';
    const lines=[header.map(esc).join(',')];
    for(const row of snapshot.guides){
      for(let page=1;page<=row.pdfPageCount;page++){
        lines.push([1405,row.key,row.category,row.originalPdfSha256,
          page,'UNREVIEWED','','','','','',''].map(esc).join(','));
      }
    }
    // No PDF text, learner data, Drive IDs, authoritative approvals or
    // invented row values. Reviewing this CSV never activates admissions.
    const blob=new Blob(['\uFEFF',lines.join('\r\n'),'\r\n'],
      {type:'text/csv;charset=utf-8'});
    const uri=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=uri;a.download='jr-1405-official-guide-page-review-UNREVIEWED.csv';
    a.hidden=true;document.body.append(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(uri),10000);
    status.textContent=T(
      'کاربرگ بازبینیِ تک‌تک صفحات به‌صورت پیش‌نویس دریافت شد؛ تمام ردیف‌ها بررسی‌نشده‌اند.',
      'Per-page source-review worksheet downloaded. Every row is unreviewed.'
    );
  });
  // Reviewer worksheet remains in the admin browser. It is never uploaded,
  // merged into the official catalogue or accepted as a scientific signature.
  const reviewHeader=[
    'cycle','guide_key','guide_category','original_pdf_sha256',
    'pdf_page_ordinal','human_review_status','human_reviewer_id',
    'human_reviewed_on','actual_table_pages_checked','amendment_checked',
    'programme_code_rows_verified','source_notes'
  ];
  function readCsvRows(source){
    if(typeof source!=='string'||source.length>8000000)throw Error('TOO_LARGE');
    const lines=[],fields=[];
    let value='',quoted=false,atStart=true;
    for(let i=0;i<source.length;i++){
      const char=source[i];
      if(quoted){
        if(char==='"'){
          if(source[i+1]==='"'){value+='"';i++;}
          else quoted=false;
        }else value+=char;
      }else if(char==='"'&&atStart){
        quoted=true;
      }else if(char===','){
        fields.push(value);value='';atStart=true;
      }else if(char==='\n'||char==='\r'){
        if(char==='\r'&&source[i+1]==='\n')i++;
        if(fields.length||value.length){
          fields.push(value);
          if(fields.length!==reviewHeader.length)throw Error('COLUMN_COUNT');
          lines.push(fields.splice(0));
          if(lines.length>20001)throw Error('ROW_LIMIT');
        }
        value='';atStart=true;
      }else if(char==='"'){
        throw Error('UNEXPECTED_QUOTE');
      }else{
        value+=char;
        atStart=false;
        if(value.length>1200)throw Error('OVERSIZE_CELL');
      }
    }
    if(quoted)throw Error('UNTERMINATED_QUOTE');
    if(fields.length||value.length){
      fields.push(value);
      if(fields.length!==reviewHeader.length)throw Error('COLUMN_COUNT');
      lines.push(fields);
    }
    if(!lines.length)throw Error('EMPTY');
    if(lines[0].some((cell,index)=>cell!==reviewHeader[index]))
      throw Error('INCORRECT_HEADER');
    return lines.slice(1);
  }
  const positive=value=>['YES','TRUE','1','Y'].includes(value.trim().toUpperCase());
  const safeReviewer=value=>/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(value);
  const validDate=value=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const d=new Date(value+'T00:00:00Z');
    return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===value;
  };
  if(localCsv&&localSummary&&localBreakdown){
    localCsv.addEventListener('change',async()=>{
      const generation=++localGeneration;
      const chosen=localCsv.files?.[0];
      localCsv.value='';
      localSummary.textContent='';
      localBreakdown.replaceChildren();
      if(!chosen||!snapshot||!loaded||!panel.open||workspace.hidden)return;
      if(chosen.size<=0||chosen.size>8000000){
        localSummary.textContent=T(
          'فایل انتخابی خالی یا بیش از اندازه مجاز است. هیچ داده‌ای ارسال نشد.',
          'The chosen file is empty or too large. Nothing was uploaded.');
        return;
      }
      localSummary.textContent=T(
        'در حال خواندن محلی کاربرگ، بدون ارسال به سرور…',
        'Reading the worksheet locally without uploading it…');
      try{
        const textData=(await chosen.text()).replace(/^\uFEFF/,'');
        if(generation!==localGeneration||!loaded||!panel.open||workspace.hidden)return;
        const rows=readCsvRows(textData);
        const trust=new Map();
        for(const guide of snapshot.guides){
          if(!guide||typeof guide.key!=='string'||typeof guide.category!=='string'||
             !/^[a-f0-9]{64}$/.test(guide.originalPdfSha256)||
             !Number.isSafeInteger(guide.pdfPageCount))throw Error('SOURCE_INVALID');
          trust.set(guide.key,{
            category:guide.category,sha:guide.originalPdfSha256,
            pages:guide.pdfPageCount,reviewed:0,needsCorrection:0,unreviewed:0
          });
        }
        const expected=[...trust.values()].reduce((sum,g)=>sum+g.pages,0);
        if(rows.length!==expected)throw Error('INCOMPLETE_PAGE_SET');
        const visited=new Set();
        for(const cols of rows){
          const [cycle,key,category,sha,pageRaw,reviewCode,
            reviewerId,reviewDate,tables,amendments,verifiedRows]=cols;
          const guide=trust.get(key);
          const page=Number(pageRaw);
          if(cycle!=='1405'||!guide||category!==guide.category||
            sha!==guide.sha||!Number.isSafeInteger(page)||
            page<1||page>guide.pages||
            !['UNREVIEWED','REVIEWED','NEEDS_CORRECTION'].includes(reviewCode))
            throw Error('FINGERPRINT_OR_PAGE_MISMATCH');
          const pageIdentity=key+'|'+page;
          if(visited.has(pageIdentity))throw Error('DUPLICATE_PAGE');
          visited.add(pageIdentity);
          if(reviewCode==='REVIEWED'){
            if(!safeReviewer(reviewerId)||!validDate(reviewDate)||
              !positive(tables)||!positive(amendments)||
              !/^\d{1,6}$/.test(verifiedRows))
              throw Error('INCOMPLETE_REVIEW_DECLARATION');
            guide.reviewed++;
          }else if(reviewCode==='NEEDS_CORRECTION'){
            guide.needsCorrection++;
          }else guide.unreviewed++;
        }
        if(visited.size!==expected)throw Error('MISSING_PAGE');
        let declaredReviewed=0,correction=0;
        for(const [key,g] of trust){
          declaredReviewed+=g.reviewed;correction+=g.needsCorrection;
          const card=node('article','jr-edu-offers__card');
          const title=node('strong','jr-edu-offers__title',key);
          const info=node('p','jr-edu-offers__warning',
            T('صفحات اعلام‌شده توسط بازبین: ','Reviewer-declared pages: ')+
            numeral.format(g.reviewed)+' / '+numeral.format(g.pages)+
            T(' · نیازمند اصلاح: ',' · needs correction: ')+
            numeral.format(g.needsCorrection));
          card.append(title,info);
          localBreakdown.append(card);
        }
        localSummary.textContent=T(
          'فقط پیشرفت اعلام‌شده در فایل: ','Worksheet-declared progress only: ')+
          numeral.format(declaredReviewed)+' / '+numeral.format(expected)+
          T(' صفحه · نیازمند اصلاح: ',' pages · need correction: ')+
          numeral.format(correction)+
          T(' · بررسی امضای مستقل: انجام نشده · انتشار: ممنوع',
            ' · independent signature verification: NOT DONE · publication: OFF');
      }catch(_){
        if(generation!==localGeneration)return;
        localBreakdown.replaceChildren();
        localSummary.textContent=T(
          'کاربرگ با فهرست اصلی صفحه‌ها سازگار نیست یا اطلاعات بازبینی ناقص است؛ هیچ صفحه‌ای تأییدشده محسوب نمی‌شود.',
          'The worksheet does not match the official page inventory or has incomplete review declarations; no page is certified.');
      }
    });
  }
  panel.addEventListener('toggle',()=>{
    if(panel.open){if(!loaded)load();}
    else {controller?.abort();}
  });
  reload.addEventListener('click',load);
  const observer=new MutationObserver(()=>{
    if(workspace.hidden)clear();
  });
  observer.observe(workspace,{attributes:true,attributeFilter:['hidden']});
  window.addEventListener('pagehide',()=>{clear();observer.disconnect();},{once:true});
})();