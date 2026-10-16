/* JR Public Ramzinex converter v1.0 — indicative-only, no payment or wallet claims. */
(()=>{'use strict';
const lang=document.documentElement.lang==='fa'?'fa':'en',fa=lang==='fa',path=location.pathname.replace(/index\.html$/,'');
const approved=/^\/(?:fa|en)\/(?:shop|services|khadamat|support-talented-students)\/$/.test(path);
if(!approved||document.querySelector('[data-jr-fx-converter]'))return;
const mount=document.querySelector('main');
if(!mount)return;
const el=(tag,cls='',txt='')=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt)x.textContent=txt;return x;};
const section=el('section','jr-fx-panel');section.dataset.jrFxConverter='1';section.setAttribute('aria-labelledby','jr-fx-title');
const eyebrow=el('p','jr-fx-eyebrow',fa?'نرخ عمومی بازار · رمزینکس':'Public market price · Ramzinex');
const title=el('h2','',fa?'مبدل تومان و تتر':'Toman and USDT converter');title.id='jr-fx-title';
const desc=el('p','jr-fx-intro',fa?'برآورد آموزشی از نرخ خرید و فروش بازار USDT/IRR؛ این اعداد پیش‌فاکتور، نرخ قطعی پرداخت یا تأیید تراکنش نیستند.':'Indicative estimate from public USDT/IRR buy and sell prices. Not an executable quote, payment rate or transaction confirmation.');
const grid=el('div','jr-fx-grid'),label=el('label','jr-fx-label',fa?'مبلغ به تومان':'Amount in toman'),input=el('input','jr-fx-amount'),valueCard=el('div','jr-fx-reading');
input.id='jr-fx-amount';input.type='text';input.inputMode='decimal';input.maxLength=21;input.autocomplete='off';input.placeholder=fa?'مثلاً ۱۰۰۰۰۰۰':'e.g. 1000000';
label.htmlFor=input.id;
const valTitle=el('span','jr-fx-small',fa?'مقدار تقریبی بر پایه بازه خرید/فروش':'Indicative range using public buy/sell');
const output=el('strong','jr-fx-result','— USDT');output.setAttribute('aria-live','polite');
const both=el('div','jr-fx-side'),buy=el('span','', '—'),sell=el('span','','—');
both.append(el('span','jr-fx-small',fa?'نرخ خرید (تومان): ':'Buy (toman): '),buy,
  el('span','jr-fx-small',fa?'نرخ فروش (تومان): ':'Sell (toman): '),sell);
valueCard.append(valTitle,output,both);
const inputCard=el('div','');inputCard.append(label,input);grid.append(inputCard,valueCard);
const bottom=el('div','jr-fx-bottom'),status=el('p','jr-fx-status',fa?'در حال دریافت نرخ…':'Fetching market price…'),button=el('button','jr-fx-button',fa?'تازه‌سازی نرخ':'Refresh price'),stamp=el('p','jr-fx-stamp','');
status.setAttribute('role','status');status.setAttribute('aria-live','polite');button.type='button';
bottom.append(button,status);section.append(eyebrow,title,desc,grid,bottom,stamp);
mount.append(section);
const num=new Intl.NumberFormat(fa?'fa-IR':'en-US',{maximumFractionDigits:2});
const usdt=new Intl.NumberFormat(fa?'fa-IR':'en-US',{minimumFractionDigits:0,maximumFractionDigits:6});
let rate=null,fetchedAt=0;const invalid=()=>{output.textContent='— USDT';};
const normalize=v=>v.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)))
 .replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[\s٬,]/g,'').replace('٫','.');
function calculate(){
 const raw=normalize(input.value.trim());
 if(!rate||Date.now()-fetchedAt>90000||!/^\d{1,13}(?:\.\d{1,2})?$/.test(raw)){invalid();return;}
 const amount=Number(raw);
 if(!Number.isFinite(amount)||amount>1e12){invalid();return;}
 const lo=amount/rate.sellToman,hi=amount/rate.buyToman;
 if(!Number.isFinite(lo)||!Number.isFinite(hi)){invalid();return;}
 output.textContent=usdt.format(Math.min(lo,hi))+' – '+usdt.format(Math.max(lo,hi))+' USDT';
}
async function refresh(){
 button.disabled=true;rate=null;invalid();buy.textContent='—';sell.textContent='—';stamp.textContent='';
 status.textContent=fa?'در حال دریافت نرخ تازه…':'Fetching a fresh market rate…';
 try{
  const r=await fetch('/api/rates/usdt-irt',{cache:'no-store',credentials:'omit',headers:{Accept:'application/json'},signal:AbortSignal.timeout(11000)});
  if(!r.ok)throw Error('rate_unavailable');
  const j=await r.json(),x=j?.rate;
  if(j?.ok!==true||j?.schema!=='ramzinex-usdt-irr-indicative-v1'||x?.pairId!==11||
   x?.base!=='USDT'||x?.quote!=='IRR'||x?.localUnit!=='toman'||
   x?.indicativeOnly!==true||x?.paymentQuote!==false||x?.isUsdFiatRate!==false||
   !Number.isFinite(x?.buyToman)||!Number.isFinite(x?.sellToman)||
   x.buyToman<=0||x.sellToman<=0||!Number.isFinite(Date.parse(x?.receivedAt)))throw Error('invalid_rate');
  fetchedAt=Date.parse(x.receivedAt);
  if(Math.abs(Date.now()-fetchedAt)>90000)throw Error('stale_rate');
  rate=x;buy.textContent=num.format(x.buyToman);sell.textContent=num.format(x.sellToman);
  stamp.textContent=(fa?'منبع: رمزینکس · جفت‌ارز USDT/IRR · ریال ÷ ۱۰ = تومان · زمان: ':'Source: Ramzinex · USDT/IRR · rial ÷ 10 = toman · received: ')+new Intl.DateTimeFormat(fa?'fa-IR':'en-US',{dateStyle:'medium',timeStyle:'medium'}).format(new Date(fetchedAt));
  status.textContent=fa?'نرخ نمایشی دریافت شد. برای هر مبلغ، بازه تقریبی محاسبه می‌شود.':'Indicative market rate received. Values are estimates, not invoices.';
  calculate();
 }catch(_){
  rate=null;invalid();status.textContent=fa?'نرخ معتبر در دسترس نیست؛ مبلغی برای پرداخت محاسبه نمی‌شود.':'A verified current rate is unavailable; no payable amount is calculated.';
 }finally{button.disabled=false;}
}
input.addEventListener('input',calculate);button.addEventListener('click',refresh);refresh();
})();