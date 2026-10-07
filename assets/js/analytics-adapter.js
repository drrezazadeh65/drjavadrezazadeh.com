(()=>{
'use strict';
const CONFIG_URL='/assets/data/analytics-config.json';
const state={config:null,ready:false,loaded:false};
const safeToken=value=>String(value??'').slice(0,120);
const consentGranted=config=>{
  try{return localStorage.getItem(config?.consent?.storage_key||'jr-analytics-consent-v1')===(config?.consent?.granted_value||'granted');}
  catch(_){return false;}
};
const validMeasurement=id=>/^G-[A-Z0-9]{6,20}$/.test(String(id||''));

function installGtag(config){
  if(state.loaded||!config?.enabled||!validMeasurement(config.measurement_id)||!consentGranted(config)) return false;
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
  window.gtag('consent','default',{
    analytics_storage:'granted',
    ad_storage:'denied',
    ad_user_data:'denied',
    ad_personalization:'denied'
  });
  window.gtag('js',new Date());
  window.gtag('config',config.measurement_id,{
    anonymize_ip:true,
    allow_google_signals:false,
    allow_ad_personalization_signals:false,
    send_page_view:true
  });
  const script=document.createElement('script');
  script.async=true;
  script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(config.measurement_id);
  script.dataset.jrAnalytics='ga4';
  document.head.appendChild(script);
  state.loaded=true;
  return true;
}

function send(detail){
  const config=state.config;
  if(!state.ready||!config?.enabled||!state.loaded||typeof window.gtag!=='function') return;
  const allowed=new Set(config.allowed_client_events||[]);
  const eventKey=safeToken(detail?.event_key);
  if(!allowed.has(eventKey)) return;
  const payload={
    surface:safeToken(detail?.surface||'unknown'),
    locale:safeToken(detail?.locale||document.documentElement.lang||'und'),
    route:safeToken(detail?.route||location.pathname),
    target_kind:safeToken(detail?.target_kind||'ACTION')
  };
  window.gtag('event',eventKey,payload);
}

async function init(){
  try{
    const res=await fetch(CONFIG_URL,{cache:'reload',credentials:'same-origin'});
    if(!res.ok) return;
    const config=await res.json();
    state.config=config;
    state.ready=true;
    installGtag(config);
  }catch(_){}
}

window.addEventListener('JR_CONVERSION_INTENT',event=>send(event.detail||{}));
window.JRAnalyticsConsent={
  status:()=>state.config?consentGranted(state.config):false,
  grant:()=>{
    const cfg=state.config;
    if(!cfg) return false;
    try{localStorage.setItem(cfg.consent.storage_key,cfg.consent.granted_value);}catch(_){return false;}
    return installGtag(cfg);
  },
  deny:()=>{
    const cfg=state.config;
    if(!cfg) return false;
    try{localStorage.setItem(cfg.consent.storage_key,cfg.consent.denied_value);}catch(_){return false;}
    if(typeof window.gtag==='function') window.gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    return true;
  }
};
init();
})();
