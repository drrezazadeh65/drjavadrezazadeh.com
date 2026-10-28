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
        select.value=option.value;
        requestedServiceValue=option.value;
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
        select.value=option.value;
        requestedServiceValue=option.value;
        renderRequestedService(service,english);
        status.textContent=fa
          ?'خدمت انتخاب‌شده از صفحه تعرفه در فرم قرار گرفت؛ دامنه، خروجی و تعرفه را بررسی کنید و سپس زمینه و سؤال اصلی را تکمیل کنید.'
          :'The selected service has been added from the official catalogue. Review its fee, scope and outcome, then describe your context. Nothing has been sent or booked.';
      }catch(_){ /* Keep the ordinary manual email route available. */ }
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
      status.textContent = '';
    }
    fields.disabled = false;
    fields.hidden = false;
    fields.style.display = 'grid';
    fields.style.gap = '1.25rem';
    form.addEventListener('input', invalidate);
    form.addEventListener('change', invalidate);
    form.addEventListener('reset', invalidate);
    form.addEventListener('reset',function(){
      requestedServiceValue=null;
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
      var labels = fa ? ['نوع خدمت', 'نقش یا زمینه', 'سؤال اصلی', 'مهلت'] : ['Service', 'Context', 'Main question', 'Deadline'];
      var text = values.map(function (value, index) { return value ? labels[index] + ': ' + value : ''; }).filter(Boolean).join('\n\n');
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
      email.setAttribute('href', recipient + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(text));
      preview.hidden = false;
      status.textContent = fa ? 'پیش‌نویس آماده است؛ هنوز ارسال نشده است.' : 'Your draft is ready. It has not been sent.';
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
  });
}());
