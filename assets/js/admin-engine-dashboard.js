/* Public-safe engineering status only. Never load personal, financial or admin data here. */
(()=>{'use strict';
 const root=document.getElementById('engine-control-dashboard');if(!root)return;
 const data=[
 ['crm','CRM و مخاطبان','relationships'],['consultation','مشاوره و رزرو','consultations'],['consultation-record','پرونده مشاوره','consultations'],
 ['commerce','تجارت و سفارش','commerce'],['communication','ارتباطات ایمیلی','communications'],['assessment','اجرای ارزیابی','assessment'],
 ['assessment-authoring','تألیف ابزار ارزیابی','assessment'],['report','گزارش‌سازی','reports'],['research-export','خروجی پژوهشی','research'],
 ['golden-talent','شواهد استعداد طلایی','talent'],['golden-talent-deep','ماژول‌های عمیق استعداد','talent'],
 ['golden-talent-analytics','تحلیل شواهد استعداد','talent'],['bahar','توسعه طولی بهار','talent']
 ];
 const list=root.querySelector('[data-engine-list]'),search=root.querySelector('[data-engine-search]'),filter=root.querySelector('[data-engine-domain]');
 const count=root.querySelector('[data-engine-count]'),empty=root.querySelector('[data-engine-empty]');
 const domains=[...new Set(data.map(x=>x[2]))];
 for(const domain of domains){const option=document.createElement('option');option.value=domain;option.textContent=domain;filter.append(option);}
 const render=()=>{
  const term=search.value.trim().toLocaleLowerCase(),domain=filter.value;
  const visible=data.filter(([id,title,group])=>(!domain||domain===group)&&(!term||(id+' '+title+' '+group).toLocaleLowerCase().includes(term)));
  list.replaceChildren();count.textContent=String(visible.length);empty.hidden=visible.length!==0;
  for(const [id,title,group] of visible){
   const card=document.createElement('article');card.className='engine-control__card';
   const heading=document.createElement('h3');heading.textContent=title;
   const code=document.createElement('code');code.textContent=id;
   const meta=document.createElement('p');meta.textContent='حوزه: '+group;
   const state=document.createElement('span');state.className='engine-control__state';state.textContent='کد شناسایی‌شده · وضعیت عملیاتی تأیید نشده';
   card.append(heading,code,meta,state);list.append(card);
  }
 };
 search.addEventListener('input',render);filter.addEventListener('change',render);render();
})();
