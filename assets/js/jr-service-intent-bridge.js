/* Lightweight first-party conversion intent bridge for standalone service pages.
 * Does not store user data, load any third-party tag or claim a received lead.
 * A site.js page keeps its existing single global intent dispatcher instead.
 */
(()=>{
  'use strict';
  const scripts=Array.from(document.scripts);
  if(scripts.some(s=>/\/assets\/js\/site\.js(?:\?|$)/.test(s.src)))return;
  const allowedEvents=new Set(['consultation_intent','consultation_email_intent']);
  const safeSurface=/^(?:fa|en)_(?:service|vip)_detail$/;
  const locale=document.documentElement.lang==='fa'?'fa':document.documentElement.lang==='en'?'en':'und';
  if(locale==='und')return;

  document.addEventListener('click',event=>{
    const element=event.target instanceof Element
      ?event.target.closest('a[data-conversion-event][data-conversion-surface]'):null;
    if(!element)return;
    const eventKey=element.dataset.conversionEvent||'';
    const surface=element.dataset.conversionSurface||'';
    if(!allowedEvents.has(eventKey)||!safeSurface.test(surface))return;
    // Deliberately exclude the entire href, search query and page fragments;
    // passing a public service ID through navigation is not a lead or purchase.
    const detail={
      event_key:eventKey,
      surface,
      locale,
      route:location.pathname,
      target_kind:element.protocol==='mailto:'?'EMAIL':'LINK'
    };
    window.dispatchEvent(new CustomEvent('JR_CONVERSION_INTENT',{detail}));
  },{capture:true,passive:true});

  // Reuse the pre-existing consent-gated adapter. The canonical analytics
  // config currently has enabled:false, so no GTM or GA4 traffic is sent.
  const loadAdapter=()=>{
    if(document.querySelector('script[src*="/assets/js/analytics-adapter.js"]'))return;
    const script=document.createElement('script');
    script.src='/assets/js/analytics-adapter.js?v=20261020-gtm-consent-v5';
    script.async=true;
    document.head.appendChild(script);
  };
  let scheduled=false;
  const schedule=()=>{
    if(scheduled)return;
    scheduled=true;
    const start=()=>loadAdapter();
    if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:2400});
    else setTimeout(start,700);
  };
  if(document.readyState==='complete')schedule();
  else{
    window.addEventListener('load',schedule,{once:true});
    const afterDom=()=>setTimeout(schedule,1800);
    if(document.readyState==='loading')
      document.addEventListener('DOMContentLoaded',afterDom,{once:true});
    else afterDom();
  }
})();
