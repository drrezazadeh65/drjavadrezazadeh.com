/* Question-led navigation helper: transparent local keyword matching.
 * Not generative AI, not personalized profiling, no network or persistence.
 */
(() => {
  'use strict';
  const field=document.getElementById('need');
  const panel=document.getElementById('jr-path-suggestion');
  const link=document.getElementById('jr-path-suggestion-link');
  const summary=document.getElementById('jr-path-suggestion-copy');
  if(!field||!panel||!link||!summary)return;
  const fa=document.documentElement.lang==='fa';
  const tiles=[...document.querySelectorAll('#paths a.tile[href]')];
  const categories=[
    {terms:['استعداد','توانایی','علاقه','aptitude','talent','strength'],index:0},
    {terms:['درس','مطالعه','یادگیری','تکنیک','bahar','study','learn'],index:1},
    {terms:['کارنامه','تراز','رتبه','درصد','آزمون','scorecard','grade','exam'],index:2},
    {terms:['دانشگاه','رشته','قبولی','پذیرش','university','admission','degree'],index:3},
    {terms:['رشد','برنامه','پیشرفت','هدف','development','growth','plan'],index:4},
    {terms:['مقایسه','تصمیم','انتخاب','گزینه','compare','choice','decision'],index:5}
  ];
  const fold=value=>value.toLowerCase().normalize('NFKC')
    .replace(/[يى]/g,'ی').replace(/ك/g,'ک')
    .replace(/[\u200c\u200d]/g,'').replace(/\s+/g,' ').trim();
  const hints=fa?[
    'پیشنهاد بر اساس واژه‌های واردشده در همین صفحه',
    'این پیشنهاد فقط راهنماست؛ می‌توانید هر مسیر دیگری را انتخاب کنید.'
  ]:[
    'Suggested by local keyword matching',
    'This is navigation assistance only; you can choose any other path.'
  ];
  function update(){
    const value=fold(field.value);
    if(value.length<3){panel.hidden=true;return;}
    let best=null;
    for(const category of categories){
      const tile=tiles[category.index];
      if(!tile)continue;
      const hits=category.terms.reduce((count,term)=>count+(value.includes(fold(term))?1:0),0);
      if(hits>0&&(!best||hits>best.hits))best={tile,hits};
    }
    if(!best){panel.hidden=true;return;}
    // Never synthesize destinations: reuse an existing, authored tile href.
    const href=best.tile.getAttribute('href');
    if(!href||!href.startsWith('/')||href.startsWith('//')){panel.hidden=true;return;}
    summary.textContent=hints[0]+': '+best.tile.querySelector('strong')?.textContent;
    link.href=href;
    link.textContent=fa?'بازکردن مسیر پیشنهادی':'Open suggested path';
    panel.hidden=false;
  }
  field.addEventListener('input',update);
  update();
})();