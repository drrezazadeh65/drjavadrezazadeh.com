import assert from 'node:assert/strict';
import {
  BITPAY_ENDPOINTS,
  toBitPayRialAmount,
  buildBitPayCreateRequest,
  interpretBitPayCreateResponse,
  bitPayRedirectUrl,
  buildBitPayVerifyRequest,
  interpretBitPayVerification
} from './bitpay-adapter.mjs';

assert.equal(toBitPayRialAmount({amount:2_000_000,currency:'IRT'}),20_000_000);
assert.equal(toBitPayRialAmount({amount:20_000_000,currency:'IRR'}),20_000_000);
assert.throws(()=>toBitPayRialAmount({amount:499,currency:'IRT'}));

const create=buildBitPayCreateRequest({
  api:'PUBLIC-TEST-KEY',
  amount:2_000_000,
  currency:'IRT',
  redirect:'https://drjavadrezazadeh.com/fa/shop/checkout/?bitpay_test=1',
  factorId:'900001',
  mobileNum:'09120000000',
  mode:'test'
});
assert.equal(create.url,BITPAY_ENDPOINTS.test.create);
const params=new URLSearchParams(create.body);
assert.equal(params.get('amount'),'20000000');
assert.equal(params.get('factorId'),'900001');
assert.equal(params.get('mobileNum'),'09120000000');

assert.deepEqual(interpretBitPayCreateResponse('12345'),{ok:true,id_get:'12345',provider_code:'12345'});
assert.equal(interpretBitPayCreateResponse('-4').ok,false);
assert.equal(bitPayRedirectUrl('12345',{mode:'test'}),'https://bitpay.ir/payment-test/gateway-12345-get');

const verify=buildBitPayVerifyRequest({
  api:'PUBLIC-TEST-KEY',
  trans_id:'98765',
  id_get:'12345',
  mode:'test'
});
assert.equal(verify.url,BITPAY_ENDPOINTS.test.verify);
const verifyParams=new URLSearchParams(verify.body);
assert.equal(verifyParams.get('json'),'1');

const ok=interpretBitPayVerification('{"status":1,"amount":20000000,"cardNum":"6037********1234","factorId":"900001"}');
assert.equal(ok.verified,true);
assert.equal(ok.amount_rial,20_000_000);
assert.equal(ok.factor_id,'900001');

const repeat=interpretBitPayVerification('{"status":11,"amount":20000000,"factorId":"900001"}');
assert.equal(repeat.verified,true);
assert.equal(repeat.already_verified,true);

const fail=interpretBitPayVerification('{"status":-4}');
assert.equal(fail.verified,false);
assert.equal(fail.reason_code,'BITPAY_VERIFY_-4');

console.log('BitPay adapter contract passed');
