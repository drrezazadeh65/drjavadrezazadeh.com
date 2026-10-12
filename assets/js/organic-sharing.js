/* Consent-conscious voluntary sharing of a PUBLIC canonical URL only. */
(() => {
  'use strict';
  const button = document.querySelector('[data-stage14-share]');
  const status = document.querySelector('[data-stage14-share-status]');
  if (!button || !status) return;
  button.addEventListener('click', async () => {
    const href = document.querySelector('link[rel="canonical"]')?.href || '';
    let url;
    try { url = new URL(href); } catch (_) { status.textContent='نشانی قابل اشتراک‌گذاری یافت نشد.'; return; }
    if (url.origin !== 'https://drjavadrezazadeh.com' || !url.pathname.startsWith('/fa/')) {
      status.textContent='نشانی معتبر عمومی در دسترس نیست.'; return;
    }
    url.hash=''; url.search='';
    const canonical=url.toString();
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({title:document.title, url:canonical});
        status.textContent='لینک عمومی از مسیر اشتراک‌گذاری دستگاه ارسال شد.';
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(canonical);
        status.textContent='نشانی عمومی کپی شد؛ می‌توانید داوطلبانه آن را برای دیگران ارسال کنید.';
      } else {
        status.replaceChildren(document.createTextNode('برای اشتراک‌گذاری، این نشانی عمومی را کپی کنید: '));
        const link=document.createElement('a'); link.href=canonical; link.textContent=canonical; status.append(link);
      }
    } catch (error) {
      status.textContent=error?.name === 'AbortError' ? 'اشتراک‌گذاری لغو شد.' : 'اشتراک‌گذاری انجام نشد؛ از لینک عمومی صفحه استفاده کنید.';
    }
  });
})();
