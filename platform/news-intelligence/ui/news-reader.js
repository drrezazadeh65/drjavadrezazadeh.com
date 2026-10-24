/* First-party news card filter by reviewed category and visible title.
 * No network requests, cookie writes, account reads or hidden index creation.
 * The full archive search is a separate, explicitly submitted operation.
 */
(function(){
  'use strict';
  var input=document.querySelector('[data-ni-list-filter]');
  var root=document.querySelector('[data-ni-news-cards]');
  var empty=document.querySelector('[data-ni-empty-result]');
  if(!input||!root)return;
  var cards=Array.prototype.slice.call(root.querySelectorAll('[data-ni-story]'));
  var tabs=Array.prototype.slice.call(
    document.querySelectorAll('[data-ni-category-select]'));
  var selected='all';
  var normalize=function(v){
    return String(v||'').normalize('NFKC')
      .replace(/[يى]/g,'ی').replace(/ك/g,'ک')
      .replace(/[\u064b-\u065f]/g,'')
      .replace(/\s+/g,' ').trim().toLocaleLowerCase();
  };
  var filter=function(){
    var q=normalize(input.value),visible=0;
    cards.forEach(function(card){
      var matchTopic=selected==='all'||
        card.getAttribute('data-ni-category')===selected;
      var matchText=!q||normalize(card.textContent).includes(q);
      var show=matchTopic&&matchText;
      card.hidden=!show;if(show)visible++;
    });
    if(empty)empty.hidden=visible!==0 || cards.length===0;
    root.setAttribute('aria-live','polite');
  };
  for(var i=0;i<tabs.length;i++){
    tabs[i].addEventListener('click',function(){
      var value=this.getAttribute('data-ni-category-select');
      if(value!=='all' && !/^[a-z-]{2,48}$/.test(value))return;
      selected=value;
      tabs.forEach(function(tab){
        tab.setAttribute('aria-pressed',
          tab.getAttribute('data-ni-category-select')===selected?'true':'false');
      });
      filter();
    });
  }
  input.addEventListener('input',filter);
  filter();
}());
