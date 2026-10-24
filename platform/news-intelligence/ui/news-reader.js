/* JREI Newsroom homepage — browser-only filter of rendered public cards.
 * No network, cookies, localStorage, analytics, personal data or public API.
 * The official archive search must be provided by the reviewed backend.
 */
(function(){
  'use strict';
  var input=document.querySelector('[data-ni-list-filter]');
  var root=document.querySelector('[data-ni-news-cards]');
  var empty=document.querySelector('[data-ni-empty-result]');
  if(!input||!root)return;
  var cards=Array.prototype.slice.call(root.querySelectorAll('[data-ni-story]'));
  var normalize=function(v){
    return String(v||'').normalize('NFKC')
      .replace(/[يى]/g,'ی').replace(/ك/g,'ک')
      .replace(/[\u064b-\u065f]/g,'')
      .replace(/\s+/g,' ').trim().toLocaleLowerCase();
  };
  var filter=function(){
    var q=normalize(input.value),visible=0;
    cards.forEach(function(card){
      var match=!q||normalize(card.textContent).indexOf(q)>=0;
      card.hidden=!match;if(match)visible++;
    });
    if(empty)empty.hidden=visible!==0;
    root.setAttribute('aria-live','polite');
  };
  input.addEventListener('input',filter);
  filter();
}());
