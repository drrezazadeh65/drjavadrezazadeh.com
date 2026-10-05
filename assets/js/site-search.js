(()=>{
const form=document.querySelector('[data-site-search]');
if(!form)return;
const input=form.querySelector('input[type="search"]');
const results=document.querySelector('[data-search-results]');
const lang=document.documentElement.lang==='fa'?'fa':'en';
const base=location.hostname.endsWith('github.io')?'/drjavadrezazadeh.com/':'/';
const norm=s=>(s||'').toLocaleLowerCase(lang==='fa'?'fa-IR':'en-US').replace(/[\u064B-\u065F]/g,'').replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/\s+/g,' ').trim();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let data=[];
fetch(base+'assets/search-index.json',{cache:'force-cache'}).then(r=>r.ok?r.json():[]).then(x=>{data=x;run()}).catch(()=>{results.innerHTML='<p class="form-note">'+(lang==='fa'?'فهرست جست‌وجو فعلاً در دسترس نیست.':'Search index is temporarily unavailable.')+'</p>'});
function run(){
 const q=norm(input.value);
 const p=new URLSearchParams(location.search); if(input.value)p.set('q',input.value); else p.delete('q');
 history.replaceState(null,'',location.pathname+(p.toString()?'?'+p:''));
 if(!q){results.innerHTML='<p class="form-note">'+(lang==='fa'?'برای جست‌وجو یک عبارت وارد کنید.':'Enter a term to search the public website.')+'</p>';return}
 const terms=q.split(' ').filter(Boolean);
 const ranked=data.filter(x=>x.lang===lang).map(x=>{
   const title=norm(x.title),text=norm([x.title,x.summary,x.keywords,x.category].join(' '));
   let score=0; for(const t of terms){if(title.includes(t))score+=5;if(text.includes(t))score+=2}
   return {x,score};
 }).filter(y=>y.score>0).sort((a,b)=>b.score-a.score||a.x.title.localeCompare(b.x.title)).slice(0,12);
 if(!ranked.length){results.innerHTML='<p class="form-note">'+(lang==='fa'?'نتیجه‌ای در صفحات عمومی پیدا نشد.':'No matching public page was found.')+'</p>';return}
 results.innerHTML='<div class="related-cluster-grid">'+ranked.map(({x})=>'<a href="'+base+x.path+'"><b>'+esc(x.title)+'</b><span>'+esc(x.category)+' · '+esc(x.summary)+'</span></a>').join('')+'</div>';
}
form.addEventListener('submit',e=>{e.preventDefault();run()}); input.addEventListener('input',()=>{window.clearTimeout(input._t);input._t=window.setTimeout(run,120)});
const initial=new URLSearchParams(location.search).get('q');if(initial){input.value=initial}
})();