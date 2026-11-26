import fs from 'node:fs';
import path from 'node:path';
import {BUSINESS_NUMBER,isContactEligible} from './jr-business-contact-v1.mjs';
const origin='https://drjavadrezazadeh.com';
// Public product/service information and exact checkout routes only.
// No account/admin/private evidence routes, journal invoices or payment callbacks.
const publicPattern=/^\/(?:fa|en|ar)\/(?:support-talented-students|donations?|books|ketab-ha|shop|services|academic-services|khadamat|khadamat-pajouheshi|moshavere-tahsili|moshavere-konkur|golden-talent|vip\/golden-talent-signature|jrei|jrei-academic|forge)(?:\/|$)/;
const excluded=/(?:^|\/)(?:customer-policy|purchase-guide|assessment|plans|account|admin|app|login|register|recover|cart|payment-start|payment-return|payment-result|private|workspace)(?:\/|$)/;
// The two public donation forms intentionally remain noindex for safeguarding.
const support=new Set(['/fa/support-talented-students/','/en/support-talented-students/']);
const checkout=new Set(['/fa/services/checkout/','/en/services/checkout/','/fa/shop/checkout/','/en/shop/checkout/','/fa/shop/golden-talent/checkout/','/en/golden-talent/checkout/']);
const copy={
 fa:{label:'درخواست فاکتور USDT (BEP20)',detail:'پرداخت دستی پس از هماهنگی و دریافت فاکتور تأییدشده. پیش از تأیید مبلغ، شبکه و آدرس دریافت هیچ وجهی ارسال نکنید. این گزینه درگاه خودکار یا تأیید پرداخت نیست.',message:'سلام. برای این صفحه درخواست فاکتور و هماهنگی پرداخت دستی USDT روی شبکه BEP20 دارم. لطفاً مبلغ و شرایط را تأیید کنید.'},
 en:{label:'Request a USDT (BEP20) invoice',detail:'Manual payment by arrangement after receiving a confirmed invoice. Do not transfer funds before the amount, network and receiving address are confirmed. This is not automated checkout or payment verification.',message:'Hello. I would like to request an invoice and arrange a manual USDT payment on BEP20 for this page. Please confirm the amount and terms.'},
 ar:{label:'طلب فاتورة USDT (BEP20)',detail:'الدفع اليدوي بالتنسيق وبعد استلام فاتورة مؤكدة. لا ترسل أي أموال قبل تأكيد المبلغ والشبكة وعنوان الاستلام. هذا ليس دفعاً آلياً أو تأكيداً للدفع.',message:'مرحباً. أود طلب فاتورة وتنسيق الدفع اليدوي بعملة USDT على شبكة BEP20 لهذه الصفحة. يرجى تأكيد المبلغ والشروط.'}
};
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
export function invoiceRequestEligible(route,source,urls){
 if(excluded.test(route)||!publicPattern.test(route)||!/<\/body\s*>/i.test(source)||!/<\/head\s*>/i.test(source))return false;
 if(support.has(route)){
  const lang=route.split('/')[1];
  return source.includes('href="'+origin+route+'"')&&
    new RegExp('<html\\b[^>]*lang=["\']'+lang+'["\']','i').test(source)&&
    !/<meta\b[^>]*http-equiv=["']refresh["']/i.test(source);
 }
 if(checkout.has(route))return /<html\b[^>]*lang=["'](?:fa|en)["']/i.test(source)&&!/<meta\b[^>]*http-equiv=["']refresh["']/i.test(source);
 return isContactEligible(route,source,urls);
}
export function invoiceRequestMarkup(route){
 const lang=route.split('/')[1],c=copy[lang];
 if(!c||!publicPattern.test(route)||excluded.test(route)||!/^(?:\/[a-zA-Z0-9_-]+)+\/$/.test(route))throw Error('Invalid invoice enquiry route');
 const href='https://wa.me/'+BUSINESS_NUMBER+'?text='+encodeURIComponent(c.message+'\n'+origin+route);
 return '<aside class="jr-wa-business" data-jr-usdt-invoice-enquiry="v1" aria-label="'+esc(c.label)+'"><p>'+esc(c.detail)+'</p><a class="jr-wa-link" rel="noopener noreferrer" target="_blank" href="'+esc(href)+'">'+esc(c.label)+'</a></aside>';
}
export function applyUsdtInvoiceEnquiries(out,files,failures){
 const maps=['sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-ar.xml','sitemap-jrei.xml','sitemap-services.xml','sitemap-news.xml','journal/sitemap.xml'];
 const urls=new Set(maps.flatMap(m=>[...fs.readFileSync(path.join(out,m),'utf8').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(x=>x[1].trim())));
 const report={mode:'manual_invoice_enquiry_not_payment_gateway',enhanced:0,byLanguage:{fa:0,en:0,ar:0},routes:[]};
 for(const file of files){
  const rel=path.relative(out,file).replaceAll(path.sep,'/'),route='/'+rel.replace(/index\.html$/,'');
  const source=fs.readFileSync(file,'utf8');if(!invoiceRequestEligible(route,source,urls))continue;
  const lang=route.split('/')[1];let next=source;
  if(!next.includes('data-jr-usdt-invoice-enquiry="v1"')){
   const block=invoiceRequestMarkup(route);
   // Outside existing checkout forms; never collect payment details through the link.
   next=next.replace(/<\/body\s*>/i,m=>block+m);
   if(!next.includes('/assets/css/jr-business-contact-v1.css'))next=next.replace(/<\/head\s*>/i,m=>'<link rel="stylesheet" href="/assets/css/jr-business-contact-v1.css">'+m);
   fs.writeFileSync(file,next,'utf8');
  }
  report.enhanced++;report.byLanguage[lang]++;report.routes.push(route);
 }
 for(const required of ['/fa/support-talented-students/','/en/support-talented-students/','/fa/shop/','/en/shop/','/ar/books/','/fa/services/','/en/services/','/ar/services/','/fa/jrei/','/en/jrei/','/ar/jrei/'])if(!report.routes.includes(required))failures.push('Missing USDT invoice enquiry: '+required);
 return report;
}
