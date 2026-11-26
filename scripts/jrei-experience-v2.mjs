import fs from 'node:fs';
import path from 'node:path';
const pattern=/^(fa|en|ar)\/(?:jrei(?:\/(?:catalog\/[a-z-]+|pricing|order|seo))?|jrei-academic|forge)\/index\.html$/;
const locales={
fa:{map:'معماری تعاملی · نمایش مفهومی، نه داده عملیاتی زنده',core:'هسته هماهنگ‌سازی',nodes:['زبان و معنا','حافظه و دانش','عامل‌ها و مأموریت','پردازش توزیع‌شده'],nav:['کاوش راهکارها','تعرفه‌ها','همکاری و سرمایه‌گذاری'],stats:['حوزه تخصصی','خدمت بررسی شواهد','زبان رابط'],journey:'از نیاز تا راهکار',steps:['تعریف نیاز','طراحی گردش کار','ارزیابی و توافق تحویل'],search:'جست‌وجو در راهکارها و خدمات',all:'همه',empty:'نتیجه‌ای یافت نشد.',found:'نتیجه',filter:['زبان و دانش','آموزش و پژوهش','مهندسی و داده','رشد و سازمان','زیرساخت و امنیت']},
en:{map:'Interactive architecture · conceptual illustration, not live telemetry',core:'Orchestration core',nodes:['Language & meaning','Memory & knowledge','Agents & missions','Distributed compute'],nav:['Explore solutions','Pricing','Business & investment'],stats:['Solution domains','Evidence review services','Interface languages'],journey:'From need to solution',steps:['Define the need','Design the workflow','Evaluate & agree delivery'],search:'Search solutions and services',all:'All',empty:'No matching results.',found:'results',filter:['Language & knowledge','Education & research','Engineering & data','Growth & enterprise','Infrastructure & security']},
ar:{map:'بنية تفاعلية · تصور مفاهيمي لا قياسات تشغيلية مباشرة',core:'نواة التنسيق',nodes:['اللغة والمعنى','الذاكرة والمعرفة','الوكلاء والمهام','الحوسبة الموزعة'],nav:['استكشف الحلول','الأسعار','التعاون والاستثمار'],stats:['مجال تخصصي','خدمة مراجعة الأدلة','لغات الواجهة'],journey:'من الاحتياج إلى الحل',steps:['تحديد الاحتياج','تصميم سير العمل','التقييم والاتفاق على التسليم'],search:'ابحث في الحلول والخدمات',all:'الكل',empty:'لا توجد نتائج مطابقة.',found:'نتيجة',filter:['اللغة والمعرفة','التعليم والبحث','الهندسة والبيانات','النمو والمؤسسات','البنية والأمان']}
};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const groups=[['architecture','language','memory','adaptive-context','knowledge','agents'],['education','assessment','talent','research','academic-writing'],['coding','data','vision','audio','documents','web','api'],['search','search-visibility','marketing','news','automation','enterprise'],['desktop','distributed','local-ai','security','recovery','plugins']];

const studio={
fa:{eyebrow:'JREI / استودیوی راهکارها',title:'از یک مسئله واقعی تا یک راهکار هوشمند',intro:'یک سناریو را انتخاب کنید و مسیر پیشنهادی هماهنگی موتورهای تخصصی را ببینید.',disclaimer:'نمایش تعاملی معماری و گردش کار پیشنهادی؛ نه اجرای مدل، داده زنده یا تضمین تحویل.',explore:'مشاهده راهکار',contact:'گفت‌وگو درباره همکاری و استقرار',steps:['ورودی','هماهنگی موتورهای تخصصی','خروجی پیشنهادی'],cases:[
['آموزش','یادگیری متناسب با نیاز','نیاز آموزشی و زمینه یادگیرنده','تحلیل زمینه · دانش · بازخورد','طرح یادگیری و شواهد قابل بررسی','education'],
['پژوهش','از پرسش تا شواهد','پرسش پژوهشی و منابع مجاز','جست‌وجو · بازیابی · تحلیل','نقشه شواهد برای بررسی پژوهشگر','research'],
['مهندسی','از ایده تا نسخه قابل آزمون','نیاز نرم‌افزاری و کد مجاز','عامل‌ها · کدنویسی · آزمون','پیشنهاد تغییر و معیارهای پذیرش','coding'],
['رشد دیجیتال','از داده تا تصمیم','نشانی سایت و اهداف کسب‌وکار','ممیزی · جست‌وجو · تحلیل','اولویت‌های بهبود قابل اندازه‌گیری','search-visibility'],
['سازمان','از گردش کار تا هماهنگی','فرایند سازمانی و حدود دسترسی','معماری · اتوماسیون · کنترل','طرح استقرار و قرارداد تحویل','enterprise']]},
en:{eyebrow:'JREI / Solution studio',title:'From a real problem to an intelligent solution',intro:'Choose a scenario to explore a proposed workflow across specialist engines.',disclaimer:'Interactive architecture and illustrative workflow only; not live inference, telemetry or a delivery guarantee.',explore:'Explore solution',contact:'Discuss collaboration and deployment',steps:['Input','Specialist orchestration','Proposed output'],cases:[
['Education','Learning shaped by context','Learning needs and learner context','Context · knowledge · feedback','Learning plan and reviewable evidence','education'],
['Research','From question to evidence','Research question and permitted sources','Search · retrieval · analysis','Evidence map for researcher review','research'],
['Engineering','From concept to testable release','Software requirements and authorized code','Agents · coding · testing','Change proposal and acceptance criteria','coding'],
['Digital growth','From data to decisions','Website and business objectives','Audit · search · analysis','Measurable improvement priorities','search-visibility'],
['Enterprise','From process to orchestration','Organizational workflow and access scope','Architecture · automation · controls','Deployment plan and delivery agreement','enterprise']]},
ar:{eyebrow:'JREI / استوديو الحلول',title:'من مشكلة واقعية إلى حل ذكي',intro:'اختر سيناريو لاستكشاف سير عمل مقترح بين المحركات المتخصصة.',disclaimer:'عرض تفاعلي للبنية وسير العمل المقترح؛ ليس تشغيلًا للنموذج أو قياسات حية أو ضمانًا للتسليم.',explore:'استكشف الحل',contact:'ناقش التعاون والنشر',steps:['المدخلات','تنسيق المحركات المتخصصة','المخرجات المقترحة'],cases:[
['التعليم','تعلم يراعي السياق','الاحتياجات التعليمية وسياق المتعلم','السياق · المعرفة · التغذية الراجعة','خطة تعلم وأدلة قابلة للمراجعة','education'],
['البحث','من السؤال إلى الأدلة','سؤال البحث والمصادر المصرح بها','البحث · الاسترجاع · التحليل','خريطة أدلة لمراجعة الباحث','research'],
['الهندسة','من الفكرة إلى إصدار قابل للاختبار','متطلبات البرمجيات والشيفرة المصرح بها','الوكلاء · البرمجة · الاختبار','اقتراح تعديل ومعايير قبول','coding'],
['النمو الرقمي','من البيانات إلى القرار','الموقع وأهداف الأعمال','التدقيق · البحث · التحليل','أولويات تحسين قابلة للقياس','search-visibility'],
['المؤسسات','من العملية إلى التنسيق','سير العمل ونطاق الوصول','البنية · الأتمتة · الضوابط','خطة نشر واتفاق تسليم','enterprise']]}
};

const showcase={
fa:{tag:'JREI / تجربه واقعی در مرورگر',title:'راهکار خود را طراحی کنید',intro:'هدف، محدوده داده و معیار تحویل را انتخاب کنید تا یک طرح اولیه قابل بررسی بسازید.',local:'این ابزار واقعاً در مرورگر محاسبه می‌کند؛ نه استنتاج مدل زبانی و نه اجرای موتورهای خصوصی. هیچ داده‌ای ارسال یا ذخیره نمی‌شود.',labels:['حوزه راهکار','نوع داده و استقرار','معیار پذیرش'],options:[['آموزش و یادگیری','پژوهش و شواهد','مهندسی نرم‌افزار','رشد دیجیتال','اتوماسیون سازمانی'],['داده عمومی و مجاز','داده خصوصی؛ بررسی مجوز و استقرار','نمونه آزمایشی بدون داده شخصی'],['خروجی قابل بازبینی','آزمون قابل تکرار','گزارش شواهد و محدودیت‌ها']],run:'ساخت طرح پیشنهادی',result:'طرح پیشنهادی قابل بررسی',route:'استعلام همین راهکار',tasks:['تعریف هدف و مخاطب','تعیین محدوده داده و دسترسی','توافق درباره معیار پذیرش و تحویل'],evidence:'شواهد و مسیرهای بررسی',eIntro:'پیش از خرید یا سرمایه‌گذاری، نمونه‌ها و شواهد را بررسی کنید. نتیجه آزمون انتشار به معنی آمادگی تمام موتورهای خصوصی نیست.',proof:['انتشار تأییدشده ۲۷ نوامبر ۲۰۲۶','۱۰۸ صفحه تجاری در سه زبان','۱۷ کنترل عملیاتی پس از انتشار'],links:['راهنمای یادگیری BAHAR','چارچوب Golden Talent','مرکز خدمات پژوهشی','اطلاعات تجاری و استعلام'],paths:['bahar/','golden-talent/','jrei-academic/','jrei/order/'],read:'گزارش پذیرش انتشار',details:'محدوده و شواهد تحویل',detailText:'برای این راهکار، ابتدا ورودی مجاز، خروجی مورد انتظار، شواهد آزمون و شرایط پذیرش مشخص می‌شود. تعرفه پایه به معنای تضمین تحویل یا فعال بودن اجرای زنده نیست.',deliver:['ورودی و مجوز','خروجی قابل بازبینی','آزمون و معیار پذیرش']},
en:{tag:'JREI / Browser-based experience',title:'Design your solution',intro:'Choose the objective, data scope and acceptance criterion to generate a reviewable initial plan.',local:'This tool performs real browser-side computation, not language-model inference or private engine execution. No data is transmitted or stored.',labels:['Solution domain','Data and deployment scope','Acceptance criterion'],options:[['Education and learning','Research and evidence','Software engineering','Digital growth','Enterprise automation'],['Permitted public data','Private data — authorization and deployment review','Synthetic example without personal data'],['Reviewable output','Repeatable test','Evidence and limitations report']],run:'Generate proposal',result:'Reviewable proposed plan',route:'Enquire about this solution',tasks:['Define objective and audience','Agree data and access scope','Agree acceptance and delivery criteria'],evidence:'Evidence and evaluation pathways',eIntro:'Review the examples and evidence before purchasing or investing. Release tests do not establish readiness of every private engine.',proof:['Verified release · 27 November 2026','108 commercial pages in three languages','17 post-release operational checks'],links:['BAHAR study-planning guide','Golden Talent framework','Research service centre','Business information and enquiries'],paths:['bahar/','golden-talent/','jrei-academic/','jrei/order/'],read:'Release acceptance report',details:'Scope and delivery evidence',detailText:'Each solution starts with agreement on permitted inputs, expected outputs, test evidence and acceptance conditions. Base pricing does not guarantee delivery or establish live execution.',deliver:['Input and authorization','Reviewable output','Testing and acceptance']},
ar:{tag:'JREI / تجربة في المتصفح',title:'صمّم الحل المناسب لك',intro:'اختر الهدف ونطاق البيانات ومعيار القبول لإنشاء خطة أولية قابلة للمراجعة.',local:'تنفذ هذه الأداة حسابًا فعليًا في المتصفح؛ ليست استدلالًا لغويًا أو تشغيلًا للمحركات الخاصة. لا تُرسل البيانات أو تُخزّن.',labels:['مجال الحل','نطاق البيانات والنشر','معيار القبول'],options:[['التعليم والتعلم','البحث والأدلة','هندسة البرمجيات','النمو الرقمي','أتمتة المؤسسات'],['بيانات عامة مصرح بها','بيانات خاصة — مراجعة الإذن والنشر','مثال اصطناعي دون بيانات شخصية'],['مخرجات قابلة للمراجعة','اختبار قابل للتكرار','تقرير الأدلة والقيود']],run:'إنشاء الخطة المقترحة',result:'خطة مقترحة قابلة للمراجعة',route:'استفسر عن هذا الحل',tasks:['تحديد الهدف والجمهور','الاتفاق على نطاق البيانات والوصول','الاتفاق على معايير القبول والتسليم'],evidence:'الأدلة ومسارات التقييم',eIntro:'راجع الأمثلة والأدلة قبل الشراء أو الاستثمار. لا تثبت اختبارات الإصدار جاهزية كل المحركات الخاصة.',proof:['إصدار متحقق منه · 27 نوفمبر 2026','108 صفحات تجارية بثلاث لغات','17 فحصًا تشغيليًا بعد النشر'],links:['دليل التخطيط الدراسي BAHAR','إطار Golden Talent','مركز خدمات البحث','معلومات الأعمال والاستفسارات'],paths:['bahar/','golden-talent/','jrei-academic/','jrei/order/'],read:'تقرير قبول الإصدار',details:'النطاق وأدلة التسليم',detailText:'يبدأ كل حل بالاتفاق على المدخلات المصرح بها والمخرجات المتوقعة وأدلة الاختبار وشروط القبول. السعر الأساسي لا يضمن التسليم أو التشغيل المباشر.',deliver:['المدخلات والإذن','مخرجات قابلة للمراجعة','الاختبار والقبول']}
};
const demoSlugs=['education','research','coding','search-visibility','enterprise'];
function demoMarkup(l){
 const d=showcase[l];
 return '<section class="jx-demo" data-jx-demo hidden><div class="jx-demo-copy"><p class="jx-overline">'+esc(d.tag)+'</p><h2>'+esc(d.title)+'</h2><p>'+esc(d.intro)+'</p><p class="jx-demo-note">'+esc(d.local)+'</p></div><div class="jx-demo-controls">'+d.labels.map((label,i)=>'<label class="jx-demo-label">'+esc(label)+'<select data-jx-demo-choice="'+i+'">'+d.options[i].map((s,k)=>'<option value="'+(i===0?demoSlugs[k]:k)+'">'+esc(s)+'</option>').join('')+'</select></label>').join('')+'<button type="button" class="button primary" data-jx-run>'+esc(d.run)+'</button><div class="jx-demo-result" data-jx-output hidden><h3>'+esc(d.result)+'</h3><ol>'+d.tasks.map((s,i)=>'<li><span>'+esc(s)+'</span><strong data-jx-answer="'+i+'"></strong></li>').join('')+'</ol><p class="jx-sr" role="status" data-jx-announcement></p><a class="jx-case-link" data-jx-enquiry href="/'+l+'/jrei/order/">'+esc(d.route)+' <span aria-hidden="true">↗</span></a></div></div></section>';
}
function evidenceMarkup(l){
 const d=showcase[l];
 return '<section class="jx-evidence"><p class="jx-overline">JREI / EVIDENCE</p><h2>'+esc(d.evidence)+'</h2><p>'+esc(d.eIntro)+'</p><div class="jx-evidence-grid">'+d.proof.map((s,i)=>'<div class="jx-proof"><span aria-hidden="true">'+['✓','108','17'][i]+'</span><strong>'+esc(s)+'</strong></div>').join('')+'</div><a class="jx-case-link" href="https://github.com/drrezazadeh65/drjavadrezazadeh.com/actions/runs/45898459730" rel="noopener">'+esc(d.read)+' <span aria-hidden="true">↗</span></a><div class="jx-evidence-links">'+d.links.map((s,i)=>'<a href="/'+l+'/'+d.paths[i]+'">'+esc(s)+' <span aria-hidden="true">↗</span></a>').join('')+'</div></section>';
}
function detailMarkup(l){
 const d=showcase[l];
 return '<section class="jx-delivery"><h2>'+esc(d.details)+'</h2><p>'+esc(d.detailText)+'</p><div class="jx-delivery-grid">'+d.deliver.map((x,i)=>'<div><span aria-hidden="true">0'+(i+1)+'</span><strong>'+esc(x)+'</strong></div>').join('')+'</div></section>';
}

function studioMarkup(l,selected){
 const d=studio[l],cases=selected===undefined?d.cases:[d.cases[selected]];
 return '<section class="jx-studio" data-jx-studio><div class="jx-studio-heading"><p class="jx-overline">'+esc(d.eyebrow)+'</p><h2>'+esc(d.title)+'</h2><p>'+esc(d.intro)+'</p></div><div class="jx-workbench">'+cases.map((v,i)=>'<details class="jx-case"'+(i===0?' open':'')+'><summary><span class="jx-case-index" aria-hidden="true">0'+(i+1)+'</span><span>'+esc(v[0])+'</span><span class="jx-case-expand" aria-hidden="true">+</span></summary><div class="jx-case-content"><h3>'+esc(v[1])+'</h3><ol class="jx-pipeline">'+d.steps.map((label,k)=>'<li><span class="jx-step-symbol" aria-hidden="true">'+['◇','✳','▤'][k]+'</span><small>'+esc(label)+'</small><strong>'+esc(v[k+2])+'</strong></li>').join('')+'</ol><a class="jx-case-link" href="/'+l+'/jrei/catalog/'+v[5]+'/">'+esc(d.explore)+' <span aria-hidden="true">↗</span></a></div></details>').join('')+'</div><p class="jx-studio-disclaimer">'+esc(d.disclaimer)+'</p><a class="button primary jx-studio-cta" href="/'+l+'/jrei/order/">'+esc(d.contact)+'</a></section>';
}
function visualTheme(relative){
 const slug=relative.match(/\/catalog\/([a-z-]+)\//)?.[1];
 if(slug){const k=groups.findIndex(g=>g.includes(slug));return k>=0?'domain-'+k:'core';}
 return /\/pricing\//.test(relative)?'pricing':/\/order\//.test(relative)?'order':'core';
}

function scene(l,c,theme){
 const nodes=c.nodes.map((x,i)=>'<a class="jx-node jx-node-'+i+'" href="/'+l+'/jrei/catalog/'+['language','memory','agents','distributed'][i]+'/"><span aria-hidden="true">'+['◈','◉','✳','▦'][i]+'</span>'+esc(x)+'</a>').join('');
 return '<figure class="jx-scene" data-jx-scene="'+esc(theme)+'"><div class="jx-scene-top"><span>JREI / SYSTEM MAP</span><span>01 — 04</span></div><div class="jx-network"><svg class="jx-lines" viewBox="0 0 400 320" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#84dacf" stroke-width="1.2"><ellipse cx="200" cy="160" rx="144" ry="112" opacity=".28"/><ellipse cx="200" cy="160" rx="105" ry="78" opacity=".55"/><path d="M65 54L200 160 335 54M65 266L200 160 335 266" stroke-dasharray="5 7"/><path d="M200 12V308M12 160H388" opacity=".2"/></g><g fill="#d6fff7"><circle cx="132" cy="108" r="3"/><circle cx="269" cy="214" r="3"/><circle cx="200" cy="48" r="2"/></g></svg><div class="jx-core"><span aria-hidden="true">✦</span><strong>JREI</strong><small>'+esc(c.core)+'</small></div>'+nodes+'</div><figcaption>'+esc(c.map)+'</figcaption></figure>';
}
function nav(l,c){return '<div class="jx-nav">'+['/jrei/','/jrei/pricing/','/jrei/order/'].map((p,i)=>'<a href="/'+l+p+'">'+esc(c.nav[i])+' <span aria-hidden="true">↗</span></a>').join('')+'</div>'}
function stats(c){return '<div class="jx-stats">'+['30','52','3'].map((v,i)=>'<div><strong dir="ltr">'+v+'</strong><span>'+esc(c.stats[i])+'</span></div>').join('')+'</div>'}
function flow(c){return '<div class="jx-flow"><h2>'+esc(c.journey)+'</h2><ol>'+c.steps.map((s,i)=>'<li><span aria-hidden="true">0'+(i+1)+'</span>'+esc(s)+'</li>').join('')+'</ol></div>'}
function toolbar(c,home){return '<div class="jx-toolbar" data-jx-toolbar hidden><label>'+esc(c.search)+'<input type="search" data-jx-search autocomplete="off"></label>'+(home?'<div class="jx-filters" role="group" aria-label="'+esc(c.nav[0])+'">'+[c.all,...c.filter].map((x,i)=>'<button type="button" data-jx-filter="'+(i-1)+'" aria-pressed="'+(i===0)+'">'+esc(x)+'</button>').join('')+'</div>':'')+'<p data-jx-result role="status" data-empty="'+esc(c.empty)+'" data-found="'+esc(c.found)+'"></p></div>'}
export function projectExperience(relative,source){
 const m=pattern.exec(relative);if(!m)return source;
 const l=m[1],c=locales[l],commercial=source.includes('data-jrei-public-centre="v1"');
 if(source.includes('/assets/css/jrei-experience-v2.css'))return source;
 if(!commercial&&!source.includes('data-jrei-launch="coming-soon"'))throw Error('Unexpected JREI route '+relative);
 let next=source.replace(/<\/head>/i,m=>'<link rel="stylesheet" href="/assets/css/jrei-experience-v2.css?v=3">'+m);
 if(commercial){
  const hero=/<div class="hero"><div class="wrap">([\s\S]*?)<\/div><\/div><\/div>/;
  if(!hero.test(next))throw Error('JREI hero shape '+relative);
  next=next.replace(hero,(_,s)=>'<div class="hero"><div class="wrap jx-hero"><div class="jx-copy">'+s+'</div></div>'+scene(l,c,visualTheme(relative))+'</div></div>');
  const home=relative===l+'/jrei/index.html';
  next=next.replace('data-jrei-public-centre="v1"','data-jrei-public-centre="v1" data-jx-theme="'+visualTheme(relative)+'"');
  const note=/<p class="note">[\s\S]*?<\/p>/;
  if(!note.test(next))throw Error('JREI note missing '+relative);
  next=next.replace(note,m=>(home?stats(c):'')+m+nav(l,c)+(home?demoMarkup(l)+studioMarkup(l)+evidenceMarkup(l)+flow(c):relative.includes('/catalog/')?detailMarkup(l):''));
  if(home){
   next=next.replace(/<article class="tile">(?=<h3><a href="\/(?:fa|en|ar)\/jrei\/catalog\/([a-z-]+)\/")/g,(tag,slug)=>{
    const k=groups.findIndex(g=>g.includes(slug));if(k<0)throw Error('Unclassified '+slug);return '<article class="tile" data-jx-domain="'+k+'">';
   });
   const first=next.indexOf('<article class="tile" data-jx-domain='),grid=next.lastIndexOf('<div class="grid">',first);
   if(first<0||grid<0)throw Error('JREI catalog missing');
   next=next.slice(0,grid)+toolbar(c,true)+next.slice(grid);
  }else if(/\/(?:pricing|order)\/index\.html$/.test(relative)){
   const pos=next.indexOf('<section>',next.indexOf('<p class="note">'));
   if(pos<0)throw Error('JREI listing missing');
   next=next.slice(0,pos)+toolbar(c,false)+next.slice(pos);
  }
  next=next.replace(/<\/body>/i,m=>'<script defer src="/assets/js/jrei-experience-v2.js?v=3"></script>'+m);
 }else{
  next=next.replace(/<p class="notice" role="status">[\s\S]*?<\/p>/,m=>m+nav(l,c)+studioMarkup(l,relative.includes('/jrei-academic/')?1:relative.includes('/forge/')?2:3));
 }
 return next;
}
export function applyJreiExperience(out,files,failures){
 const counts={fa:0,en:0,ar:0};
 for(const file of files){const rel=path.relative(out,file).split(path.sep).join('/'),m=pattern.exec(rel);if(!m)continue;try{const src=fs.readFileSync(file,'utf8');fs.writeFileSync(file,projectExperience(rel,src),'utf8');counts[m[1]]++;}catch(e){failures.push(String(e));}}
 for(const [l,n] of Object.entries(counts))if(n!==36)failures.push('JREI experience coverage '+l+': expected 36, got '+n);
 return counts;
}
