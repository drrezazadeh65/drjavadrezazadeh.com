// Commercial presentation only: original catalogue content, prices, email targets and IDs remain authoritative.
import fs from 'node:fs';
import path from 'node:path';
const slugs=["architecture","language","memory","adaptive-context","knowledge","agents","coding","education","assessment","talent","research","academic-writing","data","vision","audio","documents","web","search","search-visibility","marketing","news","automation","desktop","distributed","local-ai","security","recovery","plugins","api","enterprise"];
const copy={
 fa:{heading:'راهکارها و خدمات اختصاصی JREI',intro:'راهکارهای تخصصی هوش مصنوعی، آموزش، پژوهش و توسعه سازمانی؛ هر خدمت با دامنه و شرایط تحویل مشخص.',detail:'مشاهده صفحه اختصاصی',request:'ارسال درخواست',review:'مشاهده شرایط بررسی',terms:'بررسی شواهد و ارائه گزارش در دامنه توافق‌شده؛ پس از تأیید ظرفیت و شرایط.',pack:'شرایط و دامنه اشتراک پس از بررسی نیاز تعیین می‌شود.',contract:'دامنه پروژه، هزینه و شرایط تحویل در پیش‌فاکتور مشخص می‌شود.',more:'جزئیات تعرفه',platform:'مشاهده پلتفرم'},
 en:{heading:'JREI specialist solutions and services',intro:'AI, education, research and enterprise solutions with a defined scope and delivery conditions.',detail:'Explore service',request:'Send enquiry',review:'Review conditions',terms:'Evidence review and reporting within an agreed scope, subject to capacity and terms.',pack:'Subscription scope and conditions are agreed after needs assessment.',contract:'Project scope, costs and delivery terms are specified in the quotation.',more:'Pricing details',platform:'Explore platform'},
 ar:{heading:'حلول وخدمات JREI المتخصصة',intro:'حلول الذكاء الاصطناعي والتعليم والبحث والتطوير المؤسسي بنطاق وشروط تسليم محددة.',detail:'عرض صفحة الخدمة',request:'إرسال طلب',review:'عرض شروط المراجعة',terms:'مراجعة الأدلة وإعداد تقرير ضمن نطاق متفق عليه، بعد تأكيد السعة والشروط.',pack:'يحدد نطاق الاشتراك وشروطه بعد دراسة الاحتياج.',contract:'يحدد نطاق المشروع والتكلفة وشروط التسليم في عرض السعر.',more:'تفاصيل الأسعار',platform:'عرض المنصة'}
};
const svg=(slug)=>'/assets/images/jrei-premium/service-'+String(slugs.indexOf(slug)+1).padStart(2,'0')+'.svg';
// Native photographic-style illustrations, generated for the approved commercial visual identity.
const premiumArt=Object.freeze({"automation":{"file":"service-22.webp","w":440,"h":440,"icon":"▦"},"desktop":{"file":"service-23.webp","w":439,"h":440,"icon":"⌘"},"distributed":{"file":"service-24.webp","w":439,"h":440,"icon":"▤"},"local-ai":{"file":"service-25.webp","w":440,"h":440,"icon":"◈"},"security":{"file":"service-26.webp","w":440,"h":439,"icon":"⬡"},"recovery":{"file":"service-27.webp","w":439,"h":439,"icon":"↻"},"plugins":{"file":"service-28.webp","w":439,"h":439,"icon":"✜"},"api":{"file":"service-29.webp","w":440,"h":439,"icon":"⌬"},"architecture":{"file":"service-01.webp","w":444,"h":444,"icon":"◈"},"language":{"file":"service-02.webp","w":443,"h":444,"icon":"◉"},"memory":{"file":"service-03.webp","w":443,"h":444,"icon":"▤"},"adaptive-context":{"file":"service-04.webp","w":444,"h":444,"icon":"◎"},"knowledge":{"file":"service-05.webp","w":444,"h":443,"icon":"◇"},"agents":{"file":"service-06.webp","w":443,"h":443,"icon":"✣"},"coding":{"file":"service-07.webp","w":443,"h":443,"icon":"⌘"},"education":{"file":"service-08.webp","w":444,"h":443,"icon":"▱"},"assessment":{"file":"service-09.webp","w":442,"h":442,"icon":"✓"},"talent":{"file":"service-10.webp","w":441,"h":442,"icon":"◆"},"research":{"file":"service-11.webp","w":441,"h":442,"icon":"⌕"},"academic-writing":{"file":"service-12.webp","w":442,"h":442,"icon":"✎"},"data":{"file":"service-13.webp","w":442,"h":441,"icon":"▥"},"vision":{"file":"service-14.webp","w":441,"h":442,"icon":"◉"},"audio":{"file":"service-15.webp","w":442,"h":442,"icon":"♪"},"documents":{"file":"service-16.webp","w":442,"h":441,"icon":"▧"},"web":{"file":"service-17.webp","w":442,"h":442,"icon":"◎"},"search":{"file":"service-18.webp","w":441,"h":441,"icon":"⌕"},"search-visibility":{"file":"service-19.webp","w":441,"h":441,"icon":"↗"},"marketing":{"file":"service-20.webp","w":441,"h":441,"icon":"◈"},"news":{"file":"service-21.webp","w":442,"h":441,"icon":"◉"},"enterprise":{"file":"service-30.webp","w":441,"h":441,"icon":"▦"}});
const art=(slug)=>{const a=premiumArt[slug];return '<div class="jp-art" data-jp-art="'+(a?'3d':'vector')+'"><img src="'+(a?'/assets/images/jrei-premium/'+a.file:svg(slug))+'" width="'+(a?a.w:320)+'" height="'+(a?a.h:200)+'" loading="lazy" decoding="async" alt=""><span class="jp-emblem" aria-hidden="true">'+(a?a.icon:'✦')+'</span></div>';};
const detail=(href,label)=>'<a class="button jp-secondary" href="'+href+'">'+label+' <span aria-hidden="true">↗</span></a>';
const primary=(tag)=>tag.replace('class="button"','class="button primary jp-primary"');
const sectionTitle=(l)=>'<div class="jp-heading"><p class="jp-kicker">JREI / SOLUTIONS</p><h2>'+copy[l].heading+'</h2><p>'+copy[l].intro+'</p></div>';
const productSlugs={'RCAS':'assessment','Golden Talent':'talent','BAHAR':'education','News Intelligence':'news','JREI Academic':'research','JREI Forge':'coding','JREI SEO Intelligence':'search-visibility'};
const productPaths={'RCAS':'rcas/','Golden Talent':'golden-talent/','BAHAR':'bahar/','News Intelligence':'jrei/catalog/news/'};
const packageArt=['architecture','automation','enterprise','local-ai'];
const contractArt=['research','api','enterprise','local-ai'];
const reviewArt=['search','search-visibility','data','assessment','security','academic-writing','agents','documents','vision','desktop','recovery','enterprise','research'];
export function catalogMap(l,html){
 const out=new Map();
 for(const m of html.matchAll(/<article class="tile"(?: [^>]*)?><h3><a href="\/(?:fa|en|ar)\/jrei\/catalog\/([a-z-]+)\/">([^<]+)<\/a><\/h3><p>([\s\S]*?)<\/p>(<p class="price">[\s\S]*?<\/p>)/g))
  out.set(m[1],{title:m[2],desc:m[3],price:m[4]});
 if(out.size!==30||slugs.some(s=>!out.has(s)))throw Error('Premium catalogue source mismatch '+l);
 return out;
}
export function projectPremium(l,relative,html,map){
 if(html.includes('data-jp-premium="v1"'))return html;
 const t=copy[l],base='/'+l+'/jrei/',isOrder=relative===l+'/jrei/order/index.html',isPricing=relative===l+'/jrei/pricing/index.html',isHome=relative===l+'/jrei/index.html',detailSlug=relative.match(/\/catalog\/([a-z-]+)\/index\.html$/)?.[1];
 if(!isOrder&&!isPricing&&!isHome&&!detailSlug)return html;
 html=html.replace('data-jrei-public-centre="v1"','data-jrei-public-centre="v1" data-jp-premium="v1"').replace('</head>','<link rel="stylesheet" href="/assets/css/jrei-premium-cards-v1.css?v=3"></head>');
 // All original article text and hrefs stay present; only presentation changes.
 let contract=0,packageCount=0;
 html=html.replace(/<article class="tile"([^>]*)>([\s\S]*?)<\/article>/g,(all,attrs,inside)=>{
  const slug=inside.match(/<h3><a href="\/(?:fa|en|ar)\/jrei\/catalog\/([a-z-]+)\/">/)?.[1];
  const name=inside.match(/<h3>([^<]+)<\/h3>/)?.[1]||inside.match(/<h3><a[^>]*>([^<]+)<\/a><\/h3>/)?.[1];
  const pkg=inside.match(/\/order\/#package-([0-3])"/)?.[1];
  const isContract=inside.includes('/order/#contracts"');
  let icon=slug||productSlugs[name],target=slug?base+'catalog/'+slug+'/':productPaths[name]?'/'+l+'/'+productPaths[name]:inside.match(/<h3><a href="([^"]+)"/)?.[1],id='';
  if(pkg!==undefined){icon=packageArt[Number(pkg)];id='jp-package-'+pkg;target=base+'pricing/#'+id;packageCount++;}
  if(isContract){icon=contractArt[contract];id='jp-contract-'+contract;target=base+'pricing/#'+id;contract++;}
  if(!icon)return all;
  const button=inside.match(/<a class="button" href="[^"]+">[\s\S]*?<\/a>/)?.[0];
  if(button){inside=inside.replace(button,'<div class="jp-actions">'+(target&&!(isPricing&&(pkg!==undefined||isContract))?detail(target,slug?t.detail:t.platform):'')+primary(button)+'</div>');}
  return '<article class="tile jp-card"'+attrs+(id?' id="'+id+'"':'')+' data-jp-service="'+icon+'">'+art(icon)+'<div class="jp-copy">'+inside+'</div></article>';
 });
 if(isPricing&&(packageCount!==4||contract!==4))throw Error('Pricing package inventory '+l);
 let n=0,reviews=0;
 html=html.replace(/<ul class="orderlist">([\s\S]*?)<\/ul>/g,(all,items)=>{
  let count=0;
  let content=items.replace(/<li id="([^"]+)"><span><strong>([\s\S]*?)<\/strong> · ([\s\S]*?)<\/span>(<a class="button" href="[^"]+">[\s\S]*?<\/a>)<\/li>/g,(row,id,title,price,button)=>{
   let info=map.get(id),icon=id,target,desc,label=t.detail;
   if(info){n++;target=base+'catalog/'+id+'/';desc=info.desc;}
   else if(/^package-[0-3]$/.test(id)){icon=packageArt[Number(id.slice(-1))];target=base+'pricing/#jp-'+id;desc=t.pack;label=t.more;}
   else if(id==='contracts'){icon='enterprise';target=base+'pricing/#jp-contract-0';desc=t.contract;label=t.more;}
   else if(/^review-eng-(\d{2})\.act-\d{3}$/.test(id)){const group=Number(id.slice(11,13));icon=reviewArt[group-1];target=base+(isPricing?'order/':'pricing/')+'#'+id;desc=t.terms;label=t.review;reviews++;}
   else throw Error('Unmapped order id '+id);
   if(!icon||!target)throw Error('Missing card artwork '+id);
   count++;
   return '<li id="'+id+'" class="jp-card" data-jp-service="'+icon+'">'+art(icon)+'<div class="jp-copy"><'+(info||!id.startsWith('review-')?'h3':'h4')+' class="jp-title">'+title+'</'+(info||!id.startsWith('review-')?'h3':'h4')+'><p class="jp-description">'+desc+'</p><p class="price jp-price"><span class="jp-tag" aria-hidden="true">◇</span> '+price+'</p><div class="jp-actions">'+detail(target,label)+primary(button)+'</div></div></li>';
  });
  // A bespoke contract has no fixed price. Preserve its enquiry without inventing a price.
  content=content.replace(/<li id="contracts"><strong>([\s\S]*?)<\/strong>(<a class="button" href="[^"]+">[\s\S]*?<\/a>)<\/li>/g,(_,title,button)=>{
   count++;return '<li id="contracts" class="jp-card" data-jp-service="enterprise">'+art('enterprise')+'<div class="jp-copy"><h3 class="jp-title">'+title+'</h3><p class="jp-description">'+t.contract+'</p><div class="jp-actions">'+detail(base+'pricing/#jp-contract-0',t.more)+primary(button)+'</div></div></li>';
  });
  if(count!==(items.match(/<li id="/g)||[]).length)throw Error('Unparsed order cards '+relative);
  // Put the eight services in the approved concept first, with keyboard order matching visual order.
  if(isOrder&&count===35){
   const featured=['automation','desktop','distributed','local-ai','security','recovery','plugins','api'];
   const cards=[...content.matchAll(/<li id="([^"]+)"[\s\S]*?<\/li>/g)];
   if(cards.length!==35)throw Error('Featured gallery inventory');
   const originalOrder=new Map(cards.map((row,i)=>[row[1],i]));
   const rank=id=>featured.includes(id)?featured.indexOf(id):featured.length+originalOrder.get(id);
   content=cards.sort((x,y)=>rank(x[1])-rank(y[1])).map(row=>row[0]).join('');
   return '<ul class="orderlist jp-grid jp-featured-grid">'+content+'</ul>';
  }
  return '<ul class="orderlist jp-grid">'+content+'</ul>';
 });
 if(isOrder&&(n!==30||reviews!==52))throw Error('Order service count '+l+': '+n+'/'+reviews);
 if(isPricing&&reviews!==52)throw Error('Pricing review count '+l);
 if(isOrder||isPricing){
  const marker=isOrder?'<ul class="orderlist jp-grid jp-featured-grid">':'<article class="tile jp-card" data-jp-service="architecture">';
  const index=html.indexOf(marker);
  if(index<0)throw Error('Premium service heading target '+relative);
  if(isOrder)html=html.slice(0,index)+sectionTitle(l)+html.slice(index);
 }
 if(detailSlug&&map.has(detailSlug)){
  // Use matching art on the existing canonical detail page as well.
  html=html.replace('<div class="jx-copy">','<div class="jx-copy jp-detail-copy">').replace(/(<figure class="jx-scene"[\s\S]*?<\/figure>)/,m=>'<div class="jp-detail-visual">'+art(detailSlug)+m+'</div>');
 }
 return html;
}
export function applyPremiumCards(out,files,failures){
 const report={pages:0,services:0,reviewCards:0};
 for(const l of ['fa','en','ar']){
  try{
   const map=catalogMap(l,fs.readFileSync(path.join(out,l,'jrei','index.html'),'utf8'));
   for(const file of files){
    const rel=path.relative(out,file).split(path.sep).join('/');
    if(!new RegExp('^'+l+'/jrei/(?:index\\.html|(?:pricing|order|catalog/[a-z-]+)/index\\.html)$').test(rel))continue;
    const source=fs.readFileSync(file,'utf8'),next=projectPremium(l,rel,source,map);
    if(next!==source){fs.writeFileSync(file,next,'utf8');report.pages++;if(rel===l+'/jrei/order/index.html'){report.services+=30;report.reviewCards+=52;}}
   }
  }catch(e){failures.push(String(e));}
 }
 if(report.pages!==99||report.services!==90||report.reviewCards!==156)failures.push('Premium card coverage '+JSON.stringify(report));
 return report;
}
