/* JREI News — voluntary owner/reader in-browser news notifications.
 * Only the original same-origin receipt-backed RSS may trigger notifications.
 * No guessed story, source-only press release, private data, background worker,
 * web push subscription, or publication is created here. This client works
 * while the page remains open; browser OS notifications are optional.
 */
(function(){
 'use strict';
 var root=document.querySelector('.jrn21[data-jrn21]');
 if(!root||typeof fetch!=='function'||typeof DOMParser==='undefined')return;
 var lang=root.getAttribute('data-jr-language')==='en'?'en':'fa';
 var fa=lang==='fa',prefix=fa?'/fa/akhbar/':'/en/news-insights/';
 var code='jr-jrei-news-reader-alerts-'+lang+'-v1';
 var card=root.querySelector('.jrn21-subscribe');
 if(!card)return;
 var memory=null,enabled=false,timer=null,polling=false;
 function read(){
  try{var s=localStorage.getItem(code);return s?JSON.parse(s):null;}
  catch(_){return memory;}
 }
 function save(v){
  memory=v;
  try{if(v)localStorage.setItem(code,JSON.stringify(v));else localStorage.removeItem(code);}
  catch(_){}
 }
 function el(tag,cl,txt){
  var n=document.createElement(tag);if(cl)n.className=cl;
  if(typeof txt==='string')n.textContent=txt;return n;
 }
 var area=el('div','jrn21-notify-controls');
 area.setAttribute('data-jrn21-notify','');
 var heading=el('strong','jrn21-notify-title',fa?'اعلان خبرهای جدید JREI':'JREI new-story alerts');
 var description=el('p','jrn21-notify-detail',fa?
   'با فعال‌سازی اختیاری، خبرهای تازهٔ ثبت‌شده در آرشیو رسمی را تا زمانی که این صفحه باز است بررسی می‌کنیم. دریافت اعلان مرورگر به اجازهٔ شما وابسته است.':
   'Opt in to check newly published, verified news while this page is open. System notifications require browser permission.');
 var button=el('button','jrn21-notify-toggle');
 button.type='button';button.setAttribute('aria-pressed','false');
 var state=el('p','jrn21-notify-state','');
 state.setAttribute('role','status');state.setAttribute('aria-live','polite');
 var newLink=el('a','jrn21-notify-latest','');newLink.hidden=true;
 area.append(heading,description,button,state,newLink);
 card.insertAdjacentElement('afterend',area);
 function stateText(status){
  if(status==='off')return fa?'اعلان‌های این دستگاه خاموش است.':'This device has news alerts turned off.';
  if(status==='on')return fa?'اعلان‌ها فعال‌اند؛ فقط خبر تازهٔ منتشرشده نمایش داده می‌شود.':'Alerts enabled; only newly published stories will be announced.';
  if(status==='empty')return fa?'فعلاً خبر تازه‌ای برای اعلان وجود ندارد.':'No newly published stories to announce.';
  if(status==='wait')return fa?'در حال بررسی آرشیو خبری…':'Checking the published news archive…';
  if(status==='unavailable')return fa?'اتصال به آرشیو خبری برقرار نشد؛ خبری را تأیید یا اعلام نمی‌کنیم.':'The news feed is unavailable; no story is announced.';
  return '';
 }
 function view(){
  var s=enabled?'on':'off';button.textContent=fa?
    (enabled?'خاموش‌کردن اعلان‌ها':'فعال‌کردن اعلان‌ها'):
    (enabled?'Turn off alerts':'Enable news alerts');
  button.setAttribute('aria-pressed',String(enabled));
  if(!enabled){state.textContent=stateText(s);newLink.hidden=true;}
 }
 function validLink(value){
  try{
   var u=new URL(value,location.origin);
   if(u.origin!==location.origin||u.search||u.hash||u.username||u.password||
      !u.pathname.startsWith(prefix))return null;
   var slug=u.pathname.slice(prefix.length);
   return /^[a-z0-9-]{2,160}\/$/.test(slug)?u.pathname:null;
  }catch(_){return null;}
 }
 function parseFeed(xml){
  if(typeof xml!=='string'||xml.length>280000)throw Error('feed-size');
  var doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror')||!doc.querySelector('rss channel'))throw Error('feed-parse');
  var seen=new Set(),out=[];
  Array.prototype.slice.call(doc.querySelectorAll('channel > item'),0,100).forEach(function(item){
   var link=validLink(item.querySelector('link')?.textContent?.trim());
   var title=(item.querySelector('title')?.textContent||'').replace(/\s+/g,' ').trim().slice(0,190);
   var published=Date.parse(item.querySelector('pubDate')?.textContent||'');
   if(!link||title.length<4||!Number.isFinite(published)||
      published<946684800000||published>Date.now()+60000||seen.has(link))return;
   seen.add(link);
   var urgent=Array.prototype.some.call(item.querySelectorAll('category'),function(tag){
    return !tag.hasAttribute('domain')&&tag.textContent.trim()==='BREAKING';
   })&&Date.now()-published<=48*3600000;
   out.push({path:link,title:title,published:published,urgent:urgent});
  });
  return out.sort(function(a,b){return b.published-a.published;});
 }
 function maybeNotify(item){
  state.textContent=(fa?'خبر تازه منتشر شد: ':'New verified story: ')+item.title;
  newLink.textContent=item.title;newLink.href=item.path;newLink.hidden=false;
  newLink.rel='noopener';
  if(typeof Notification!=='undefined'&&Notification.permission==='granted'&&document.hidden){
   try{
    var notification=new Notification(
      item.urgent?(fa?'خبر فوری JREI':'JREI Breaking News'):
        (fa?'خبر جدید JREI':'New JREI News'),{
      body:item.title,tag:'jrei-news-'+lang,renotify:false
    });
    notification.onclick=function(){window.focus();location.href=item.path;};
   }catch(_){}
  }
 }
 function poll(){
  if(!enabled||polling||document.hidden)return Promise.resolve();
  polling=true;state.textContent=stateText('wait');
  var controller=typeof AbortController==='function'?new AbortController():null;
  var deadline=controller?setTimeout(function(){controller.abort();},12000):null;
  return fetch('/api/news/v1/rss?language='+lang,{
   method:'GET',credentials:'omit',redirect:'error',cache:'no-store',
   headers:{Accept:'application/rss+xml, application/xml;q=0.9'},
   ...(controller?{signal:controller.signal}:{})
  }).then(function(response){
   if(!response.ok||!/xml|rss/i.test(response.headers.get('content-type')||''))throw Error('feed-offline');
   return response.text();
  }).then(function(xml){
   if(!enabled)return;
   var rows=parseFeed(xml),last=read();
   if(!last||last.enabled!==true){
    save({enabled:true,latest:rows[0]?.published||0,paths:rows.slice(0,30).map(x=>x.path)});
    state.textContent=stateText(rows.length?'on':'empty');return;
   }
   var known=new Set(Array.isArray(last.paths)?last.paths:[]);
   var newest=rows.filter(function(x){
     return x.published>=Number(last.latest||0)&&!known.has(x.path);
   });
   if(newest.length)maybeNotify(newest[0]);
   else state.textContent=stateText(rows.length?'on':'empty');
   save({enabled:true,latest:Math.max(Number(last.latest||0),rows[0]?.published||0),
     paths:[...new Set(rows.slice(0,30).map(x=>x.path).concat(Array.from(known).slice(0,20)))].slice(0,50)});
  }).catch(function(){if(enabled)state.textContent=stateText('unavailable');})
    .finally(function(){if(deadline)clearTimeout(deadline);polling=false;});
 }
 button.addEventListener('click',function(){
  if(enabled){
   enabled=false;save(null);if(timer)clearInterval(timer);timer=null;view();return;
  }
  enabled=true;save({enabled:true,latest:0,paths:[]});view();
  state.textContent=stateText('wait');
  poll();
  timer=setInterval(poll,5*60000);
  // Optional browser-level permission is only ever requested by a direct click.
  if(typeof Notification!=='undefined'&&Notification.permission==='default'&&
     typeof Notification.requestPermission==='function'){
    try{var outcome=Notification.requestPermission();
      if(outcome&&typeof outcome.catch==='function')outcome.catch(function(){});
    }catch(_){}
  }
 });
 var saved=read();
 if(saved&&saved.enabled===true){
  enabled=true;view();poll();timer=setInterval(poll,5*60000);
 }else view();
 document.addEventListener('visibilitychange',function(){if(!document.hidden&&enabled)poll();});
}());