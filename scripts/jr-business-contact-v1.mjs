import fs from 'node:fs';
import path from 'node:path';
export const BUSINESS_NUMBER='989132641068';
const ORIGIN='https://drjavadrezazadeh.com';
const CSS='<link rel="stylesheet" href="/assets/css/jr-business-contact-v1.css">';
const icon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5 8 8 0 0 1-3.8-.9L4 20l1-3.7a8.5 8.5 0 1 1 15-4.8Z"/><path d="M8.5 8.5c.5 3.5 2.5 5.5 6 6l1-1.5-2-1-1 1a6 6 0 0 1-2.5-2.5l1-1-1-2Z"/></svg>';
const copy={
 fa:{label:'واتساپ بیزینس',intro:'ارتباط سریع برای مشاوره، خرید، همکاری و سرمایه‌گذاری',hello:'سلام، از طریق وب‌سایت با شما آشنا شدم.',purpose:'موضوع درخواست',page:'صفحه',topics:{consult:'مشاوره و خدمات آموزشی یا پژوهشی',buy:'خرید و استعلام خدمات یا محصولات',invest:'همکاری تجاری و سرمایه‌گذاری',general:'ارتباط و کسب اطلاعات',journal:'پرسش عمومی دربارهٔ وب‌سایت (نه ارسال مقاله)'}},
 en:{label:'WhatsApp Business',intro:'Quick enquiries: consultation, purchases, collaboration and investment',hello:'Hello, I found you through your website.',purpose:'Enquiry',page:'Page',topics:{consult:'Consultation and educational or research services',buy:'Purchase or service enquiry',invest:'Business collaboration and investment',general:'General enquiry',journal:'General website enquiry (not manuscript submission)'}},
 ar:{label:'واتساب للأعمال',intro:'تواصل سريع للاستشارة والشراء والتعاون والاستثمار',hello:'مرحباً، تعرفت إليكم عبر الموقع الإلكتروني.',purpose:'موضوع الاستفسار',page:'الصفحة',topics:{consult:'استشارة وخدمات تعليمية أو بحثية',buy:'استفسار عن الشراء أو الخدمات',invest:'التعاون التجاري والاستثمار',general:'استفسار عام',journal:'استفسار عام عن الموقع (ليس لإرسال المخطوطات)'}}
};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attrs=t=>Object.fromEntries([...t.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),m[2]??m[3]]));
function head(s){return s.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1]||'';}
function meta(s,n){return [...head(s).matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0])).find(a=>a.name?.toLowerCase()===n)?.content||'';}
function links(s){return [...head(s).matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0]));}
function canonical(s){return links(s).find(a=>a.rel==='canonical')?.href||'';}
function locale(s){const l=attrs(s.match(/<html\b[^>]*>/i)?.[0]||'').lang?.toLowerCase().split('-')[0];return copy[l]?l:'en';}
function route(rel){return '/'+rel.replace(/(?:^|\/)index\.html$/,m=>m.startsWith('/')?'/':'');}
const forbidden=/(?:^|\/)(?:api|app|account|customer-dashboard|admin|login|register|recover|bazyabi-hesab|checkout|cart|payment-start|payment-return|payment-result|workspace|observer|roles|student|assessments|my|request-consultation|darkhast-moshavere)(?:\/|$)/i;
export function isContactEligible(p,s,sitemap){
 if(!sitemap.has(ORIGIN+p)||/\bnoindex\b/i.test(meta(s,'robots'))||canonical(s)!==ORIGIN+p||!/<\/head\s*>/i.test(s)||!/<\/body\s*>/i.test(s)||(forbidden.test(p)&&!/^\/(?:fa|en|ar)\/jrei\/catalog\/api\/$/.test(p)))return false;
 if(/\/dashboard(?:\/|$)/i.test(p)&&!/^\/journal\/(?:fa\/)?dashboard\/$/.test(p))return false;
 if(/\/golden-talent\/(?:assessment|plans)(?:\/|$)/i.test(p))return false;
 return true;
}
function topicFor(p){if(p.startsWith('/journal/'))return 'journal';if(/\/(?:shop|order|pricing|services|khadamat|books)(?:\/|$)/i.test(p))return 'buy';if(/\/(?:jrei|forge|jrei-academic|collaboration|invite|hamkari-sazmani)(?:\/|$)/i.test(p))return 'invest';if(/consult|moshavere|research|pajouhesh|teaching|tadris|golden-talent|rcas|bahar|exams|education|amoozesh/i.test(p))return 'consult';return 'general';}
export function businessHref(l,p,topic=topicFor(p)){
 if(!copy[l]||!copy[l].topics[topic]||!/^\/(?!\/)[^\s?#]*$/.test(p))throw Error('Invalid business contact context');
 const c=copy[l];return 'https://wa.me/'+BUSINESS_NUMBER+'?text='+encodeURIComponent(c.hello+'\n'+c.purpose+': '+c.topics[topic]+'\n'+c.page+': '+ORIGIN+p);
}
export function contactMarkup(l,p){
 const c=copy[l];
 return '<aside class="jr-wa-float" data-jr-business-contact="v1" data-jr-business-float="v1" aria-label="'+esc(c.label)+'"><a class="jr-wa-link" href="'+esc(businessHref(l,p))+'" rel="noopener noreferrer" target="_blank" aria-label="'+esc(c.label)+'" title="'+esc(c.label)+'">'+icon+'</a></aside>';
}
function sitemapSet(out){
 const maps=['sitemap-core.xml','journal/sitemap.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-news.xml','sitemap-services.xml','sitemap-jrei.xml','sitemap-ar.xml'];
 const seen=new Set(),duplicates=[];
 for(const m of maps){const f=path.join(out,m);if(!fs.existsSync(f))continue;for(const x of fs.readFileSync(f,'utf8').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)){const u=x[1].trim().replaceAll('&amp;','&');if(seen.has(u))duplicates.push(u);seen.add(u);}}
 return {seen,duplicates};
}
export function applyBusinessContact(out,files,failures){
 const {seen}=sitemapSet(out);const report={enhanced:0,skipped:0,byLanguage:{fa:0,en:0,ar:0},pages:[]};
 for(const file of files){
  const rel=path.relative(out,file).replaceAll(path.sep,'/'),p=route(rel),s=fs.readFileSync(file,'utf8');
  if(!isContactEligible(p,s,seen)){report.skipped++;continue;}
  const l=locale(s);
  let next=s.replace(/\s*·\s*<bdi dir="ltr">\+98 913 264 1068<\/bdi>/g,'');
  // One icon-only launcher, outside layout containers; CSS coordinates with the assistant.
  if(s.includes('data-jr-business-contact="v1"')){
   if(!s.includes('https://wa.me/'+BUSINESS_NUMBER))failures.push('Invalid business contact: '+p);
   if(next!==s)fs.writeFileSync(file,next,'utf8');
   report.enhanced++;report.byLanguage[l]++;report.pages.push(p);continue;
  }
  next=next.replace(/<\/body\s*>/i,m=>contactMarkup(l,p)+m);
  if(!next.includes('/assets/css/jr-business-contact-v1.css'))next=next.replace(/<\/head\s*>/i,CSS+'$&');
  if(!next.includes('data-jr-business-contact="v1"')||!next.includes('https://wa.me/'+BUSINESS_NUMBER)||canonical(next)!==canonical(s)||meta(next,'robots')!==meta(s,'robots')){failures.push('Business contact invariant failed: '+p);continue;}
  fs.writeFileSync(file,next,'utf8');report.enhanced++;report.byLanguage[l]++;report.pages.push(p);
 }
 for(const p of ['/','/fa/tamas/','/en/contact/','/ar/contact/','/fa/jrei/','/en/jrei/','/ar/jrei/'])if(!report.pages.includes(p))failures.push('Required business contact missing: '+p);
 return report;
}
export function auditPublicRelease(out,files){
 const {seen,duplicates}=sitemapSet(out),records=new Map(),issues=[],titles=new Map(),incoming=new Map();
 const add=(kind,p,detail)=>issues.push({kind,page:p,detail});
 for(const file of files){
  const rel=path.relative(out,file).replaceAll(path.sep,'/'),p=route(rel),s=fs.readFileSync(file,'utf8'),u=ORIGIN+p;
  const listed=seen.has(u),canon=canonical(s),robots=meta(s,'robots'),indexable=!/\bnoindex\b/i.test(robots);
  const h=head(s),title=h.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()||'',description=meta(s,'description'),a=Object.fromEntries(links(s).filter(x=>x.rel==='alternate'&&x.hreflang&&x.href).map(x=>[x.hreflang,x.href]));
  records.set(u,{p,listed,canon,indexable,a});
  if(!listed)continue;
  if(!indexable)add('sitemap_noindex',p,robots);
  if(canon!==u)add('canonical_mismatch',p,canon);
  if(!title)add('missing_title',p,'');
  else {const k=title.replace(/\s+/g,' ').toLowerCase();if(!titles.has(k))titles.set(k,[]);titles.get(k).push(p);}
  if(!description)add('missing_description',p,'');
  else if(description.length<50||description.length>200)add('description_review',p,description.length);
  const h1=(s.match(/<h1\b/gi)||[]).length;if(h1!==1)add('h1_review',p,h1);
  const imgs=[...s.matchAll(/<img\b[^>]*>/gi)].map(m=>attrs(m[0]));
  if(imgs.some(i=>!('alt' in i)))add('missing_image_alt',p,imgs.filter(i=>!('alt' in i)).length);
  if(imgs.some(i=>!i.width||!i.height))add('image_dimensions_review',p,imgs.filter(i=>!i.width||!i.height).length);
  for(const m of s.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{JSON.parse(m[1]);}catch{add('invalid_jsonld',p,'parse error');}}
  if(!s.includes('data-jr-business-contact="v1"'))add('business_contact_missing_or_excluded',p,'review eligibility');
  const body=s.replace(/<!--[\s\S]*?-->|<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
  for(const m of body.matchAll(/<a\b[^>]*>/gi)){
   const href=attrs(m[0]).href;if(!href||href.startsWith('#'))continue;
   let v;try{v=new URL(href.replaceAll('&amp;','&'),u);}catch{continue;}
   if(v.origin!==ORIGIN)continue;
   const q=v.pathname;if(q===p)continue;const dest=ORIGIN+q;
   if(seen.has(dest))incoming.set(dest,(incoming.get(dest)||0)+1);
   if(v.search||!q.endsWith('/')||/\/api\//.test(q))continue;
   if(!fs.existsSync(path.join(out,q.slice(1),'index.html')))add('local_link_target_review',p,q);
  }
 }
 for(const [u,r] of records)if(r.listed){for(const [l,target] of Object.entries(r.a)){if(l==='x-default')continue;const t=records.get(target);if(!t){add('hreflang_target_review',r.p,target);continue;}const own=r.p.match(/^\/(fa|en|ar)\//)?.[1]||(r.p.startsWith('/journal/fa/')?'fa':r.p.startsWith('/journal/')?'en':null);if(own&&t.a[own]!==u)add('hreflang_reciprocity_review',r.p,target);}}
 for(const [title,pages] of titles)if(pages.length>1)add('duplicate_title_review',pages[0],pages);
 for(const u of seen){if(!records.has(u))add('sitemap_target_review',u,'not an HTML route in this artifact');else if(u!==ORIGIN+'/'&&!incoming.has(u))add('orphan_candidate',u,'no inbound HTML link from another sitemap-listed page');}
 const counts={};for(const x of issues)counts[x.kind]=(counts[x.kind]||0)+1;
 return {schema:'jr.source-audit.v1',scope:'Static release HTML and local files; not live HTTP, browser, PageSpeed, Search Console or security penetration testing',htmlRoutes:records.size,sitemapUnique:seen.size,sitemapDuplicates:duplicates,issueCounts:counts,issues};
}
