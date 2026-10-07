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
      const res=await fetch('/platform/service-catalog.json',{cache:'reload'});
      if(!res.ok) throw new Error('catalogue unavailable');
      const data=await res.json();
      const services=(data.services||[]).filter(x=>x.sellable===true&&Number.isInteger(x.price));
      host.innerHTML=services.map(service=>{
        const id=encodeURIComponent(service.id);
        return '<article class="service-offer service-pricing-card">'+
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
      const count=document.querySelector('[data-service-pricing-count]');
      if(count) count.textContent=faDigits(services.length);
    }catch(_){
      host.innerHTML='<p class="service-pricing-error">تعرفه‌ها موقتاً قابل بارگذاری نیستند. برای دریافت دامنه و تعرفه معتبر از مسیر درخواست مشاوره اقدام کنید.</p>';
    }
  }

  render();
})();
