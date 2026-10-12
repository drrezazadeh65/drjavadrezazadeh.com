/* JHELA founding expressions of interest: user-initiated email draft only.
 * No form POST, storage, credential, tracking endpoint or automatic membership. */
(()=>{'use strict';
const inbox='dr.rezazadeh65@gmail.com';
const limit=(value,n=1600)=>String(value||'').trim().slice(0,n);
const fields=[
 ['name','Full name'],['email','Reply email'],['affiliation','Affiliation'],
 ['country','Country'],['orcid','ORCID'],['academicRole','Academic role'],
 ['subjects','Research areas'],['methods','Methodological expertise / proposed contribution'],
 ['publications','Selected publications / profile']
];
document.querySelectorAll('form[data-jhela-interest]').forEach(form=>{
 const mode=form.dataset.jhelaInterest==='reviewer'?'Reviewer':'Founding Editorial Collaboration';
 const feedback=form.querySelector('[data-jhela-feedback]');
 const draft=()=>{
   if(!form.reportValidity()){feedback.textContent='Please complete the required academic profile fields and confirm the declaration.';return null;}
   const parts=fields.map(([key,label])=>{
     const element=form.elements.namedItem(key);
     return label+': '+limit(element&&element.value,key==='subjects'||key==='methods'?1500:650);
   });
   return 'JHELA — '+mode+' Expression of Interest\n\n'+parts.join('\n')+
     '\n\nI understand this is an expression of interest, not an appointment or assignment.'+
     '\n\nI will attach my CV and selected publications manually before sending.';
 };
 form.addEventListener('submit',event=>{
   event.preventDefault();
   const body=draft();if(!body)return;
   const subject='JHELA '+mode+' Expression of Interest';
   feedback.textContent='Your email application is being prepared. Review the draft and attach your CV before sending.';
   window.location.href='mailto:'+inbox+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 });
 const copy=form.querySelector('[data-jhela-copy]');
 copy?.addEventListener('click',async()=>{
   const body=draft();if(!body)return;
   try{
     if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error('Clipboard unavailable');
     await navigator.clipboard.writeText(body);
     feedback.textContent='Application text copied. Email it to '+inbox+' with your CV and selected publications.';
   }catch{
     const output=document.createElement('textarea');
     output.value=body;output.setAttribute('readonly','');output.setAttribute('aria-label','Prepared application text');
     output.style.cssText='position:absolute;left:-9999px;top:0';
     document.body.appendChild(output);output.select();
     const ok=document.execCommand&&document.execCommand('copy');
     output.remove();
     feedback.textContent=ok?'Application text copied. Attach your CV before sending.':'Clipboard unavailable. Use the compose email button or direct email link.';
   }
 });
});
})();