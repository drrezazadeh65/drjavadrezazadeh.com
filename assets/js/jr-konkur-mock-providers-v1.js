/* JR Konkur mock-provider directory v1.0 — traceable labels, no vendor integration.
 * Research inventory, NOT approved provider scorecards or comparable rating scales.
 * Pure UMD, zero storage/network/identifiers. "Other" accepts new issuers without code changes.
 */
(function(root,factory){
 const entries=factory();
 if(typeof module==='object'&&module.exports)module.exports=entries;
 if(root)root.JRKonkurMockProviders=entries;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const entries=[
  {code:'GHALAMCHI',fa:'کانون قلم‌چی',en:'Kanoon / Ghalamchi',evidence:'PROVIDER_REPORT_DESCRIBED',
   source:'https://t.me/s/kanoonir/8684'},
  {code:'GAJ',fa:'گاج',en:'GAJ',evidence:'PROVIDER_REPORT_DESCRIBED',
   source:'https://t.me/s/gaj_ir?q=%23%D8%A7%D8%B7%D9%84%D8%A7%D8%B9%DB%8C%D9%87'},
  {code:'GOZINE2',fa:'گزینه دو',en:'Gozineh Do',evidence:'PROVIDER_REPORT_DESCRIBED',
   source:'https://t.me/s/gozine2?after=38982'},
  {code:'MAZ',fa:'ماز',en:'MAZ',evidence:'PUBLIC_SCORECARD_SAMPLE_OLD',
   source:'https://www.scribd.com/document/904196526/'},
  {code:'SANJESH_MOCK',fa:'آزمون‌های آزمایشی سنجش (غیر از آزمون رسمی سراسری)',en:'Sanjesh mock exams (NOT official national exam)',evidence:'MOCK_SERVICE_REPORTED_LAYOUT_PENDING',
   source:'https://www.heyvagroup.com/shownews/7121/'},
  {code:'VALEH',fa:'واله (قالب کارنامه بررسی نشده)',en:'Valeh (report layout unverified)',evidence:'RESEARCH_CANDIDATE',
   source:'https://www.webmasterfa.com/entrance-exam/'},
  {code:'MOBTAKERAN',fa:'مبتکران (قالب کارنامه بررسی نشده)',en:'Mobtakeran (report layout unverified)',evidence:'RESEARCH_CANDIDATE',
   source:'https://www.webmasterfa.com/entrance-exam/'},
  {code:'AYANDESAZAN',fa:'آینده‌سازان (قالب کارنامه بررسی نشده)',en:'Ayandesazan (report layout unverified)',evidence:'RESEARCH_CANDIDATE',
   source:'https://www.webmasterfa.com/entrance-exam/'},
  {code:'SCHOOL_LOCAL',fa:'آزمون مدرسه یا مؤسسه محلی',en:'School or local provider exam',evidence:'USER_DEFINED',
   source:null},
  {code:'OTHER',fa:'سایر برگزارکنندگان',en:'Other provider',evidence:'USER_DEFINED',
   source:null}
 ];
 return Object.freeze(entries.map(p=>Object.freeze(p)));
});
