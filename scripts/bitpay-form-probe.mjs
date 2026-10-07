import {buildBitPayCreateRequest,interpretBitPayCreateResponse,bitPayRedirectUrl} from '../platform/bitpay-adapter.mjs';

const api='adxcv-zzadq-polkjsad-opp13opoz-1sdf455aadzmck1244567';
const req=buildBitPayCreateRequest({
  api,
  amount:500,
  currency:'IRT',
  redirect:'https://drjavadrezazadeh.com/fa/shop/checkout/?bitpay_test=1',
  factorId:String(Date.now()),
  mode:'test'
});
const created=await fetch(req.url,{method:req.method,headers:req.headers,body:req.body,signal:AbortSignal.timeout(30000)});
const id=interpretBitPayCreateResponse((await created.text()).trim());
if(!id.ok) throw new Error('create failed');
const url=bitPayRedirectUrl(id.id_get,{mode:'test'});
const res=await fetch(url,{signal:AbortSignal.timeout(30000)});
const html=await res.text();
const m=html.match(/name=["']method["'][^>]*value=["']([^"']+)["']/i)||html.match(/value=["']([^"']+)["'][^>]*name=["']method["']/i);
const form=html.match(/<form\b[^>]*action=["']([^"']+)["'][^>]*method=["']([^"']+)["'][^>]*>/i)||html.match(/<form\b[^>]*method=["']([^"']+)["'][^>]*action=["']([^"']+)["'][^>]*>/i);
console.log(JSON.stringify({id_get:id.id_get,method_value:m?.[1]||null,form_match:form?form.slice(1):null},null,2));
if(!m?.[1]) process.exitCode=2;
