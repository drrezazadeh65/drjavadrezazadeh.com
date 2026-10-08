/* Knowledge Article: progressive enhancements; readable without JavaScript.
   No third-party requests or tracking. All TOC links are present in static HTML. */
(() => {
  'use strict';
  const root = document.querySelector('.knowledge-article-page .article-shell');
  if (!root) return;
  const progress = document.querySelector('.knowledge-article-progress');
  const bar = progress?.querySelector('span');
  const top = document.querySelector('.knowledge-article-backtop');
  const sections = [...root.querySelectorAll('.knowledge-article-content section[id]')];
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
})();
