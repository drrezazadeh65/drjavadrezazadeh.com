/* JREI NEWS — complete 21-section public reader.
 * Original RSS/search and official-source calendar only.
 * Zero fabricated headlines, traffic scores, publication dates or deadlines.
 * No cookies, storage, user profiling, second model or external API.
 */
(function(){
  'use strict';
  var root=document.querySelector('.jrn21[data-jrn21]');
  if(!root)return;
  var locale=root.getAttribute('data-jr-language')==='en'?'en':'fa';
  var fa=locale==='fa';
  var prefix=fa?'/fa/akhbar/':'/en/news-insights/';
  var topics=['school','examinations','universities','employment',
    'language','international','research'];
  var feed=[];
  function text(s,max){
    return typeof s==='string'?s.replace(/\s+/g,' ').trim().slice(0,max):'';
  }
  function node(tag,cls,content){
    var n=document.createElement(tag);
    if(cls)n.className=cls;
    if(typeof content==='string')n.textContent=content;
    return n;
  }
  function date(s,allowFuture){
    if(typeof s!=='string'||s.length>80)return null;
    var t=Date.parse(s);
    if(!Number.isFinite(t)||t<946684800000)return null;
    var diff=t-Date.now();
    if(allowFuture){
      if(diff<0||diff>10*365*86400000)return null;
    }else if(diff>60000)return null;
    return new Date(t);
  }
  function formatDate(value){
    try{
      return new Intl.DateTimeFormat(fa?'fa-IR':'en-GB',{
        year:'numeric',month:'short',day:'numeric',timeZone:'UTC'
      }).format(value);
    }catch(_){return value.toISOString().slice(0,10);}
  }
  function storyUrl(s){
    if(typeof s!=='string'||s.length>320)return null;
    try{
      var url=new URL(s,location.origin);
      if(url.origin!==location.origin||url.username||url.password||
         url.search||url.hash||!url.pathname.startsWith(prefix))return null;
      var tail=url.pathname.slice(prefix.length);
      return /^[a-z0-9-]{2,160}\/$/.test(tail)?url.pathname:null;
    }catch(_){return null;}
  }
  function officialUrl(s){
    if(typeof s!=='string'||s.length>1000)return null;
    try{
      var url=new URL(s);
      if(url.protocol!=='https:'||url.username||url.password||url.hash||
         !url.hostname.includes('.')||/^\d+(\.\d+){3}$/.test(url.hostname)||
         /\.local$|\.internal$|\.localhost$|\.test$/i.test(url.hostname))
        return null;
      return url.href;
    }catch(_){return null;}
  }
  function fromRss(xml){
    if(typeof xml!=='string'||xml.length>280000)throw Error('large-rss');
    var doc=new DOMParser().parseFromString(xml,'application/xml');
    if(doc.querySelector('parsererror')||!doc.querySelector('rss channel'))
      throw Error('bad-rss');
    var rows=[],seen=new Set();
    Array.prototype.slice.call(doc.querySelectorAll('channel > item'),0,100)
      .forEach(function(item){
        var path=storyUrl(item.querySelector('link')?.textContent?.trim());
        var title=text(item.querySelector('title')?.textContent,200);
        var summary=text(item.querySelector('description')?.textContent,540);
        var time=date(item.querySelector('pubDate')?.textContent||'',false);
        if(!path||title.length<4||!time||seen.has(path))return;
        seen.add(path);
        var tags=Array.prototype.slice.call(item.querySelectorAll('category'));
        var topic=tags.find(function(tag){
          return tag.getAttribute('domain')==='jrei-news-topic';
        });
        var event=tags.find(function(tag){
          return tag.getAttribute('domain')==='jrei-news-event';
        });
        var category=text(topic?.textContent,48);
        if(!topics.includes(category))category='unclassified';
        var kind=text(event?.textContent,64);
        if(!/^[a-z0-9_-]{2,64}$/.test(kind))kind='general';
        var urgent=tags.some(function(tag){
          return !tag.getAttribute('domain') &&
            text(tag.textContent,24)==='BREAKING';
        }) && Date.now()-time.getTime()<=48*3600*1000;
        rows.push({path:path,title:title,summary:summary,time:time,
          category:category,kind:kind,urgent:urgent});
      });
    return rows.sort(function(a,b){return b.time-a.time;});
  }
  var categoryLabels=fa?{
    school:'آموزش‌وپرورش',examinations:'کنکور و آزمون‌ها',
    universities:'دانشگاه‌ها',employment:'استخدام',
    language:'آموزش زبان',international:'بین‌الملل',
    research:'پژوهش و فناوری',unclassified:'خبر معتبر'
  }:{
    school:'School Education',examinations:'Entrance Examinations',
    universities:'Universities',employment:'Employment',
    language:'Language Education',international:'International',
    research:'Research & EdTech',unclassified:'Verified news'
  };
  function showFeed(type,rows,max){
    var list=root.querySelector('[data-jrn21-feed="'+type+'"]');
    if(!list)return;
    var portion=rows.slice(0,max||6);
    list.replaceChildren();
    portion.forEach(function(item){
      var li=node('li','jrn21-story');
      var meta=node('div','jrn21-story-time');
      var time=node('time',null,formatDate(item.time));
      time.dateTime=item.time.toISOString();
      meta.append(time);
      meta.append(node('span','jrn21-story-label',
        categoryLabels[item.category]||categoryLabels.unclassified));
      var heading=node('h3');
      var anchor=node('a',null,item.title);anchor.href=item.path;
      heading.append(anchor);
      li.append(meta,heading);
      if(item.summary)li.append(node('p',null,item.summary));
      list.append(li);
    });
    var section=list.closest('.jrn21-section');
    var empty=section&&section.querySelector('[data-jrn21-empty]');
    if(empty)empty.hidden=Array.prototype.some.call(
      section.querySelectorAll('.jrn21-story-grid,.jrn21-event-list'),
      function(group){return group.children.length>0;});
    list.hidden=portion.length===0;
  }
  function setLead(){
    var lead=root.querySelector('[data-jrn21-lead]');
    var first=feed[0];
    if(!lead||!first)return;
    var heading=lead.querySelector('[data-jrn21-lead-title]');
    var summary=lead.querySelector('[data-jrn21-lead-summary]');
    var link=lead.querySelector('[data-jrn21-lead-link]');
    var time=lead.querySelector('[data-jrn21-lead-time]');
    if(!heading||!summary||!link||!time)return;
    heading.textContent=first.title;
    summary.textContent=first.summary;
    link.href=first.path;
    time.dateTime=first.time.toISOString();
    time.textContent=formatDate(first.time);
    time.hidden=false;
  }
  function setBreaking(){
    var box=root.querySelector('[data-jrn21-breaking]');
    var urgent=feed.find(function(x){return x.urgent;});
    if(!box||!urgent)return;
    box.replaceChildren();
    var link=node('a',null,urgent.title);
    link.href=urgent.path;
    box.append(link);
    var published=node('small',null,' · '+formatDate(urgent.time));
    box.append(published);
  }
  function updateFeeds(){
    showFeed('latest',feed,9);
    showFeed('official',feed,6);
    var deadlinePattern=/register|deadline|application|closing|submit|extension|ثبت.?نام|مهلت|تمدید/i;
    var resultPattern=/result|score|admission-result|نتیجه|نتایج|کارنامه|قبولی/i;
    showFeed('deadline-reports',feed.filter(function(item){
      return deadlinePattern.test(item.kind+' '+item.title);
    }),5);
    showFeed('results-reports',feed.filter(function(item){
      return resultPattern.test(item.kind+' '+item.title);
    }),5);
    ['universities','international','school','employment'].forEach(function(cat){
      showFeed(cat,feed.filter(function(item){return item.category===cat;}),4);
    });
    var ai=/\b(?:ai|edtech|machine learning|artificial intelligence|learning technology)\b|هوش مصنوعی|فناوری آموزشی|یادگیری ماشین/i;
    showFeed('research',feed.filter(function(x){
      return x.category==='research' && ai.test(x.title+' '+x.summary);
    }),4);
    var correction=/correct|retract|amend|withdraw|revision|appeal|اصلاح|تکذیب|ابطال|تغییر/i;
    showFeed('corrections',feed.filter(function(x){
      return correction.test(x.kind)||
        (x.category==='examinations'&&correction.test(x.title));
    }),4);
    setLead();setBreaking();
    updatePersonal();
  }
  function updatePersonal(){
    var select=root.querySelector('[data-jrn21-personal-form] select[name="category"]');
    if(!select)return;
    var value=topics.includes(select.value)?select.value:'all';
    var rows=value==='all'?feed:feed.filter(function(x){return x.category===value;});
    showFeed('personal',rows,6);
  }
  var personal=root.querySelector('[data-jrn21-personal-form]');
  if(personal)personal.addEventListener('submit',function(event){
    event.preventDefault();updatePersonal();
  });
  function selectArchive(category,query){
    var search=document.querySelector('[data-ni-archive-search]');
    if(!search)return;
    var select=search.querySelector('select[name="category"]');
    var input=search.querySelector('input[name="q"]');
    if(select)select.value=category;
    if(input)input.value=query||'';
    if(typeof CustomEvent==='function'){
      search.dispatchEvent(new CustomEvent('jr-news-select-category',{
        detail:{category:category,query:query||''}
      }));
    }
  }
  root.addEventListener('click',function(event){
    var target=event.target.closest('[data-jrn21-category]');
    if(!target||!root.contains(target))return;
    var category=target.getAttribute('data-jrn21-category');
    if(!topics.includes(category))return;
    selectArchive(category,text(target.getAttribute('data-jrn21-query'),160));
    // The original fragment link remains functional if the search endpoint is disabled.
  });
  if(typeof fetch==='function'&&typeof DOMParser!=='undefined'){
    fetch('/api/news/v1/rss?language='+locale,{
      method:'GET',credentials:'omit',redirect:'error',cache:'no-store',
      headers:{Accept:'application/rss+xml, application/xml;q=0.9'}
    }).then(function(response){
      if(!response.ok)throw Error('rss-not-available');
      if(!/rss|xml/i.test(response.headers.get('content-type')||''))
        throw Error('rss-media');
      return response.text();
    }).then(function(xml){
      feed=fromRss(xml);
      updateFeeds();
    }).catch(function(){
      // No fabricated stories, private fallbacks or misleading "live" claims.
      feed=[];updateFeeds();
    });
  }
  function verifiedEvents(data){
    if(!data||data.schema!=='jr.jrei.news-approved-calendar-snapshot.v1'||
       !Array.isArray(data.events))throw Error('calendar-schema');
    var seen=new Set(),events=[];
    data.events.slice(0,120).forEach(function(item){
      if(item.schema!=='jr.jrei.exam-event.v1'||
         item.status!=='OFFICIAL_DATE_REVIEWED'||
         item.ownerPublicationApproved!==true||
         item.sourceVerifiedAtReadTime!==true)return;
      var title=text(item[fa?'titleFa':'titleEn'],220);
      // Event dates are future timestamps; keep them separate from the
      // already-published RSS timestamp contract.
      var time=date(item.startsAt,true);
      var source=officialUrl(item.sourceUrl);
      var key=text(item.eventId,60);
      if(title.length<4||!time||!source||key.length<12||seen.has(key))return;
      seen.add(key);
      events.push({title:title,time:time,source:source,
        kind:text(item.milestone,64)});
    });
    return events.sort(function(a,b){return a.time-b.time;});
  }
  function showEvents(type,items,max){
    var list=root.querySelector('[data-jrn21-event="'+type+'"]');
    if(!list)return;
    var entries=items.slice(0,max||9);
    list.replaceChildren();
    entries.forEach(function(event){
      var li=node('li','jrn21-event');
      var when=node('time','jrn21-event-date',formatDate(event.time));
      when.dateTime=event.time.toISOString();
      var body=node('div');
      var heading=node('strong',null,event.title);
      var source=node('a',null,fa?'اصل اطلاعیه رسمی':'Original official notice');
      source.href=event.source;source.target='_blank';
      source.rel='noopener noreferrer external';
      body.append(heading,source);li.append(when,body);list.append(li);
    });
    var section=list.closest('.jrn21-section');
    var empty=section&&section.querySelector('[data-jrn21-empty]');
    if(empty)empty.hidden=Array.prototype.some.call(
      section.querySelectorAll('.jrn21-story-grid,.jrn21-event-list'),
      function(group){return group.children.length>0;});
    list.hidden=entries.length===0;
  }
  if(typeof fetch==='function'){
    fetch('/api/news/v1/calendar',{
      method:'GET',credentials:'omit',redirect:'error',cache:'no-store',
      headers:{Accept:'application/json'}
    }).then(function(response){
      if(!response.ok)throw Error('calendar-unavailable');
      return response.json();
    }).then(function(data){
      var events=verifiedEvents(data);
      var deadline=/register|deadline|application|closing|submit|ثبت.?نام|مهلت|تمدید/i;
      var result=/result|score|admission-result|نتیجه|نتایج|کارنامه|قبولی/i;
      showEvents('upcoming',events,12);
      showEvents('deadline',events.filter(function(x){
        return deadline.test(x.kind+' '+x.title);
      }),9);
      showEvents('results',events.filter(function(x){
        return result.test(x.kind+' '+x.title);
      }),9);
    }).catch(function(){
      // Original route may remain unmounted. Honest, useful state is already
      // present in the server-rendered 21-section HTML.
    });
  }
}());
