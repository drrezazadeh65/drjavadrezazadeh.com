/**
 * Read-only, bilingual publishing-page acceptance. This checks truthful public
 * disclosure and a FAIL-CLOSED checkout shell, NOT author signatures, rights,
 * file custody, actual sale, payment, SMTP or private PDF delivery.
 *
 * No mutable checkout input or screenshot can establish server readiness.
 */
const sku='digital:tefl-ma-exams-1370-1405';
const origin='https://drjavadrezazadeh.com';

export function inspectPublishingPublicPage(html,language){
 const lang=language==='fa'?'fa':language==='en'?'en':null;
 if(!lang||typeof html!=='string'||html.length<1500)
   return {valid:false,language:lang,checks:{}};
 const url=origin+'/'+lang+'/shop/authors/mehrab-mirkarimi/';
 const counterpart=origin+'/'+(lang==='fa'?'en':'fa')+'/shop/authors/mehrab-mirkarimi/';
 const form=html.match(/<form\b[^>]*\bid="jp-digital-checkout-form"[^>]*>/i)?.[0]||'';
 const disclosures=lang==='fa'
  ?['بررسی مستقل علمی پاسخ‌ها همچنان ادامه دارد',
    'تا زمان فعال‌سازی، پرداختی از شما دریافت نخواهد شد']
  :['Independent answer-by-answer verification remains incomplete',
    'no payment is accepted'];
 const checks={
  htmlLanguage:html.includes('<html lang="'+lang+'"'),
  selfCanonical:html.includes('<link rel="canonical" href="'+url+'">'),
  reciprocalLanguage:html.includes('<link rel="alternate" hreflang="'+(lang==='fa'?'en':'fa')+'" href="'+counterpart+'">'),
  pageIndexable:/<meta\s+name="robots"\s+content="index,follow/.test(html),
  checkoutInitiallyHidden:/\shidden(?:\s|>)/.test(form),
  checkoutUsesExistingCommerce:form.includes('action="/api/commerce/create"')
    &&form.includes('method="post"'),
  readinessStatusPresent:html.includes('id="jp-purchase-readiness"')
    &&html.includes('id="jp-checkout-state"'),
  checkoutScriptLoaded:/src="\/assets\/js\/jr-publishing-checkout-v1\.js(?:\?[^"]*)?"/.test(html),
  independentAcademicReviewDisclosure:html.includes(disclosures[0]),
  noPaymentUntilServerReadyDisclosure:html.includes(disclosures[1]),
  noAuthorEmailLeak:!/[a-z0-9._%+-]*mirkarimi[a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/i.test(html)
 };
 return {valid:Object.values(checks).every(x=>x===true),language:lang,checks};
}

export function inspectPublishingPublicOffer(response){
 const v=response?.body;
 const valid=response?.httpStatus===200&&v?.ok===true
  &&v.sku===sku&&v.priceToman===1000000
  &&typeof v.available==='boolean'&&typeof v.checkoutEnabled==='boolean'
  &&v.available===v.checkoutEnabled;
 return {valid,checkoutReady:valid&&v.available===true};
}
