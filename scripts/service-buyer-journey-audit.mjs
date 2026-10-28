/* Source-only integrity guard for buyer decision pages; no network or production writes.
 * Do not confuse catalogue facts with available booking/payment capacity.
 */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const BASE='https://drjavadrezazadeh.com';
const read=(relative)=>fs.readFileSync(path.join(root,relative),'utf8');
const standard=JSON.parse(read('assets/data/service-catalog.json')).services;
const vip=JSON.parse(read('assets/data/vip-catalog.json')).services;
const enServices=JSON.parse(read('assets/data/service-descriptions-en.json'));
const enVip=JSON.parse(read('assets/data/vip-descriptions-en.json'));
const errors=[];
let checked=0;

function requireCondition(ok,msg){if(!ok)errors.push(msg);}
function attr(tag,key){
  const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const found=tag.match(new RegExp('(?:^|\\s)'+escaped+'\\s*=\\s*(["\x27])([^"\x27]*)\\1','i'));
  return found?found[2]:null;
}
function localHrefExists(href){
  if(!href||!href.startsWith('/')||href.startsWith('//'))return true;
  const target=href.split(/[?#]/,1)[0];
  if(!target)return true;
  if(/\.(?:css|js|svg|jpg|png|webp|pdf|xml|txt)$/i.test(target)){
    return fs.existsSync(path.join(root,target.slice(1)));
  }
  const normalized=target.endsWith('/')?target:target+'/';
  return fs.existsSync(path.join(root,normalized.slice(1),'index.html'));
}
function validate(locale,kind,id){
  const base=`${locale}/${kind}/${id}/`;
  const relative=base+'index.html';
  checked++;
  let html;
  try{html=read(relative);}catch(_){errors.push(relative+': missing page');return;}
  const prefix=relative+': ';
  const lang=(html.match(/<html\b[^>]*\blang=["\x27]([^"\x27]+)/i)||[])[1];
  requireCondition(lang===locale,prefix+'wrong document language');
  const canonical=(html.match(/<link\b[^>]*\brel=["\x27]canonical["\x27][^>]*\bhref=["\x27]([^"\x27]+)/i)||[])[1];
  requireCondition(canonical===BASE+'/'+base,prefix+'incorrect canonical URL');
  requireCondition(!/<meta\b[^>]*\bname=["\x27]robots["\x27][^>]*\bcontent=["\x27][^"\x27]*noindex/i.test(html),prefix+'public detail unexpectedly noindex');
  requireCondition((html.match(/<h1\b/gi)||[]).length===1,prefix+'must contain one visible H1');
  requireCondition((html.match(/id=["\x27]jr-decision-guide-v1["\x27]/gi)||[]).length===1,prefix+'guide ID missing/duplicated');
  requireCondition(html.includes('href="#jr-decision-guide-v1"'),prefix+'hero jump link missing');
  const bridge=(html.match(/src=["']\/assets\/js\/jr-service-intent-bridge\.js(?:\?[^"']*)?["']/gi)||[]).length;
  const globalSite=(html.match(/src=["'](?:\/assets\/js\/|[^"']*\/)site\.js(?:\?[^"']*)?["']/gi)||[]).length;
  requireCondition(bridge+globalSite===1,prefix+'expected one consent-aware intent dispatcher, found '+(bridge+globalSite));
  requireCondition(html.includes('/assets/css/jr-service-decision-guides-20261028.css'),prefix+'guide stylesheet missing');
  const guideStart=html.indexOf('<section id="jr-decision-guide-v1"');
  const guideEnd=html.indexOf('</section>',guideStart)+10;
  const mainStart=html.indexOf('<main');
  const mainEnd=html.indexOf('</main>');
  requireCondition(guideStart>mainStart&&guideEnd<=mainEnd&&guideEnd>guideStart,
    prefix+'guide must be inside the main landmark');
  if(kind==='services'&&locale==='fa'){
    const footer=html.indexOf('<footer');
    requireCondition(footer>guideEnd,prefix+'Persian article footer must follow guide');
  }
  if(guideStart<0||guideEnd<=guideStart)return;
  const guide=html.slice(guideStart,guideEnd);
  const q=kind==='vip'?'vip%3A'+id:id;
  const href=`/${locale}/${locale==='fa'?'darkhast-moshavere':'request-consultation'}/?service=${q}`;
  requireCondition(guide.includes('href="'+href+'"'),prefix+'guide must carry catalogue ID into intended intake');
  requireCondition(guide.includes('data-conversion-event="consultation_intent"'),prefix+'CTA must label the canonical conversion intent');
  requireCondition(guide.includes('jr-guide-actions'),prefix+'usable action links missing');
  requireCondition(!/<form\b/i.test(guide),prefix+'guide must not collect private data or create shadow checkout');
  requireCondition(locale==='fa'?/(?:نمونه|سناریو|مثال)\s+فرضی/.test(guide):/(?:hypothetical|illustrative)/i.test(guide),
    prefix+'hypothetical example needs explicit disclosure');
  for(const tag of guide.match(/<a\b[^>]*>/gi)||[]){
    const url=attr(tag,'href');
    if(url&&url.startsWith('/')&&!localHrefExists(url)){
      errors.push(prefix+'missing local guide link target '+url);
    }
  }
}

for(const s of standard){
  requireCondition(/^[a-z][a-z0-9_]{2,63}$/.test(s.id),'invalid standard catalogue identifier');
  requireCondition(typeof s.title_fa==='string'&&s.title_fa.trim(),'missing FA standard title '+s.id);
  requireCondition(typeof enServices.services?.[s.id]?.title==='string',
    'missing EN standard title '+s.id);
  validate('fa','services',s.id);validate('en','services',s.id);
}
for(const v of vip){
  requireCondition(/^[a-z][a-z0-9-]{2,63}$/.test(v.id),'invalid VIP catalogue identifier');
  requireCondition(typeof v.title_fa==='string'&&v.title_fa.trim(),'missing FA VIP title '+v.id);
  requireCondition(typeof enVip.services?.[v.id]==='string'&&enVip.services[v.id].trim(),
    'missing EN VIP title '+v.id);
  validate('fa','vip',v.id);validate('en','vip',v.id);
}
requireCondition(checked===54,'expected 54 bilingual detail pages; found '+checked);

// Existing indexed educational guides retain their informational intent.
// The optional service bridge must appear only in editorially relevant articles.
const editorialBridges=new Map([
 ['tahlil-karname-tahsili','transcript_analysis'],
 ['ghabl-az-submit-maghale','manuscript_diagnostic'],
 ['pasokh-be-davaran','reviewer_response'],
 ['entekhab-majale-monaseb','journal_strategy'],
 ['academic-cv-professional','academic_cv'],
 ['mosahabe-heyat-elmi','academic_interview_90'],
 ['tosee-herfei-moalleman','teacher_dev_90'],
 ['kargah-amoozeshi-asarbakhsh','specialist_workshop_120'],
 ['barname-yek-mahe-konkur','konkur_month'],
 ['madarese-system-estedaadyabi','organization_consult_90'],
 ['estedaad-alaghe-bazaar-kar','field_selection_comprehensive'],
 ['behtarin-sen-estedaadyabi','talent_initial'],
 ['desk-rejection-chist','manuscript_diagnostic'],
 ['azmoon-khoob-vijegiha','teacher_consult_60'],
 ['moshavere-konkur-herfei','konkur_consult_60']
]);
const faSitemap=read('sitemap-fa.xml');
for(const [slug,serviceId] of editorialBridges){
 const path='fa/rahnamaha/'+slug+'/index.html';
 let html;
 try{html=read(path);}catch(_){errors.push(path+': missing editorial page');continue;}
 const prefix=path+': ';
 requireCondition(html.includes('https://drjavadrezazadeh.com/fa/rahnamaha/'+slug+'/'),
   prefix+'existing canonical must be preserved');
 requireCondition(!/<meta\b[^>]*name=["']robots["'][^>]*noindex/i.test(html),
   prefix+'helpful educational guide must remain publicly indexable');
 requireCondition((html.match(/id=["']jr-knowledge-decision-20261028["']/g)||[]).length===1,
   prefix+'missing/duplicate editorial-to-service guide');
 const start=html.indexOf('<section id="jr-knowledge-decision-20261028"');
 const end=html.indexOf('</section>',start)+10;
 const articleEnd=html.lastIndexOf('</article>');
 requireCondition(start>=0&&end>start&&end<articleEnd,
   prefix+'optional service information must remain inside the article');
 const module=start>=0&&end>start?html.slice(start,end):'';
 requireCondition(module.includes('href="/fa/services/'+serviceId+'/"'),
   prefix+'editorial link must reach relevant original service scope');
 requireCondition(module.includes('href="/fa/darkhast-moshavere/?service='+serviceId+'"'),
   prefix+'optional consultation path must preserve public catalogue ID');
 requireCondition(module.includes('data-conversion-event="organic_article_service_intent"'),
   prefix+'reading a service explanation is not a received lead or order');
 requireCondition(module.includes('نیازی به خرید ندارد')&&module.includes('به معنی رزرو'),
   prefix+'free reading, booking and purchase must be clearly distinguished');
 requireCondition(html.includes('jr-knowledge-service-bridge-20261028.css'),
   prefix+'editorial bridge visual stylesheet absent');
 requireCondition(faSitemap.includes(
   '<loc>https://drjavadrezazadeh.com/fa/rahnamaha/'+slug+'/</loc><lastmod>2026-10-28</lastmod>'),
   prefix+'newly revised public article has stale sitemap lastmod');
}
const freeTools=read('assets/js/free-growth-tools.js');
for(const id of ['transcript_analysis','field_selection_standard','talent_initial',
                  'manuscript_diagnostic','teacher_dev_90']){
 // transcript_analysis is reachable through the new article bridges.
 const source=id==='transcript_analysis'?read('fa/rahnamaha/tahlil-karname-tahsili/index.html'):freeTools;
 requireCondition(source.includes('/fa/services/'+id+'/'),
   'no useful free-content route to paid service explanation '+id);
}
requireCondition(!freeTools.includes('localStorage')&&!freeTools.includes('sendBeacon('),
 'free worksheets must not persist or transmit reflection answers');


// International educational information stays readable without sales
// dependence; readers can proceed to a specific, bounded professional offer.
const englishContext=new Map([
 ['en/research/index.html',['manuscript_diagnostic','academic_editing','research_consult_60']],
 ['en/teaching/index.html',['teacher_consult_60','teacher_dev_90','specialist_workshop_120']],
 ['en/student-guidance/index.html',['academic_consult_60','student_parent_90','talent_initial']]
]);
for(const [file,ids] of englishContext){
 const html=read(file);
 requireCondition(html.includes('jr-service-decision-guides-20261028.css'),
   file+': contextual guidance stylesheet missing');
 requireCondition((html.match(/data-conversion-event="organic_article_service_intent"/g)||[]).length>=ids.length,
   file+': contextual route events must remain informational, never received leads');
 for(const id of ids){
   requireCondition(html.includes('href="/en/services/'+id+'/"'),
     file+': missing relevant service scope '+id);
 }
}
const academicHub=read('en/academic-services/index.html');
for(const id of ['academic_editing','manuscript_diagnostic','research_consult_60',
                 'journal_strategy','reviewer_response','academic_cv','academic_interview_90']){
 requireCondition(academicHub.includes('href="/en/services/'+id+'"'),
   'international academic services hub lacks direct scope link '+id);
}
requireCondition(academicHub.includes('Published standard tariffs'),
  'international academic hub must not contradict published canonical pricing');

const faIntake=read('fa/darkhast-moshavere/index.html');
const enIntake=read('en/request-consultation/index.html');
for(const [file,html] of [['fa/darkhast-moshavere/',faIntake],['en/request-consultation/',enIntake]]){
  requireCondition(/name=["\x27]robots["\x27][^>]*noindex/i.test(html),file+' must remain noindex');
  requireCondition(html.includes('data-stage14-consent-lead'),file+' missing existing verified-account intake');
  requireCondition(html.includes('data-consultation-composer'),file+' missing honest email route');
  requireCondition(html.includes('jr-service-decision-guides-20261028.css'),file+' missing intake guidance styling');
}
const composer=read('assets/js/consultation-composer.js');
requireCondition(composer.includes('applyRequestedVip'),'bilingual composer missing verified VIP deep-link handler');
requireCondition(composer.includes("fetch('/assets/data/vip-catalog.json'"),
  'VIP metadata must originate in the canonical public catalogue');
requireCondition(composer.includes('revision!==startedAt'),'service selection must reject stale asynchronous responses');
requireCondition(!composer.includes('localStorage'),'email composer must not retain sensitive enquiry fields');
const bridgeSource=read('assets/js/jr-service-intent-bridge.js');
requireCondition(bridgeSource.includes('JR_CONVERSION_INTENT')&&bridgeSource.includes('analytics-adapter.js'),
  'standalone pages must reuse the approved event bus and consent-gated analytics adapter');
requireCondition(!bridgeSource.includes('localStorage')&&!bridgeSource.includes('sendBeacon('),
  'standalone event bridge must never retain personal data or transmit directly');
const adapter=read('assets/js/analytics-adapter.js');
requireCondition(adapter.includes('0-9_-'),
  'private-safe public route allowlist must accommodate canonical underscore service IDs');
const css=read('assets/css/jr-service-decision-guides-20261028.css');
requireCondition(css.includes('@media(max-width:700px)'),'mobile-friendly guide layout missing');
requireCondition(css.includes('focus-visible'),'visible keyboard focus required');

console.log('Audited '+checked+' bilingual standard/VIP pages, two intake routes and the public catalogue bridge.');
if(errors.length){
  for(const message of errors)console.error('✗ '+message);
  console.error('Service buyer-journey audit failures: '+errors.length);
  process.exit(1);
}
console.log('PASS: buyer decision guides, canonical routing and consent boundaries.');
