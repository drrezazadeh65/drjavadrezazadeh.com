/* JR Assessment Literacy Studio v1.
 * Reflective, educational decision aid for teachers. No pupil information,
 * psychometric scoring, classification, diagnosis, prediction or persistence.
 * This is not an automatic assessment or a substitute for institutional rules.
 */
(()=>{
 'use strict';
 const localizations={
 fa:{
  eyebrow:'ASSESSMENT LITERACY · تصمیم شواهدمحور',
  heading:'آزمایشگاه سواد سنجش؛ از شواهد کلاس تا قضاوت مسئولانه',
  lead:'هدف تصمیم، نوع شواهد و پیامد تصمیم را تغییر دهید تا ببینید کدام برداشت‌ها قابل دفاع‌اند و در چه شرایطی باید شواهد بیشتری گردآوری شود.',
  labels:{purpose:'هدف استفاده از شواهد',source:'منبع اصلی شواهد',stakes:'پیامد تصمیم',breadth:'گستره شواهد',access:'فرصت دسترسی و مشارکت'},
  choices:{
   purpose:{feedback:'بازخورد برای بهبود یادگیری',progress:'بررسی پیشرفت در طول زمان',placement:'تصمیم آموزشی درباره مسیر یا سطح'},
   source:{observation:'مشاهده و عملکرد در کلاس',task:'آزمون یا تکلیف کوتاه',portfolio:'مجموعه آثار و تکالیف',selfreport:'خودگزارشی یادگیرنده'},
   stakes:{low:'بازنگری قابل‌اصلاح در تدریس',high:'تصمیم پرپیامد درباره فرصت یا دسترسی'},
   breadth:{single:'فقط یک موقعیت یا نوبت',multiple:'شواهد چندگانه در چند موقعیت'},
   access:{unchecked:'دسترسی و موانع هنوز بررسی نشده',reviewed:'دسترسی، زبان و تسهیلات بررسی شده‌اند'}
  },
  headings:{reading:'این شواهد چه چیزی را روشن می‌کنند؟',limits:'چه چیزی هنوز نامعلوم است؟',action:'اقدام سازنده بعدی',fairness:'عدالت و دسترسی در تفسیر',warning:'احتیاط اصلی'},
  purposes:{
   feedback:{reading:'این شواهد می‌توانند درباره پاسخ یادگیرنده به یک تکلیف یا فعالیت مشخص، بازخورد نزدیک به عمل فراهم کنند.',action:'یک بازخورد مشخص ارائه دهید و فرصت اصلاح یا تلاش دوباره را فراهم کنید.'},
   progress:{reading:'مقایسه عملکرد با هدف روشن و معیارهای ثابت می‌تواند بخشی از روند رشد را قابل مشاهده کند.',action:'نمونه‌های قابل مقایسه را در زمان‌های متفاوت بررسی و تغییرات را با شرایط اجرای هر نمونه تفسیر کنید.'},
   placement:{reading:'شواهد آموزشی ممکن است بخشی از آمادگی برای یک مسیر را روشن کنند، اما به‌تنهایی تصمیم قطعی نمی‌سازند.',action:'ضوابط رسمی، معیارهای شفاف، چند منبع مستقل و بازبینی انسانی تصمیم را بررسی کنید.'}
  },
  sources:{
   observation:{strength:'مشاهده عملکرد واقعی در یک بافت معین',limit:'مشاهده یک کلاس، تمام توانایی‌ها یا عملکرد بیرون از آن موقعیت را نشان نمی‌دهد.',next:'هدف مشاهده و نشانه‌های رفتاری مرتبط را تعریف کنید؛ در فعالیت دیگری نیز مشاهده کنید.'},
   task:{strength:'پاسخ به پرسش‌ها یا انجام تکلیف‌هایی با محدوده مشخص',limit:'یک آزمون کوتاه ممکن است تحت تأثیر آشنایی با قالب، اضطراب، زبان دستور و فرصت پاسخ باشد.',next:'پوشش اهداف یادگیری، وضوح دستورها و نمونه‌های پاسخ را بازبینی کنید؛ یک روش دیگر هم به کار ببرید.'},
   portfolio:{strength:'نمونه‌هایی از کار یادگیرنده و روند بازبینی آن‌ها',limit:'مجموعه آثار ممکن است فرصت‌ها، کمک بیرونی یا شرایط نابرابر تولید کار را پنهان کند.',next:'معیارهای مشترک و شرایط تولید آثار را مستند و نمونه‌های قابل مقایسه را تحلیل کنید.'},
   selfreport:{strength:'برداشت و توضیح یادگیرنده درباره تجربه خویش',limit:'خودگزارشی نشانه‌ای از تجربه ادراک‌شده است، نه شاهد مستقیم تسلط یا تشخیص توانایی.',next:'خودگزارشی را با مشاهده، گفت‌وگو و یک تکلیف مناسب کنار هم بررسی کنید.'}
  },
  cautions:{
   highSingle:'برای تصمیم پرپیامد، یک منبع در یک نوبت معمولاً کفایت استنباطی ندارد؛ تصمیم را متوقف و شواهد مستقل و امکان اعتراض یا بازبینی فراهم کنید.',
   highMultiple:'چندمنبعی بودن به‌تنهایی اعتبار تصمیم پرپیامد را ثابت نمی‌کند؛ کیفیت ابزار، قواعد رسمی، خطا و بازبینی انسانی باید مستقل بررسی شوند.',
   lowSingle:'این نتیجه فقط برای یک موقعیت مناسب است؛ از آن برچسب ثابت، رتبه یا پیش‌بینی نسازید.',
   lowMultiple:'حتی با چند نمونه، دامنه تفسیر باید به هدف و کیفیت شواهد محدود بماند.'
  },
  fairness:{
   unchecked:'پیش از استنباط، بررسی کنید زبان تکلیف، دسترس‌پذیری، تسهیلات معقول، زمینه فرهنگی و فرصت آشنایی با روش برای یادگیرندگان منصفانه بوده‌اند.',
   reviewed:'بررسی دسترسی گام ضروری است، اما به‌تنهایی نبود سوگیری را اثبات نمی‌کند؛ شواهد تفاوت فرصت و پیامدها را بازبینی کنید.'
  },
  limitsPrefix:'منبع منتخب: ',
  singles:'در حال حاضر تنها یک مشاهده/نوبت دارید؛ نبود شواهد مخالف به معنای تأیید نتیجه نیست.',
  multiples:'چند نمونه می‌تواند به مقایسه کمک کند، اما تنها در صورت تناسب وظایف، کیفیت و ثبات معیارها.',
  outcome:'نتیجهٔ این کاربرگ صرفاً یک راهنمای تأمل حرفه‌ای است؛ نمره، تشخیص یا مجوز تصمیم‌گیری خودکار تولید نمی‌شود.',
  privacy:'این انتخاب‌ها فقط در حافظهٔ این صفحه پردازش می‌شوند. نام یا اطلاعات دانش‌آموز را وارد نکنید؛ هیچ پاسخی ذخیره یا ارسال نمی‌شود.',
  reset:'بازنشانی انتخاب‌ها',
  resetNotice:'انتخاب‌ها به حالت اولیه بازگشتند؛ اطلاعاتی ذخیره نشده است.',
  nextLinks:'ادامه مطالعه در چارچوب علمی',
  more:'/fa/golden-talent/ravesh-shenasi/',moreText:'حدود علمی تفسیر شواهد',
  action:'/fa/services/teacher_consult_60/',actionText:'مشاوره حرفه‌ای معلمان (با شرح و شرایط واقعی)'
 },
 en:{
  eyebrow:'ASSESSMENT LITERACY · EVIDENCE-INFORMED DECISIONS',
  heading:'Assessment Literacy Studio: from classroom evidence to responsible judgement',
  lead:'Change the intended use, evidence source and consequences of a decision to examine what the evidence can reasonably support—and what still needs investigation.',
  labels:{purpose:'Intended use of evidence',source:'Main source of evidence',stakes:'Consequences of the decision',breadth:'Breadth of evidence',access:'Access and participation'},
  choices:{
   purpose:{feedback:'Formative feedback for learning',progress:'Understanding progress over time',placement:'Educational placement or pathway choice'},
   source:{observation:'Classroom observation and performance',task:'Short test or learning task',portfolio:'Portfolio of work samples',selfreport:'Learner self-report'},
   stakes:{low:'Revisable classroom adjustment',high:'High-stakes access or opportunity decision'},
   breadth:{single:'One occasion or setting',multiple:'Multiple occasions and sources'},
   access:{unchecked:'Access and barriers not yet examined',reviewed:'Language, access and accommodations reviewed'}
  },
  headings:{reading:'What might the evidence illuminate?',limits:'What remains uncertain?',action:'Constructive next step',fairness:'Fairness and access',warning:'Main interpretive caution'},
  purposes:{
   feedback:{reading:'The evidence can support feedback on a particular task or observed learning activity, provided it is aligned with the intended goal.',action:'Offer specific feedback and a meaningful opportunity for revision or another attempt.'},
   progress:{reading:'Comparable work aligned with explicit learning goals may illuminate aspects of developmental change over time.',action:'Review work from distinct occasions against consistent criteria while accounting for differences in learning conditions.'},
   placement:{reading:'Educational evidence may inform one part of a pathway decision; it cannot independently determine a learner’s future potential.',action:'Check published decision rules, transparent criteria, multiple independent sources and opportunities for human review.'}
  },
  sources:{
   observation:{strength:'Situated performance in an observable learning context',limit:'A single classroom observation does not represent every ability or performance beyond that setting.',next:'Specify the learning indicators and repeat observation in a different task or context.'},
   task:{strength:'Responses to a bounded set of tasks or questions',limit:'A short test can reflect format familiarity, anxiety, language demands and opportunity as well as learning.',next:'Review task alignment, instructions and response evidence; add a different method where useful.'},
   portfolio:{strength:'Examples of a learner’s work and their revisions',limit:'A portfolio can conceal unequal production opportunities, assistance or the context in which work was created.',next:'Make the criteria and production conditions explicit; compare representative samples fairly.'},
   selfreport:{strength:'The learner’s account of their own experience and perceived difficulties',limit:'A self-report describes perceived experience; it is not direct evidence of mastery or a diagnosis.',next:'Triangulate accounts with observation, dialogue and an appropriate learning task.'}
  },
  cautions:{
   highSingle:'Do not make a high-stakes decision from one source on one occasion. Seek independent evidence, published rules and a route for appeal or human review.',
   highMultiple:'Multiple sources do not automatically establish decision validity. Examine evidence quality, error, applicable rules and the human review process.',
   lowSingle:'Treat the judgement as local and revisable; do not transform a single observation into a stable label, rank or prediction.',
   lowMultiple:'Even with several examples, interpretation must remain bounded by the purpose and quality of the evidence.'
  },
  fairness:{
   unchecked:'Before interpreting performance, check the language of the task, accessibility, reasonable accommodations, cultural context and opportunity to become familiar with the method.',
   reviewed:'Reviewing accessibility is necessary but does not itself establish fairness. Revisit unequal opportunity, evidence quality and any differential consequences.'
  },
  limitsPrefix:'Selected source: ',
  singles:'Only one occasion is represented; absence of contrary evidence is not confirmation.',
  multiples:'Multiple examples may strengthen contextual comparison only if tasks, criteria and evidence quality support it.',
  outcome:'This is a reflective professional guide, not a psychometric test, diagnosis, automatic decision rule or validated prediction.',
  privacy:'Selections are processed in this page’s memory only. Do not enter pupil information; nothing is saved or sent to a server.',
  reset:'Reset choices',
  resetNotice:'Choices restored to defaults; nothing was stored.',
  nextLinks:'Further professional reading',
  more:'/en/golden-talent/methodology/',moreText:'Scientific and interpretive limitations',
  action:'/en/services/teacher_consult_60/',actionText:'Teacher consultation — verified professional scope'
 }
 };
 const create=(tag,cls,value)=>{
  const x=document.createElement(tag);
  if(cls)x.className=cls;
  if(value!==undefined)x.textContent=value;
  return x;
 };
 const roots=[...document.querySelectorAll('[data-evidence-studio]')];
 roots.forEach((root,index)=>{
  const locale=root.dataset.locale==='fa'?'fa':'en',T=localizations[locale],prefix='jr-al-'+index+'-';
  root.classList.add('jr-assessment-studio');
  const eyebrow=create('span','jr-al-eyebrow',T.eyebrow);
  const h=create('h3',null,T.heading);
  const intro=create('p','jr-al-intro',T.lead);
  const form=create('form','jr-al-form');
  form.noValidate=true;
  const fields=create('div','jr-al-fields');
  const control={};
  for(const key of ['purpose','source','stakes','breadth','access']){
   const label=create('label','jr-al-field');
   const caption=create('span',null,T.labels[key]);
   const select=create('select');select.name=key;select.id=prefix+key;
   select.setAttribute('aria-label',T.labels[key]);
   for(const [value,text] of Object.entries(T.choices[key])){
    const option=create('option',null,text);option.value=value;select.append(option);
   }
   label.htmlFor=select.id;label.append(caption,select);fields.append(label);
   control[key]=select;
  }
  const result=create('section','jr-al-results');
  result.setAttribute('aria-label',locale==='fa'?'راهنمای تفسیر بر اساس انتخاب‌های فعلی':'Guidance based on current selections');
  const cards=create('div','jr-al-result-grid');
  const content={};
  for(const key of ['reading','limits','action','fairness','warning']){
   const card=create('article','jr-al-result-card jr-al-result-'+key);
   card.append(create('h4',null,T.headings[key]));
   const body=create('p');body.dataset.role=key;card.append(body);
   cards.append(card);content[key]=body;
  }
  const status=create('p','jr-al-status');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  status.setAttribute('aria-atomic','true');
  result.append(cards,status);
  const footer=create('div','jr-al-footer');
  const reset=create('button','jr-al-reset',T.reset);reset.type='reset';
  const note=create('p','jr-al-boundary',T.outcome);
  const privacy=create('p','jr-al-privacy',T.privacy);
  const links=create('div','jr-al-links');
  const more=create('a',null,T.moreText),action=create('a',null,T.actionText);
  more.href=T.more;action.href=T.action;links.append(more,action);
  footer.append(reset,note,privacy,create('strong',null,T.nextLinks),links);
  form.append(fields,result,footer);
  root.replaceChildren(eyebrow,h,intro,form);

  const draw=(message)=>{
   const {purpose,source,stakes,breadth,access}=Object.fromEntries(
    Object.entries(control).map(([k,v])=>[k,v.value]));
   const p=T.purposes[purpose],s=T.sources[source];
   if(!p||!s)return;
   const risk=stakes==='high'
    ?(breadth==='single'?'highSingle':'highMultiple')
    :(breadth==='single'?'lowSingle':'lowMultiple');
   content.reading.textContent=p.reading+' '+T.limitsPrefix+s.strength+'.';
   content.limits.textContent=s.limit+' '+(breadth==='single'?T.singles:T.multiples);
   content.action.textContent=p.action+' '+s.next;
   content.fairness.textContent=T.fairness[access]||T.fairness.unchecked;
   content.warning.textContent=T.cautions[risk];
   result.dataset.risk=stakes==='high'?'higher-stakes':'revisable';
   status.textContent=message||(locale==='fa'
    ?'راهنمای توصیفی با انتخاب‌های جدید به‌روز شد.'
    :'Descriptive guidance updated for your current choices.');
  };
  form.addEventListener('input',()=>draw());
  form.addEventListener('change',()=>draw());
  form.addEventListener('submit',event=>event.preventDefault());
  form.addEventListener('reset',()=>{
   // Native reset completes after this event; update from actual defaults.
   queueMicrotask(()=>draw(T.resetNotice));
  });
  draw();
 });
})();
