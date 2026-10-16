/* English checkout facade over the EXISTING authoritative Bertina PHP/MySQL service gateway.
 * No secondary gateway, fake payment status, localStorage, session secrets, or client price authority.
 * Keep the Persian checkout unchanged. */
(()=>{'use strict';
const host=document.querySelector('[data-commerce-services-en]');
if(!host)return;
const API='/api';
const formatter=new Intl.NumberFormat('en-US');
const byId=id=>document.getElementById(id);
const status=byId('checkout-en-status');
const form=byId('checkout-en-contact');
const nameField=byId('checkout-en-name');
const emailField=byId('checkout-en-email');
const phoneField=byId('checkout-en-phone');
const cards=byId('checkout-en-offers');
const selected=new URLSearchParams(location.search).get('service');
const help='info@drjavadrezazadeh.com';
let busy=false;
let ready=false;
const setStatus=(message,kind='info')=>{
 status.textContent=message;status.dataset.state=kind;
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
};
const node=(tag,text,className)=>{
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=String(text);
 if(className)el.className=className;
 return el;
};
function buttonState(){
 for(const button of cards.querySelectorAll('[data-pay-service]')){
  button.disabled=!ready||busy;
  button.textContent=busy?'Opening the secure payment process…':
    ready?'Continue to secure payment':'Secure payment is not currently available';
 }
}
function safeGateway(raw){
 if(typeof raw!=='string'||!raw.trim())throw Error('payment_link_missing');
 const url=new URL(raw,location.origin);
 if(url.origin!==location.origin||
    url.pathname!=='/fa/shop/payment-start/'||
    url.username||url.password||url.hash||
    url.searchParams.size!==1||
    !url.searchParams.get('gateway'))
   throw Error('payment_link_invalid');
 return url.href;
}
async function createServiceOrder(id){
 if(busy||!ready)return;
 if(!form.reportValidity())return;
 const buyerName=nameField.value.trim(),email=emailField.value.trim(),phone=phoneField.value.trim();
 if(buyerName.length<2||buyerName.length>100){
  nameField.setCustomValidity('Please enter your full name (2–100 characters).');
  nameField.reportValidity();nameField.setCustomValidity('');return;
 }
 if(!/^[a-z0-9_-]{1,70}$/.test(id))return;
 busy=true;buttonState();
 setStatus('Creating your secure order. Please wait; do not submit twice.');
 try{
  const response=await fetch(API+'/commerce/create',{
   method:'POST',credentials:'same-origin',mode:'cors',cache:'no-store',
   headers:{'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify({items:[{sku:'service:'+id,quantity:1}],
    customer:{name:buyerName,email,phone}})
  });
  const data=await response.json();
  if(!response.ok||data?.ok!==true){
   setStatus(data?.error==='checkout_disabled'
    ?'Online payment is not currently enabled for this service; no charge has been made.'
    :'The order could not be confirmed. Before another attempt, contact support to check for an existing order.','error');
   return;
  }
  const gateway=safeGateway(data.paymentUrl);
  setStatus('Your order was created securely. Redirecting to the existing verified payment gateway…');
  location.assign(gateway);
 }catch(_){
  setStatus('The payment request status could not be verified. Please check your order history or contact '+help+' before trying again.','error');
 }finally{busy=false;buttonState();}
}
function offer(item,translation){
 const card=node('article',undefined,'en-checkout-card');
 const picture=node('img');picture.src='/assets/images/services/'+encodeURIComponent(item.id)+'.svg';
 picture.alt='Illustration for '+translation.title;
 picture.width=1200;picture.height=675;picture.loading='lazy';picture.decoding='async';
 const inner=node('div',undefined,'en-checkout-card-content');
 inner.append(node('h3',translation.title),node('p',translation.fit,'en-checkout-fit'));
 const scope=node('p',undefined,'en-checkout-boundary');
 scope.append(node('strong','Professional boundary: '),document.createTextNode(translation.boundary));
 inner.append(scope);
 inner.append(node('p',formatter.format(item.price)+' toman','en-checkout-price'));
 const detail=node('a','Read the full service description','en-checkout-detail');
 detail.href='/en/services/'+encodeURIComponent(item.id)+'/';
 inner.append(detail);
 const button=node('button','Verifying payment availability…','en-checkout-pay');
 button.type='button';button.disabled=true;
 button.dataset.payService=item.id;
 button.addEventListener('click',()=>createServiceOrder(item.id));
 inner.append(button);
 card.append(picture,inner);
 return card;
}
async function start(){
 setStatus('Checking the approved service catalogue and live payment readiness…');
 if(selected!==null&&!/^[a-z0-9_-]{1,70}$/.test(selected)){
  setStatus('The service identifier is invalid. Choose a service from the official catalogue.','error');return;
 }
 try{
  const [catalogueResponse,localeResponse]=await Promise.all([
   fetch('/assets/data/service-catalog.json',{cache:'no-store'}),
   fetch('/assets/data/service-descriptions-en.json',{cache:'no-store'})
  ]);
  if(!catalogueResponse.ok||!localeResponse.ok)throw Error('catalog_unavailable');
  const catalogue=await catalogueResponse.json(),locale=await localeResponse.json();
  if(!Array.isArray(catalogue?.services)||locale?.language!=='en'||!locale.services)throw Error('invalid_catalogue');
  const entries=catalogue.services.filter(item=>
   item.sellable===true&&Number.isSafeInteger(item.price)&&item.price>0&&
   typeof item.id==='string'&&/^[a-z0-9_-]{1,70}$/.test(item.id)&&
   (!selected||selected===item.id)&&
   typeof locale.services[item.id]?.title==='string'&&
   typeof locale.services[item.id]?.fit==='string'&&
   typeof locale.services[item.id]?.boundary==='string'
  );
  cards.replaceChildren();
  if(!entries.length){
   setStatus('No matching service is available in the approved catalogue. No payment was initiated.','error');
   const link=node('a','Browse all services');link.href='/en/services/';cards.append(link);return;
  }
  for(const item of entries)cards.append(offer(item,locale.services[item.id]));
  const response=await fetch(API+'/commerce/health',{credentials:'omit',cache:'no-store',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('health_unavailable');
  const health=await response.json();
  ready=health?.ok===true&&health?.checkout===true&&health?.capabilities?.services===true;
  if(ready)setStatus('The secure service gateway is available. Amounts are revalidated by the server before charging.','ok');
  else setStatus('Secure service payment is not currently available. No charge can be initiated from this page.','error');
  buttonState();
 }catch(_){ready=false;buttonState();setStatus('The live catalogue or payment capability cannot be verified. No payment can be initiated. Please contact '+help+'.','error');}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();