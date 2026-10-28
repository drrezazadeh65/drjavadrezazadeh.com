/* JR Service Navigator v1.0
 * Curated audience/need -> existing 21 canonical service IDs.
 * All public tariffs and Persian service descriptions come from the one
 * approved catalogue, never from client-generated prices or invented offers.
 * English titles/descriptions come from the existing bilingual service atlas.
 * Discovery is not advice, a reservation, a checkout, or proof of availability.
 * No personal data, storage, analytics, third-party requests or cookies.
 */
(()=>{
 'use strict';
 const roots=[...document.querySelectorAll('[data-jr-service-navigator]')];
 if(!roots.length)return;
 const canonical=[
 'academic_consult_60','student_parent_90','konkur_consult_60','konkur_month',
 'transcript_analysis','field_selection_standard','field_selection_comprehensive',
 'talent_initial','golden_talent_comprehensive','golden_talent_premium',
 'teacher_consult_60','teacher_dev_90','manuscript_diagnostic','academic_editing',
 'research_consult_60','journal_strategy','reviewer_response','academic_cv',
 'academic_interview_90','organization_consult_90','specialist_workshop_120'
 ];
 // Curated, transparent lookup: no statistical or personal-data matching.
 const journeys={
  student:{
   planning:['academic_consult_60','student_parent_90','transcript_analysis'],
   exam:['konkur_consult_60','konkur_month'],
   major:['field_selection_standard','field_selection_comprehensive'],
   talent:['talent_initial','golden_talent_comprehensive','golden_talent_premium']
  },
  researcher:{
   manuscript:['manuscript_diagnostic','academic_editing','reviewer_response'],
   research:['research_consult_60','manuscript_diagnostic'],
   publishing:['journal_strategy','manuscript_diagnostic','reviewer_response'],
   career:['academic_cv','academic_interview_90']
  },
  teacher:{
   practice:['teacher_consult_60','teacher_dev_90'],
   growth:['teacher_dev_90','teacher_consult_60']
  },
  institution:{
   strategy:['organization_consult_90','specialist_workshop_120'],
   workshop:['specialist_workshop_120','organization_consult_90']
  }
 };
 const L={
 fa:{
  heading:'مسیر‌یاب هوشمندانه خدمات',eyebrow:'SERVICE PATHWAYS · راهنمای تعاملی',
  lead:'ابتدا مخاطب و مسئله را انتخاب کنید. این ابزار فقط خدمات تأییدشده کاتالوگ را نشان می‌دهد تا دامنه، خروجی و محدودیت هر خدمت را پیش از هر درخواست مقایسه کنید.',
  audience:'برای چه کسی بررسی می‌کنید؟',goal:'در حال حاضر چه مسئله‌ای مهم‌تر است؟',
  pick:'انتخاب کنید…',audiences:{student:'دانش‌آموز یا خانواده',researcher:'پژوهشگر یا دانشگاهی',teacher:'معلم یا مدرس',institution:'مدرسه یا سازمان'},
  goals:{
   student:{planning:'یک تصمیم تحصیلی یا تحلیل کارنامه',exam:'برنامه‌ریزی و تصمیم‌های کنکور',major:'انتخاب رشته و اولویت‌بندی دانشگاه',talent:'شواهد استعداد و مسیر رشد'},
   researcher:{manuscript:'بازبینی یا ویرایش مقاله',research:'طرح، روش یا تفسیر پژوهش',publishing:'انتخاب مجله و پاسخ به داور',career:'رزومه یا مصاحبه دانشگاهی'},
   teacher:{practice:'مسئله تدریس، مواد یا سنجش',growth:'توسعه حرفه‌ای مدرس'},
   institution:{strategy:'مشاوره برای یک مسئله سازمانی',workshop:'کارگاه و آموزش گروهی'}
  },
  waiting:'با انتخاب مخاطب و مسئله، خدمات مرتبطِ موجود نمایش داده می‌شوند.',
  loading:'در حال خواندن کاتالوگ معتبر…',missing:'کاتالوگ خدمات در حال حاضر قابل تأیید نیست. فهرست اصلی خدمات را پایین همین صفحه بررسی کنید.',
  mismatch:'اطلاعات رسمی برخی خدمات با فهرست صفحه هم‌خوان نیست؛ تا بررسی، پیشنهاد نمایش داده نمی‌شود.',
  count:'مسیر خدمات مرتبط',price:'تعرفه ثبت‌شده',toman:' تومان',
  outcome:'خروجی مورد انتظار',boundary:'حدود و محدودیت',fit:'مناسب برای',
  scope:'مطالعه دامنه واقعی خدمت',reset:'شروع دوباره',clear:'انتخاب‌ها پاک شدند؛ داده‌ای ذخیره نشده است.',
  status:'این یک راهنمای انتخاب خدمات است، نه توصیه قطعی، رزرو، تأیید ظرفیت، صورتحساب یا پرداخت.',
  note:'مقایسه بر اساس مسئله انتخابی و دسته‌بندی شفاف خدمات است؛ هیچ امتیاز استعداد یا احتمال موفقیتی محاسبه نمی‌شود.',
  contact:'آشنایی با همه خدمات',currency:'تومان',
  failedTitle:'بازیابی اطلاعات ممکن نشد'
 },
 en:{
  heading:'Professional Service Navigator',eyebrow:'SERVICE PATHWAYS · INTERACTIVE GUIDE',
  lead:'Begin with your audience and the question you are trying to resolve. Explore verified existing services, their published scope and boundaries before entering any purchasing or consultation process.',
  audience:'Who is this for?',goal:'Which issue matters most right now?',
  pick:'Choose an option…',audiences:{student:'Student or parent',researcher:'Researcher or academic',teacher:'Teacher or educator',institution:'School or organisation'},
  goals:{
   student:{planning:'An educational decision or transcript review',exam:'Entrance examination planning',major:'University major and programme selection',talent:'Developmental evidence and talent exploration'},
   researcher:{manuscript:'Manuscript review or academic editing',research:'Research design or methods',publishing:'Journal selection and reviewer response',career:'Academic CV or interview preparation'},
   teacher:{practice:'Teaching, materials or assessment question',growth:'Professional development'},
   institution:{strategy:'An organisational education challenge',workshop:'Professional workshop or group learning'}
  },
  waiting:'Select an audience and an issue to see related existing services.',
  loading:'Checking the approved service catalogue…',missing:'The current catalogue could not be verified. Please use the existing full service directory below.',
  mismatch:'Published service information does not match the current directory. Suggestions are withheld until verified.',
  count:'Matching existing services',price:'Published catalogue tariff',toman:' toman',
  outcome:'Expected deliverable',boundary:'Professional boundary',fit:'Suitable for',
  scope:'View actual service scope',reset:'Start again',clear:'Your selections were cleared; nothing was saved.',
  status:'This is a discovery guide, not a professional assessment, confirmed booking, capacity claim, invoice or payment.',
  note:'Matching uses transparent service categories only. It does not compute an aptitude score or predict academic outcomes.',
  contact:'Browse all services',currency:'toman',failedTitle:'Information unavailable'
 }
 };
 const escapeLabel=(value,max)=>String(value||'').trim().slice(0,max);
 const node=(tag,text,klass)=>{
   const el=document.createElement(tag);
   if(text!==undefined&&text!==null)el.textContent=text;
   if(klass)el.className=klass;
   return el;
 };
 const validItem=s=>s&&canonical.includes(s.id)&&s.sellable===true&&
  Number.isSafeInteger(s.price)&&s.price>0&&
  typeof s.title_fa==='string'&&s.title_fa.trim()&&
  typeof s.fit_fa==='string'&&typeof s.outcome_fa==='string'&&typeof s.boundary_fa==='string';
 const getAtlas=()=>{
  const titles=new Map();
  document.querySelectorAll('.jr-en-services-atlas a[href^="/en/services/"]').forEach(link=>{
   const match=link.getAttribute('href')?.match(/^\/en\/services\/([a-z0-9_]+)\/$/);
   const name=link.querySelector('strong')?.textContent?.trim();
   const fit=link.querySelector('span')?.textContent?.trim();
   if(match&&canonical.includes(match[1])&&name&&fit)titles.set(match[1],{name,fit});
  });
  return titles;
 };
 // Progressive enhancement of the EXISTING crawlable English 21-offer directory.
 // It never creates extra SKUs, alters prices, requests user data or starts payment.
 function enhanceEnglishAtlas(map,english){
  const atlas=document.querySelector('.jr-en-services-atlas');
  const list=atlas?.querySelector('ul.cards');
  if(!atlas||!list||atlas.querySelector('[data-jr-atlas-filter]'))return;
  const rows=[...list.children].map((li,index)=>{
   const link=li.querySelector('a[href^="/en/services/"]');
   const id=link?.getAttribute('href')?.match(/^\/en\/services\/([a-z0-9_]+)\/$/)?.[1];
   const service=id?map.get(id):null;
   const title=link?.querySelector('strong')?.textContent?.trim();
   const fit=link?.querySelector('span')?.textContent?.trim();
   const quoted=link?.querySelector('em')?.textContent||'';
   if(!service||!english.has(id)||!title||!fit||
      !quoted.includes(new Intl.NumberFormat('en-US').format(service.price)+' toman'))return null;
   return {li,index,id,price:service.price,
    searchable:(title+' '+fit).normalize('NFKC').toLocaleLowerCase('en')};
  });
  // On any stale/mismatched data, leave the entire server-rendered directory visible.
  if(rows.length!==canonical.length||rows.some(row=>!row)||
     new Set(rows.map(row=>row.id)).size!==canonical.length)return;
  const controls=node('div',null,'jr-sn-atlas-filter');
  controls.setAttribute('data-jr-atlas-filter','');
  const field=node('label',null,'jr-sn-atlas-field');
  field.append(node('span','Search the 21 published services'));
  const search=node('input');search.type='search';search.maxLength=90;
  search.setAttribute('autocomplete','off');
  search.setAttribute('placeholder','e.g. editing, teacher, university');
  field.append(search);
  const sortField=node('label',null,'jr-sn-atlas-field');
  sortField.append(node('span','Order services by'));
  const sort=node('select');
  sort.append(new Option('Original catalogue order','default'),
   new Option('Price: low to high','asc'),new Option('Price: high to low','desc'));
  sortField.append(sort);
  const feedback=node('p','','jr-sn-atlas-feedback');
  feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
  const clear=node('button','Clear filters','jr-sn-atlas-clear');clear.type='button';
  controls.append(field,sortField,clear,feedback);
  const original=rows.map(row=>row.li);
  const apply=()=>{
   const terms=search.value.normalize('NFKC').toLocaleLowerCase('en').trim().split(/\s+/).filter(Boolean);
   const choice=sort.value;
   const arranged=[...rows].sort((a,b)=>choice==='asc'
    ?a.price-b.price||a.index-b.index:choice==='desc'
    ?b.price-a.price||a.index-b.index:a.index-b.index);
   list.replaceChildren(...arranged.map(row=>row.li));
   let visible=0;
   for(const row of rows){
    const match=terms.every(term=>row.searchable.includes(term));
    row.li.hidden=!match;
    if(match)visible++;
   }
   feedback.textContent=visible+' of '+canonical.length+
    ' published services shown. This is a catalogue filter, not an availability or payment confirmation.';
   clear.hidden=!terms.length&&choice==='default';
  };
  search.addEventListener('input',apply);
  sort.addEventListener('change',apply);
  clear.addEventListener('click',()=>{search.value='';sort.value='default';apply();search.focus()});
  // Keep the canonical 21 links in document order until the user requests sorting.
  atlas.querySelector('h2')?.insertAdjacentElement('afterend',controls);
  apply();
 }

 for(const [index,root] of roots.entries()){
  const isFa=root.dataset.locale==='fa',t=L[isFa?'fa':'en'],ident='jr-sn-'+index+'-';
  root.classList.add('jr-service-navigator');
  const head=node('div',null,'jr-sn-head');
  head.append(node('span',t.eyebrow,'jr-sn-eyebrow'),node('h3',t.heading),node('p',t.lead));
  const form=node('form',null,'jr-sn-form');form.noValidate=true;
  const controls=node('div',null,'jr-sn-controls');
  const first=node('label',null,'jr-sn-field');
  const firstTitle=node('span',t.audience);const audience=node('select');
  audience.id=ident+'audience';audience.name='audience';
  audience.appendChild(new Option(t.pick,''));
  Object.entries(t.audiences).forEach(([key,label])=>audience.appendChild(new Option(label,key)));
  first.append(firstTitle,audience);
  const second=node('label',null,'jr-sn-field');
  const secondTitle=node('span',t.goal),goal=node('select');
  goal.id=ident+'goal';goal.name='goal';goal.disabled=true;
  goal.appendChild(new Option(t.pick,''));
  second.append(secondTitle,goal);
  controls.append(first,second);form.append(controls);
  const results=node('section',null,'jr-sn-results');
  results.setAttribute('aria-label',t.count);
  const summary=node('p',t.loading,'jr-sn-status');summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');summary.setAttribute('aria-atomic','true');
  const cards=node('div',null,'jr-sn-cards');cards.hidden=true;
  const reset=node('button',t.reset,'jr-sn-reset');reset.type='reset';
  const notice=node('p',t.status,'jr-sn-notice');
  const explainer=node('p',t.note,'jr-sn-explainer');
  results.append(summary,cards);form.append(results,reset,notice,explainer);
  root.append(head,form);
  let catalogue=null,englishTitles=null;
  function refreshGoals(){
   const objectives=t.goals[audience.value]||{};
   goal.replaceChildren(new Option(t.pick,''));
   Object.entries(objectives).forEach(([id,label])=>goal.appendChild(new Option(label,id)));
   goal.disabled=!audience.value;
  }
  function render(message){
   cards.replaceChildren();cards.hidden=true;
   if(!catalogue){summary.textContent=t.loading;return}
   if(!audience.value||!goal.value){summary.textContent=message||t.waiting;return}
   const ids=journeys[audience.value]?.[goal.value]||[];
   const active=ids.map(id=>catalogue.get(id)).filter(Boolean);
   if(active.length!==ids.length||(englishTitles&&active.some(item=>!englishTitles.has(item.id)))){
    summary.textContent=t.mismatch;return;
   }
   for(const item of active){
    const en=englishTitles?.get(item.id);
    const card=node('article',null,'jr-sn-card');
    const header=node('div',null,'jr-sn-card-top');
    header.append(node('span',item.id.replaceAll('_',' '),'jr-sn-code'));
    const amount=node('p',null,'jr-sn-price');
    amount.append(node('span',t.price),node('strong',
     new Intl.NumberFormat(isFa?'fa-IR':'en-US').format(item.price)+t.toman));
    header.append(amount);
    const title=node('h4',isFa?escapeLabel(item.title_fa,145):en.name);
    const fit=node('p',isFa?escapeLabel(item.fit_fa,500):en.fit,'jr-sn-fit');
    const details=node('dl',null,'jr-sn-details');
    if(isFa){
     for(const [label,value] of [[t.outcome,item.outcome_fa],[t.boundary,item.boundary_fa]]){
      const row=node('div');row.append(node('dt',label),node('dd',escapeLabel(value,650)));details.append(row);
     }
    }else{
     // English descriptions are supplied by the existing published atlas,
     // not ad hoc machine-translated from sensitive Persian service text.
     details.append(node('p','Read the bilingual service page for the full deliverable and professional limits.','jr-sn-english-note'));
    }
    const actions=node('div',null,'jr-sn-actions');
    const link=node('a',t.scope,'jr-sn-link');
    link.href=(isFa?'/fa/services/':'/en/services/')+item.id+'/';
    actions.append(link);
    // Optional contact action uses the existing bilingual intake. A public
    // catalogue ID preserves context without collecting data or implying
    // availability, payment, booking, or personalised recommendations.
    const enquire=node('a',
      isFa?'پرسش درباره این خدمت':'Enquire about this service',
      'jr-sn-inquire');
    enquire.href=(isFa?'/fa/darkhast-moshavere/':'/en/request-consultation/')+
      '?service='+encodeURIComponent(item.id);
    enquire.dataset.conversionEvent='consultation_intent';
    enquire.dataset.conversionSurface=isFa?'fa_service_navigator':'en_service_navigator';
    actions.append(enquire);
    card.append(header,title,fit,details,actions);cards.append(card);
   }
   cards.hidden=false;
   summary.textContent=new Intl.NumberFormat(isFa?'fa-IR':'en-US').format(active.length)+' '+t.count;
  }
  audience.addEventListener('change',()=>{refreshGoals();render()});
  goal.addEventListener('change',()=>render());
  form.addEventListener('submit',event=>event.preventDefault());
  form.addEventListener('reset',()=>{window.setTimeout(()=>{refreshGoals();render(t.clear)},0)});
  async function load(){
   try{
    const response=await fetch('/assets/data/service-catalog.json',{
     method:'GET',credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}
    });
    if(!response.ok)throw Error('catalog_unavailable');
    const data=await response.json();
    if(data?.currency!=='IRT'||!Array.isArray(data.services))throw Error('catalog_contract');
    const available=data.services.filter(validItem);
    const map=new Map(available.map(s=>[s.id,s]));
    if(map.size!==canonical.length||canonical.some(id=>!map.has(id)))throw Error('catalog_mismatch');
    const english=isFa?null:getAtlas();
    if(english&&canonical.some(id=>!english.has(id)))throw Error('atlas_mismatch');
    catalogue=map;englishTitles=english;
    if(english)enhanceEnglishAtlas(map,english);
    render();
   }catch(_){
    catalogue=null;
    cards.replaceChildren();cards.hidden=true;
    summary.textContent=t.missing;
    audience.disabled=true;goal.disabled=true;
   }
  }
  refreshGoals();
  load();
 }
})();
