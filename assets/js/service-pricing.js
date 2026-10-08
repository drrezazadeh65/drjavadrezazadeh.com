(()=>{
  'use strict';
  const host=document.querySelector('[data-service-pricing]');
  if(!host) return;

  const faDigits=value=>new Intl.NumberFormat('fa-IR').format(value);
  const price=value=>faDigits(value)+' تومان';
  const duration=value=>Number.isInteger(value)?faDigits(value)+' دقیقه':'دامنه و زمان بر اساس شرح خدمت';

  function escapeHtml(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  async function render(){
    try{
      const res=await fetch('/assets/data/service-catalog.json',{cache:'reload'});
      if(!res.ok) throw new Error('catalogue unavailable');
      const data=await res.json();
      const services=(data.services||[]).filter(x=>x.sellable===true&&Number.isInteger(x.price));
      const search=document.querySelector('[data-service-search]');
      const sort=document.querySelector('[data-service-sort]');
      const clear=document.querySelector('[data-service-clear]');
      const feedback=document.querySelector('[data-service-filter-count]');
      const empty=document.querySelector('[data-service-empty]');
      const normalize=value=>String(value||'').toLocaleLowerCase('fa')
        .normalize('NFKC').replace(/[\u064b-\u065f\u0670\u0640]/g,'')
        .replace(/[يى]/g,'ی').replace(/ك/g,'ک')
        .replace(/[\u200c\u200d]/g,' ').replace(/\s+/g,' ').trim();
      const prepared=services.map((service,index)=>({
        service,index,text:normalize([service.title_fa,service.fit_fa,service.outcome_fa,service.boundary_fa].join(' '))
      }));
      const renderCards=()=>{
        const query=normalize(search?.value);
        const terms=query.split(' ').filter(Boolean);
        const order=sort?.value||'default';
        const selected=prepared.filter(row=>terms.every(term=>row.text.includes(term))).sort((a,b)=>
          order==='asc'?(a.service.price-b.service.price||a.index-b.index):
          order==='desc'?(b.service.price-a.service.price||a.index-b.index):a.index-b.index
        );
        host.innerHTML=selected.map(({service})=>{
        const id=encodeURIComponent(service.id);
        return '<article class="service-offer service-pricing-card" data-service-price="'+service.price+'">'+
          '<h3>'+escapeHtml(service.title_fa)+'</h3>'+
          '<div class="service-price-amount">'+price(service.price)+'</div>'+
          '<span class="service-fit">'+duration(service.duration_minutes)+'</span>'+
          '<div class="service-pricing-detail">'+
            (service.fit_fa?'<p><strong>مناسب برای:</strong> '+escapeHtml(service.fit_fa)+'</p>':'')+
            (service.outcome_fa?'<p><strong>خروجی مورد انتظار:</strong> '+escapeHtml(service.outcome_fa)+'</p>':'')+
            (service.boundary_fa?'<p class="service-boundary"><strong>مرز خدمت:</strong> '+escapeHtml(service.boundary_fa)+'</p>':'')+
          '</div>'+
          '<a class="button" data-conversion-event="service_price_intent" data-conversion-surface="fa_services_pricing" href="/fa/darkhast-moshavere/?service='+id+'">درخواست بررسی این خدمت</a>'+
        '</article>';
        }).join('');
        if(feedback) feedback.textContent='نمایش '+faDigits(selected.length)+' خدمت از '+faDigits(services.length)+' خدمت';
        if(empty) empty.hidden=selected.length!==0;
        if(clear) clear.hidden=!query&&order==='default';
      };
      const count=document.querySelector('[data-service-pricing-count]');
      if(count) count.textContent=faDigits(services.length);
      if(search) search.addEventListener('input',renderCards);
      if(sort) sort.addEventListener('change',renderCards);
      if(clear) clear.addEventListener('click',()=>{
        if(search) search.value='';
        if(sort) sort.value='default';
        renderCards();
        if(search) search.focus();
      });
      renderCards();
    }catch(_){
      host.innerHTML='<p class="service-pricing-error">تعرفه‌ها موقتاً قابل بارگذاری نیستند. برای دریافت دامنه و تعرفه معتبر از مسیر درخواست مشاوره اقدام کنید.</p>';
    }
  }

  render();
})();
