/* JREI News newsroom progressive enhancement.
 * Only same-origin, authenticated-publisher-receipt-gated public RSS.
 * Never infer "breaking" status from a recent publication date.
 * No timers, background crawling, account data, cookies, or raw HTML injection.
 */
(function(){
  'use strict';
  var root=document.querySelector('[data-jr-newsroom]');
  if(!root)return;
  var locale=root.getAttribute('data-jr-language')==='en'?'en':'fa';
  var fa=locale==='fa';
  var prefix=fa?'/fa/akhbar/':'/en/news-insights/';
  var latest=document.querySelector('[data-jr-latest]');
  var list=latest&&latest.querySelector('[data-jr-latest-list]');
  var feedStatus=latest&&latest.querySelector('[data-jr-feed-status]');
  var urgent=root.querySelector('[data-jr-breaking-status]');
  var topicLinks=Array.prototype.slice.call(document.querySelectorAll('[data-jr-news-topic]'));
  var publishedFeedItems=null,selectedTopic='all';
  function renderPublished(){
    if(!latest||!list||!feedStatus||!Array.isArray(publishedFeedItems))return;
    var approved=publishedFeedItems.filter(function(item){
      return selectedTopic==='all'||item.category===selectedTopic;
    });
    list.replaceChildren();
    approved.slice(0,9).forEach(function(item){
      var li=textEl('li');
      var time=textEl('time',null,new Intl.DateTimeFormat(
        fa?'fa-IR':'en-GB',{year:'numeric',month:'short',day:'numeric',
          timeZone:'UTC'}).format(item.date));
      time.dateTime=item.date.toISOString();
      var a=textEl('a',null,item.title);a.href=item.link;
      li.append(time,a);
      if(item.summary)li.append(textEl('p',null,item.summary));
      list.append(li);
    });
    if(approved.length){
      feedStatus.textContent=fa?
        'خبرهای دارای سند انتشار معتبر از سامانه اصلی JREI.':
        'Published updates verified by the original JREI publication record.';
    }else{
      feedStatus.textContent=fa?
        'در این دسته هنوز خبر منتشرشده و تأییدشده‌ای وجود ندارد.':
        'No verified published story is available in this news desk.';
    }
    latest.hidden=publishedFeedItems.length===0&&selectedTopic==='all';
  }
  function safeUrl(raw){
    if(typeof raw!=='string'||raw.length>300)return null;
    try{
      var url=new URL(raw,location.origin);
      if(url.origin!==location.origin||url.username||url.password||
          url.search||url.hash||!url.pathname.startsWith(prefix))return null;
      var slug=url.pathname.slice(prefix.length);
      if(!/^[a-z0-9-]{2,160}\/$/.test(slug))return null;
      return url.pathname;
    }catch(_){return null;}
  }
  function cleanText(str,max){
    if(typeof str!=='string')return '';
    return str.replace(/\s+/g,' ').trim().slice(0,max);
  }
  function textEl(tag,css,value){
    var node=document.createElement(tag);
    if(css)node.className=css;
    if(value!==undefined)node.textContent=value;
    return node;
  }
  function feedDate(s){
    var timestamp=Date.parse(s);
    if(!Number.isFinite(timestamp)||timestamp>Date.now()+60000||
       timestamp<946684800000)return null;
    return new Date(timestamp);
  }
  // A verified calendar milestone MUST be in the future. Do not reuse the
  // past-only publication timestamp guard for an upcoming event.
  function futureEventDate(s){
    if(typeof s!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(s))return null;
    var timestamp=Date.parse(s);
    if(!Number.isFinite(timestamp)||timestamp<Date.now()||
       timestamp>Date.now()+10*365*24*60*60*1000)return null;
    return new Date(timestamp);
  }
  if(latest&&list&&feedStatus&&typeof fetch==='function'&&
     typeof DOMParser!=='undefined'){
    var controller=typeof AbortController!=='undefined'?
      new AbortController():null;
    var opts={method:'GET',credentials:'omit',redirect:'error',cache:'no-store',
      headers:{'Accept':'application/rss+xml, application/xml;q=0.9'}};
    if(controller)opts.signal=controller.signal;
    fetch('/api/news/v1/rss?language='+locale,opts)
      .then(function(response){
        if(!response.ok)throw Error('feed-unavailable');
        if(!/xml|rss/i.test(response.headers.get('content-type')||''))
          throw Error('unexpected-media');
        return response.text();
      }).then(function(xml){
        if(xml.length>250000)throw Error('oversized-feed');
        var doc=new DOMParser().parseFromString(xml,'application/xml');
        if(doc.querySelector('parsererror')||!doc.querySelector('rss channel'))
          throw Error('invalid-feed');
        var items=Array.prototype.slice.call(doc.querySelectorAll('channel > item'))
          .slice(0,35),used=new Set(),valid=[];
        items.forEach(function(item){
          var link=safeUrl(item.querySelector('link')?.textContent?.trim());
          var headline=cleanText(item.querySelector('title')?.textContent,180);
          var summary=cleanText(item.querySelector('description')?.textContent,450);
          var date=feedDate(item.querySelector('pubDate')?.textContent||'');
          var kind=Array.prototype.slice.call(item.querySelectorAll('category'));
          var breaking=kind.some(function(c){
            return c.getAttribute('domain')===null&&
              cleanText(c.textContent,24)==='BREAKING';
          });
          var categoryNode=kind.find(function(c){
            return c.getAttribute('domain')==='jrei-news-topic';
          });
          var category=cleanText(categoryNode&&categoryNode.textContent,48);
          if(!/^(school|examinations|universities|employment|language|international|research)$/.test(category))
            category='unclassified';
          if(!link||!headline||!date||used.has(link))return;
          used.add(link);valid.push({link:link,title:headline,
            summary:summary,date:date,breaking:breaking,category:category});
        });
        valid.sort(function(a,b){return b.date-a.date;});
        var urgentItem=valid.find(function(item){
          return item.breaking && Date.now()-item.date.getTime()>=0 &&
            Date.now()-item.date.getTime()<=48*60*60*1000;
        });
        if(urgent&&urgentItem){
          urgent.replaceChildren();
          var urgentLink=textEl('a',null,urgentItem.title);
          urgentLink.href=urgentItem.link;
          urgent.append(urgentLink);
        }
        publishedFeedItems=valid;
        renderPublished();
      }).catch(function(){
        // An unavailable official feed is not an empty feed or proof of live
        // source monitoring. Existing static, canonical articles remain usable.
        latest.hidden=true;
      });
  }
  topicLinks.forEach(function(link){
    link.addEventListener('click',function(){
      var category=link.getAttribute('data-jr-news-topic');
      if(!/^(school|examinations|universities|employment|language|international|research)$/.test(category))
        return;
      topicLinks.forEach(function(other){other.removeAttribute('aria-current');});
      link.setAttribute('aria-current','true');
      selectedTopic=category;
      renderPublished();
      // Reuse the original PUBLISHED-only archive, with no new crawler or
      // secondary index. A normal anchor still works without JavaScript.
      var archive=document.querySelector('[data-ni-archive-search]');
      if(archive&&typeof CustomEvent==='function'){
        archive.dispatchEvent(new CustomEvent('jr-news-select-category',{
          detail:{category:category}
        }));
      }
    });
  });
  var curated=document.querySelector('.launch-news-grid');
  var curatedInput=document.querySelector('[data-jr-curated-filter]');
  var curatedEmpty=document.querySelector('[data-jr-curated-empty]');
  if(curated&&curatedInput){
    var cards=Array.prototype.slice.call(curated.querySelectorAll(':scope > .news-card'));
    var normalize=function(s){
      return String(s||'').normalize('NFKC').replace(/[يى]/g,'ی')
        .replace(/ك/g,'ک').replace(/[\u064b-\u065f]/g,'')
        .replace(/\s+/g,' ').toLocaleLowerCase();
    };
    curatedInput.addEventListener('input',function(){
      var query=normalize(curatedInput.value.trim()),visible=0;
      cards.forEach(function(card){
        var show=normalize(card.textContent).includes(query);
        card.hidden=!show;
        if(show)visible++;
      });
      if(curatedEmpty)curatedEmpty.hidden=visible!==0;
    });
  }

  var calendar=document.querySelector('[data-jr-calendar]');
  if(calendar&&typeof fetch==='function'){
    var calendarStatus=calendar.querySelector('[data-jr-calendar-status]');
    var calendarList=calendar.querySelector('[data-jr-calendar-events]');
    fetch('/api/news/v1/calendar',{method:'GET',credentials:'omit',redirect:'error',
      cache:'no-store',headers:{'Accept':'application/json'}})
      .then(function(response){
        if(!response.ok)throw Error('calendar-not-public');
        return response.json();
      }).then(function(data){
        if(data.schema!=='jr.jrei.news-approved-calendar-snapshot.v1'||
           !Array.isArray(data.events))throw Error('unexpected-calendar-contract');
        var accepted=[],now=Date.now();
        data.events.slice(0,60).forEach(function(event){
          if(event.schema!=='jr.jrei.exam-event.v1'||
             event.status!=='OFFICIAL_DATE_REVIEWED'||
             event.ownerPublicationApproved!==true||
             event.sourceVerifiedAtReadTime!==true)return;
          var title=cleanText(event[fa?'titleFa':'titleEn'],220);
          var date=futureEventDate(event.startsAt);
          var url;
          try{
            url=new URL(event.sourceUrl);
            if(url.protocol!=='https:'||url.username||url.password||
               !url.hostname.includes('.')||url.hash)return;
          }catch(_){return;}
          if(!title||!date||date.getTime()<now)return;
          accepted.push({title:title,date:date,source:url.href});
        });
        accepted.sort(function(a,b){return a.date-b.date;});
        calendarList.replaceChildren();
        accepted.slice(0,9).forEach(function(event){
          var card=textEl('article','jr-news-calendar-entry');
          var time=textEl('time',null,
            new Intl.DateTimeFormat(fa?'fa-IR':'en-GB',
              {year:'numeric',month:'short',day:'numeric',timeZone:'UTC'})
              .format(event.date)+' UTC');
          time.dateTime=event.date.toISOString();
          var heading=textEl('h3',null,event.title);
          var source=textEl('a',null,fa?'اطلاعیه رسمی':'Official source');
          source.href=event.source;
          source.rel='noopener noreferrer external';source.target='_blank';
          card.append(time,heading,source);calendarList.append(card);
        });
        calendarStatus.textContent=accepted.length?
          (fa?'رویدادهای آتی دارای تاریخ و منبع رسمی تأییدشده.':
             'Upcoming events with current, independently verified official dates.'):
          (fa?'در حال حاضر رویداد دارای تاریخ رسمی قابل نمایش ثبت نشده است.':
             'No future event with a verified official date is available.');
      }).catch(function(){
        calendarStatus.textContent=fa?
          'نمایش برخط تقویم هنوز در دسترس نیست؛ تاریخ معتبر را از اطلاعیه رسمی بررسی کنید.':
          'The public calendar is unavailable; consult the issuing authority for current dates.';
      });
  }
}());
