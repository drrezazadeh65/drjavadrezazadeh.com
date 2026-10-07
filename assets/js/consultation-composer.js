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
    async function applyRequestedService(){
      if(!fa) return;
      var requested=new URLSearchParams(location.search).get('service');
      if(!requested) return;
      try{
        var response=await fetch('/platform/service-catalog.json',{cache:'reload'});
        if(!response.ok) return;
        var catalogue=await response.json();
        var service=(catalogue.services||[]).find(function(item){return item.id===requested&&item.sellable===true;});
        if(!service) return;
        var select=form.elements.namedItem('service');
        if(!select) return;
        var option=Array.from(select.options).find(function(item){return item.value===service.title_fa;});
        if(!option){
          option=document.createElement('option');
          option.value=service.title_fa;
          option.textContent=service.title_fa;
          option.dataset.serviceId=service.id;
          select.appendChild(option);
        }
        select.value=option.value;
        status.textContent='خدمت انتخاب‌شده از صفحه تعرفه در فرم قرار گرفت؛ لطفاً زمینه و سؤال اصلی را تکمیل کنید.';
      }catch(_){ /* keep the normal manual selector available */ }
    }
    function invalidate() {
      revision++;
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
