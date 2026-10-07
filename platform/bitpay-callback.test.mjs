import assert from 'node:assert/strict';
import {validateBitPayVerifiedPayment} from './bitpay-callback.mjs';

const expected={order_id:'o1',id_get:'51090',factor_id:'900001',amount_rial:20_000_000};
assert.equal(validateBitPayVerifiedPayment({
  expected,
  verification:{verified:true,already_verified:false,amount_rial:20_000_000,factor_id:'900001'}
}).verified,true);

assert.equal(validateBitPayVerifiedPayment({
  expected,
  verification:{verified:true,already_verified:false,amount_rial:19_000_000,factor_id:'900001'}
}).reason_code,'BITPAY_AMOUNT_MISMATCH');

assert.equal(validateBitPayVerifiedPayment({
  expected,
  verification:{verified:true,already_verified:false,amount_rial:20_000_000,factor_id:'X'}
}).reason_code,'BITPAY_FACTOR_MISMATCH');

assert.equal(validateBitPayVerifiedPayment({
  expected,
  verification:{verified:false,reason_code:'BITPAY_VERIFY_-4'}
}).verified,false);

console.log('BitPay callback integrity contract passed');
