/* First-party multilingual news archive search.
 * Uses only the reviewed SAME-ORIGIN JREI News public search endpoint.
 * No third-party tracking, no user session storage, no HTML injection.
 */
(function(){
  'use strict';
  var host=document.querySelector('[data-ni-archive-search]');
  if(!host)return;
  var language=host.getAttribute('data-ni-language')==='en'?'en':'fa';
  var fa=language==='fa';
  var copy=fa?{
    search:'جست‌وجوی آرشیو اخبار',submit:'جست‌وجو',
    placeholder:'عنوان آزمون، نام دانشگاه یا موضوع',
    category:'موضوع',all:'همه موضوعات',country:'کشور (کد دوحرفی)',
    from:'از تاریخ',to:'تا تاریخ',
    none:'خبری مطابق جست‌وجوی شما پیدا نشد.',
    failed:'دریافت نتیجه فعلاً ممکن نیست.',unavailable:'آرشیو اخبارِ تأییدشده هنوز فعال نشده است. مقاله‌های موجود در صفحه همچنان قابل مطالعه‌اند.',
    found:'نتیجه یافت شد',read:'مطالعه خبر'
  }:{
    search:'Search the full news archive',submit:'Search',
    placeholder:'Examination, institution or topic',
    category:'Topic',all:'All topics',country:'Country (two-letter code)',
    from:'From date',to:'Until date',
    none:'No matching published news was found.',
    failed:'Search is temporarily unavailable.',unavailable:'The approved news archive has not yet been activated. Existing articles remain available above.',
    found:'results',read:'Read story'
  };
  var topics=[
    ['',''],['school',fa?'مدارس':'Schools'],
    ['examinations',fa?'آزمون‌ها':'Exams'],
    ['universities',fa?'دانشگاه‌ها':'Universities'],
    ['employment',fa?'استخدام':'Employment'],
    ['language',fa?'آموزش زبان':'Language'],
    ['international',fa?'بین‌الملل':'International'],
    ['research',fa?'پژوهش':'Research']
  ];
  function element(tag,cls,text){
    var x=document.createElement(tag);
    if(cls)x.className=cls;
    if(text!==undefined)x.textContent=text;
    return x;
  }
  function group(label,field){
    var box=element('label','ni-search-field');
    var span=element('span',null,label);
    box.append(span,field);return box;
  }
  var form=element('form','ni-archive-form');
  var input=element('input');
  input.type='search';input.name='q';input.maxLength=160;
  input.required=true;input.placeholder=copy.placeholder;
  input.autocomplete='off';
  var topic=element('select');topic.name='category';
  topics.forEach(function(t){
    var option=element('option',null,t[1]||copy.all);option.value=t[0];
    topic.append(option);
  });
  var country=element('input');country.name='country';country.type='text';
  country.maxLength=2;country.pattern='[A-Za-z]{2}';
  country.placeholder=fa?'IR / GB / US':'IR / GB / US';
  var from=element('input');from.name='after';from.type='date';
  var to=element('input');to.name='before';to.type='date';
  var submit=element('button','ni-search-submit',copy.submit);submit.type='submit';
  form.append(group(copy.search,input),group(copy.category,topic),
    group(copy.country,country),group(copy.from,from),group(copy.to,to),
    submit);
  var status=element('p','ni-search-status');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  var list=element('div','ni-archive-results');
  host.append(form,status,list);
  var inflight=null;
  function utcEpoch(date,isEnd){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
    var ms=Date.parse(date+'T'+(isEnd?'23:59:59':'00:00:00')+'Z');
    return Number.isFinite(ms)?String(Math.floor(ms/1000)):null;
  }
  form.addEventListener('submit',async function(event){
    event.preventDefault();if(inflight)inflight.abort();
    inflight=new AbortController();list.replaceChildren();
    submit.disabled=true;status.textContent=fa?'در حال جست‌وجو…':'Searching…';
    try{
      var params=new URLSearchParams();
      params.set('q',input.value.trim());params.set('language',language);
      if(topic.value)params.set('category',topic.value);
      if(country.value.trim())params.set('country',country.value.trim().toUpperCase());
      if(from.value)params.set('after',utcEpoch(from.value,false));
      if(to.value)params.set('before',utcEpoch(to.value,true));
      var response=await fetch('/api/news/v1/search?'+params.toString(),{
        credentials:'same-origin',redirect:'error',cache:'no-store',
        signal:inflight.signal,headers:{'Accept':'application/json'}});
      if(response.status===503)throw Error('ARCHIVE_NOT_ENABLED');
      if(!response.ok)throw Error('NOT_AVAILABLE');
      var data=await response.json();
      if(data.schema!=='jr.jrei.news-public-search.v1'||
        !Array.isArray(data.results))throw Error('RESULT_NOT_AUTHORIZED');
      status.textContent=data.results.length?
        data.results.length+' '+copy.found:copy.none;
      for(var i=0;i<data.results.length;i++){
        var item=data.results[i];
        var url;
        try{url=new URL(item.url,location.origin);}catch{continue;}
        if(url.origin!==location.origin||
          !url.pathname.startsWith('/'+language+'/'))continue;
        var card=element('article','ni-search-result');
        var h=element('h3');var a=element('a');
        a.href=url.pathname;a.textContent=String(item.headline||copy.read);
        h.append(a);
        var summary=element('p',null,String(item.summary||''));
        card.append(h,summary);list.append(card);
      }
    }catch(error){
      if(error.name!=='AbortError')
        status.textContent=error.message==='ARCHIVE_NOT_ENABLED'?
          copy.unavailable:copy.failed;
    }finally{if(inflight&&inflight.signal.aborted===false)submit.disabled=false;}
  });
}());
