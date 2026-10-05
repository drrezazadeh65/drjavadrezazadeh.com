(()=>{
const standalone=window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
const preferred=localStorage.getItem('preferred-language');
if(standalone && (preferred==='fa'||preferred==='en')){
  const base=location.hostname.endsWith('github.io')?'/drjavadrezazadeh.com/':'/';
  const target=base+preferred+'/';
  if(location.pathname!==target){location.replace(target);return}
}
document.addEventListener('click',e=>{
  const a=e.target.closest('[data-language-choice]');
  if(!a)return;
  const lang=a.getAttribute('data-language-choice');
  if(lang==='fa'||lang==='en') localStorage.setItem('preferred-language',lang);
});
})();