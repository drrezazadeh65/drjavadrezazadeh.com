import {
  buildBitPayCreateRequest,
  interpretBitPayCreateResponse,
  bitPayRedirectUrl,
  buildBitPayVerifyRequest,
  interpretBitPayVerification
} from '../platform/bitpay-adapter.mjs';

const TEST_API=process.env.BITPAY_TEST_API || 'adxcv-zzadq-polkjsad-opp13opoz-1sdf455aadzmck1244567';
const redirect=process.env.BITPAY_TEST_REDIRECT || 'https://drjavadrezazadeh.com/fa/shop/checkout/?bitpay_test=1';

async function post(req){
  const res=await fetch(req.url,{method:req.method,headers:req.headers,body:req.body,signal:AbortSignal.timeout(30000),redirect:'manual'});
  const text=(await res.text()).trim();
  return {status:res.status,text,headers:Object.fromEntries(res.headers)};
}
function stripTags(s=''){return s.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();}

const factorId=String(Date.now());
const createReq=buildBitPayCreateRequest({
  api:TEST_API,
  amount:2_000_000,
  currency:'IRT',
  redirect,
  factorId,
  name:'Javad Rezazadeh',
  description:'Automated BitPay sandbox smoke test',
  mode:'test'
});
const created=await post(createReq);
console.log('create_http_status='+created.status);
console.log('create_response='+created.text);
const createResult=interpretBitPayCreateResponse(created.text);
if(!createResult.ok) throw new Error('Sandbox create failed: '+created.text);

const paymentUrl=bitPayRedirectUrl(createResult.id_get,{mode:'test'});
const payRes=await fetch(paymentUrl,{signal:AbortSignal.timeout(30000),redirect:'manual'});
const paymentHtml=await payRes.text();
console.log('payment_page_status='+payRes.status);
console.log('payment_page_location='+(payRes.headers.get('location')||''));
if(payRes.status<200||payRes.status>=400) throw new Error('Sandbox payment page unavailable');

const formActions=[...paymentHtml.matchAll(/<form\b[^>]*action=["']([^"']*)["'][^>]*>/gi)].map(m=>m[1]).slice(0,10);
const inputNames=[...paymentHtml.matchAll(/<input\b[^>]*name=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]).slice(0,30);
const buttonTexts=[...paymentHtml.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map(m=>stripTags(m[1])).filter(Boolean).slice(0,20);
const submitValues=[...paymentHtml.matchAll(/<input\b[^>]*type=["']submit["'][^>]*value=["']([^"']*)["'][^>]*>/gi)].map(m=>m[1]).slice(0,20);
console.log('payment_page_forms='+JSON.stringify({formActions,inputNames,buttonTexts,submitValues}));

const verifyReq=buildBitPayVerifyRequest({
  api:TEST_API,
  trans_id:'1',
  id_get:createResult.id_get,
  mode:'test',
  json:true
});
const verifyProbe=await post(verifyReq);
const verifyResult=interpretBitPayVerification(verifyProbe.text);
console.log('negative_verify_http_status='+verifyProbe.status);
console.log('negative_verify_response='+verifyProbe.text);
if(verifyResult.verified) throw new Error('Unpaid sandbox intent unexpectedly verified');

console.log(JSON.stringify({
  sandbox_create:true,
  id_get:createResult.id_get,
  payment_url_reachable:true,
  payment_page_form_discovered:formActions.length>0,
  unpaid_verification_rejected:true,
  amount_sent_rial:20_000_000,
  source_display_amount_toman:2_000_000,
  redirect
},null,2));
