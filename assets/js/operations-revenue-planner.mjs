/* JR Revenue Scenario Studio: admin-only, local, explicitly hypothetical.
 * Static PUBLIC catalog prices only. Never reads, stores or reports customer records.
 */
import {forecastRevenue} from './revenue-planner-model.mjs';

const host=document.querySelector('[data-jr-revenue-planner]');
const workspace=document.getElementById('ops-workspace');
if(host && workspace){
  const fa=document.documentElement.lang==='fa';
  const t=(a,b)=>fa?a:b;
  const model={
    IRT:{goal:'',goalMetric:'GROSS',fixed:'',reserve:'',available:'',lines:[
      {product:'SERVICE:talent_initial',quantity:'',unitCost:'',minutes:''},
      {product:'SERVICE:academic_consult_60',quantity:'',unitCost:'',minutes:'60'},
      {product:'VIP:institutional-advisory',quantity:'',unitCost:'',minutes:''}
    ]},
    USD:{goal:'10000',goalMetric:'CONTRIBUTION',fixed:'',reserve:'',available:'',lines:[
      {name:'Digital assessments',price:'',quantity:'',unitCost:'',minutes:''},
      {name:'Specialist consultations',price:'',quantity:'',unitCost:'',minutes:''},
      {name:'Institutional services',price:'',quantity:'',unitCost:'',minutes:''}
    ]}
  };
  let currency=fa?'IRT':'USD',catalog=[];
  function el(tag,cls,text){
    const x=document.createElement(tag);if(cls)x.className=cls;
    if(text!==undefined)x.textContent=text;return x;
  }
  const numeric=(value,{step='1',max=null}={})=>{
    const input=el('input');input.type='number';input.min='0';input.step=step;
    input.inputMode='decimal';input.value=String(value??'');
    if(max!==null)input.max=String(max);
    return input;
  };
  function field(title,input){
    const label=el('label','jr-revenue-field');
    label.append(el('span','jr-revenue-label',title),input);
    return label;
  }
  function minor(raw,mode){
    const v=String(raw??'').trim();
    if(!v)return 0;
    if(!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(v)||(mode==='IRT'&&v.includes('.')))throw new RangeError('invalid money');
    const n=Number(v)*(mode==='USD'?100:1);
    if(!Number.isFinite(n)||!Number.isSafeInteger(Math.round(n))||n<0)throw new RangeError('invalid money');
    return Math.round(n);
  }
  function whole(raw){
    const v=String(raw??'').trim();if(!v)return 0;
    if(!/^(0|[1-9]\d*)$/.test(v)||!Number.isSafeInteger(Number(v)))throw new RangeError('invalid count');
    return Number(v);
  }
  function minutes(raw){
    const v=String(raw??'').trim();
    if(!v)return null;
    const n=Number(v);
    if(!/^\d+(?:\.\d{1,2})?$/.test(v)||!Number.isSafeInteger(Math.round(n*60)))throw new RangeError('invalid delivery hours');
    return Math.round(n*60);
  }
  function money(v){
    const n=currency==='USD'?v/100:v;
    return n.toLocaleString(fa?'fa-IR':'en-US',{minimumFractionDigits:currency==='USD'?2:0,maximumFractionDigits:currency==='USD'?2:0})+(currency==='USD'?' USD':t(' تومان',' toman'));
  }
  const note=el('p','ops-muted');
  note.textContent=t('همهٔ مقادیر این بخش فرضی و فقط برای تصمیم‌سازی‌اند؛ قیمت‌های کاتالوگ از منبع عمومی سایت خوانده می‌شوند. این صفحه هیچ پرداخت، قرارداد یا درآمد واقعی را تأیید نمی‌کند. اطلاعات در مرورگر ذخیره یا ارسال نمی‌شوند.',
    'All figures are planning assumptions, not transactions, contracts or verified income. Local prices use the published catalog. No scenario inputs are stored, submitted or tracked.');
  host.append(note);
  const main=el('div','jr-revenue-form'),result=el('div','jr-revenue-results');
  host.append(main,result);
  const current=()=>model[currency];
  function render(){
    main.replaceChildren();result.replaceChildren();
    const top=el('div','jr-revenue-controls');
    const unit=el('select');
    for(const [code,label] of [['IRT',t('بازار ایران — تومان','Iran — toman')],['USD',t('بازار بین‌الملل — دلار (فرضی)','International — USD (hypothetical)')]]){
      const opt=el('option','',label);opt.value=code;unit.append(opt);
    }
    unit.value=currency;unit.addEventListener('change',()=>{currency=unit.value;render()});
    top.append(field(t('بازار و واحد پول','Market and currency'),unit));
    const s=current();
    const goal=numeric(s.goal,{step:currency==='USD'?'0.01':'1'});
    goal.addEventListener('input',()=>{s.goal=goal.value;update()});
    const metric=el('select');
    for(const [code,label] of [
      ['GROSS',t('فروش ناخالص پیش از هزینه‌ها','Gross sales before costs')],
      ['CONTRIBUTION',t('مانده پس از هزینه‌های واردشده (پیش از مالیات)','Contribution after entered costs (before tax)')]
    ]){
      const option=el('option','',label);option.value=code;metric.append(option);
    }
    metric.value=s.goalMetric;
    metric.addEventListener('change',()=>{s.goalMetric=metric.value;render()});
    top.append(field(t('نوع هدف ماهانه','Monthly goal measure'),metric));
    top.append(field(t('مبلغ هدف ماهانه','Monthly goal amount'),goal));
    main.append(top);
    const list=el('div','jr-revenue-lines');
    for(const [idx,line] of s.lines.entries()){
      const card=el('fieldset','jr-revenue-line');
      const legend=el('legend','',t('مسیر فروش ','Offer stream ')+(idx+1));card.append(legend);
      const fields=el('div','jr-revenue-controls');
      let selected=null;
      if(currency==='IRT'){
        const choice=el('select');choice.setAttribute('aria-label',t('خدمت یا کتاب','Service or book'));
        for(const entry of catalog){
          const option=el('option','',entry.title);option.value=entry.key;choice.append(option);
        }
        if(catalog.length){
          if(!catalog.some(x=>x.key===line.product))line.product=catalog[idx%catalog.length].key;
          choice.value=line.product;selected=catalog.find(x=>x.key===line.product);
        }else{
          const option=el('option','',t('کاتالوگ در دسترس نیست','Catalog unavailable'));option.value='';choice.append(option);
          choice.disabled=true;
        }
        choice.addEventListener('change',()=>{line.product=choice.value;const item=catalog.find(x=>x.key===line.product);line.minutes=item?.duration??'';render()});
        fields.append(field(t('خدمت موجود در کاتالوگ','Existing catalog offering'),choice));
      }else{
        fields.append(el('strong','jr-revenue-label',line.name));
      }
      const price=numeric(currency==='IRT'?(selected?.price??''):line.price,{step:currency==='USD'?'0.01':'1'});
      if(currency==='IRT'){price.readOnly=true;price.title=t('قیمتِ منبع کاتالوگ؛ از اینجا تغییر نمی‌کند','Published catalog price, not editable here');}
      else price.addEventListener('input',()=>{line.price=price.value;update()});
      fields.append(field(t('قیمت هر فروش','Price per sale')+(currency==='IRT'?t(' (کاتالوگ)',' (catalog)'):''),price));
      const qty=numeric(line.quantity);qty.addEventListener('input',()=>{line.quantity=qty.value;update()});
      fields.append(field(t('فروش فرضی در ماه','Assumed sales per month'),qty));
      const cost=numeric(line.unitCost,{step:currency==='USD'?'0.01':'1'});cost.addEventListener('input',()=>{line.unitCost=cost.value;update()});
      fields.append(field(t('هزینه متغیر هر فروش','Delivery cost per sale'),cost));
      const hours=numeric(line.minutes===''?'':Number(line.minutes)/60,{step:'0.25'});
      if(currency==='IRT'&&selected?.duration!=null&&line.minutes==='')hours.placeholder=String(selected.duration/60);
      hours.addEventListener('input',()=>{line.minutes=hours.value===''?'':String(Math.round(Number(hours.value)*60));update()});
      fields.append(field(t('ساعت کار لازم برای هر فروش','Delivery hours per sale'),hours));
      card.append(fields);list.append(card);
    }
    main.append(list);
    const extras=el('div','jr-revenue-controls');
    const fixed=numeric(s.fixed,{step:currency==='USD'?'0.01':'1'});fixed.addEventListener('input',()=>{s.fixed=fixed.value;update()});
    extras.append(field(t('هزینه‌های ثابت ماهانه','Monthly fixed costs'),fixed));
    const reserve=numeric(s.reserve,{step:'0.01',max:'100'});reserve.addEventListener('input',()=>{s.reserve=reserve.value;update()});
    extras.append(field(t('ذخیره احتیاطی بازپرداخت (%)','Refund reserve (%)'),reserve));
    const available=numeric(s.available,{step:'0.25'});available.addEventListener('input',()=>{s.available=available.value;update()});
    extras.append(field(t('ساعات قابل ارائه در ماه','Monthly available delivery hours'),available));
    main.append(extras);
    if(currency==='IRT'&&!catalog.length){main.append(el('p','jr-revenue-warning',t('قیمت‌های کاتالوگ دریافت نشد. محاسبات این بازار تا اتصال معتبر متوقف است.','Catalog pricing could not be loaded. Domestic forecast is unavailable.')));}
    update();
  }
  function update(){
    result.replaceChildren();
    const s=current();if(currency==='IRT'&&!catalog.length)return;
    try {
      const lines=s.lines.map(line=>{
        const entry=currency==='IRT'?catalog.find(x=>x.key===line.product):null;
        if(currency==='IRT'&&!entry)throw new RangeError('missing catalog entry');
        return {quantity:whole(line.quantity),unitPriceMinor:currency==='IRT'?entry.price:minor(line.price,currency),
          unitCostMinor:minor(line.unitCost,currency),minutesPerUnit:line.minutes===''?null:whole(line.minutes)};
      });
      const refundPct=s.reserve===''?0:Number(s.reserve);
      if(!Number.isFinite(refundPct)||refundPct<0||refundPct>100)throw new RangeError('invalid reserve');
      const reserveBps=Math.round(refundPct*100);
      const forecast=forecastRevenue({currency,lines,monthlyGoalMinor:minor(s.goal,currency),
        fixedCostMinor:minor(s.fixed,currency),refundReserveBasisPoints:reserveBps,
        availableMinutes:minutes(s.available),goalMetric:s.goalMetric});
      const grid=el('div','ops-grid');
      const card=(name,value,subtitle)=>{
        const article=el('article','ops-card');
        article.append(el('small','',name),el('div','ops-number',value),el('small','',subtitle));grid.append(article);
      };
      card(t('فروش ناخالصِ فرضی','Hypothetical gross sales'),money(forecast.grossMinor),t('نه گردش مالی واقعی','Not observed transactions'));
      card(t('ذخیره استرداد','Refund reserve'),money(forecast.reserveMinor),t('فرض انتخابی شما','Your own assumption'));
      card(t('سهم پس از هزینه‌های واردشده','Contribution after entered costs'),money(forecast.contributionMinor),t('بدون هزینه‌های ثبت‌نشده یا مالیات','Excludes unentered costs and taxes'));
      card(s.goalMetric==='CONTRIBUTION'
        ?t('فاصله تا هدف مانده عملیاتی','Contribution goal shortfall')
        :t('فاصله تا هدف فروش ناخالص','Gross sales goal shortfall'),
        s.goal!==''?money(forecast.selectedGoalGapMinor):t('هدف تعیین نشده','No goal entered'),
        t('فرضی، پیش از مالیات و هزینه‌های لحاظ‌نشده','Hypothetical; excludes taxes and unentered costs'));
      card(t('حجم فروش موردنیاز در سناریو','Assumed order volume'),forecast.units.toLocaleString(fa?'fa-IR':'en-US'),t('تعداد از ورودی‌های شما','Sum of entered quantities'));
      card(t('ظرفیت تحویل','Delivery capacity'),forecast.capacityStatus==='OVER_CAPACITY'?t('بیش از ظرفیت','Over capacity'):forecast.capacityStatus==='WITHIN_CAPACITY'?t('در محدوده ورودی','Within stated capacity'):t('نامشخص','Unknown'),
        forecast.requiredMinutes===null?t('برخی ساعات انجام کار مشخص نیست','Some delivery times are missing'):t('ساعات لازم: ','Required hours: ')+(forecast.requiredMinutes/60).toLocaleString(fa?'fa-IR':'en-US'));
      result.append(grid);
      const gaps=[];
      if(s.lines.some(x=>x.unitCost===''))gaps.push(t('هزینهٔ تحویل برای بعضی مسیرها وارد نشده است.','Some unit delivery costs are missing.'));
      if(s.fixed==='')gaps.push(t('هزینه‌های ثابت هنوز برآورد نشده‌اند.','Fixed costs have not been estimated.'));
      if(s.reserve==='')gaps.push(t('ذخیرهٔ استرداد هنوز تعیین نشده است.','A refund reserve has not been selected.'));
      if(forecast.capacityStatus==='UNKNOWN')gaps.push(t('ظرفیت عملیاتی تأیید نشده است.','Delivery capacity is not established.'));
      if(forecast.capacityStatus==='OVER_CAPACITY')gaps.push(t('این ترکیب فروش با ساعات عرضه‌شده قابل تحویل نیست.','This sales mix exceeds entered delivery capacity.'));
      if(s.goal!==''&&forecast.selectedGoalMet){
        const caution=s.fixed===''||s.reserve===''||s.lines.some(x=>x.unitCost===''||x.minutes==='')||
          forecast.capacityStatus!=='WITHIN_CAPACITY';
        gaps.push(caution
          ?t('هدف صرفاً روی کاغذ پوشش داده می‌شود؛ هزینه یا ظرفیت کامل معلوم نیست.','The scenario meets its numerical target, but cost or capacity assumptions remain incomplete.')
          :t('هدف در سناریو برآورده شده است؛ این رقم فروش یا سود واقعی نیست.','The scenario meets the entered target, not verified revenue or profit.'));
      }
      if(gaps.length)result.append(el('p','jr-revenue-warning',gaps.join(' ')));
      result.append(el('p','ops-muted',t('این بخش فقط تحلیل سناریوی مدیر است و به داشبورد درآمد واقعی، دیتابیس، مشتری، ایمیل، بانک یا درگاه متصل نیست.',
        'Planning only: this model does not connect to live accounting, customers, bank settlement, bookings or payments.')));
    }catch(error){
      result.append(el('p','jr-revenue-warning',t('ورودی نامعتبر یا بیش از دامنهٔ محاسبه است؛ اعداد را اصلاح کنید.','Invalid or out-of-range assumptions; please correct the inputs.')));
    }
  }
  async function load(){
    const endpoints=[
      ['/assets/data/service-catalog.json','SERVICE'],['/assets/data/vip-catalog.json','VIP'],['/assets/data/book-catalog.json','BOOK']
    ];
    try{
      const docs=await Promise.all(endpoints.map(async([url,type])=>{
        const res=await fetch(url,{credentials:'omit',cache:'no-store'});
        if(!res.ok)throw new Error('catalog unavailable');
        return {type,body:await res.json()};
      }));
      let items=[];
      for(const {type,body} of docs){
        if(type==='BOOK'){
          for(const book of body.books||[]){
            if(book.commerce?.sellable!==true||book.commerce.currency!=='IRT')continue;
            items.push({key:'BOOK:'+book.id,title:book.title_fa||book.id,price:book.commerce.price,duration:null});
          }
        }else{
          if(body.currency!=='IRT')throw new Error('currency mismatch');
          for(const service of body.services||[]){
            if(service.sellable!==true)continue;
            items.push({key:type+':'+service.id,title:service.title_fa||service.id,price:service.price,duration:service.duration_minutes??null});
          }
        }
      }
      if(items.length!==30||items.some(x=>!Number.isSafeInteger(x.price)||x.price<0))throw new Error('catalog integrity mismatch');
      catalog=items;
    }catch(_){catalog=[];}
    render();
  }
  load();
}
