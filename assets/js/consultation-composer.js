/* Prepare a user-reviewed email; never submit or persist consultation details. */
(function () {
  'use strict';
  document.querySelectorAll('[data-consultation-composer]').forEach(function (form) {
    var fa = form.dataset.language === 'fa';
    var fields = form.querySelector('[data-composer-fields]');
    var preview = form.querySelector('[data-composer-preview]');
    var draft = form.querySelector('[data-composer-draft]');
    var email = form.querySelector('[data-composer-email]');
    var status = form.querySelector('[data-composer-status]');
    var copy = form.querySelector('[data-composer-copy]');
    var recipient = 'mailto:dr.rezazadeh65@gmail.com';
    var revision = 0;
    var requestedServiceDetails=form.querySelector('[data-requested-service-details]');
    var requestedServiceValue=null;
    // Labels and prices come from the already-published public catalogues.
    // The map is display-only: it never confers capacity, acceptance or payment.
    var publicServiceFacts=new Map();
    // Practical, context-specific intake guidance without additional fields,
    // automatic uploads, saved text or collection of child/manuscript records.
    var scopeHint=document.createElement('p');
    scopeHint.className='form-note jr-intake-scope-hint';
    scopeHint.id='jr-intake-scope-hint';
    scopeHint.setAttribute('aria-live','polite');
    var serviceSelector=form.elements.namedItem('service');
    serviceSelector?.closest('label')?.insertAdjacentElement('afterend',scopeHint);
    var questionField=form.elements.namedItem('question');
    if(questionField){
      var oldDescription=questionField.getAttribute('aria-describedby')||'';
      questionField.setAttribute('aria-describedby',
        [oldDescription,scopeHint.id].filter(Boolean).join(' '));
    }
    function setScopeHint(serviceId){
      var key=String(serviceId||'');
      var group='general';
      if(/^(?:konkur_|field_selection_|transcript_|academic_consult_|student_parent_|vip:(?:academic-direction|university-selection))/.test(key))group='student';
      else if(/^(?:talent_|golden_talent_|vip:golden-talent-signature)/.test(key))group='talent';
      else if(/^(?:teacher_|vip:educator-development)/.test(key))group='teacher';
      else if(/^(?:organization_|specialist_workshop_|vip:institutional-advisory)/.test(key))group='organization';
      else if(/^(?:manuscript_|academic_editing|research_|journal_strategy|reviewer_response|academic_cv|academic_interview_|vip:research-publication)/.test(key))group='research';
      var hints={
        general:[
          'در دو یا سه جمله مسئله و هدف خود را بنویسید. در درخواست اولیه فایل، رمز، شماره کارت یا اطلاعات محرمانه ارسال نکنید.',
          'Briefly describe one question and desired decision. Do not include private documents, passwords or card details.'
        ],
        student:[
          'پایه یا گروه آزمون، تصمیم مشخص و محدودیت زمانی را کوتاه بیان کنید. کارنامه دارای مشخصات فردی را فعلاً ارسال نکنید.',
          'State the learning stage, the specific decision and its timeline. Do not submit identifiable examination records yet.'
        ],
        talent:[
          'پرسش رشد، علاقه‌های بیان‌شده توسط خود دانش‌آموز و زمینه تجربه را بدون نام، مشخصات کودک یا نتیجه آزمون حساس توضیح دهید.',
          'Explain the developmental question, the learner’s own interests and opportunities without identifying child records or sensitive test data.'
        ],
        teacher:[
          'سطح آموزشی، یک هدف تدریس و یک مسئله قابل‌مشاهده را توضیح دهید؛ نام و نمونه کار قابل‌شناسایی فراگیران را وارد نکنید.',
          'Describe the teaching context, a learning objective and one observed issue without identifiable learner material.'
        ],
        organization:[
          'نوع مؤسسه، تصمیم پیش رو، نقش شما و محدودیت اجرا را به‌صورت کلی بیان کنید؛ اسناد محرمانه کارکنان یا فراگیران را نفرستید.',
          'Outline the institution, decision, your role and implementation constraints without sharing confidential personnel or student records.'
        ],
        research:[
          'مرحله مقاله یا پژوهش، مسئله اصلی و نوع کمک مدنظر را بگویید؛ نسخه محرمانه مقاله یا داده خام را در فرم اولیه قرار ندهید.',
          'State the manuscript stage, the substantive question and the assistance sought; do not paste unpublished confidential work or raw data.'
        ]
      };
      scopeHint.textContent=hints[group][fa?0:1];
    }
    setScopeHint('');

    function renderRequestedService(service,english){
      if(!requestedServiceDetails)return;
      requestedServiceDetails.replaceChildren();
      requestedServiceDetails.hidden=!service;
      if(!service)return;
      var heading=document.createElement('strong');
      heading.textContent=fa?(service.title_fa||'خدمت انتخاب‌شده'):(english?.title||'');
      requestedServiceDetails.appendChild(heading);
      var price=Number.isSafeInteger(service.price)&&service.price>=0
        ?new Intl.NumberFormat(fa?'fa-IR':'en-GB').format(service.price)+(fa?' تومان':' toman')
        :(fa?'برای اعلام تعرفه هماهنگ کنید':'Confirm the listed fee');
      var rows=fa?[
        ['تعرفه ثبت‌شده',price],
        ['مناسب برای',service.fit_fa],
        ['خروجی مورد انتظار',service.outcome_fa],
        ['مرز خدمت',service.boundary_fa]
      ]:[
        ['Listed price',price],
        ['Who it is for',english?.fit],
        ['Expected outcome',english?.outcome],
        ['Scope and limits',english?.boundary]
      ];
      rows.filter(function(row){return typeof row[1]==='string'&&row[1].trim();})
        .forEach(function(row){
          var paragraph=document.createElement('p');
          var label=document.createElement('b');
          label.textContent=row[0]+': ';
          paragraph.append(label,document.createTextNode(row[1]));
          requestedServiceDetails.appendChild(paragraph);
        });
    }
    async function applyRequestedVip(vipId){
      // VIP deep links are public package identifiers, not a booking or
      // entitlement. Never infer any client details from URL parameters.
      var startedAt=revision;
      try{
        var responses=await Promise.all([
          fetch('/assets/data/vip-catalog.json',{cache:'no-store'}),
          fa?Promise.resolve(null):fetch('/assets/data/vip-descriptions-en.json',{cache:'no-store'})
        ]);
        if(!responses[0].ok||(!fa&&!responses[1].ok))return;
        var catalogue=await responses[0].json();
        var localized=fa?null:await responses[1].json();
        var vip=(catalogue.services||[]).find(function(item){
          return item.id===vipId&&item.sellable===true&&
            typeof item.title_fa==='string'&&item.title_fa.trim();
        });
        var translated=fa?null:localized?.services?.[vipId];
        if(!vip||(!fa&&(localized.language!=='en'||typeof translated!=='string'||
          !translated.trim()))||revision!==startedAt||!preview.hidden)return;
        var select=form.elements.namedItem('service');
        if(!select)return;
        var title=fa?vip.title_fa:translated;
        var option=Array.from(select.options).find(function(item){
          return item.value===title;
        });
        if(!option){
          option=document.createElement('option');
          option.value=title;
          option.textContent=title;
          option.dataset.serviceId='vip:'+vipId;
          select.appendChild(option);
        }
        option.dataset.serviceId='vip:'+vipId;
        select.value=option.value;
        requestedServiceValue=option.value;
        setScopeHint('vip:'+vipId);
        // The public VIP catalogue gives only a name, price and booking
        // requirement. Do not invent session counts, outcomes or acceptance.
        var display={
          title_fa:vip.title_fa,
          price:vip.price,
          fit_fa:'درخواست بررسی تناسب بسته اختصاصی با مسئله شما، پس از استعلام ظرفیت.',
          outcome_fa:'خروجی دقیق فقط پس از توافق مکتوب و تأیید امکان اجرا مشخص می‌شود.',
          boundary_fa:'قیمت و انتخاب بسته به معنی رزرو، پذیرش پرونده یا تأیید پرداخت نیست.'
        };
        var english=fa?null:{
          title:translated,
          fit:'A scoped VIP enquiry subject to suitability and capacity review.',
          outcome:'Exact deliverables require a written agreement before payment.',
          boundary:'The listed fee does not confirm booking, availability or settlement.'
        };
        renderRequestedService(display,english);
        status.textContent=fa
          ?'بسته VIP از کاتالوگ رسمی انتخاب شد؛ پیش از پرداخت، ظرفیت، تعداد جلسات، خروجی، زمان تحویل و لغو باید کتبی تأیید شوند.'
          :'VIP package selected from the public catalogue. Please agree on capacity, sessions, deliverables, timing and cancellation in writing before payment.';
      }catch(_){ /* Never disable the separate ordinary email request path. */ }
    }
    async function applyRequestedService(){
      var requested=new URLSearchParams(location.search).get('service');
      if(!requested)return;
      // Shared with the consented-intake catalogue's existing VIP selector.
      var vipMatch=/^vip:([a-z][a-z0-9-]{2,63})$/.exec(requested);
      if(vipMatch){ await applyRequestedVip(vipMatch[1]); return; }
      if(!/^[a-z][a-z0-9_]{2,63}$/.test(requested))return;
      // Catalogue and English copy are public descriptions, never payment,
      // booking or entitlement proof. Manual choices always take precedence.
      var startedAt=revision;
      try{
        var responses=await Promise.all([
          fetch('/assets/data/service-catalog.json',{cache:'no-store'}),
          fa?Promise.resolve(null):fetch('/assets/data/service-descriptions-en.json',{cache:'no-store'})
        ]);
        if(!responses[0].ok||(!fa&&!responses[1].ok))return;
        var catalogue=await responses[0].json();
        var localized=fa?null:await responses[1].json();
        var service=(catalogue.services||[]).find(function(item){
          return item.id===requested&&item.sellable===true;
        });
        var english=fa?null:localized?.services?.[requested];
        if(!service||(!fa&&(!english||localized.language!=='en'||
          !['title','fit','outcome','boundary'].every(function(key){
            return typeof english[key]==='string'&&english[key].trim();
          })))||revision!==startedAt||!preview.hidden)return;
        var select=form.elements.namedItem('service');
        if(!select)return;
        var selectedTitle=fa?service.title_fa:english.title;
        var option=Array.from(select.options).find(function(item){return item.value===selectedTitle;});
        if(!option){
          option=document.createElement('option');
          option.value=selectedTitle;
          option.textContent=selectedTitle;
          option.dataset.serviceId=service.id;
          select.appendChild(option);
        }
        option.dataset.serviceId=service.id;
        select.value=option.value;
        requestedServiceValue=option.value;
        setScopeHint(service.id);
        renderRequestedService(service,english);
        status.textContent=fa
          ?'خدمت انتخاب‌شده از صفحه تعرفه در فرم قرار گرفت؛ دامنه، خروجی و تعرفه را بررسی کنید و سپس زمینه و سؤال اصلی را تکمیل کنید.'
          :'The selected service has been added from the official catalogue. Review its fee, scope and outcome, then describe your context. Nothing has been sent or booked.';
      }catch(_){ /* Keep the ordinary manual email route available. */ }
    }
    function reconcileManualService(){
      var select=form.elements.namedItem('service');
      var option=select?.selectedOptions?.[0];
      var key=option?.dataset?.serviceId||'';
      var facts=publicServiceFacts.get(key);
      if(!facts){
        requestedServiceValue=null;
        setScopeHint('');
        renderRequestedService(null,null);
        return;
      }
      requestedServiceValue=option.value;
      setScopeHint(key);
      renderRequestedService(facts.service,facts.english);
      status.textContent=fa
        ?'شرح و تعرفه خدمت از کاتالوگ رسمی بارگذاری شد؛ این انتخاب نه رزرو است و نه پرداخت.'
        :'Service details were loaded from the public catalogue. Selection is neither a booking nor payment.';
    }
    async function loadManualCatalogueOptions(){
      var select=form.elements.namedItem('service');
      if(!select)return;
      // Explicit optgroups preserve the general free-text subject categories.
      // Missing catalogue responses never block the existing email draft route.
      function adoptOption(title,id,service,english,group){
        if(typeof title!=='string'||!title.trim())return;
        var existing=Array.from(select.options).find(function(item){
          return item.value===title&&item.value!=='';
        });
        var option=existing||document.createElement('option');
        if(!existing){
          option.value=title;
          option.textContent=title;
          group.appendChild(option);
        }
        option.dataset.serviceId=id;
        publicServiceFacts.set(id,{service:service,english:english});
      }
      try{
        var [standardResponse,englishResponse]=await Promise.all([
          fetch('/assets/data/service-catalog.json',{cache:'no-store'}),
          fa?Promise.resolve(null):fetch('/assets/data/service-descriptions-en.json',{cache:'no-store'})
        ]);
        if(standardResponse.ok&&(fa||englishResponse?.ok)){
          var standard=await standardResponse.json();
          var translated=fa?null:await englishResponse.json();
          if(fa||translated?.language==='en'){
            var standardGroup=document.createElement('optgroup');
            standardGroup.label=fa?'خدمات تخصصی با تعرفه مشخص':'Specific professional services';
            (Array.isArray(standard.services)?standard.services:[]).forEach(function(service){
              var en=fa?null:translated?.services?.[service.id];
              if(service?.sellable!==true||!service.id||
                (!fa&&(!en||!['title','fit','outcome','boundary'].every(function(key){
                  return typeof en[key]==='string'&&en[key].trim();
                }))))return;
              adoptOption(fa?service.title_fa:en.title,service.id,service,en,standardGroup);
            });
            if(standardGroup.children.length)select.appendChild(standardGroup);
          }
        }
      }catch(_){/* Generic service areas stay available. */}
      try{
        var [vipResponse,vipEnglishResponse]=await Promise.all([
          fetch('/assets/data/vip-catalog.json',{cache:'no-store'}),
          fa?Promise.resolve(null):fetch('/assets/data/vip-descriptions-en.json',{cache:'no-store'})
        ]);
        if(vipResponse.ok&&(fa||vipEnglishResponse?.ok)){
          var catalog=await vipResponse.json();
          var labels=fa?null:await vipEnglishResponse.json();
          if(fa||labels?.language==='en'){
            var vipGroup=document.createElement('optgroup');
            vipGroup.label=fa?'بسته‌های VIP (پیش از پرداخت نیازمند تأیید)':'VIP proposals (confirm terms before payment)';
            (Array.isArray(catalog.services)?catalog.services:[]).forEach(function(service){
              var name=fa?service?.title_fa:labels?.services?.[service?.id];
              if(service?.sellable!==true||service?.checkout_enabled!==true||
                 !service?.id||typeof name!=='string'||!name.trim())return;
              var display={
                title_fa:service.title_fa,price:service.price,
                fit_fa:'بررسی تناسب و ظرفیت بسته اختصاصی بر اساس نیاز شما.',
                outcome_fa:'خروجی‌ها، تعداد جلسات و مهلت تحویل باید پیش از پرداخت توافق شوند.',
                boundary_fa:'انتخاب بسته، رزرو یا تأیید پرداخت و ظرفیت نیست.'
              };
              var en=fa?null:{
                title:name,fit:'VIP enquiry subject to suitability and availability.',
                outcome:'Sessions, deliverables and turnaround require written agreement.',
                boundary:'Selecting a package is not a confirmed booking or payment.'
              };
              adoptOption(name,'vip:'+service.id,display,en,vipGroup);
            });
            if(vipGroup.children.length)select.appendChild(vipGroup);
          }
        }
      }catch(_){/* Standard catalogue and email composer remain operational. */}
      // Do not reset a draft or overwrite a manual selection after asynchronous
      // catalogue retrieval. A visible summary is never authority to purchase.
      if(preview.hidden&&select.value)reconcileManualService();
    }
    function invalidate() {
      revision++;
      if(requestedServiceValue){
        var selected=form.elements.namedItem('service');
        if(!selected||selected.value!==requestedServiceValue){
          requestedServiceValue=null;
          renderRequestedService(null,null);
        }
      }
      preview.hidden = true;
      draft.value = '';
      email.setAttribute('href', recipient);
      email.textContent=fa?'بازکردن در برنامه ایمیل':'Open in email app';
      status.textContent = '';
    }
    fields.disabled = false;
    fields.hidden = false;
    fields.style.display = 'grid';
    fields.style.gap = '1.25rem';
    form.addEventListener('input', invalidate);
    form.addEventListener('change', invalidate);
    form.addEventListener('change',function(event){
      if(event.target===form.elements.namedItem('service'))reconcileManualService();
    });
    form.addEventListener('reset', invalidate);
    form.addEventListener('reset',function(){
      requestedServiceValue=null;
      setScopeHint('');
      renderRequestedService(null,null);
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      var names = ['service', 'context', 'question', 'deadline'];
      var values = names.map(function (name) { return form.elements.namedItem(name).value.trim(); });
      for (var i = 0; i < 3; i++) {
        if (!values[i]) {
          status.textContent = fa ? 'لطفاً بخش‌های ضروری را کامل کنید.' : 'Please complete the required fields.';
          form.elements.namedItem(names[i]).focus();
          return;
        }
      }
      // Include only the validated public catalogue ID in the user's email draft.
      // This helps staff distinguish similarly named services, but is never a
      // booking, payment, identity, or analytics event.
      var selectedOption=form.elements.namedItem('service')?.selectedOptions?.[0];
      var publicServiceId=selectedOption?.dataset?.serviceId||'';
      if(!/^(?:vip:[a-z][a-z0-9-]{2,63}|[a-z][a-z0-9_]{2,63})$/.test(publicServiceId)){
        publicServiceId='';
      }
      var labels = fa ? ['نوع خدمت', 'نقش یا زمینه', 'سؤال اصلی', 'مهلت'] : ['Service', 'Context', 'Main question', 'Deadline'];
      var text = values.map(function (value, index) { return value ? labels[index] + ': ' + value : ''; }).filter(Boolean).join('\n\n');
      if(publicServiceId) text+='\n\n'+(fa?'شناسه عمومی خدمت: ':'Public service ID: ')+publicServiceId;
      // A preference is not a booking. Keep the mode allowlisted rather than
      // trusting modified form option labels or granting in-person access.
      var modeField = form.elements.namedItem('delivery_mode');
      var mode = modeField ? modeField.value : '';
      var modeLabels = fa ? { PHONE: 'تلفنی', VOICE: 'تماس صوتی آنلاین', VIDEO: 'آنلاین تصویری' } : { PHONE: 'Telephone', VOICE: 'Online voice call', VIDEO: 'Online video' };
      if (mode && !Object.prototype.hasOwnProperty.call(modeLabels, mode)) {
        status.textContent = fa ? 'روش انتخابی مشاوره معتبر نیست.' : 'The selected consultation format is not valid.';
        return;
      }
      if (mode) text += '\n\n' + (fa ? 'روش ترجیحی جلسه: ' : 'Preferred session format: ') + modeLabels[mode];
      var slotField=form.elements.namedItem('preferred_slot');
      var selectedSlot=slotField ? String(slotField.value||'').trim() : '';
      if(selectedSlot){
        if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(selectedSlot)){
          status.textContent=fa?'زمان پیشنهادی معتبر نیست.':'The preferred time is not valid.';return;
        }
        var slotDate=new Date(selectedSlot.replace(' ','T')+'Z');
        if(!Number.isFinite(slotDate.getTime())
          ||slotDate.toISOString().slice(0,19)!==selectedSlot.replace(' ','T')){
          status.textContent=fa?'زمان پیشنهادی معتبر نیست.':'The preferred time is not valid.';return;
        }
        var local=new Intl.DateTimeFormat(fa?'fa-IR':'en-GB',{
          dateStyle:'full',timeStyle:'short',timeZone:'Asia/Tehran'
        }).format(slotDate);
        text += '\n\n'+(fa?'زمان پیشنهادی (در انتظار بررسی ظرفیت و تأیید): ':
          'Preferred time (subject to availability and confirmation): ')+local+
          ' [Asia/Tehran]';
      }
      var subject = (fa ? 'درخواست مشاوره: ' : 'Consultation request: ') + values[0];
      draft.value = text;
      var subjectUrl=recipient+'?subject='+encodeURIComponent(subject);
      var fullMailto=subjectUrl+'&body='+encodeURIComponent(text);
      // Some mobile email handlers reject very long mailto URLs, especially
      // when percent-encoding Persian text. Never silently truncate a request.
      var requiresPaste=fullMailto.length>1800;
      email.setAttribute('href',requiresPaste?subjectUrl:fullMailto);
      email.textContent=requiresPaste
        ?(fa?'بازکردن ایمیل پس از کپی‌کردن متن':'Open email after copying the draft')
        :(fa?'بازکردن در برنامه ایمیل':'Open in email app');
      preview.hidden = false;
      status.textContent = requiresPaste
        ?(fa?'پیش‌نویس کامل آماده است اما برای لینک ایمیل طولانی است. متن را کپی کنید، در برنامه ایمیل بچسبانید و سپس ارسال کنید؛ هنوز هیچ درخواستی ارسال نشده است.'
          :'The full draft is ready but too long for a reliable email link. Copy it, paste it into your email app and send it. No request has been sent.')
        :(fa?'پیش‌نویس آماده است؛ هنوز ارسال نشده است.':'Your draft is ready. It has not been sent.');
      draft.focus();
    });
    copy.addEventListener('click', async function () {
      var currentRevision = revision;
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(draft.value);
        if (currentRevision === revision) status.textContent = fa ? 'متن کپی شد؛ برای ارسال، آن را در ایمیل خود قرار دهید.' : 'Draft copied. Paste it into your email to send it.';
      } catch (_) {
        if (currentRevision !== revision) return;
        draft.focus();
        draft.select();
        status.textContent = fa ? 'متن انتخاب شد؛ با گزینه کپی دستگاه خود آن را بردارید.' : 'Draft selected. Use your device’s Copy command.';
      }
    });
    window.addEventListener('pageshow', function (event) { if (event.persisted) form.reset(); });
    applyRequestedService();
    loadManualCatalogueOptions();
  });
}());
