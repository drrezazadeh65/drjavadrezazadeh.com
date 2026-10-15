/* JR Admin Intelligence v1 — administrator-facing, public-page-only schema sampling.
   Never handles credentials, private URLs, customer data, or secrets. */
(()=>{'use strict';
const root=document.getElementById('jr-intelligence');if(!root)return;
const fa=root.dataset.lang==='fa';
const t=(a,b)=>fa?a:b;
const $=s=>root.querySelector(s);
const btn=$('[data-jr-audit]'),summary=$('[data-jr-summary]'),detail=$('[data-jr-results]'),score=$('[data-jr-score]'),gauge=$('[data-jr-gauge]'),count=$('[data-jr-count]');
const pending=$('[data-jr-modules]');
const modules=[
[t('مرکز فرماندهی هوشمند','Intelligence Command Center'),t('طراحی و اتصال امن مدل در صف اجراست؛ هیچ گزارش زنده‌ای جعل نمی‌شود.','Secure model integration is planned; no fabricated live report.')],
[t('موتور GEO و کشف هوش مصنوعی','AI Discovery & GEO'),t('ENG-02 موجود است؛ اثربخشی استنادهای AI هنوز اندازه‌گیری نشده.','ENG-02 exists; AI citation outcomes remain unmeasured.')],
[t('مدیریت کلیدواژه‌ها','Keyword Intelligence'),t('نیازمند اتصال داده‌های تأییدشده و نگاشت صفحه/عبارت است.','Requires verified metrics and query-to-page mappings.')],
[t('شبیه‌ساز نتایج کنکور','Entrance Exam Simulator'),t('فقط طرح آینده؛ غیرفعال و بدون محاسبه.','Future concept only; disabled with no calculations.')]
];
modules.forEach(([title,description],i)=>{const article=document.createElement('article');article.className='jr-i-card';const h=document.createElement('h3');h.textContent=title;const p=document.createElement('p');p.textContent=description;const tag=document.createElement('small');tag.textContent=i===3?t('غیرفعال — فقط ثبت عنوان','Parked — title only'):t('در صف تکمیل','Planned');article.append(h,p,tag);pending.append(article);});

/* Three standing editorial priorities. These are not live diagnoses or auto-executed work. */
const prioritySection=document.createElement('section');prioritySection.className='jr-i-priorities';
prioritySection.setAttribute('aria-label',t('سه اولویت بعدی','Three next priorities'));
const priorityTitle=document.createElement('h3');priorityTitle.textContent=t('سه اولویت بعدی پیشنهادی','Three proposed next priorities');
const priorityNote=document.createElement('p');priorityNote.textContent=t('بر اساس فهرست درخواست‌ها و وابستگی‌های ثبت‌شده؛ داده زنده موتورهای سایت یا تحلیل ChatGPT نیست.','From recorded requirements and dependencies; not live engine data or a ChatGPT analysis.');
const priorityList=document.createElement('ol');priorityList.setAttribute('data-jr-priority-list','');
[
 t('تکمیل اتصال امن داشبورد و شواهد اجرایی ۱۳ موتور','Verify secure dashboard connectivity and execution evidence for 13 engines'),
 t('ارتقای تجربه نصب PWA و فروشگاه، همراه با آزمون موبایل و دسکتاپ','Test PWA installation UX and redesign the store across devices'),
 t('تکمیل نقشه کلیدواژه و سنجش واقعی GEO با داده‌های معتبر','Complete keyword strategy and collect verified GEO/AI visibility observations')
].forEach(s=>{const li=document.createElement('li');li.textContent=s;priorityList.append(li);});
prioritySection.append(priorityTitle,priorityNote,priorityList);
pending.after(prioritySection);

const allowed=p=>/^\/(fa|en)\/(?!app\/|account\/|login\/|register\/|shop\/(cart|checkout|payment|payment-start|payment-return|payment-result)\/|customer-dashboard\/|assessments\/|bazyabi-hesab\/|recover\/)/.test(p)&&!/(?:^|\/)(?:admin|checkout|login|register|payment)(?:\/|$)/i.test(p);
const normalize=u=>new URL(u,location.origin).pathname.replace(/index\.html$/,'').replace(/\/?$/,'/');
const finding=(url,state,notes)=>{const li=document.createElement('li');const a=document.createElement('a');a.href=url;a.textContent=new URL(url).pathname;a.target='_blank';a.rel='noopener noreferrer';const b=document.createElement('strong');b.textContent=state;const p=document.createElement('span');p.textContent=notes.join(' · ');li.append(a,b,p);return li;};
async function inspect(url){
 const res=await fetch(url,{credentials:'omit',cache:'no-store',redirect:'follow',headers:{Accept:'text/html'}});if(!res.ok)throw Error('HTTP '+res.status);
 if(new URL(res.url).origin!==location.origin || !allowed(new URL(res.url).pathname))throw Error('redirect outside allowed public pages');
 const html=await res.text();if(html.length>1600000)throw Error('page too large');
 const doc=new DOMParser().parseFromString(html,'text/html');
 if(/noindex/i.test(doc.querySelector('meta[name="robots"]')?.content||''))return {skip:true,url};
 const scripts=[...doc.querySelectorAll('script[type="application/ld+json"]')];
 const errors=[],warnings=[];
 if(!scripts.length)warnings.push(t('JSON-LD ندارد','No JSON-LD'));
 for(const node of scripts){let data;try{data=JSON.parse(node.textContent||'');}catch(e){errors.push(t('JSON-LD نامعتبر','Invalid JSON-LD'));continue;}
 const entities=Array.isArray(data)?data:[data];
 for(const entity of entities){if(!entity||typeof entity!=='object'){errors.push(t('موجودیت نامعتبر','Invalid entity'));continue;}
 const graph=Array.isArray(entity['@graph'])?entity['@graph']:[entity];
 const context=entity['@context'];
 if(!context && !graph.some(x=>x&&x['@context']))warnings.push(t('زمینه @context مشخص نیست','Missing @context'));
 else if(context && !String(context).includes('schema.org'))warnings.push(t('زمینه ناشناخته','Unknown context'));
 if(!graph.some(x=>x&&x['@type']))warnings.push(t('نوع @type مشخص نیست','Missing @type'));
 }}
 const canonical=doc.querySelector('link[rel="canonical"]')?.href;
 if(!canonical)warnings.push(t('canonical یافت نشد','Canonical missing'));
 else {try{if(normalize(canonical)!==normalize(url))warnings.push(t('canonical متفاوت','Canonical differs'));}catch(e){errors.push('Invalid canonical');}}
 return {url,errors,warnings,count:scripts.length,skip:false};
}
let running=false;
btn.addEventListener('click',async()=>{
 if(running || document.getElementById('ops-workspace')?.hidden)return;
 running=true;btn.disabled=true;score.textContent='—';gauge.style.setProperty('--jr-progress','0');detail.replaceChildren();summary.textContent=t('در حال نمونه‌برداری از صفحات عمومی…','Sampling public pages…');
 const urls=new Set([new URL('/fa/',location.origin).href,new URL('/en/',location.origin).href]);
 try{const res=await fetch('/sitemap.xml',{credentials:'omit',cache:'no-store'});if(!res.ok)throw Error('sitemap HTTP '+res.status);
 const xml=new DOMParser().parseFromString(await res.text(),'application/xml');
 if(xml.querySelector('parsererror'))throw Error('Invalid sitemap XML');
 for(const loc of xml.getElementsByTagName('loc')){try{const u=new URL(loc.textContent.trim());if(u.origin===location.origin&&allowed(u.pathname))urls.add(u.href);}catch(e){} if(urls.size>=32)break;}
 }catch(e){summary.textContent=t('نقشه سایت خوانده نشد؛ نمونه پایه بررسی می‌شود.','Sitemap unavailable; checking basic samples.');}
 let done=0,passed=0,skipped=0,totalErrors=0,totalWarnings=0,withSchema=0;const list=[...urls].slice(0,32);count.textContent='0 / '+list.length;
 let cursor=0;
 async function worker(){while(cursor<list.length){const url=list[cursor++];try{const r=await inspect(url);if(r.skip){skipped++;continue;}passed++;totalErrors+=r.errors.length;totalWarnings+=r.warnings.length;if(r.count)withSchema++;
 const notes=[...r.errors,...r.warnings];detail.append(finding(url,r.errors.length?t('خطا','Error'):r.warnings.length?t('نیازمند بازبینی','Review'):t('بدون ایراد ساختاری آشکار','No obvious structural issue'),notes.length?notes:[t('JSON-LD قابل خواندن','JSON-LD parsed')]));}
 catch(e){totalErrors++;detail.append(finding(url,t('خطای دریافت','Fetch error'),[String(e.message||e).slice(0,100)]));}
 finally{done++;count.textContent=done+' / '+list.length;}}}
 await Promise.all([worker(),worker(),worker()]);
 // This is a bounded heuristic of the sampled HTML source, not Google validation, rank or rich-result eligibility.
 const measured=passed?Math.max(0,10-Math.min(10,(totalErrors*2+totalWarnings*.3)/passed)):null;
 score.textContent=measured===null?'—':measured.toFixed(1)+' / 10';
 gauge.style.setProperty('--jr-progress',measured===null?'0':String(measured*10));
 summary.textContent=t('بررسی منبع HTML '+passed+' صفحه؛ '+withSchema+' صفحه دارای JSON-LD؛ '+totalErrors+' خطا و '+totalWarnings+' هشدار؛ '+skipped+' صفحه noindex کنار گذاشته شد. این نمره داخلی و صرفاً برای نمونه بررسی‌شده است؛ اعتبار نتایج غنی گوگل یا وضعیت ایندکس را اثبات نمی‌کند.','HTML source checked: '+passed+' pages; '+withSchema+' with JSON-LD; '+totalErrors+' errors and '+totalWarnings+' warnings; '+skipped+' noindex pages skipped. This is an internal sample-only heuristic, not evidence of Google eligibility or indexing.');
 btn.disabled=false;running=false;
});
})();