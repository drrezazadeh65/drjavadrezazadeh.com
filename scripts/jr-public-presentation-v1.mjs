// Public presentation metadata: project only canonical, sitemap-listed public pages.
import fs from 'node:fs';
import path from 'node:path';
const origin='https://drjavadrezazadeh.com';
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const decode=v=>String(v).replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&lt;','<').replaceAll('&#39;',"'");
const attrs=t=>Object.fromEntries([...t.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1].toLowerCase(),m[2]??m[3]]));
// Exact reviewed descriptions from the 2026-11-26 release audit. Preserve
// canonical content, schema, qualification and original authoring sources.
const reviewedDescriptions={
  "/ar/jrei/": "JREI منظومة ذكاء اصطناعي إيرانية التطوير بمبادرة الدكتور جواد رضازاده يزدلي؛ معمارية معيارية وحلول متخصصة وأسعار تجارية مقترحة.",
  "/en/exams/konkur/": "Evidence-led preparation for national undergraduate entrance examinations. Verify subjects, weightings and conditions against authoritative sources for the specified year.",
  "/en/jrei/": "JREI is an Iranian-developed AI ecosystem initiated by Dr. Javad Rezazadeh Yazdeli, with modular specialist solutions, a commercial catalogue and proposed pricing.",
  "/en/shop/authors/mehrab-mirkarimi/": "Meet Seyyed Mehrab Mirkarimi, who reports first place in the 2026 ELT MA entrance exam, and explore his 997-page, 36-year question and explanatory answer collection.",
  "/fa/jrei/": "JREI اکوسیستم هوش مصنوعی توسعه‌یافته در ایران به ابتکار دکتر جواد رضازاده یزدلی؛ معماری ماژولار، راهکارهای تخصصی و کاتالوگ تعرفه‌های تجاری پیشنهادی.",
  "/fa/shop/authors/mehrab-mirkarimi/": "معرفی سید محراب میرکریمی، رتبه نخست کنکور ارشد آموزش زبان انگلیسی ۱۴۰۵ طبق رزومه مؤلف؛ مجموعه ۹۹۷ صفحه‌ای سؤالات و پاسخ تشریحی ۳۶ سال آزمون و حمایت از استعدادهای کم‌بضاعت.",
  "/journal/fa/aims-scope/": "دامنه علمی JHELA: پژوهش نظری، تجربی و روش‌شناختی در آموزش، با تأکید بر کیفیت شواهد، مسئله روشن و سهم قابل دفاع در دانش آموزشی.",
  "/journal/fa/author-guidelines/": "راهنمای نویسندگان JHELA؛ مقالات علمی و مکاتبات تحریریه به انگلیسی خواهد بود. پذیرش رسمی مقاله و دستورالعمل قطعی هنوز اعلام نشده است.",
  "/journal/fa/call-for-reviewers/": "دعوت از اعضای هیئت علمی و پژوهشگران برای اعلام علاقه‌مندی به داوری در آموزش، سنجش، تربیت معلم و آموزش زبان؛ فراخوان مربوط به مرحله تأسیس JHELA است.",
  "/journal/fa/contact/": "ارتباط با JHELA برای پیشنهاد علمی و همکاری در مرحله تأسیس؛ تا آغاز رسمی پذیرش، مقاله یا مدارک حساس برای انتشار ارسال نکنید.",
  "/journal/fa/dashboard/": "درگاه عمومی جامعه علمی JHELA برای آشنایی با فرصت‌های همکاری؛ پرونده خصوصی نویسنده جداگانه است و داوری رسمی هنوز تأیید عملیاتی نشده است.",
  "/journal/fa/editorial-board/": "JHELA در مرحله شکل‌دهی هیئت تحریریه بین‌المللی با تأکید بر کیفیت علمی و انصاف تصمیم‌هاست؛ نام اعضای تأییدنشده منتشر نمی‌شود.",
  "/journal/fa/ethics/": "چارچوب اخلاق پژوهش JHELA: صداقت علمی، استقلال تصمیم‌ها، احترام به مشارکت‌کنندگان و اصلاحات قابل پیگیری؛ بدون ادعای اعتبارسنجی رسمی.",
  "/journal/fa/founding-collaborators/": "دعوت JHELA از پژوهشگران ایرانی و بین‌المللی برای همکاری در تدوین رویه‌های علمی و توسعه شبکه داوری و تحریریه در مرحله تأسیس.",
  "/journal/fa/peer-review/": "سیاست پیشنهادی داوری دوسوناشناس JHELA برای مقالات پژوهشی؛ اجرای رسمی پس از راه‌اندازی سامانه امن نشر آغاز خواهد شد."
};
const sealBoxes=new Map([['/',58],['/fa/',58],['/en/',58],['/fa/shop/',110]]);
export function applyReviewedPresentation(p,html){
 const d=reviewedDescriptions[p];
 if(d){
  const old=html.match(/<meta name="description" content="([^"]*)">/);
  if(!old)throw Error('Reviewed description missing '+p);
  if(old[1].length>200){
   html=html.replace(old[0],()=>'<meta name="description" content="'+esc(d)+'">');
   for(const key of ['og:description','twitter:description']){
    const tag=html.match(new RegExp('<meta (?:property|name)="'+key+'" content="([^"]*)">'));
    if(tag&&tag[1]===old[1])html=html.replace(tag[0],()=>tag[0].replace(old[1],esc(d)));
   }
  }
 }
 const size=sealBoxes.get(p);
 if(size)html=html.replace(/<img\b[^>]*src=['"]https:\/\/trustseal\.enamad\.ir\/logo\.aspx[^>]*>/gi,tag=>{
  if(/\bwidth=|\bheight=/.test(tag))return tag;
  tag=tag.replace(/<img\b/,'<img width="'+size+'" height="'+size+'"');
  return /style=['"]/.test(tag)?tag.replace(/style=(['"])/,(_,q)=>'style='+q+'object-fit:contain;'):tag.replace(/>$/,' style="object-fit:contain">');
 });
 return html;
}
export function projectPublicPresentation(out,files){
 const maps=['sitemap-core.xml','sitemap-fa.xml','sitemap-en.xml','sitemap-ar.xml','sitemap-jrei.xml','sitemap-news.xml','sitemap-services.xml','journal/sitemap.xml'];
 const urls=new Set(maps.flatMap(f=>[...fs.readFileSync(path.join(out,f),'utf8').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map(m=>m[1].trim())));
 const image=origin+'/assets/images/javad-rezazadeh-yazdeli-portrait-2026.webp';
 if(!fs.existsSync(path.join(out,'assets/images/javad-rezazadeh-yazdeli-portrait-2026.webp')))throw Error('Missing approved site identity image');
 let enhanced=0;
 for(const file of files){
  const rel=path.relative(out,file).replaceAll(path.sep,'/'),p=rel==='index.html'?'/':'/'+rel.replace(/index\.html$/,'');
  if(!urls.has(origin+p))continue;
  let html=fs.readFileSync(file,'utf8');
  const head=html.match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1]||'';
  const metas=[...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0]));
  const meta=(key,val)=>metas.find(m=>m[key]===val)?.content;
  if(/\bnoindex\b/i.test(meta('name','robots')||''))continue;
  const canon=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0])).find(m=>m.rel==='canonical')?.href;
  if(canon!==origin+p)continue;
  const reviewed=applyReviewedPresentation(p,html);
  if(reviewed!==html){html=reviewed;fs.writeFileSync(file,html,'utf8');}
  const title=head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim(),desc=meta('name','description');
  if(!title||!desc)continue;
  let tags='';
  for(const [k,v] of Object.entries({'og:type':'website','og:title':decode(title),'og:description':decode(desc),'og:url':canon,'og:image':image})){
   if(!meta('property',k))tags+='<meta property="'+k+'" content="'+esc(v)+'">';
  }
  if(!meta('name','twitter:card'))tags+='<meta name="twitter:card" content="summary">';
  if(!/<script\b[^>]*type=["']application\/ld\+json["']/i.test(head)){
   const l=attrs(html.match(/<html\b[^>]*>/i)?.[0]||'').lang;
   if(l&&['fa','en','ar'].includes(l)){
    const schema={"@context":"https://schema.org","@type":"WebPage","@id":canon+"#webpage",url:canon,name:decode(title),description:decode(desc),inLanguage:l,isPartOf:{"@id":origin+"/#website"}};
    tags+='<script type="application/ld+json">'+JSON.stringify(schema).replaceAll('<','\\u003c')+'</script>';
   }
  }
  if(/^\/(?:fa|en|ar)\/jrei(?:\/|$)/.test(p)&&html.includes('data-jrei-public-centre=')){
   const language=attrs(html.match(/<html\b[^>]*>/i)?.[0]||'').lang;
   const label={fa:'پرش به محتوای اصلی',en:'Skip to main content',ar:'انتقل إلى المحتوى الرئيسي'}[language];
   if(label)html=html.replace(/(<a\b[^>]*class="skip"[^>]*href="#main"[^>]*>)[\s\S]*?(<\/a>)/i,(_,a,z)=>a+label+z);
   fs.writeFileSync(file,html,'utf8');
  }
  if(tags){html=html.replace(/<\/head\s*>/i,m=>tags+m);fs.writeFileSync(file,html,'utf8');enhanced++;}
 }
 return enhanced;
}
