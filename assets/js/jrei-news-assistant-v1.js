/**
 * Article-specific companion to the EXISTING site-wide JREI assistant.
 * No extra chatbot, no direct model API, no auto-sending user questions.
 * After a deliberate click, only prefills the existing assistant textarea.
 * The original assistant retains its provider consent/privacy requirements.
 */
(function(){
  'use strict';
  var article=document.querySelector('.ni-article');
  var box=article&&article.querySelector('[data-jrei-news-context]');
  var slot=box&&box.querySelector('[data-jrei-existing-assistant-slot]');
  if(!box||!slot)return;
  var language=document.documentElement.lang==='en'?'en':'fa';
  var headline=article.querySelector('h1')?.textContent?.trim()||'';
  var articleUrl=location.origin+location.pathname;
  var fa=language==='fa';
  var question=fa?
    'این خبر درباره «'+headline+'» برای من چه معنایی دارد؟ '+
    'گام بعدی، مهلت‌های رسمی و منابع معتبر را توضیح بده. '+
    'نشانی خبر: '+articleUrl:
    'What does this announcement mean for my educational future? '+
    'Explain the official deadlines, next steps and reliable sources. '+
    'Article: '+articleUrl+' — '+headline;
  var suggested=fa?[
    'این خبر شامل حال من می‌شود؟',
    'گام بعدی و مهلت رسمی چیست؟',
    'برای آزمون مرتبط چگونه آماده شوم؟',
    'لینک رسمی و اطلاعات معتبر کجاست؟'
  ]:[
    'Does this announcement apply to me?',
    'What is the next step and official deadline?',
    'How can I prepare for the related examination?',
    'Where is the verified official source?'
  ];
  var instructions=document.createElement('p');
  instructions.textContent=fa?
    'پرسش شما در دستیار اصلی JREI آماده می‌شود؛ بدون تأیید و ارسال شما پردازش نخواهد شد.':
    'Your question is prepared in the original JREI assistant, but never sent without your action.';
  slot.append(instructions);
  function openOriginalAssistant(asked){
    var original=document.querySelector('.jr-assistant');
    var launcher=original?.querySelector('.jr-assistant-launcher');
    var panel=original?.querySelector('.jr-assistant-panel');
    var textarea=original?.querySelector('#jr-assistant-input');
    if(!launcher||!panel||!textarea){
      instructions.textContent=fa?
        'دستیار اصلی سایت اکنون در این صفحه در دسترس نیست.':
        'The existing site assistant is not available on this page.';
      return;
    }
    if(panel.hidden)launcher.click();
    var safe=String(asked).slice(0,1400);
    textarea.value=safe;
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
    textarea.focus();
    // Neither form.submit() nor new HTTP request is allowed here.
  }
  var primary=document.createElement('button');
  primary.type='button';primary.className='ni-ai-open';
  primary.textContent=fa?'از JREI بپرسید':'Ask JREI about this news';
  primary.addEventListener('click',function(){openOriginalAssistant(question);});
  slot.append(primary);
  var options=document.createElement('div');options.className='ni-ai-suggestions';
  suggested.forEach(function(label){
    var button=document.createElement('button');
    button.type='button';button.textContent=label;
    button.addEventListener('click',function(){
      openOriginalAssistant(label+'\n'+(fa?'خبر: ':'News: ')+
        headline+'\n'+articleUrl);
    });
    options.append(button);
  });
  slot.append(options);
}());
