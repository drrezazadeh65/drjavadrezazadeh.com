(()=>{
const form=document.querySelector('[data-site-search]');
if(!form)return;
const input=form.querySelector('input[type="search"]');
const category=form.querySelector('[data-search-category]');
const clear=form.querySelector('[data-search-clear]');
const results=document.querySelector('[data-search-results]');
const lang=document.documentElement.lang==='fa'?'fa':'en';
const locale=lang==='fa'?'fa-IR':'en-US';
const base=location.hostname.endsWith('github.io')?'/drjavadrezazadeh.com/':'/';

const norm=s=>(s||'')
  .toLocaleLowerCase(locale)
  .normalize('NFKC')
  .replace(/[\u064B-\u065F\u0670]/g,'')
  .replace(/[يى]/g,'ی')
  .replace(/ك/g,'ک')
  .replace(/[أإٱ]/g,'ا')
  .replace(/ؤ/g,'و')
  .replace(/ة/g,'ه')
  .replace(/[‌‍]/g,' ')
  .replace(/[^\p{L}\p{N}\s-]/gu,' ')
  .replace(/\s+/g,' ')
  .trim();

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const synonymGroups=lang==='fa'?[
  ['استعداد','استعدادیابی','توانمندی','توانایی','گلدن تلنت','golden talent'],
  ['انتخاب رشته','رشته','رشته دانشگاهی','هدایت تحصیلی','تصمیم تحصیلی'],
  ['کنکور','آزمون سراسری','ورودی دانشگاه'],
  ['مشاوره','مشاوره تحصیلی','راهنمایی تحصیلی'],
  ['پژوهش','تحقیق','مقاله','انتشار علمی','پابلیکیشن'],
  ['کتاب','کتاب ها','کتاب‌ها','اثر','آثار'],
  ['معلم','مدرس','تدریس','آموزش'],
  ['والد','والدین','خانواده'],
  ['دانش آموز','دانش‌آموز','student']
]:[
  ['talent','strengths','golden talent','aptitude'],
  ['student guidance','major','major exploration','pathway','educational choice'],
  ['research','publication','paper','article','scholarship'],
  ['teaching','teacher','educator','language education'],
  ['book','books','author','publishing'],
  ['consultation','consulting','guidance','advice']
];

const synonymMap=new Map();
for(const group of synonymGroups){
  const normalized=group.map(norm);
  for(const term of normalized) synonymMap.set(term,normalized);
}

let data=[];

function hydrateCategories(){
  if(!category)return;
  const categories=[...new Set(data.filter(x=>x.lang===lang).map(x=>x.category).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,locale));
  const current=category.value;
  category.innerHTML='<option value="">'+(lang==='fa'?'همه دسته‌ها':'All categories')+'</option>'+
    categories.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
  if(categories.includes(current))category.value=current;
}

function expandedTerms(query){
  const raw=query.split(' ').filter(Boolean);
  const out=new Set(raw);
  for(const [key,group] of synonymMap){
    if(query.includes(key)||raw.includes(key)) group.forEach(x=>x.split(' ').forEach(t=>out.add(t)));
  }
  return [...out].filter(Boolean);
}

function scoreEntry(x,q,terms){
  const title=norm(x.title),summary=norm(x.summary),keywords=norm(x.keywords),cat=norm(x.category);
  const hay=norm([x.title,x.summary,x.keywords,x.category].join(' '));
  let score=0;
  if(title===q)score+=30;
  if(title.startsWith(q))score+=18;
  else if(title.includes(q))score+=14;
  if(summary.includes(q))score+=8;
  if(keywords.includes(q))score+=7;
  if(hay.includes(q))score+=4;
  for(const t of terms){
    if(title===t)score+=12;
    else if(title.startsWith(t))score+=8;
    else if(title.includes(t))score+=6;
    if(keywords.includes(t))score+=4;
    if(summary.includes(t))score+=3;
    if(cat.includes(t))score+=2;
  }
  return score;
}

function updateUrl(){
  const p=new URLSearchParams(location.search);
  const q=input.value.trim();
  const c=category?.value||'';
  q?p.set('q',q):p.delete('q');
  c?p.set('category',c):p.delete('category');
  history.replaceState(null,'',location.pathname+(p.toString()?'?'+p:''));
}

function run(){
  updateUrl();
  const q=norm(input.value);
  const selected=category?.value||'';
  if(!q){
    results.innerHTML='<p class="form-note">'+(lang==='fa'?'برای جست‌وجو یک عبارت وارد کنید.':'Enter a term to search the public website.')+'</p>';
    return;
  }
  const terms=expandedTerms(q);
  const ranked=data
    .filter(x=>x.lang===lang&&(!selected||x.category===selected))
    .map(x=>({x,score:scoreEntry(x,q,terms)}))
    .filter(y=>y.score>0)
    .sort((a,b)=>b.score-a.score||a.x.title.localeCompare(b.x.title,locale))
    .slice(0,18);

  if(!ranked.length){
    const discovery=lang==='fa'
      ? '<div class="actions"><a class="button" href="'+base+'fa/rahnamaha/">راهنماها</a><a class="button" href="'+base+'fa/khadamat/">خدمات</a><a class="button" href="'+base+'fa/tamas/">تماس</a></div>'
      : '<div class="actions"><a class="button" href="'+base+'en/news-insights/">News & Insights</a><a class="button" href="'+base+'en/services/">Services</a><a class="button" href="'+base+'en/contact/">Contact</a></div>';
    results.innerHTML='<p class="form-note">'+(lang==='fa'?'نتیجه‌ای در صفحات عمومی پیدا نشد. عبارت کوتاه‌تر یا دسته دیگری را امتحان کنید.':'No matching public page was found. Try a shorter phrase or another category.')+'</p>'+discovery;
    return;
  }

  const count=lang==='fa'?(ranked.length+' نتیجه عمومی'):(ranked.length+' public result'+(ranked.length===1?'':'s'));
  results.innerHTML='<p class="form-note" role="status">'+esc(count)+'</p><div class="related-cluster-grid">'+
    ranked.map(({x})=>'<a href="'+base+x.path+'"><b>'+esc(x.title)+'</b><span>'+esc(x.category)+' · '+esc(x.summary)+'</span></a>').join('')+
    '</div>';
}

fetch(base+'assets/search-index.json',{cache:'force-cache'})
  .then(r=>r.ok?r.json():Promise.reject(new Error('index')))
  .then(x=>{
    data=Array.isArray(x)?x:[];
    hydrateCategories();
    const params=new URLSearchParams(location.search);
    const q=params.get('q');
    const c=params.get('category');
    if(q)input.value=q;
    if(c&&category&&[...category.options].some(o=>o.value===c))category.value=c;
    run();
  })
  .catch(()=>{results.innerHTML='<p class="form-note">'+(lang==='fa'?'فهرست جست‌وجو فعلاً در دسترس نیست.':'Search index is temporarily unavailable.')+'</p>'});

form.addEventListener('submit',e=>{e.preventDefault();run()});
input.addEventListener('input',()=>{window.clearTimeout(input._t);input._t=window.setTimeout(run,140)});
category?.addEventListener('change',run);
clear?.addEventListener('click',()=>{
  input.value='';
  if(category)category.value='';
  input.focus();
  run();
});
})();