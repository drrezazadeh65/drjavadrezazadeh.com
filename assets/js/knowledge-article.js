/* Knowledge Article: progressive enhancements; readable without JavaScript.
   No third-party requests or tracking. All TOC links are present in static HTML. */
(() => {
  'use strict';
  const root = document.querySelector('.knowledge-article-page .article-shell');
  if (!root) return;
  const progress = document.querySelector('.knowledge-article-progress');
  const bar = progress?.querySelector('span');
  const top = document.querySelector('.knowledge-article-backtop');
  const sections = [...root.querySelectorAll('.knowledge-article-content h2[id]')];
  const desktopLinks = [...root.querySelectorAll('.knowledge-article-toc a[href^="#"]')];
  const mobileToc = root.querySelector('.knowledge-article-mobiletoc');
  const status = root.querySelector('.knowledge-article-copy-status');
  let ticking = false;
  function update() {
    ticking = false;
    const scroll = Math.max(0,window.scrollY || document.documentElement.scrollTop || 0);
    const total = Math.max(1,document.documentElement.scrollHeight - window.innerHeight);
    const pct = Math.round(Math.min(1,scroll / total) * 100);
    if (bar) bar.style.width = pct + '%';
    if (progress) progress.setAttribute('aria-valuenow',String(pct));
    if (top) top.dataset.visible = scroll > 640 ? 'true' : 'false';
    if (!desktopLinks.length || !sections.length) return;
    let current = sections[0].id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= Math.max(180,window.innerHeight * .26)) current = section.id;
      else break;
    }
    for (const anchor of desktopLinks) {
      if (anchor.getAttribute('href') === '#' + current) anchor.setAttribute('aria-current','location');
      else anchor.removeAttribute('aria-current');
    }
  }
  window.addEventListener('scroll',() => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  },{passive:true});
  window.addEventListener('resize',() => { if (!ticking) {ticking=true;requestAnimationFrame(update)} },{passive:true});
  update();
  if (top) top.addEventListener('click',() => {
    window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  mobileToc?.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click',() => {mobileToc.open = false});
  });
  let statusTimer;
  function announce(message) {
    if (!status) return;
    status.textContent = message;
    if (statusTimer) window.clearTimeout(statusTimer);
    statusTimer = window.setTimeout(() => {status.textContent = ''},4500);
  }
  async function copyLink() {
    const link = location.href.split('#')[0];
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const field=document.createElement('textarea');
        field.value=link;field.setAttribute('readonly','');
        field.style.cssText='position:fixed;opacity:0;pointer-events:none;top:-100px';
        document.body.appendChild(field);field.select();
        const success=document.execCommand('copy');field.remove();
        if (!success) throw new Error('Clipboard permission denied');
      }
      announce('لینک مقاله کپی شد.');
    } catch (_) {announce('کپی خودکار ممکن نشد؛ نشانی مقاله را از نوار مرورگر بردارید.')}
  }
  root.querySelector('[data-article-copy]')?.addEventListener('click',copyLink);
  root.querySelector('[data-article-share]')?.addEventListener('click',async() => {
    const title = root.querySelector('h1')?.textContent?.trim() || document.title;
    const url=location.href.split('#')[0];
    if (navigator.share) {
      try{await navigator.share({title,url})}
      catch(err){if(err?.name !== 'AbortError') await copyLink()}
    } else {await copyLink()}
  });

  /* Reader sharing destinations and device-only bookmarks. No backend,
     accounts, cookies, third-party scripts or background network requests. */
  const toolsBar = root.querySelector('.knowledge-article-tools');
  if (toolsBar) {
    const title = root.querySelector('h1')?.textContent?.trim() || document.title;
    const canonical = document.querySelector('link[rel="canonical"]')?.href || location.href.split('#')[0].split('?')[0];
    const bookmarkUrl = location.origin + new URL(canonical,location.href).pathname;
    const bookmarkKey = 'jr-knowledge-bookmarks-v1';
    const statusNode = toolsBar.querySelector('.knowledge-article-copy-status');
    const insert = element => toolsBar.insertBefore(element, statusNode || null);

    const shareMenu = document.createElement('details');
    shareMenu.className = 'knowledge-article-actionmenu';
    const shareHeading = document.createElement('summary');
    shareHeading.textContent = 'ارسال به...';
    const shareTargets = document.createElement('div');
    const destinations = [
      ['واتساپ', 'https://wa.me/?text=' + encodeURIComponent(title + ' — ' + canonical)],
      ['تلگرام', 'https://t.me/share/url?url=' + encodeURIComponent(canonical) + '&text=' + encodeURIComponent(title)],
      ['ایمیل', 'mailto:?subject=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(canonical)]
    ];
    for (const [label, url] of destinations) {
      const link = document.createElement('a');
      link.href = url;
      link.textContent = label;
      link.setAttribute('aria-label','اشتراک مقاله در ' + label);
      if (!url.startsWith('mailto:')) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      shareTargets.appendChild(link);
    }
    shareMenu.append(shareHeading, shareTargets);
    insert(shareMenu);

    function readBookmarks() {
      try {
        const parsed = JSON.parse(localStorage.getItem(bookmarkKey) || '[]');
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(entry => {
          if (!entry || typeof entry.title !== 'string' || typeof entry.url !== 'string') return false;
          try {
            const address = new URL(entry.url);
            return address.origin === location.origin &&
              address.pathname.startsWith('/fa/rahnamaha/') &&
              address.pathname.split('/').length === 5 &&
              /^[a-z0-9-]+$/.test(address.pathname.split('/')[3]);
          } catch (_) { return false; }
        }).slice(0,40);
      } catch (_) { return []; }
    }
    const bookmarkButton = document.createElement('button');
    bookmarkButton.type = 'button';
    bookmarkButton.setAttribute('data-article-bookmark','');
    const bookmarkMenu = document.createElement('details');
    bookmarkMenu.className = 'knowledge-article-actionmenu';
    const bookmarkHeading = document.createElement('summary');
    const bookmarkList = document.createElement('div');
    bookmarkMenu.append(bookmarkHeading,bookmarkList);
    function refreshBookmarks() {
      const saved = readBookmarks();
      const selected = saved.some(item => item.url === bookmarkUrl);
      bookmarkButton.setAttribute('aria-pressed',String(selected));
      bookmarkButton.textContent = selected ? '★ ذخیره‌شده' : '☆ ذخیره مقاله';
      bookmarkHeading.textContent = 'ذخیره‌شده‌ها (' + new Intl.NumberFormat('fa-IR').format(saved.length) + ')';
      bookmarkList.replaceChildren();
      if (!saved.length) {
        const empty = document.createElement('span');
        empty.textContent = 'هنوز مقاله‌ای ذخیره نشده است. ذخیره فقط روی همین مرورگر انجام می‌شود.';
        empty.style.cssText = 'font-size:12px;line-height:1.9;color:#d9d0c1';
        bookmarkList.appendChild(empty);
      }
      for (const entry of saved) {
        const a = document.createElement('a');
        a.href = entry.url;
        a.textContent = entry.title;
        bookmarkList.appendChild(a);
      }
    }
    bookmarkButton.addEventListener('click',() => {
      const items = readBookmarks();
      const selected = items.some(item => item.url === bookmarkUrl);
      const next = selected ? items.filter(item => item.url !== bookmarkUrl) :
        [{url:bookmarkUrl,title},...items].slice(0,40);
      try {
        localStorage.setItem(bookmarkKey,JSON.stringify(next));
        refreshBookmarks();
        announce(selected ? 'مقاله از فهرست ذخیره‌شده‌ها حذف شد.' :
          'مقاله فقط در این مرورگر ذخیره شد. برای دیدن آن، فهرست ذخیره‌شده‌ها را باز کنید.');
      } catch (_) {
        announce('ذخیره در تنظیمات این مرورگر مجاز نیست؛ از کپی لینک مقاله استفاده کنید.');
      }
    });
    insert(bookmarkButton);
    insert(bookmarkMenu);
    refreshBookmarks();
  }

  /* Article reading accessibility and private author enquiry.
     This mailto link opens the reader's mail app; it does not submit a public comment. */
  const readerBar = root.querySelector('.knowledge-article-tools');
  if (readerBar) {
    const articleTitle = root.querySelector('h1')?.textContent?.trim() || document.title;
    const articleUrl = document.querySelector('link[rel="canonical"]')?.href || location.href.split('#')[0];
    const questionLink = document.createElement('a');
    questionLink.className = 'knowledge-article-private-question';
    questionLink.textContent = 'پرسش از نویسنده با ایمیل';
    questionLink.href = 'mailto:info@drjavadrezazadeh.com?subject=' +
      encodeURIComponent('پرسش درباره مقاله: ' + articleTitle) + '&body=' +
      encodeURIComponent('موضوع مقاله: ' + articleTitle + '\n' +
        'پیوند مقاله: ' + articleUrl + '\n\n' +
        'پرسش من: \n\n' +
        'لطفاً اطلاعات حساس یا جزئیات خصوصی دانش‌آموز را از طریق ایمیل عمومی ارسال نکنید.');
    questionLink.setAttribute('aria-label','طرح پرسش خصوصی با باز کردن برنامه ایمیل');
    readerBar.insertBefore(questionLink,readerBar.querySelector('.knowledge-article-copy-status'));

    const fontButton = document.createElement('button');
    fontButton.type = 'button';
    fontButton.dataset.readerFont = '';
    const fontKey = 'jr-knowledge-large-text-v1';
    let largeText = false;
    try { largeText = localStorage.getItem(fontKey) === '1'; } catch (_) {}
    function syncFont() {
      root.classList.toggle('knowledge-article-large-text',largeText);
      fontButton.setAttribute('aria-pressed',String(largeText));
      fontButton.textContent = largeText ? 'اندازه متن: معمولی' : 'درشت‌تر کردن متن';
    }
    fontButton.addEventListener('click',() => {
      largeText = !largeText;
      syncFont();
      try { localStorage.setItem(fontKey,largeText?'1':'0'); } catch (_) {}
      announce(largeText ? 'اندازه متن مقاله بزرگ‌تر شد.' : 'اندازه متن به حالت معمولی بازگشت.');
    });
    readerBar.insertBefore(fontButton,readerBar.querySelector('.knowledge-article-copy-status'));
    syncFont();

    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.dataset.readerPrint = '';
    printButton.textContent = 'چاپ یا ذخیره PDF';
    printButton.addEventListener('click',() => window.print());
    readerBar.insertBefore(printButton,readerBar.querySelector('.knowledge-article-copy-status'));
  }
})();
