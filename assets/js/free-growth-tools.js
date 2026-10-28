/* Stage 14 — five privacy-first public reflection tools. Not diagnostic tests.
   Answers remain in the browser DOM; no storage, network, or analytics payload. */
(() => {
  'use strict';
  const host = document.querySelector('[data-free-growth-tools]');
  if (!host) return;
  const choices = [
    ['yes', 'بله، شواهدی دارم'], ['unsure', 'هنوز روشن نیست'], ['no', 'خیر / نیازمند بررسی']
  ];
  const tools = [
    {
      id: 'pathway', name: 'کاربرگ تصمیم تحصیلی',
      intro: 'برای بررسی آمادگی تصمیم، نه معرفی قطعی یک رشته یا پیش‌بینی قبولی.',
      questions: [
        'علاقه خود به فعالیت‌های واقعی این مسیر را با تجربه یا گفت‌وگو بررسی کرده‌ام.',
        'محدودیت‌های رسمی پذیرش و شرایط واقعی خانواده را از منابع معتبر بررسی کرده‌ام.',
        'برای مقایسه گزینه‌ها، شواهد و ابهام‌های هر گزینه را جداگانه نوشته‌ام.'
      ],
      advice: 'پیش از اولویت‌بندی، منابع رسمی پذیرش و ماتریس مقایسه رشته‌ها را مرور کنید.',
      href: '/fa/rahnamaha/moghayese-reshteha-ba-matris-tasmim/',
      link: 'کاربرگ کامل مقایسه رشته‌ها',
      nextHref: '/fa/services/field_selection_standard/',
      nextLabel: 'اگر به بررسی فردی نیاز دارید: تفاوت خدمت انتخاب رشته استاندارد'
    },
    {
      id: 'talent', name: 'شناخت اولیه ظرفیت‌های رشد',
      intro: 'صرفاً بازاندیشی در شواهد رشد؛ این ابزار آزمون روان‌سنجی یا برچسب‌گذاری استعداد نیست.',
      questions: [
        'نمونه‌ای از علاقه و پشتکار فرد را در بیش از یک موقعیت مشاهده کرده‌ایم.',
        'صدای خود دانش‌آموز و برداشت والد یا معلم هر دو در شواهد حضور دارند.',
        'شرایط فرصت، حمایت و محیط یادگیری را کنار عملکرد فعلی در نظر گرفته‌ایم.'
      ],
      advice: 'یک مشاهده کوتاه، تنها آغاز گفت‌وگوست؛ مسیر رشد باید به مرور و با رضایت معتبر بازبینی شود.',
      href: '/fa/golden-talent/ravesh-shenasi/',
      link: 'روش‌شناسی چندمنبعی Golden Talent',
      nextHref: '/fa/services/talent_initial/',
      nextLabel: 'پیش از سفارش، دامنه استعدادیابی اولیه را بشناسید'
    },
    {
      id: 'manuscript', name: 'آمادگی اولیه مقاله',
      intro: 'خودبازبینی پیش از ارسال؛ بدون دریافت فایل، متن مقاله یا داده پژوهشی.',
      questions: [
        'پرسش و سهم پژوهش در نسبت با ادبیات پیشین روشن بیان شده‌اند.',
        'روش، تحلیل و نتیجه‌گیری از شواهد گزارش‌شده پشتیبانی می‌شوند.',
        'دامنه مجله، الزامات اخلاق نشر و راهنمای نویسندگان بررسی شده‌اند.'
      ],
      advice: 'موارد نامشخص را به فهرست اصلاحات تبدیل کنید؛ بازبینی علمی جایگزین داوری مجله نیست.',
      href: '/fa/khadamat-pajouheshi/',
      link: 'بررسی خدمات پژوهشی و بازبینی مقاله',
      nextHref: '/fa/services/manuscript_diagnostic/',
      nextLabel: 'نمونه فرضی و حدود خدمت بازبینی تشخیصی مقاله'
    },
    {
      id: 'teacher', name: 'خودارزیابی تأملی معلم',
      intro: 'کاربرگ رشد حرفه‌ای؛ نه قضاوت درباره صلاحیت، رتبه‌بندی یا نظارت بر معلم.',
      questions: [
        'هدف یادگیری و شواهدی که نشان می‌دهند دانش‌آموز چه آموخته، روشن هستند.',
        'بازخورد دانش‌آموز و نیازهای متفاوت یادگیرندگان در طراحی فعالیت‌ها دیده شده‌اند.',
        'یک تغییر کوچک در تدریس را با شواهد بازبینی و درباره نتیجه آن تأمل کرده‌ام.'
      ],
      advice: 'یک پرسش حرفه‌ای مشخص را برای چرخه مشاهده، اقدام و بازاندیشی انتخاب کنید.',
      href: '/fa/services/teacher_consult_60/',
      link: 'مشاهده دامنه خدمت مشاوره معلم',
      nextHref: '/fa/services/teacher_dev_90/',
      nextLabel: 'مقایسه با جلسه توسعه حرفه‌ای ۹۰ دقیقه‌ای'
    }
  ];
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }
  function makeTool(tool, index) {
    const section = el('details', 'free-growth-tool');
    section.id = 'free-tool-' + tool.id;
    const summary = el('summary', null, (index + 1).toLocaleString('fa-IR') + '. ' + tool.name);
    section.append(summary, el('p', 'free-growth-intro', tool.intro));
    const form = el('form', 'free-growth-form');
    form.noValidate = true;
    tool.questions.forEach((question, number) => {
      const group = el('fieldset');
      group.append(el('legend', null, question));
      choices.forEach(([value, label]) => {
        const wrap = el('label', 'free-growth-choice');
        const input = document.createElement('input');
        input.type = 'radio'; input.name = tool.id + '-' + number; input.value = value;
        input.required = true;
        wrap.append(input, document.createTextNode(' ' + label));
        group.append(wrap);
      });
      form.append(group);
    });
    const actions = el('div', 'free-growth-actions');
    const submit = el('button', null, 'مشاهده جمع‌بندی و گام بعدی');
    submit.type = 'submit';
    const reset = el('button', 'free-growth-reset', 'پاک‌کردن پاسخ‌ها');
    reset.type = 'reset';
    actions.append(submit, reset);
    const output = el('div', 'free-growth-result');
    output.setAttribute('role', 'status');
    output.setAttribute('aria-live', 'polite');
    output.hidden = true;
    form.append(actions, output);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const answers = tool.questions.map((_, number) => form.querySelector('input[name="' + tool.id + '-' + number + '"]:checked')?.value || '');
      if (answers.includes('')) {
        output.hidden = false;
        output.textContent = 'برای یک جمع‌بندی معنادار، به هر سه پرسش پاسخ دهید.';
        return;
      }
      const open = answers.reduce((count, answer) => count + (answer !== 'yes' ? 1 : 0), 0);
      const heading = open === 0
        ? 'شواهد اولیه شما قابل گفت‌وگو هستند؛ هنوز به معنای تصمیم قطعی نیستند.'
        : 'در ' + open.toLocaleString('fa-IR') + ' محور هنوز شواهد تکمیلی یا بازبینی لازم است.';
      output.replaceChildren(el('strong', null, heading), el('p', null, tool.advice));
      const link = el('a', null, tool.link);
      link.href = tool.href;
      output.append(link);
      // Optional contextual next step. The tool never collects data, pushes
      // users to checkout or claims their answers prove a need to purchase.
      if(tool.nextHref&&tool.nextLabel){
        const next=el('a', 'free-growth-next-step', tool.nextLabel);
        next.href=tool.nextHref;
        output.append(next);
      }
      output.hidden = false;
    });
    form.addEventListener('reset', () => {
      output.replaceChildren();
      output.hidden = true;
    });
    section.append(form);
    return section;
  }
  tools.forEach((tool, index) => host.append(makeTool(tool, index)));
  const finder = el('details', 'free-growth-tool');
  finder.id = 'free-tool-service';
  finder.append(el('summary', null, '۵. راهنمای انتخاب خدمت متناسب'));
  finder.append(el('p', 'free-growth-intro', 'یک مسیر اولیه بر اساس نوع مسئله؛ این انتخاب سفارش، رزرو یا تشخیص حرفه‌ای نیست.'));
  const form = el('form', 'free-growth-form');
  const label = el('label', null, 'مسئله اصلی شما در کدام حوزه است؟');
  const select = document.createElement('select');
  select.required = true;
  const options = [
    ['', 'ابتدا یک حوزه انتخاب کنید', ''],
    ['education', 'تصمیم تحصیلی و انتخاب رشته', '/fa/entekhab-reshteh/'],
    ['talent', 'شناخت و رشد استعداد دانش‌آموز', '/fa/estedaadyabi/'],
    ['research', 'مقاله و مسائل پژوهشی', '/fa/khadamat-pajouheshi/'],
    ['teaching', 'تدریس، مواد آموزشی و سنجش', '/fa/services/teacher_consult_60/'],
    ['institution', 'همکاری مدرسه یا مؤسسه', '/fa/hamkari-sazmani/']
  ];
  for (const [value, name] of options) {
    const option = document.createElement('option');
    option.value = value; option.textContent = name;
    select.append(option);
  }
  label.append(select);
  const action = el('button', null, 'نمایش مسیر مرتبط');
  action.type = 'submit';
  const output = el('div', 'free-growth-result');
  output.setAttribute('role', 'status'); output.setAttribute('aria-live', 'polite');
  output.hidden = true;
  form.append(label, action, output);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const choice = options.find(row => row[0] === select.value && row[2]);
    if (!choice) { output.textContent = 'یک حوزه انتخاب کنید.'; output.hidden = false; return; }
    output.replaceChildren(el('p', null, 'این صفحه دامنه، محدودیت و گام نخست خدمت را توضیح می‌دهد؛ هیچ خریدی ثبت نشده است.'));
    const link = el('a', null, 'بررسی ' + choice[1]);
    link.href = choice[2];
    output.append(link);
    output.hidden = false;
  });
  select.addEventListener('change', () => { output.hidden = true; });
  finder.append(form);
  host.append(finder);
  host.dataset.enhanced = 'true';
})();
