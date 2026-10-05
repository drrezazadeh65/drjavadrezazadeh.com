(()=>{
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>[...r.querySelectorAll(s)];
const rawPath=location.pathname.replace(/index\.html$/,'');
const gh='/drjavadrezazadeh.com/';
const base=rawPath.includes(gh)?gh:'/';
const isFa=rawPath.startsWith(base+'fa/');
const isJournal=rawPath.startsWith(base+'journal/');
const isPrivateApp=rawPath.startsWith(base+'app/')||rawPath.startsWith(base+'fa/app/');
const u=p=>base+p.replace(/^\//,'');
const icon=n=>{
 const d={
  home:'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9 20v-6h6v6"/>',
  user:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  book:'<path d="M4 5.5c3-1 5.5-.6 8 1v13c-2.5-1.6-5-2-8-1z"/><path d="M20 5.5c-3-1-5.5-.6-8 1v13c2.5-1.6 5-2 8-1z"/>',
  menu:'<path d="M5 7h14M5 12h14M5 17h14"/>',
  star:'<path d="m12 3 2.7 5.4 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-.9z"/>',
  test:'<path d="M7 3h10v4H7z"/><path d="M6 7h12v14H6z"/><path d="m9 12 2 2 4-4"/>',
  path:'<path d="M5 18c3-6 5-7 8-7 2.5 0 3.5-2 6-6"/><circle cx="5" cy="18" r="1.5"/><circle cx="13" cy="11" r="1.5"/><circle cx="19" cy="5" r="1.5"/>',
  news:'<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>'
 };
 return '<svg class="app-icon" viewBox="0 0 24 24">'+(d[n]||d.menu)+'</svg>';
};
function ensureMobileNav(){
 if(q('.app-dock')) return;
 const nav=document.createElement('nav');nav.className='app-dock';nav.setAttribute('aria-label',isFa?'منوی موبایلی':'Mobile app navigation');
 let links=[],sheet=[];
 if(isJournal){
   links=[
    [u('journal/'),isFa?'ژورنال':'Journal','home'],
    [u('journal/current/'),isFa?'شماره جاری':'Current','book'],
    [u('journal/submission/'),isFa?'ارسال مقاله':'Submit','path'],
    [u('journal/call-for-reviewers/'),isFa?'داوری':'Review','user']
   ];
   sheet=[
    [u('journal/aims-scope/'),'Aims & Scope'],
    [u('journal/author-guidelines/'),'Author Guidelines'],
    [u('journal/peer-review/'),'Peer Review'],
    [u('journal/ethics/'),'Publication Ethics'],
    [u('journal/editorial-board/'),'Editorial Board'],
    [u('journal/archive/'),'Archive'],
    [u('publisher/'),'Rezazadeh Foundation Press']
   ];
 }else if(isPrivateApp){
   const appBase=isFa?u('fa/app/'):u('app/');
   links=[
    [appBase,isFa?'خانه':'Home','home'],
    [isFa?u('fa/golden-talent/'):u('golden-talent/'),isFa?'کشف':'Discover','star'],
    [u('assessments/'),isFa?'آزمون‌ها':'Tests','test'],
    [appBase,isFa?'مسیر من':'My Path','path']
   ];
   sheet=[
    [appBase,isFa?'داشبورد':'Dashboard'],
    [isFa?u('fa/harim-khosusi/'):u('privacy/'),isFa?'حریم خصوصی':'Privacy'],
    [isFa?u('fa/darkhast-moshavere/'):u('fa/darkhast-moshavere/'),isFa?'مشاوره':'Consultation'],
    [isFa?u('fa/golden-talent/'):u('golden-talent/'),'Golden Talent']
   ];
 }else if(isFa){
   links=[
    [u('fa/'),'خانه','home'],
    [u('fa/moshavere-tahsili/'),'مشاوره','chat'],
    [u('fa/golden-talent/'),'Golden Talent','star'],
    [u('fa/akhbar/'),'مطالب','news']
   ];
   sheet=[
    [u('fa/darbare-man/'),'درباره من'],
    [u('fa/tadris/'),'تدریس دانشگاهی'],
    [u('fa/ketab-ha/'),'کتاب‌ها'],
    [u('fa/faaliat-haye-elmi/'),'فعالیت‌های علمی'],
    [u('fa/entekhab-reshteh/'),'انتخاب رشته'],
    [u('fa/estedaadyabi/'),'استعدادیابی'],
    [u('fa/moshavere-konkur/'),'مشاوره کنکور'],
    [u('fa/danesh-amoozan/'),'دانش‌آموزان'],
    [u('publisher/'),'Rezazadeh Foundation Press'],
    [u('journal/'),'JHELA']
   ];
 }else{
   links=[
    [u(''),'Home','home'],
    [u('about/'),'About','user'],
    [u('golden-talent/'),'Golden Talent','star'],
    [u('research/'),'Research','book']
   ];
   sheet=[
    [u('about/'),'About'],
    [u('teaching/'),'University Teaching'],
    [u('books/'),'Books'],
    [u('publications/'),'Publications'],
    [u('academic-engagements/'),'Academic Engagements'],
    [u('research/'),'Research'],
    [u('golden-talent/'),'Golden Talent'],
    [u('publisher/'),'Rezazadeh Foundation Press'],
    [u('journal/'),'JHELA'],
    [u('fa/'),'فارسی']
   ];
 }
 nav.innerHTML=links.map(([href,label,ic])=>'<a href="'+href+'">'+icon(ic)+'<span>'+label+'</span></a>').join('')+
 '<button class="dock-action" data-nav-toggle aria-controls="mobile-app-menu" aria-expanded="false">'+icon('menu')+'<span>'+(isFa?'منو':'Menu')+'</span></button>';
 document.body.appendChild(nav);
 if(!q('#mobile-app-menu')){
   const sheetEl=document.createElement('div');sheetEl.className='mobile-app-sheet';sheetEl.id='mobile-app-menu';sheetEl.hidden=true;
   sheetEl.innerHTML='<div class="app-sheet-panel"><div class="app-sheet-head"><strong>'+(isFa?'دسترسی سریع':'Explore')+'</strong><button class="app-sheet-close" data-nav-close aria-label="'+(isFa?'بستن منو':'Close menu')+'">×</button></div><div class="app-sheet-grid">'+sheet.map(([href,label])=>'<a href="'+href+'"><b>'+label+'</b></a>').join('')+'</div></div>';
   document.body.appendChild(sheetEl);
 }
}
ensureMobileNav();
function setSheet(open){
 const sheet=q('#mobile-app-menu'),btn=q('[data-nav-toggle]');
 if(!sheet||!btn)return;
 sheet.hidden=!open;btn.setAttribute('aria-expanded',String(open));
 document.documentElement.classList.toggle('nav-open',open);
 if(open){requestAnimationFrame(()=>sheet.classList.add('is-open'));const first=q('a,button',sheet);first&&first.focus()}
 else sheet.classList.remove('is-open');
}
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-nav-toggle]');
 if(t){e.preventDefault();setSheet(t.getAttribute('aria-expanded')!=='true');return}
 if(e.target.closest('[data-nav-close]')||e.target.classList.contains('mobile-app-sheet'))setSheet(false);
 const link=e.target.closest('#mobile-app-menu a');if(link)setSheet(false);
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')setSheet(false)});
const path=location.pathname.replace(/index\.html$/,'');
qa('.app-dock a').forEach(a=>{
 try{const p=new URL(a.href,location.href).pathname.replace(/index\.html$/,'');if((p===base&&path===base)||(p!==base&&path.startsWith(p)))a.classList.add('is-active')}catch{}
});
})();