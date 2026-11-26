import fs from 'node:fs';
import path from 'node:path';
const pattern=/^(fa|en|ar)\/(?:jrei(?:\/(?:catalog\/[a-z-]+|pricing|order|seo))?|jrei-academic|forge)\/index\.html$/;
const locales={
fa:{map:'معماری تعاملی · نمایش مفهومی، نه داده عملیاتی زنده',core:'هسته هماهنگ‌سازی',nodes:['زبان و معنا','حافظه و دانش','عامل‌ها و مأموریت','پردازش توزیع‌شده'],nav:['کاوش راهکارها','تعرفه‌ها','همکاری و سرمایه‌گذاری'],stats:['حوزه تخصصی','خدمت بررسی شواهد','زبان رابط'],journey:'از نیاز تا راهکار',steps:['تعریف نیاز','طراحی گردش کار','ارزیابی و توافق تحویل'],search:'جست‌وجو در راهکارها و خدمات',all:'همه',empty:'نتیجه‌ای یافت نشد.',found:'نتیجه',filter:['زبان و دانش','آموزش و پژوهش','مهندسی و داده','رشد و سازمان','زیرساخت و امنیت']},
en:{map:'Interactive architecture · conceptual illustration, not live telemetry',core:'Orchestration core',nodes:['Language & meaning','Memory & knowledge','Agents & missions','Distributed compute'],nav:['Explore solutions','Pricing','Business & investment'],stats:['Solution domains','Evidence review services','Interface languages'],journey:'From need to solution',steps:['Define the need','Design the workflow','Evaluate & agree delivery'],search:'Search solutions and services',all:'All',empty:'No matching results.',found:'results',filter:['Language & knowledge','Education & research','Engineering & data','Growth & enterprise','Infrastructure & security']},
ar:{map:'بنية تفاعلية · تصور مفاهيمي لا قياسات تشغيلية مباشرة',core:'نواة التنسيق',nodes:['اللغة والمعنى','الذاكرة والمعرفة','الوكلاء والمهام','الحوسبة الموزعة'],nav:['استكشف الحلول','الأسعار','التعاون والاستثمار'],stats:['مجال تخصصي','خدمة مراجعة الأدلة','لغات الواجهة'],journey:'من الاحتياج إلى الحل',steps:['تحديد الاحتياج','تصميم سير العمل','التقييم والاتفاق على التسليم'],search:'ابحث في الحلول والخدمات',all:'الكل',empty:'لا توجد نتائج مطابقة.',found:'نتيجة',filter:['اللغة والمعرفة','التعليم والبحث','الهندسة والبيانات','النمو والمؤسسات','البنية والأمان']}
};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const groups=[['architecture','language','memory','adaptive-context','knowledge','agents'],['education','assessment','talent','research','academic-writing'],['coding','data','vision','audio','documents','web','api'],['search','search-visibility','marketing','news','automation','enterprise'],['desktop','distributed','local-ai','security','recovery','plugins']];
function scene(l,c){
 const nodes=c.nodes.map((x,i)=>'<a class="jx-node jx-node-'+i+'" href="/'+l+'/jrei/catalog/'+['language','memory','agents','distributed'][i]+'/"><span aria-hidden="true">'+['◈','◉','✳','▦'][i]+'</span>'+esc(x)+'</a>').join('');
 return '<figure class="jx-scene"><div class="jx-scene-top"><span>JREI / SYSTEM MAP</span><span>01 — 04</span></div><div class="jx-network"><svg class="jx-lines" viewBox="0 0 400 320" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="#84dacf" stroke-width="1.2"><ellipse cx="200" cy="160" rx="144" ry="112" opacity=".28"/><ellipse cx="200" cy="160" rx="105" ry="78" opacity=".55"/><path d="M65 54L200 160 335 54M65 266L200 160 335 266" stroke-dasharray="5 7"/><path d="M200 12V308M12 160H388" opacity=".2"/></g><g fill="#d6fff7"><circle cx="132" cy="108" r="3"/><circle cx="269" cy="214" r="3"/><circle cx="200" cy="48" r="2"/></g></svg><div class="jx-core"><span aria-hidden="true">✦</span><strong>JREI</strong><small>'+esc(c.core)+'</small></div>'+nodes+'</div><figcaption>'+esc(c.map)+'</figcaption></figure>';
}
function nav(l,c){return '<div class="jx-nav">'+['/jrei/','/jrei/pricing/','/jrei/order/'].map((p,i)=>'<a href="/'+l+p+'">'+esc(c.nav[i])+' <span aria-hidden="true">↗</span></a>').join('')+'</div>'}
function stats(c){return '<div class="jx-stats">'+['30','52','3'].map((v,i)=>'<div><strong dir="ltr">'+v+'</strong><span>'+esc(c.stats[i])+'</span></div>').join('')+'</div>'}
function flow(c){return '<div class="jx-flow"><h2>'+esc(c.journey)+'</h2><ol>'+c.steps.map((s,i)=>'<li><span aria-hidden="true">0'+(i+1)+'</span>'+esc(s)+'</li>').join('')+'</ol></div>'}
function toolbar(c,home){return '<div class="jx-toolbar" data-jx-toolbar hidden><label>'+esc(c.search)+'<input type="search" data-jx-search autocomplete="off"></label>'+(home?'<div class="jx-filters" role="group" aria-label="'+esc(c.nav[0])+'">'+[c.all,...c.filter].map((x,i)=>'<button type="button" data-jx-filter="'+(i-1)+'" aria-pressed="'+(i===0)+'">'+esc(x)+'</button>').join('')+'</div>':'')+'<p data-jx-result role="status" data-empty="'+esc(c.empty)+'" data-found="'+esc(c.found)+'"></p></div>'}
export function projectExperience(relative,source){
 const m=pattern.exec(relative);if(!m)return source;
 const l=m[1],c=locales[l],commercial=source.includes('data-jrei-public-centre="v1"');
 if(source.includes('/assets/css/jrei-experience-v2.css'))return source;
 if(!commercial&&!source.includes('data-jrei-launch="coming-soon"'))throw Error('Unexpected JREI route '+relative);
 let next=source.replace(/<\/head>/i,m=>'<link rel="stylesheet" href="/assets/css/jrei-experience-v2.css?v=2">'+m);
 if(commercial){
  const hero=/<div class="hero"><div class="wrap">([\s\S]*?)<\/div><\/div><\/div>/;
  if(!hero.test(next))throw Error('JREI hero shape '+relative);
  next=next.replace(hero,(_,s)=>'<div class="hero"><div class="wrap jx-hero"><div class="jx-copy">'+s+'</div></div>'+scene(l,c)+'</div></div>');
  const home=relative===l+'/jrei/index.html';
  const note=/<p class="note">[\s\S]*?<\/p>/;
  if(!note.test(next))throw Error('JREI note missing '+relative);
  next=next.replace(note,m=>(home?stats(c):'')+m+nav(l,c)+(home?flow(c):''));
  if(home){
   next=next.replace(/<article class="tile">(?=<h3><a href="\/(?:fa|en|ar)\/jrei\/catalog\/([a-z-]+)\/")/g,(tag,slug)=>{
    const k=groups.findIndex(g=>g.includes(slug));if(k<0)throw Error('Unclassified '+slug);return '<article class="tile" data-jx-domain="'+k+'">';
   });
   const first=next.indexOf('<article class="tile" data-jx-domain='),grid=next.lastIndexOf('<div class="grid">',first);
   if(first<0||grid<0)throw Error('JREI catalog missing');
   next=next.slice(0,grid)+toolbar(c,true)+next.slice(grid);
  }else if(/\/(?:pricing|order)\/index\.html$/.test(relative)){
   const pos=next.indexOf('<section>',next.indexOf('<p class="note">'));
   if(pos<0)throw Error('JREI listing missing');
   next=next.slice(0,pos)+toolbar(c,false)+next.slice(pos);
  }
  next=next.replace(/<\/body>/i,m=>'<script defer src="/assets/js/jrei-experience-v2.js?v=2"></script>'+m);
 }else{
  next=next.replace(/<p class="notice" role="status">[\s\S]*?<\/p>/,m=>m+nav(l,c));
 }
 return next;
}
export function applyJreiExperience(out,files,failures){
 const counts={fa:0,en:0,ar:0};
 for(const file of files){const rel=path.relative(out,file).split(path.sep).join('/'),m=pattern.exec(rel);if(!m)continue;try{const src=fs.readFileSync(file,'utf8');fs.writeFileSync(file,projectExperience(rel,src),'utf8');counts[m[1]]++;}catch(e){failures.push(String(e));}}
 for(const [l,n] of Object.entries(counts))if(n!==36)failures.push('JREI experience coverage '+l+': expected 36, got '+n);
 return counts;
}
