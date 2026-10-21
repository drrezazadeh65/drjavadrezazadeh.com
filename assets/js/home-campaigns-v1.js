/* Public-home campaigns: progressive enhancement only.
   Links, images, copy, scroll-snap and SEO work with JavaScript disabled.
   No autoplay, new storage, tracking, API calls, or dependence on PWA. */
(()=>{
 "use strict";
 const campaigns=document.querySelector('.jr-campaigns');
 if(!campaigns)return;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 for(const group of campaigns.querySelectorAll('[data-jr-promo-group]')){
  const rail=group.querySelector('[data-jr-promo-rail]');
  const slides=Array.from(rail?.querySelectorAll('.jr-campaign-card')||[]);
  const controls=Array.from(group.querySelectorAll('[data-jr-promo-step]'));
  if(!rail||slides.length<2)continue;
  const rtl=getComputedStyle(rail).direction==='rtl';
  const indexAtLeadingEdge=()=>{
   const rect=rail.getBoundingClientRect();
   const edge=rtl?rect.right:rect.left;
   let closest=0,dist=Infinity;
   slides.forEach((slide,i)=>{
    const sr=slide.getBoundingClientRect();
    const d=Math.abs((rtl?sr.right:sr.left)-edge);
    if(d<dist){dist=d;closest=i}
   });
   return closest;
  };
  const sync=()=>{
   const index=indexAtLeadingEdge();
   controls.forEach(button=>{
    const step=Number(button.dataset.jrPromoStep);
    button.disabled=(step<0&&index===0)||(step>0&&index===slides.length-1);
   });
  };
  for(const button of controls){
   button.hidden=false;
   button.addEventListener('click',()=>{
    const next=Math.max(0,Math.min(slides.length-1,indexAtLeadingEdge()+Number(button.dataset.jrPromoStep)));
    slides[next].scrollIntoView({
     behavior:reduced?.matches?'auto':'smooth',
     block:'nearest',inline:'start'
    });
   });
  }
  let scheduled=false;
  rail.addEventListener('scroll',()=>{
   if(scheduled)return;
   scheduled=true;
   requestAnimationFrame(()=>{scheduled=false;sync()});
  },{passive:true});
  window.addEventListener('resize',sync,{passive:true});
  sync();
 }
})();
