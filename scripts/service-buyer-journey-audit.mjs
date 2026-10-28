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
    // Adjacent closing section and opening footer have equal offsets at this boundary.
    requireCondition(footer>=guideEnd,prefix+'Persian article footer must follow guide');
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
 requireCondition(academicHub.includes('href="/en/services/'+id+'/"'),
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
requireCondition(composer.includes("option.dataset.serviceId='vip:'+vipId")&&composer.includes('option.dataset.serviceId=service.id'),
  'public catalogue IDs must survive selected-option reuse');
requireCondition(composer.includes('Public service ID: ')&&composer.includes('publicServiceId'),
  'reviewed email draft must preserve a bounded public service identifier');
requireCondition(composer.includes('loadManualCatalogueOptions()')&&
  composer.includes('publicServiceFacts.set(')&&composer.includes('optgroup'),
  'manual email enquiries must offer canonical standard and VIP choices without a new catalogue');
requireCondition(composer.includes('reconcileManualService()')&&
  composer.includes('renderRequestedService(facts.service,facts.english)'),
  'manually selected services must display the authoritative scope summary');
requireCondition(composer.includes('fullMailto.length>1800')&&
  composer.includes('requiresPaste?subjectUrl:fullMailto'),
  'mobile email preparation must preserve long draft text rather than truncate it');
requireCondition(composer.includes('function setScopeHint(serviceId)')&&
  composer.includes('scopeHint.setAttribute(\'aria-live\',\'polite\')'),
  'service-qualified intake needs contextual accessible instructions without extra fields');
requireCondition(composer.includes('setScopeHint(key)')&&
  composer.includes('setScopeHint(service.id)'),
  'manual and deep-linked service selection must show the matching non-sensitive question hint');

for(const [file,html] of [
 ['fa/darkhast-moshavere/',faIntake],['en/request-consultation/',enIntake]
]){
 requireCondition(html.includes('consultation-composer.js?v=20261028-canonical-intake-v3'),
   file+' must load the current canonical offer selector rather than a cached script');
}
const navigator=read('assets/js/jr-service-navigator-v1.js');
for(const path of ['fa/khadamat/index.html','en/services/index.html']){
 const html=read(path);
 requireCondition(html.includes('jr-service-navigator-v1.js?v=20261028-journey-v2'),
   path+': current source navigator script not referenced');
 requireCondition(html.includes('jr-service-navigator-v1.css?v=20261028-journey-v2'),
   path+': current mobile navigator styles not referenced');
}
requireCondition(navigator.includes('encodeURIComponent(item.id)')&&
  navigator.includes('dataset.conversionEvent'),
  'navigator optional enquiry must reuse canonical public ID and existing intent bus');
requireCondition(!navigator.includes('localStorage')&&!navigator.includes('sendBeacon('),
  'service navigator must not transmit or persist visitor activity');

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

// Educational product descriptions must explain the actual study workflow,
// not merely offer a checkout button. Payment readiness remains server-owned.
for(const locale of ['fa','en']){
 const product=''+locale+'/shop/authors/mehrab-mirkarimi/index.html';
 const html=read(product);
 requireCondition(html.includes('id="study-guide"'),
   product+': practical guide for using both digital PDFs missing');
 requireCondition(html.includes('href="#study-guide"'),
   product+': buyer cannot discover the study guide from the first screen');
 requireCondition(html.includes('id="jp-purchase-readiness"')&&
   html.includes('id="jp-checkout-state"'),
   product+': secure server-verified availability gate must remain');
 requireCondition(html.includes('jr-publishing-checkout-v1.js'),
   product+': existing protected digital fulfilment flow must remain');
 requireCondition(!/\bguaranteed (?:admission|rank|exam score)\b/i.test(html),
   product+': product cannot imply guaranteed academic success');
 const sitemap=read('sitemap-'+locale+'.xml');
 const key='<loc>https://drjavadrezazadeh.com/'+locale+
   '/shop/authors/mehrab-mirkarimi/</loc><lastmod>2026-10-28</lastmod>';
 requireCondition(sitemap.includes(key),
   product+': the revised product guide must carry an honest sitemap lastmod');
}

// Informed purchasing requires relevant worked reasoning, not only generic
// promotional copy. These examples are explicitly hypothetical and do not
// change the authoritative published catalogue, pricing or service readiness.
const evidenceRichStandardIds=[
 'konkur_month','field_selection_standard','reviewer_response',
 'teacher_dev_90','organization_consult_90','golden_talent_comprehensive'
];
for(const locale of ['fa','en']){
 for(const id of evidenceRichStandardIds){
  const file=locale+'/services/'+id+'/index.html';
  const html=read(file);
  requireCondition((html.match(/data-jr-worked-example="v2"/g)||[]).length===1,
    file+': substantive illustrative service reasoning is missing or duplicated');
  requireCondition(html.includes('jr-case-boundary'),
    file+': hypothetical output lacks a clear professional/contractual limitation');
 }
 for(const offer of vip){
  const file=locale+'/vip/'+offer.id+'/index.html';
  const html=read(file);
  requireCondition((html.match(/data-jr-worked-example-vip="v2"/g)||[]).length===1,
    file+': VIP output illustration must be unique and context-specific');
  requireCondition(html.includes('jr-case-boundary'),
    file+': VIP illustrative deliverable must disclose its contractual limits');
 }
 const vipHub=locale+'/vip/index.html';
 const html=read(vipHub);
 requireCondition((html.match(/id="jr-vip-compare-v1"/g)||[]).length===1,
   vipHub+': 6-offer standard-vs-VIP comparison missing');
 requireCondition(html.includes('/assets/css/jr-service-decision-guides-20261028.css'),
   vipHub+': VIP comparisons require the accessible mobile guide style');
 for(const offer of vip){
  requireCondition(html.includes('href="/'+locale+'/vip/'+offer.id+'/'),
    vipHub+': incomplete canonical VIP comparison '+offer.id);
 }
 const purchaseGuide=locale+'/shop/purchase-guide/index.html';
 const guide=read(purchaseGuide);
 requireCondition((guide.match(/id="service-commissioning-journey"/g)||[]).length===1,
   purchaseGuide+': customer cannot distinguish enquiry, booking and payment');
 requireCondition(guide.includes('href="/'+locale+'/services/"')&&
  guide.includes('href="/'+locale+'/vip/"'),
  purchaseGuide+': professional help guide must include ordinary and VIP services');
 requireCondition(guide.includes(
  locale==='fa'?'/fa/darkhast-moshavere/':'/en/request-consultation/'),
  purchaseGuide+': initial consented/email enquiry should be discoverable');
 const sitemap=read(locale==='fa'?'sitemap-fa.xml':'sitemap-en.xml');
 requireCondition(sitemap.includes(
  '<loc>https://drjavadrezazadeh.com/'+locale+
  '/shop/purchase-guide/</loc><lastmod>2026-10-28</lastmod>'),
  purchaseGuide+': informative purchase guide lastmod is stale');
 const vipMap=read(locale==='fa'?'sitemap-services.xml':'sitemap-en.xml');
 requireCondition(vipMap.includes(
  '<loc>https://drjavadrezazadeh.com/'+locale+
  '/vip/</loc><lastmod>2026-10-28</lastmod>'),
  vipHub+': new comparison not reflected in existing canonical sitemap');
}

// Visible question-to-guide links must connect the main educational need
// router to indexable, original articles and proportionate paid alternatives.
const pathway=read('fa/masir-man/index.html');
const matches=[...pathway.matchAll(/href="\/fa\/rahnamaha\/([^"\/]+)\/"/g)]
 .map(x=>x[1]);
for(const slug of ["chegoone-estedaad-vaghei-farzand-ra-beshenasim","barname-yek-mahe-konkur","tahlil-karname-tahsili","che-reshteyi-baraye-man-monaseb-ast","gozaresh-estedaad-va-masir-roshd","moghayese-reshteha-ba-matris-tasmim"]){
 requireCondition(matches.includes(slug),
  'fa/masir-man: missing direct public reading route '+slug);
 const article=read('fa/rahnamaha/'+slug+'/index.html');
 requireCondition(article.includes('<title>')&&
   article.includes('application/ld+json')&&
   article.includes('property="og:image"'),
  'fa/masir-man: incomplete public article metadata '+slug);
}
requireCondition((pathway.match(/class="jr-q-card"/g)||[]).length===6,
 'fa/masir-man: six illustrated question-to-reading cards must remain static, visible HTML');
requireCondition(pathway.includes('id="free-guides"')&&
 pathway.includes('href="/fa/rahnamaha/"'),
 'fa/masir-man: public learning guide hub must remain discoverable');
requireCondition(pathway.includes('max-image-preview:large'),
 'fa/masir-man: permit rich image previews for indexable learning router');
requireCondition(read('sitemap-fa.xml').includes(
 '<loc>https://drjavadrezazadeh.com/fa/masir-man/</loc><lastmod>2026-10-28</lastmod>'),
 'fa/masir-man: sitemap lastmod needs to match new guidance');
const journeyMarkup=pathway.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
try{
 const entities=JSON.parse(journeyMarkup?.[1]||'{}')?.['@graph']||[];
 const collection=entities.find(x=>x['@type']==='CollectionPage');
 requireCondition(collection?.hasPart?.length===6,
   'fa/masir-man: CollectionPage schema must describe six visible articles');
}catch{requireCondition(false,'fa/masir-man: invalid educational pathway JSON-LD');}


// The six real learner questions must be answered in indexable, image-backed
// content, not only by routing visitors into a paid checkout or an AI tool.
const sixFamilyQuestions=[
 ['chegoone-estedaad-vaghei-farzand-ra-beshenasim','talent_initial'],
 ['barname-yek-mahe-konkur','konkur_month'],
 ['tahlil-karname-tahsili','transcript_analysis'],
 ['che-reshteyi-baraye-man-monaseb-ast','field_selection_standard'],
 ['gozaresh-estedaad-va-masir-roshd','golden_talent_comprehensive'],
 ['moghayese-reshteha-ba-matris-tasmim','field_selection_comprehensive']
];
const enPath=read('en/my-path/index.html');
const guideHub=read('fa/rahnamaha/index.html');
const faHome=read('fa/index.html');
const faServices=read('fa/khadamat/index.html');
const enServices=read('en/services/index.html');
const questionCss='assets/css/jr-question-journeys-v1.css';
requireCondition(fs.existsSync(path.join(root,questionCss)),
 'the shared RTL/LTR mobile question pathway CSS is missing');
for(const [file,html] of [
 ['fa/masir-man/index.html',pathway],
 ['en/my-path/index.html',enPath],
 ['fa/rahnamaha/index.html',guideHub]
]){
 requireCondition((html.match(/class="jr-q-card"/g)||[]).length===6,
  file+': exactly six explanatory, image-supported question cards required');
 requireCondition(html.includes('/assets/css/jr-question-journeys-v1.css?v=20261028-q1'),
  file+': the approved accessible mobile question layout must be loaded');
 requireCondition(html.includes('max-image-preview:large')&&
   html.includes('application/ld+json'),
  file+': indexable content requires meaningful metadata and valid structured data');
 const json=html.split('<script type="application/ld+json">')[1]?.split('</script>')[0];
 try{
  const entities=JSON.parse(json||'{}')['@graph']||[];
  const list=entities.find(entity=>entity['@type']==='ItemList'&&
   /#(?:free-guides|family-questions)$/.test(entity['@id']||''));
  requireCondition(list?.itemListElement?.length===6,
   file+': six authored linkable questions missing from the ItemList');
 }catch{
  requireCondition(false,file+': invalid or incomplete JSON-LD question entity graph');
 }
}
requireCondition(faHome.includes('id="jr-home-family-questions-v1"'),
 'Persian home must link organically to the public answers, without a purchase gate');
requireCondition(faServices.includes('/fa/masir-man/#free-guides'),
 'Persian service hub must allow free educational reading before pricing');
requireCondition(enServices.includes('/en/my-path/#free-guides'),
 'English services must disclose non-commercial educational entry points');
const faMap=read('sitemap-fa.xml');
const enMap=read('sitemap-en.xml');
for(const [slug,service] of sixFamilyQuestions){
 const article='fa/rahnamaha/'+slug+'/index.html';
 const html=read(article);
 const canonical=BASE+'/fa/rahnamaha/'+slug+'/';
 requireCondition(html.includes('rel="canonical" href="'+canonical+'"'),
  article+': original published canonical URL must remain unchanged');
 requireCondition(html.includes('name="robots" content="index,follow,max-image-preview:large"'),
  article+': public article must remain discoverable');
 requireCondition(html.includes('id="jr-family-decision-v1"')&&
  html.includes('href="/fa/services/'+service+'/'),
  article+': useful next step and relevant scoped service are absent');
 requireCondition(html.includes('href="/fa/masir-man/#free-guides"'),
  article+': answer must connect back to visible family question router');
 const feature='/assets/images/knowledge/'+slug+'-featured.webp';
 const og='/assets/images/knowledge/'+slug+'-og.webp';
 requireCondition(fs.existsSync(path.join(root,feature.slice(1)))&&
  fs.existsSync(path.join(root,og.slice(1))),
  article+': real local featured and social share images are required');
 requireCondition(html.includes('src="../../../assets/images/knowledge/'+slug+'-featured.webp"'),
  article+': main visual must be a real image, not empty decorative alt');
 requireCondition(pathway.includes('src="'+feature+'"')&&
  guideHub.includes('src="'+feature+'"'),
  article+': native question cards must expose a lazy-loading conceptual image');
 requireCondition(html.includes('property="og:image"')&&
  html.includes('name="twitter:image"'),
  article+': social and chat preview images must be declared');
 const rawJson=html.split('<script type="application/ld+json">')[1]?.split('</script>')[0];
 try{
  const nodes=JSON.parse(rawJson||'{}')['@graph']||[];
  const story=nodes.find(x=>x['@type']==='Article');
  requireCondition(story?.dateModified==='2026-10-28'&&
   (story.mentions||[]).some(x=>x['@id']===BASE+'/fa/services/'+service+'/#service'),
   article+': Article schema must reflect current content and canonical service entity');
 }catch{
  requireCondition(false,article+': invalid Article structured data');
 }
 requireCondition(faMap.includes('<loc>'+canonical+'</loc><lastmod>2026-10-28</lastmod>'),
  article+': the unchanged public slug needs authentic latest modification date');
}
for(const locale of ['fa','en']){
 const publicPath=locale+'/bahar/index.html';
 const html=read(publicPath);
 requireCondition(html.includes('id="study-methods-evidence"')&&
  html.includes('data-jr-free-study-answer="v1"'),
  publicPath+': free study-method explanation is required for the broad study question');
 requireCondition(html.includes('https://doi.org/10.1177/1529100612453266')&&
  html.includes('https://doi.org/10.1111/j.1467-9280.2006.01693.x'),
  publicPath+': substantive study advice must link genuine research sources');
 requireCondition(html.includes('id="section-1"')&&html.includes('id="section-2"')&&
  html.includes('id="weekly-plan"'),
  publicPath+': pre-existing free BAHAR exercises must remain intact');
 requireCondition(html.includes('max-image-preview:large')&&
  html.includes('barname-yek-mahe-konkur-og.webp'),
  publicPath+': free educational answer requires an appropriate real preview');
 const sitemap=locale==='fa'?faMap:enMap;
 requireCondition(sitemap.includes('<loc>'+BASE+'/'+locale+'/bahar/</loc><lastmod>2026-10-28</lastmod>'),
  publicPath+': genuine study-guide changes must be reflected in the existing sitemap');
}
requireCondition(guideHub.includes('numberOfItems":45')&&
 guideHub.includes('id="family-questions"'),
 'the original 45-guide index and its six featured questions must coexist without duplicates');
requireCondition(faMap.includes('<loc>'+BASE+'/fa/rahnamaha/</loc><lastmod>2026-10-28</lastmod>')&&
 enMap.includes('<loc>'+BASE+'/en/my-path/</loc><lastmod>2026-10-28</lastmod>'),
 'both language pathway hubs need real published revision dates');

console.log('Audited '+checked+' bilingual standard/VIP pages, two intake routes and the public catalogue bridge.');
if(errors.length){
  for(const message of errors)console.error('✗ '+message);
  console.error('Service buyer-journey audit failures: '+errors.length);
  process.exit(1);
}
console.log('PASS: buyer decision guides, canonical routing and consent boundaries.');
