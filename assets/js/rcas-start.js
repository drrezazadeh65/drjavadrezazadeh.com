(()=>{
const accessItems=["مکان نسبتاً مناسب برای مطالعه یا کار فکری","اینترنت موردنیاز","ابزار دیجیتال مناسب","کتاب یا منبع اصلی موردنیاز","زمان نسبتاً قابل‌پیش‌بینی برای مطالعه","فردی برای پرسیدن سؤال علمی","فردی برای کمک در یک تصمیم مهم","امکان رفت‌وآمد لازم برای فعالیت آموزشی"];
const groups=[
{key:"A",title:"جهت و عاملیت",scale:"C",items:["برای هشت هفته آینده، یک اولویت اصلی دارم که می‌توانم آن را در یک جمله روشن بیان کنم.","می‌توانم توضیح دهم چرا این اولویت برای خودم مهم است.","می‌توانم برای همین هفته یک اقدام مشخص انتخاب کنم که مستقیماً به این اولویت مربوط باشد.","اگر شواهد تازه نشان دهد برنامه یا هدف فعلی مناسب نیست، می‌توانم آن را بازنگری کنم."]},
{key:"B",title:"راهبرد یادگیری",scale:"B",items:["پیش از شروع مطالعه، مشخص می‌کنم در پایان جلسه باید چه چیزی را بتوانم توضیح دهم، حل کنم یا انجام دهم.","پیش از دوباره‌خوانی مطلب، تلاش می‌کنم آنچه را به یاد دارم بدون نگاه‌کردن بازیابی کنم.","بعد از یادگیری، تلاش می‌کنم مطلب را بدون نگاه به منبع با زبان خودم توضیح دهم.","روش مطالعه‌ام را با توجه به نوع درس یا تکلیف تغییر می‌دهم."]},
{key:"C",title:"اجرا و بازگشت",scale:"B",items:["وقتی زمان شروع یک کار مهم می‌رسد، بدون تأخیر طولانی وارد کار می‌شوم.","وقتی یک کار بزرگ یا مبهم است، آن را به اولین قدم کوچک و مشخص تبدیل می‌کنم.","پیش از یک کار مهم، عوامل قابل‌کنترل حواس‌پرتی را تا حد امکان کاهش می‌دهم.","اگر برنامه‌ام به هم بخورد، در اولین فرصت واقع‌بینانه به مسیر برمی‌گردم."]},
{key:"D",title:"پایش و سواد خطا",scale:"B",items:["پس از مطالعه، بدون نگاه به منبع خودم را امتحان می‌کنم.","وقتی اشتباه می‌کنم، بررسی می‌کنم خطا از چه نوعی بوده است.","پس از اصلاح یک خطا، با سؤال یا مسئله دیگری دوباره خودم را می‌سنجم.","اگر شواهد نشان دهد روش فعلی من نتیجه نمی‌دهد، راهبردم را تغییر می‌دهم."]},
{key:"E",title:"انرژی و بهزیستی تحصیلی",scales:["B","B","B","C"],items:["در بیشتر روزهای تحصیلی، برای انجام کار فکری اصلی خود انرژی کافی دارم.","الگوی خواب و بیداری من آن‌قدر قابل‌پیش‌بینی است که بتوانم زمان‌های بهتر تمرکز خود را بشناسم.","وقتی فشار تحصیلی بالا می‌رود، دست‌کم یک راه سالم برای تنظیم وضعیت خود به کار می‌برم.","اگر فشار یا خستگی برای مدتی عملکردم را مختل کند، می‌دانم از چه فرد مناسبی کمک بگیرم."]},
{key:"F",title:"خودتنظیمی دیجیتال و هوش مصنوعی",scale:"B",items:["پیش از کار مهم، اعلان‌ها و ابزارهای دیجیتال را طوری تنظیم می‌کنم که احتمال وقفه کمتر شود.","پیش از بازکردن یک برنامه، سایت یا پلتفرم، معمولاً می‌دانم برای چه کاری وارد آن می‌شوم.","پیش از استفاده از یک پاسخ مهم تولیدشده با هوش مصنوعی، آن را بررسی می‌کنم.","پس از کمک گرفتن از هوش مصنوعی، بررسی می‌کنم چه چیزی را اکنون می‌توانم مستقل از آن توضیح دهم یا انجام دهم."]},
{key:"G",title:"مسیر طلایی و حمایت",scale:"C",items:["برای یکی از توانایی‌های مهمی که به خودم نسبت می‌دهم، شاهد واقعی دارم.","دست‌کم یکی از مسیرهای موردعلاقه‌ام را با تجربه واقعی یا اطلاعات معتبر بررسی کرده‌ام.","برای یک مشکل تحصیلی مهم، می‌دانم از چه فردی و با چه سؤال مشخصی کمک بخواهم.","حمایتی که دریافت می‌کنم به من کمک می‌کند دفعه بعد بخش بیشتری از کار را خودم انجام دهم."]}
];
const scaleLabels={B:["۰ · هرگز","۱ · به‌ندرت","۲ · گاهی","۳ · اغلب","۴ · تقریباً همیشه","NA · کاربرد ندارد","UNKNOWN · نمی‌دانم یا شاهد کافی ندارم"],C:["۰ · هنوز نمی‌توانم/روشن نیست","۱ · کم","۲ · تاحدی","۳ · خوب","۴ · روشن و همراه با شاهد","NA · کاربرد ندارد","UNKNOWN · نمی‌دانم یا شاهد کافی ندارم"]};
const routeMap={D1:["RCAS-D1","Learning & Self-Regulation"],D2:["RCAS-D2","Self-Efficacy, Wellbeing & Recovery"],D3:["RCAS-D3","Digital & AI Self-Regulation"],D4:["RCAS-D4","Context, Access & Support Ecology"],D5:["RCAS-D5","Golden Path"],D6:["RCAS-D6","Critical Thinking & Decision Quality"]};
const access=document.getElementById("rcasAccess");
accessItems.forEach((x,i)=>{access.insertAdjacentHTML("beforeend",`<div class="rcas-access-row"><span>${x}</span><select name="access${i}"><option value="">انتخاب</option><option>در دسترس</option><option>محدود</option><option>فعلاً در دسترس نیست</option><option>نیاز ندارم</option></select></div>`)});
const core=document.getElementById("rcasCore");
groups.forEach(g=>{let html=`<section class="rcas-domain"><div class="rcas-domain-title"><b>${g.key}</b><h3>${g.title}</h3></div>`;g.items.forEach((item,i)=>{const sc=g.scales?g.scales[i]:g.scale;html+=`<fieldset class="rcas-item"><legend><span>${g.key}${i+1} · ${sc}</span>${item}</legend><div class="rcas-scale">${scaleLabels[sc].map((lab,n)=>`<label><input type="radio" name="${g.key}${i+1}" value="${n===5?"NA":n===6?"UNKNOWN":n}"><span>${lab}</span></label>`).join("")}</div></fieldset>`});html+="</section>";core.insertAdjacentHTML("beforeend",html)});
const routing=document.getElementById("rcasRouting");
const evidence=["شواهد همسو","شواهد متناقض","فقط یک منبع شاهد","شاهد کافی ندارم"];
groups.forEach(g=>routing.insertAdjacentHTML("beforeend",`<fieldset class="rcas-route-row"><legend><b>${g.key}</b> ${g.title}</legend><div>${evidence.map((x,i)=>`<label><input type="radio" name="route_${g.key}" value="${i}"><span>${x}</span></label>`).join("")}<label class="priority-check"><input type="checkbox" name="priority_${g.key}"><span>این حوزه برای من اولویت است</span></label></div></fieldset>`));
// RCAS Start v1.1: an educational, self-directed evidence reflection.
// This browser-only preview has no diagnostic score, norms or professional
// assessment authority. Raw P0, C1 and R1 responses must never be persisted.
const form=document.getElementById("rcasForm");
const panels=[...document.querySelectorAll(".rcas-panel")];
const bar=document.getElementById("rcasProgressBar"),txt=document.getElementById("rcasProgressText");
const coreStatus=document.getElementById("rcasCoreStatus");
const p0Status=document.getElementById("rcasP0Status");
const routeStatus=document.getElementById("rcasRouteStatus");
const routeResult=document.getElementById("rcasResult");
const clearSummary=document.getElementById("clearRcasSummary");
const requiredP0Access=[...access.querySelectorAll('select[name^="access"]')];
const P0_EVIDENCE_FIELDS=["evidence1","evidence2","evidence8","needsEvidence","strengthEvidence"];
let activeStep=1;
// A newly opened form is a NEW attempt. Previous session summaries are not
// evidence that this blank form has been answered.
try{sessionStorage.removeItem("gt_rcas_state");}catch(_){}
function invalidateSummary(){
  try{sessionStorage.removeItem("gt_rcas_state");}catch(_){}
  routeResult.hidden=true;
  routeResult.replaceChildren();
  if(routeStatus)routeStatus.textContent="";
  if(activeStep===3){
    bar.style.width="66.666%";
    txt.textContent="مرحله ۳ از ۳ · Routing (خلاصه نیازمند ثبت دوباره)";
  }
  if(clearSummary)clearSummary.textContent="پاک‌کردن خلاصه مسیر این نشست";
}
function p0Complete(){
  const value=name=>String(form.elements.namedItem(name)?.value||"").trim();
  const education=form.elements.namedItem("edu");
  const reasons=[...form.querySelectorAll('input[name="reason"]:checked')];
  const noEvidence=form.elements.namedItem("noEvidenceYet");
  const checks=[
    [value("edu")!=="",education,"وضعیت آموزشی فعلی را مشخص کن."],
    [reasons.length>0,form.querySelector('input[name="reason"]'),"دست‌کم یک دلیل برای شروع RCAS انتخاب کن؛ گزینه «هنوز دقیق نمی‌دانم» هم مجاز است."],
    [value("mainQuestion")!==""||value("priority8")!=="",form.elements.namedItem("mainQuestion"),"سؤال اصلی یا اولویت هشت‌هفته‌ای خود را بنویس."],
    [requiredP0Access.length===8&&requiredP0Access.every(x=>x.value!==""),requiredP0Access.find(x=>!x.value)||requiredP0Access[0],"وضعیت هر هشت مورد دسترسی را مشخص کن. گزینه «نیاز ندارم» نیز مجاز است."],
    [P0_EVIDENCE_FIELDS.some(name=>value(name)!=="")||noEvidence?.checked===true,form.elements.namedItem("evidence1"),"یک شاهد یا مثال واقعی بنویس، یا صریحاً علامت بزن که هنوز شاهد کافی نداری."]
  ];
  const invalid=checks.find(([ok])=>!ok);
  if(invalid){
    if(p0Status)p0Status.textContent="مرحله P0 هنوز کامل نیست: "+invalid[2];
    invalid[1]?.scrollIntoView({behavior:"smooth",block:"center"});
    invalid[1]?.focus({preventScroll:true});
    return false;
  }
  if(p0Status)p0Status.textContent="حداقل اطلاعات مرحله P0 تکمیل شد. این داده‌ها نتیجه تشخیصی یا امتیاز استعداد نیستند.";
  return true;
}
function routingComplete(){
  const values=groups.map(g=>form.querySelector('input[name="route_'+g.key+'"]:checked')?.value);
  const missing=values.findIndex(v=>!["0","1","2","3"].includes(v));
  if(missing>=0){
    if(routeStatus)routeStatus.textContent="برای هر هفت حوزه، وضعیت شواهد را انتخاب کن؛ حوزه "+groups[missing].key+" هنوز بی‌پاسخ است.";
    routing.querySelectorAll("fieldset")[missing]?.scrollIntoView({behavior:"smooth",block:"center"});
    return false;
  }
  const domain=document.getElementById("priorityDomain").value;
  if(!Object.prototype.hasOwnProperty.call(routeMap,domain)){
    if(routeStatus)routeStatus.textContent="ابتدا یک حوزه D1 تا D6 را به‌صورت آگاهانه انتخاب کن.";
    document.getElementById("priorityDomain").focus();
    return false;
  }
  const why=document.getElementById("priorityWhy").value.trim();
  if(!why){
    if(routeStatus)routeStatus.textContent="دلیل خودت را برای انتخاب این حوزه بنویس. این دلیل، تشخیص علمی محسوب نمی‌شود.";
    document.getElementById("priorityWhy").focus();
    return false;
  }
  // There is no validated one-to-one mapping from A–G evidence domains to
  // D1–D6 self-selected modules. Do not fabricate such a psychometric rule.
  if(values.every(v=>v==="3")){
    if(routeStatus)routeStatus.textContent="در هر هفت حوزه اعلام کرده‌ای هنوز شاهد کافی نداری. اکنون باید شاهد جمع‌آوری کنی؛ خروجی مسیر تکمیل‌شده صادر نمی‌شود.";
    return false;
  }
  if(!CORE_ITEM_IDS.some(name=>{
    const checked=form.querySelector('input[name="'+name+'"]:checked');
    return checked&&/^[0-4]$/.test(checked.value);
  })){
    if(routeStatus)routeStatus.textContent="هر ۲۸ پاسخ، «کاربرد ندارد» یا «نمی‌دانم» است. بدون حتی یک مشاهده خودگزارشی مشخص، مسیر تکمیل‌شده ساخته نمی‌شود.";
    return false;
  }
  if(routeStatus)routeStatus.textContent="";
  return true;
}
// Descriptive, client-only insight; never a psychometric diagnosis or an AI-generated claim.
const sevenDayActions={
 D1:{focus:"راهبرد یادگیری و پایش اجرا",action:"یک تکلیف واقعی انتخاب کن؛ در سه نوبت کوتاه ابتدا بدون نگاه به منبع بازیابی کن و سپس خطاها را ثبت کن.",question:"کدام تغییر در روش مطالعه با نمونه عملکرد قابل بررسی است؟",value:"بررسی تخصصی می‌تواند نمونه‌های عملکرد، شرایط یادگیری و بازخورد را کنار خودگزارشی قرار دهد."},
 D2:{focus:"انرژی، فشار و بازگشت به مسیر",action:"در سه روز، زمان فعالیت، استراحت و امکان تمرکز را بدون قضاوت درباره خودت ثبت کن؛ یک اصلاح کوچک و امن را امتحان کن.",question:"چه شرایطی انجام کار را آسان‌تر یا دشوارتر می‌کند؟",value:"در بررسی تخصصی، شرایط و زمینه فردی با گفت‌وگوی حرفه‌ای روشن می‌شود؛ این آزمون تشخیص سلامت نیست."},
 D3:{focus:"خودتنظیمی دیجیتال و هوش مصنوعی",action:"برای یک تکلیف، پیش از شروع هدف استفاده از ابزار دیجیتال را بنویس؛ وقفه‌ها و میزان انجام مستقل کار را مشاهده کن.",question:"کدام استفاده از ابزار واقعاً یادگیری مستقل را پشتیبانی می‌کند؟",value:"بررسی عمیق‌تر می‌تواند نمونه‌های واقعی کار، کیفیت تصمیم‌گیری و موقعیت‌های استفاده از فناوری را مقایسه کند."},
 D4:{focus:"دسترسی، محیط و شبکه حمایت",action:"یک مانع واقعی در محیط یادگیری را ثبت و یک حمایت قابل‌دسترس و داوطلبانه را آزمایش کن؛ پیامد را توصیف کن.",question:"کدام تغییر محیطی به جای سرزنش فرد، فرصت رشد ایجاد می‌کند؟",value:"در بررسی تخصصی می‌توان محدودیت منابع، فرصت‌ها و حمایت‌های عملی را در تفسیر شواهد لحاظ کرد."},
 D5:{focus:"کاوش مسیر و شواهد توانمندی",action:"یک حوزه موردعلاقه انتخاب کن و یک نمونه فعالیت واقعی انجام بده؛ توضیح بده چه چیزی آموختی و چه پرسشی باقی مانده است.",question:"علاقه ادعاشده با چه تجربه واقعی و بازخوردی بهتر روشن می‌شود؟",value:"خدمت تخصصی Golden Talent می‌تواند شواهد چندمنبعی و گفت‌وگو را برای بازنگری گزینه‌های مسیر کنار هم قرار دهد؛ هیچ استعداد قطعی پیش‌بینی نمی‌شود."},
 D6:{focus:"سواد شواهد و کیفیت تصمیم",action:"برای یک تصمیم آموزشی، دو منبع اطلاعاتی مستقل را بررسی کن و دلیل اعتماد یا تردیدت را به‌صورت مکتوب ثبت کن.",question:"برای تصمیم بهتر، هنوز چه شواهدی لازم است؟",value:"بررسی حرفه‌ای می‌تواند کیفیت منابع، فرض‌های تصمیم و پیامدهای وابسته به زمینه را به‌صورت انتقادی مرور کند."}
};
const domainCoreGroups={D1:['B','C','D'],D2:['E'],D3:['F'],D4:['G'],D5:['A','G'],D6:['D','F']};
function appendFreeInsight(report,selectedDomain){
 const detail=sevenDayActions[selectedDomain];
 const valid=CORE_ITEM_IDS.map(name=>form.querySelector('input[name="'+name+'"]:checked')?.value);
 const known=valid.filter(x=>/^[0-4]$/.test(x||'')).length;
 const unknown=valid.filter(x=>x==='UNKNOWN').length;
 const notApplicable=valid.filter(x=>x==='NA').length;
 const related=domainCoreGroups[selectedDomain].flatMap(k=>CORE_ITEM_IDS.filter(x=>x.startsWith(k)));
 const relatedKnown=related.filter(name=>/^[0-4]$/.test(form.querySelector('input[name="'+name+'"]:checked')?.value||'')).length;
 const section=document.createElement('section');section.id='rcasInsight';section.className='rcas-insight';
 const el=(tag,content,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;n.textContent=content;section.append(n);return n;};
 el('p','بازخورد اولیه اختصاصی • صرفاً توصیفی','kicker');
 el('h4','نقشه شواهد تو؛ نه نمره استعداد');
 el('p','از ۲۸ گزاره، '+known+' پاسخ مشخص، '+unknown+' پاسخ «نمی‌دانم» و '+notApplicable+' پاسخ «کاربرد ندارد» ثبت کرده‌ای. این شمارش، کیفیت یا توانایی تو را اندازه نمی‌گیرد.');
 const cards=document.createElement('div');cards.className='rcas-insight-grid';
 const card=(title,description)=>{const box=document.createElement('div');box.className='rcas-insight-card';const strong=document.createElement('strong');strong.textContent=title;const p=document.createElement('p');p.textContent=description;box.append(strong,p);cards.append(box);};
 card('حوزه‌ای که خودت انتخاب کردی',detail.focus+'؛ '+relatedKnown+' پاسخ مشخص از '+related.length+' گزاره مرتبط در فرم وجود دارد. ارتباط این گزاره‌ها صرفاً برای مرور توصیفی است، نه اعتبارسنجی حوزه.');
 const exampleNames=['evidence1','evidence2','evidence8','needsEvidence','strengthEvidence'];
 const hasExample=exampleNames.some(name=>String(form.elements.namedItem(name)?.value||'').trim());
 card('کیفیت شواهد اولیه',hasExample?'در پرونده اولیه نمونه یا شاهد نوشته‌ای، اما صحت آن در این مرحله به طور مستقل بررسی نشده است.':'هنوز نمونه قابل بررسی وارد نکرده‌ای؛ این نبودِ شاهد به معنای ضعف یا فقدان استعداد نیست.');
 card('پرسش ارزشمند بعدی',detail.question);
 // Quote two concrete choices from the learner's own selected area, never
 // infer aptitude, percentile, clinical state or a validated subscale score.
 const observations=related.flatMap(code=>{
   const answer=form.querySelector('input[name="'+code+'"]:checked')?.value;
   if(!/^[0-4]$/.test(answer||''))return [];
   const group=groups.find(g=>g.key===code[0]);
   const index=Number(code.slice(1))-1;
   if(!group||index<0||index>=group.items.length)return [];
   const scale=group.scales?group.scales[index]:group.scale;
   return ['«'+group.items[index]+'» — '+scaleLabels[scale][Number(answer)].replace(/^[۰-۴] · /,'')];
 }).slice(0,2);
 if(observations.length){
   card(observations.length===1?'یک مشاهده مشخص از پاسخ‌های خودت':'دو مشاهده مشخص از پاسخ‌های خودت',
     observations.join('؛ ')+'؛ این‌ها صرفاً انتخاب‌های تو در همین فرم‌اند، نه اندازه‌گیری مستقل استعداد.');
 }
 section.append(cards);
 el('h4','یک تجربه هفت‌روزه که همین حالا می‌توانی شروع کنی');
 el('p',detail.action);
 el('p','در پایان هفته، یک نمونه از آنچه واقعاً رخ داده و یک ابهام باقی‌مانده را یادداشت کن. این پیشنهاد آموزشی رایگان است و به خرید نیاز ندارد.','rcas-insight-note');
 const premium=document.createElement('section');premium.className='rcas-insight-premium';
 const h=document.createElement('h4');h.textContent='اگر بخواهی از خودگزارشی به بررسی حرفه‌ای برسی';premium.append(h);
 const p=document.createElement('p');p.textContent=detail.value+' خدمات قابل سفارش فعلی، خدمات انسانی‌اند؛ ابزارهای دیجیتال عمیق D1 تا D6 هنوز برای خرید فعال نشده‌اند.';premium.append(p);
 const small=document.createElement('p');small.className='rcas-insight-note';small.textContent='ارتقا اختیاری است. هیچ نتیجه‌ای برای ایجاد ترس، ضرورت ساختگی خرید یا تضمین موفقیت صادر نمی‌شود.';premium.append(small);
 const age=Number(form.elements.namedItem('age')?.value);
 const minor=(age>=10&&age<18)||['متوسطه اول','پایه دهم','پایه یازدهم','پایه دوازدهم'].includes(form.elements.namedItem('edu')?.value);
 const link=document.createElement('a');link.className='button primary';
 link.href=minor?'/fa/services/talent_initial/':'/fa/services/checkout/?service=talent_initial';
 link.textContent=minor?'اطلاعات ارزیابی تخصصی برای بررسی همراه والد/سرپرست':'مشاهده تعرفه و درخواست بررسی تخصصی';
 premium.append(link);
 const more=document.createElement('a');more.className='button';more.href='/fa/shop/golden-talent/#professional-services';more.textContent='مقایسه خدمات تکمیلی و حدود آن‌ها';premium.append(more);
 section.append(premium);
 report.append(section);
}

const CORE_ITEM_IDS=groups.flatMap(g=>g.items.map((_,i)=>g.key+(i+1)));
if(CORE_ITEM_IDS.length!==28||new Set(CORE_ITEM_IDS).size!==28)throw Error("RCAS Core 28 version mismatch");
const coreAnswered=()=>CORE_ITEM_IDS.filter(name=>{
  const inputs=[...core.querySelectorAll('input[type="radio"]')].filter(x=>x.name===name);
  return inputs.some(x=>x.checked && (["NA","UNKNOWN"].includes(x.value)||/^[0-4]$/.test(x.value)));
});
const updateCoreProgress=()=>{
  const count=coreAnswered().length;
  if(coreStatus)coreStatus.textContent="Core 28: "+count+" از ۲۸ پاسخ ثبت‌شده در همین صفحه؛ «کاربرد ندارد» و «نمی‌دانم/شاهد کافی ندارم» هر دو پاسخ مجاز و جدا از صفرند.";
  return count;
};
function show(n){
  activeStep=n;
  panels.forEach(p=>p.classList.toggle("active",p.dataset.step==n));
  // Bar represents completed FLOW stages, not a psychological score or
  // automatically inferred progress from blank questions.
  bar.style.width=(((n-1)/3)*100)+"%";
  txt.textContent="مرحله "+n+" از ۳ · "+(n===1?"P0":n===2?"Core 28":"Routing");
  if(n===2)updateCoreProgress();
  window.scrollTo({top:0,behavior:"smooth"});
}
const coreComplete=()=>{
  const answered=new Set(coreAnswered());
  if(answered.size===28)return true;
  const first=CORE_ITEM_IDS.find(name=>!answered.has(name));
  if(coreStatus)coreStatus.textContent="برای ادامه، هر ۲۸ گزاره را پاسخ بده یا «کاربرد ندارد» یا «نمی‌دانم» را انتخاب کن. پاسخ "+first+" باقی مانده است ("+answered.size+"/۲۸).";
  const target=[...core.querySelectorAll('input[type="radio"]')].find(x=>x.name===first);
  target?.closest("fieldset")?.scrollIntoView({behavior:"smooth",block:"center"});
  target?.focus({preventScroll:true});
  return false;
};
form.addEventListener("input",()=>invalidateSummary());
form.addEventListener("change",e=>{
  invalidateSummary();
  if(e.target?.matches('input[type="radio"]'))updateCoreProgress();
});
document.addEventListener("click",e=>{
  const target=e.target.closest("button");
  if(!target||!form.contains(target))return;
  const n=Number(target.dataset.next),b=Number(target.dataset.back);
  if(n===2){
    if(activeStep!==1||!p0Complete())return;
    show(2);
  }else if(n===3){
    if(activeStep!==2||!p0Complete()||!coreComplete())return;
    show(3);
  }
  if(b===1&&activeStep===2)show(1);
  if(b===2&&activeStep===3)show(2);
});
clearSummary?.addEventListener("click",()=>{
  invalidateSummary();
  const res=document.getElementById("rcasResult");
  res.hidden=true;res.replaceChildren();
  clearSummary.textContent="خلاصه مسیر این نشست پاک شد.";
});
document.getElementById("showRoute").addEventListener("click",()=>{
  const res=document.getElementById("rcasResult"),d=document.getElementById("priorityDomain").value;
  res.replaceChildren();
  res.hidden=true;
  // Recheck all gates at output time, not just when moving between panels.
  if(activeStep!==3||!p0Complete()||!coreComplete()||!routingComplete())return;
  res.hidden=false;
  bar.style.width="100%";
  txt.textContent="مرحله ۳ از ۳ · انتخاب شخصی ثبت شد";
  const code=routeMap[d],why=document.getElementById("priorityWhy").value.trim();
  // Minimal session-state bridge for the existing student dashboard. It does
  // not save raw item scores, contact details, private narrative or P0 answers.
  const preview={
    completed:true,rcasRevision:"start-1.2",completedItemCount:28,
    p0Validated:true,routingEvidenceCompleted:true,meaningfulCoreEvidence:true,
    route:d,routeCode:d,routeLabel:code[1],
    routeBasis:"SELF_SELECTED_UNVALIDATED",
    updatedAt:new Date().toISOString()
  };
  try{sessionStorage.setItem("gt_rcas_state",JSON.stringify(preview));}catch(_){}
  const add=(tag,value,className)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    node.textContent=value;
    res.append(node);
    return node;
  };
  add("p","گام بعدی بر پایه انتخاب شخصی","kicker");
  add("h3",code[0]+" · "+code[1]);
  add("p","این اولویت را خودت انتخاب کردی. RCAS Start در نسخه فعلی پاسخ‌ها را با هنجار علمی مقایسه نمی‌کند و هیچ تشخیص، امتیاز استعداد یا صلاحیت خرید ماژول عمیق صادر نمی‌کند. شواهد دیگر و بررسی متخصص ممکن است مسیر را تغییر دهد.");
  if(why){
    const note=document.createElement("div");note.className="rcas-user-note";
    const label=document.createElement("strong");label.textContent="دلیل انتخاب تو: ";
    const explanation=document.createElement("span");explanation.textContent=why;
    note.append(label,explanation);res.append(note);
  }
  const links=document.createElement("div");links.className="actions";
  for(const [href,label,kind] of [
    ["/fa/assessments/golden-talent/","نقشه مراحل Golden Talent","button primary"],
    ["/fa/app/student/","پیش‌نمایش داشبورد دانش‌آموز","button"],
    ["/fa/bahar/","ادامه رایگان در BAHAR: دو درس و برنامه هفتگی (ورود دستی)","button"]
  ]){
    const link=document.createElement("a");link.href=href;link.className=kind;link.textContent=label;links.append(link);
  }
  appendFreeInsight(res,d);
  res.append(links);
});
// Explicitly clear ALL local answers, not just the derived route preview.
// This is independent of signing in, a paid upgrade or consent acquisition.
document.getElementById("rcasClearAll")?.addEventListener("click",()=>{
 form.reset();
 invalidateSummary();
 if(p0Status)p0Status.textContent="همه پاسخ‌های این فرم از همین صفحه پاک شدند؛ هیچ نسخه پشتیبان یا گزارش شخصی نزد سایت نگهداری نمی‌شود.";
 if(routeStatus)routeStatus.textContent="";
 if(clearSummary)clearSummary.textContent="پاک‌کردن خلاصه مسیر این نشست";
 show(1);
 updateCoreProgress();
 form.elements.namedItem("edu")?.focus({preventScroll:true});
});
bar.style.width="0%";
updateCoreProgress();
})();
