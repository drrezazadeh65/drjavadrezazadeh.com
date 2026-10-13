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
const scaleLabels={B:["۰ · هرگز","۱ · به‌ندرت","۲ · گاهی","۳ · اغلب","۴ · تقریباً همیشه","NA"],C:["۰ · هنوز نمی‌توانم/روشن نیست","۱ · کم","۲ · تاحدی","۳ · خوب","۴ · روشن و همراه با شاهد","NA"]};
const routeMap={D1:["RCAS-D1","Learning & Self-Regulation"],D2:["RCAS-D2","Self-Efficacy, Wellbeing & Recovery"],D3:["RCAS-D3","Digital & AI Self-Regulation"],D4:["RCAS-D4","Context, Access & Support Ecology"],D5:["RCAS-D5","Golden Path"],D6:["RCAS-D6","Critical Thinking & Decision Quality"]};
const access=document.getElementById("rcasAccess");
accessItems.forEach((x,i)=>{access.insertAdjacentHTML("beforeend",`<div class="rcas-access-row"><span>${x}</span><select name="access${i}"><option value="">انتخاب</option><option>در دسترس</option><option>محدود</option><option>فعلاً در دسترس نیست</option><option>نیاز ندارم</option></select></div>`)});
const core=document.getElementById("rcasCore");
groups.forEach(g=>{let html=`<section class="rcas-domain"><div class="rcas-domain-title"><b>${g.key}</b><h3>${g.title}</h3></div>`;g.items.forEach((item,i)=>{const sc=g.scales?g.scales[i]:g.scale;html+=`<fieldset class="rcas-item"><legend><span>${g.key}${i+1} · ${sc}</span>${item}</legend><div class="rcas-scale">${scaleLabels[sc].map((lab,n)=>`<label><input type="radio" name="${g.key}${i+1}" value="${n===5?"NA":n}"><span>${lab}</span></label>`).join("")}</div></fieldset>`});html+="</section>";core.insertAdjacentHTML("beforeend",html)});
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
const CORE_ITEM_IDS=groups.flatMap(g=>g.items.map((_,i)=>g.key+(i+1)));
if(CORE_ITEM_IDS.length!==28||new Set(CORE_ITEM_IDS).size!==28)throw Error("RCAS Core 28 version mismatch");
const coreAnswered=()=>CORE_ITEM_IDS.filter(name=>{
  const inputs=[...form.querySelectorAll('input[type="radio"]')].filter(x=>x.name===name);
  return inputs.some(x=>x.checked && (x.value==="NA"||/^[0-4]$/.test(x.value)));
});
const updateCoreProgress=()=>{
  const count=coreAnswered().length;
  if(coreStatus)coreStatus.textContent="Core 28: "+count+" از ۲۸ پاسخ ثبت‌شده در همین صفحه؛ NA یک پاسخ مجاز است، نه صفر.";
  return count;
};
function show(n){
  panels.forEach(p=>p.classList.toggle("active",p.dataset.step==n));
  bar.style.width=(n/3*100)+"%";
  txt.textContent="مرحله "+n+" از ۳ · "+(n===1?"P0":n===2?"Core 28":"Routing");
  if(n===2)updateCoreProgress();
  window.scrollTo({top:0,behavior:"smooth"});
}
const coreComplete=()=>{
  const answered=new Set(coreAnswered());
  if(answered.size===28)return true;
  const first=CORE_ITEM_IDS.find(name=>!answered.has(name));
  if(coreStatus)coreStatus.textContent="برای ادامه، هر ۲۸ گزاره را پاسخ بده یا NA انتخاب کن. پاسخ "+first+" باقی مانده است ("+answered.size+"/۲۸).";
  const target=[...form.querySelectorAll('input[type="radio"]')].find(x=>x.name===first);
  target?.closest("fieldset")?.scrollIntoView({behavior:"smooth",block:"center"});
  target?.focus({preventScroll:true});
  return false;
};
form.addEventListener("change",e=>{
  if(e.target?.matches('input[type="radio"]'))updateCoreProgress();
});
document.addEventListener("click",e=>{
  const target=e.target.closest("button");
  if(!target)return;
  const n=target.dataset.next,b=target.dataset.back;
  if(n){
    if(Number(n)===3&&!coreComplete())return;
    show(Number(n));
  }
  if(b)show(Number(b));
});
const clearSummary=document.getElementById("clearRcasSummary");
clearSummary?.addEventListener("click",()=>{
  try{sessionStorage.removeItem("gt_rcas_state");}catch(_){}
  const res=document.getElementById("rcasResult");
  res.hidden=true;res.replaceChildren();
  clearSummary.textContent="خلاصه مسیر این نشست پاک شد.";
});
document.getElementById("showRoute").addEventListener("click",()=>{
  const res=document.getElementById("rcasResult"),d=document.getElementById("priorityDomain").value;
  res.replaceChildren();
  res.hidden=false;
  if(!coreComplete()){
    res.textContent="پیش از انتخاب مسیر، Core 28 را کامل کن؛ هیچ مسیر معتبری ذخیره نشده است.";
    return;
  }
  if(!Object.prototype.hasOwnProperty.call(routeMap,d)){
    res.textContent="یک حوزه اولویت D1 تا D6 انتخاب کن. پیشنهاد بدون انتخاب آگاهانه تحمیل نمی‌شود.";
    return;
  }
  const code=routeMap[d],why=document.getElementById("priorityWhy").value.trim();
  // Minimal session-state bridge for the existing student dashboard. It does
  // not save raw item scores, contact details, private narrative or P0 answers.
  const preview={
    completed:true,rcasRevision:"start-1.1",completedItemCount:28,
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
    ["/fa/shop/golden-talent/#professional-services","بررسی خدمات حرفه‌ای (اختیاری)","button"],
    ["/fa/app/student/","پیش‌نمایش داشبورد دانش‌آموز","button"]
  ]){
    const link=document.createElement("a");link.href=href;link.className=kind;link.textContent=label;links.append(link);
  }
  res.append(links);
});
updateCoreProgress();
})();
