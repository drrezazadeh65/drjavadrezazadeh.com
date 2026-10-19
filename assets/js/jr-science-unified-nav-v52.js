/* JR scientific navigation v5.2: presentation only; never grants entitlements. */
(()=>{'use strict';
const fa=document.documentElement.lang==='fa',root=document.body;
if(!root||!root.classList.contains('jr-science-workspace'))return;
const base=fa?'/fa/':'/en/',student=base+'app/student/';
const items=[
[fa?'داشبورد و معرفی':'Dashboard preview',student,'preview'],
['RCAS Start',base+'assessments/golden-talent/start/','free'],
[fa?'نمایه شواهد':'Evidence profile',student+'integrated-profile/','paid'],
[fa?'سوابق تحصیلی':'Academic records',student+'records/','paid'],
[fa?'پیشرفت من':'My progress',student+'progress/','paid'],
[fa?'زمینه و حمایت':'Context and support',student+'context/','paid'],
[fa?'جلسات':'Appointments',student+'appointments/','paid'],
['Golden Path',student+'golden-path/','paid'],
[fa?'BAHAR · کاربرگ رایگان':'BAHAR · free worksheet',student+'bahar/#baharWorkingPlan','free'],
[fa?'بسته‌ها و خرید':'Packages and purchase',base+'shop/golden-talent/','open'],
[fa?'حساب و حریم خصوصی':'Account and privacy',base+'app/account/','account']];
const status={free:fa?'رایگان':'Free',paid:fa?'پس از خرید':'After purchase',preview:fa?'پیش‌نمایش':'Preview',open:fa?'مشاهده':'Explore',account:fa?'ورود':'Sign in'};
const style=document.createElement('style');
style.textContent='.jr-unified-nav a{display:flex;align-items:center;justify-content:space-between;gap:10px}.jr-unified-nav .jr-access-label{font-size:.7rem;opacity:.78;white-space:nowrap}.jr-unified-nav a[aria-current="page"]{border-color:#d4ad5a}.jr-mobile-nav-toggle{display:none;background:#151412;color:#f6e5bf;border:1px solid #92743b;border-radius:10px;padding:10px 14px;cursor:pointer}.jr-science-drawer{display:none}@media(max-width:900px){.jr-mobile-nav-toggle{display:inline-flex;position:sticky;top:8px;z-index:101;margin:10px}.jr-science-drawer[data-open="true"]{display:block;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.68)}.jr-science-drawer-panel{position:absolute;right:0;top:0;bottom:0;width:min(88vw,340px);overflow:auto;background:#0c0c0d;border-left:1px solid #846a36;padding:16px}.jr-science-drawer-panel nav{display:grid;gap:8px}.jr-science-drawer-panel a{padding:10px;color:#f4ead8;text-decoration:none;border:1px solid #363027;border-radius:8px}.jr-science-drawer-close{margin-bottom:16px;background:#262016;color:#fff;border:1px solid #997d44;padding:9px;border-radius:8px}}';
document.head.append(style);
const current=location.pathname;
function nav(container){container.classList.add('jr-unified-nav');container.replaceChildren();items.forEach(([name,url,type])=>{const a=document.createElement('a');a.href=url;const title=document.createElement('span');title.textContent=name;const tag=document.createElement('small');tag.className='jr-access-label';tag.textContent=status[type];a.append(title,tag);if(new URL(url,location.origin).pathname===current)a.setAttribute('aria-current','page');container.append(a);});}
const existing=document.querySelector('.dashboard-sidebar nav');
if(existing)nav(existing);
if(!existing){
 const aside=document.createElement('aside');aside.className='jr-science-desktop-sidebar';
 aside.setAttribute('aria-label',fa?'امکانات Golden Talent':'Golden Talent features');
 const heading=document.createElement('strong');heading.textContent='Golden Talent';
 const description=document.createElement('p');description.textContent=fa?'نمایش امکانات؛ دسترسی اختصاصی پس از خرید معتبر':'Explore features; paid access requires a verified purchase';
 const desktopNav=document.createElement('nav');nav(desktopNav);aside.append(heading,description,desktopNav);root.append(aside);
 const desktopStyle=document.createElement('style');desktopStyle.textContent='@media(min-width:901px){body.assessment-workspace-page{padding-right:260px}.jr-science-desktop-sidebar{position:fixed;right:0;top:0;bottom:0;z-index:60;width:240px;overflow:auto;background:#0a0a0b;border-left:1px solid #755d2d;padding:18px 10px;color:#f7e9ce}.jr-science-desktop-sidebar>strong{display:block;text-align:center;padding:15px}.jr-science-desktop-sidebar>p{font-size:12px;line-height:1.7;text-align:center;color:#d5c5a2}.jr-science-desktop-sidebar nav{display:grid;gap:4px}.jr-science-desktop-sidebar a{padding:9px 7px;border:1px solid transparent;border-radius:9px;color:#eee1c7;text-decoration:none;font-size:12px}.jr-science-desktop-sidebar a:hover,.jr-science-desktop-sidebar a[aria-current="page"]{border-color:#a18445;background:#201c16}}@media(max-width:900px){.jr-science-desktop-sidebar{display:none}}';document.head.append(desktopStyle);
}
const button=document.createElement('button');button.type='button';button.className='jr-mobile-nav-toggle';button.textContent=fa?'☰ امکانات پلتفرم':'☰ Platform features';button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','jr-science-drawer');
const drawer=document.createElement('div');drawer.id='jr-science-drawer';drawer.className='jr-science-drawer';drawer.setAttribute('data-open','false');
const panel=document.createElement('div');panel.className='jr-science-drawer-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',fa?'امکانات پلتفرم':'Platform features');
const close=document.createElement('button');close.type='button';close.className='jr-science-drawer-close';close.textContent=fa?'بستن ×':'Close ×';
const menu=document.createElement('nav');nav(menu);panel.append(close,menu);drawer.append(panel);
const anchor=document.querySelector('.dashboard-workspace')||document.querySelector('main')||root.firstElementChild;anchor.parentNode.insertBefore(button,anchor);root.append(drawer);
let previous=null;
function toggle(open){drawer.dataset.open=String(open);button.setAttribute('aria-expanded',String(open));if(open){previous=document.activeElement;close.focus();}else{(previous||button).focus();}}
button.addEventListener('click',()=>toggle(true));close.addEventListener('click',()=>toggle(false));drawer.addEventListener('click',e=>{if(e.target===drawer)toggle(false);});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.dataset.open==='true')toggle(false);if(e.key==='Tab'&&drawer.dataset.open==='true'){const links=[close,...menu.querySelectorAll('a')];const i=links.indexOf(document.activeElement);if(e.shiftKey&&i===0){e.preventDefault();links.at(-1).focus();}else if(!e.shiftKey&&i===links.length-1){e.preventDefault();close.focus();}}});
/* A navigation label is not authorization: paid APIs must independently verify authenticated ownership and settled order. */
})();