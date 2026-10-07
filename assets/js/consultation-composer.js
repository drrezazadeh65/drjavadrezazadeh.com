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
    function invalidate() {
      revision++;
      preview.hidden = true;
      draft.value = '';
      email.setAttribute('href', recipient);
      status.textContent = '';
    }
    fields.disabled = false;
    fields.hidden = false;
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
  });
}());
