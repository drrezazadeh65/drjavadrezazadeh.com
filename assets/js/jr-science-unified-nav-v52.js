/* Golden Talent / RCAS / BAHAR shared navigation v5.2.
 * Presentation only: payment, account ownership and private data require
 * independent server-side authorization. Never grant access from this script.
 */
(() => {
  'use strict';
  const root = document.body;
  if (!root || document.querySelector('[data-jr-science-nav-ready]')) return;
  const isFa = document.documentElement.lang === 'fa';
  const path = window.location.pathname;
  if (!/^\/(?:fa\/(?:golden-talent\/|app\/student\/|assessments\/golden-talent\/)|en\/golden-talent\/)/.test(path)) return;

  const fa = {
    home: '/fa/golden-talent/',
    dashboard: '/fa/app/student/',
    rcas: '/fa/assessments/golden-talent/start/',
    profile: '/fa/app/student/integrated-profile/',
    records: '/fa/app/student/records/',
    progress: '/fa/app/student/progress/',
    context: '/fa/app/student/context/',
    appointments: '/fa/app/student/appointments/',
    goldenPath: '/fa/app/student/golden-path/',
    bahar: '/fa/app/student/bahar/',
    plans: '/fa/shop/golden-talent/',
    account: '/fa/app/account/'
  };
  const en = {
    home: '/en/golden-talent/',
    dashboard: '/en/golden-talent/dashboard/',
    rcas: '/en/golden-talent/assessment/',
    profile: '/en/golden-talent/dashboard/profile/',
    records: '/en/golden-talent/dashboard/records/',
    progress: '/en/golden-talent/dashboard/progress/',
    context: '/en/golden-talent/dashboard/context/',
    appointments: '/en/golden-talent/dashboard/appointments/',
    goldenPath: '/en/golden-talent/dashboard/golden-path/',
    bahar: '/en/golden-talent/dashboard/bahar/',
    plans: '/en/golden-talent/plans/',
    account: '/en/account/'
  };
  const routes = isFa ? fa : en;
  const labels = isFa ? {
    home: 'Golden Talent · معرفی و شواهد رایگان',
    dashboard: 'داشبورد · پیش‌نمایش',
    rcas: 'RCAS Start · رایگان',
    profile: 'نمایه شواهد',
    records: 'سوابق تحصیلی',
    progress: 'پیشرفت من',
    context: 'زمینه و حمایت',
    appointments: 'جلسات',
    goldenPath: 'Golden Path',
    bahar: 'BAHAR · کاربرگ رایگان',
    plans: 'خدمات و بسته‌ها',
    account: 'حساب و حریم خصوصی',
    free: 'رایگان',
    demo: 'پیش‌نمایش',
    paid: 'امکانات اختصاصی پس از خرید',
    offer: 'مشاهده',
    accountStatus: 'ورود',
    opener: 'امکانات Golden Talent',
    close: 'بستن منو',
    summary: 'امکانات را پیش از خرید ببینید. اجرای خدمات اختصاصی تنها با مجوز معتبر سرور ممکن است.',
    preview: 'نمایش این صفحه مجوز استفاده از خدمات اختصاصی نیست.'
  } : {
    home: 'Golden Talent · free evidence',
    dashboard: 'Dashboard preview',
    rcas: 'RCAS Start · free',
    profile: 'Evidence profile',
    records: 'Academic records',
    progress: 'My progress',
    context: 'Context and support',
    appointments: 'Appointments',
    goldenPath: 'Golden Path',
    bahar: 'BAHAR · free worksheet',
    plans: 'Plans and services',
    account: 'Account and privacy',
    free: 'Free',
    demo: 'Preview',
    paid: 'Full service after purchase',
    offer: 'Explore',
    accountStatus: 'Sign in',
    opener: 'Golden Talent features',
    close: 'Close menu',
    summary: 'Explore the platform before purchase. Private services require verified server-side authorization.',
    preview: 'Viewing this page does not grant private-service access.'
  };
  // "paid" describes the full service, never access to these non-sensitive
  // preview pages. Existing locally executed free worksheets remain free.
  const types = {
    home: 'free', dashboard: 'demo', rcas: 'free', profile: 'paid',
    records: 'paid', progress: 'paid', context: 'paid',
    appointments: 'paid', goldenPath: 'paid', bahar: 'free',
    plans: 'offer', account: 'accountStatus'
  };
  const keys = [
    'home', 'dashboard', 'rcas', 'profile', 'records', 'progress',
    'context', 'appointments', 'goldenPath', 'bahar', 'plans', 'account'
  ];
  const style = document.createElement('style');
  style.textContent = [
    '.jr-sc-nav a{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;padding:9px 10px;border:1px solid transparent;border-radius:10px;color:inherit;text-decoration:none;line-height:1.5;font-size:13px}',
    '.jr-sc-nav a:hover,.jr-sc-nav a:focus-visible,.jr-sc-nav a[aria-current="page"]{background:#242018;border-color:#8b713e;outline-offset:2px}',
    '.jr-sc-nav .jr-sc-nav-label{flex:1;min-width:0}',
    '.jr-sc-nav .jr-sc-nav-status{font-size:10px;opacity:.85;max-width:112px;text-align:end;line-height:1.45}',
    '.jr-sc-nav [data-access="paid"] .jr-sc-nav-status{color:#e3c682}',
    '.jr-sc-nav [data-access="free"] .jr-sc-nav-status{color:#b5e3bc}',
    '.jr-sc-nav-intro{color:#d7c5a3;font-size:12px;line-height:1.75;margin:4px 4px 14px}',
    '.jr-sc-nav-trigger{position:fixed;right:12px;top:90px;z-index:110;display:none;gap:8px;align-items:center;background:#171511;color:#f6e8c9;border:1px solid #b08d4b;border-radius:12px;min-height:44px;padding:8px 13px;font:inherit;font-size:12px;cursor:pointer;box-shadow:0 8px 24px #0006}',
    '.jr-sc-nav-trigger:focus-visible,.jr-sc-nav-close:focus-visible{outline:3px solid #e7c887;outline-offset:2px}',
    '.jr-sc-nav-backdrop[hidden]{display:none!important}',
    '.jr-sc-nav-backdrop{position:fixed;inset:0;z-index:400;background:#000b;display:flex;justify-content:flex-end}',
    '.jr-sc-nav-sheet{width:min(360px,92vw);height:100%;overflow:auto;overscroll-behavior:contain;background:#0e0e0f;border-left:1px solid #a78746;color:#f5ead3;padding:18px 12px;box-sizing:border-box}',
    '.jr-sc-nav-close{border:1px solid #a78746;border-radius:10px;background:#211c14;color:#fff;min-height:44px;padding:8px 15px;font:inherit;cursor:pointer}',
    '.jr-sc-nav-new-sidebar{position:fixed;right:0;top:0;bottom:0;z-index:65;width:248px;overflow:auto;background:#0b0b0c;border-left:1px solid #89703c;color:#f3e5c9;box-sizing:border-box;padding:18px 10px}',
    '.jr-sc-nav-new-sidebar>strong{display:block;text-align:center;padding:12px 0}',
    '@media(min-width:901px){body.jr-sc-nav-shift{padding-right:258px}.jr-sc-nav-trigger.jr-sc-nav-public{display:flex}}',
    '@media(max-width:900px){.jr-sc-nav-trigger{display:flex;top:auto;bottom:calc(78px + env(safe-area-inset-bottom));right:12px}.jr-sc-nav-new-sidebar{display:none}.dashboard-sidebar .jr-sc-nav{display:none}}',
    '@media(prefers-reduced-motion:reduce){.jr-sc-nav-trigger,.jr-sc-nav-backdrop{scroll-behavior:auto;transition:none}}'
  ].join('');
  document.head.append(style);
  function navIn(container) {
    container.classList.add('jr-sc-nav');
    container.replaceChildren();
    for (const key of keys) {
      const a = document.createElement('a');
      a.href = routes[key] + (key === 'bahar' ? '#baharWorkingPlan' : key === 'home' ? '#goldenTalentEvidenceStudio' : '');
      a.dataset.access = types[key];
      const name = document.createElement('span');
      name.className = 'jr-sc-nav-label';
      name.textContent = labels[key];
      const status = document.createElement('small');
      status.className = 'jr-sc-nav-status';
      status.textContent = labels[types[key]];
      a.append(name, status);
      if (path === routes[key]) a.setAttribute('aria-current', 'page');
      container.append(a);
    }
  }
  const existing = document.querySelector('.dashboard-sidebar nav');
  if (existing) {
    navIn(existing);
  } else if (!root.classList.contains('public-content-page')) {
    const aside = document.createElement('aside');
    aside.className = 'jr-sc-nav-new-sidebar';
    aside.setAttribute('aria-label', labels.opener);
    const title = document.createElement('strong');
    title.textContent = 'Golden Talent';
    const intro = document.createElement('p');
    intro.className = 'jr-sc-nav-intro';
    intro.textContent = labels.summary;
    const nav = document.createElement('nav');
    navIn(nav);
    aside.append(title, intro, nav);
    root.append(aside);
    root.classList.add('jr-sc-nav-shift');
  }
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'jr-sc-nav-trigger';
  if (root.classList.contains('public-content-page')) trigger.classList.add('jr-sc-nav-public');
  trigger.textContent = '☰ ' + labels.opener;
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'jr-sc-nav-dialog');
  const backdrop = document.createElement('div');
  backdrop.className = 'jr-sc-nav-backdrop';
  backdrop.hidden = true;
  const sheet = document.createElement('div');
  sheet.id = 'jr-sc-nav-dialog';
  sheet.className = 'jr-sc-nav-sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', labels.opener);
  const close = document.createElement('button');
  close.className = 'jr-sc-nav-close';
  close.type = 'button';
  close.textContent = '× ' + labels.close;
  const intro = document.createElement('p');
  intro.className = 'jr-sc-nav-intro';
  intro.textContent = labels.summary;
  const menu = document.createElement('nav');
  navIn(menu);
  sheet.append(close, intro, menu);
  backdrop.append(sheet);
  root.append(trigger, backdrop);
  let restoreFocus = trigger;
  let wasOverflow = '';
  function toggle(open) {
    if (open === !backdrop.hidden) return;
    if (open) {
      restoreFocus = document.activeElement || trigger;
      wasOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      backdrop.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      close.focus();
    } else {
      backdrop.hidden = true;
      document.body.style.overflow = wasOverflow;
      trigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus && restoreFocus.isConnected) restoreFocus.focus();
    }
  }
  trigger.addEventListener('click', () => toggle(true));
  close.addEventListener('click', () => toggle(false));
  backdrop.addEventListener('click', event => { if (event.target === backdrop) toggle(false); });
  document.addEventListener('keydown', event => {
    if (backdrop.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); toggle(false); return; }
    if (event.key !== 'Tab') return;
    const targets = [close, ...menu.querySelectorAll('a')];
    const first = targets[0], last = targets[targets.length - 1];
    if (event.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  });
  trigger.dataset.jrScienceNavReady = 'true';
  // No localStorage, network requests, authentication or entitlement mutations.
})();
