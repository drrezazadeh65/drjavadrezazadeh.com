import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('gated Konkur landing pages route to existing help rather than fake purchasable exams',()=>{
  const fa=load('fa/exams/konkur/index.html');
  const en=load('en/exams/konkur/index.html');
  assert.match(fa,/href="\/fa\/konkur-ai-lab\/"/);
  assert.match(fa,/href="\/fa\/services\/konkur_month\/"/);
  assert.match(en,/href="\/en\/student-guidance\/"/);
  assert.match(en,/href="\/en\/services\/konkur_month\/"/);
  assert.match(fa,/فروش و ثبت‌نام فعال نمی‌شود/);
  assert.match(en,/Purchase and registration remain disabled/);
});
test('exam centre hubs carry correct bilingual lead paths with no fake paid offering',()=>{
  const fa=load('fa/exams/index.html'),en=load('en/exams/index.html');
  assert.match(fa,/href="\/fa\/konkur-ai-lab\/"/);
  assert.match(fa,/href="\/fa\/services\/konkur_month\/"/);
  assert.match(en,/href="\/en\/student-guidance\/"/);
  assert.match(en,/href="\/en\/services\/konkur_month\/"/);
  assert.match(fa,/خرید هنوز فعال نیست/);
  assert.match(en,/Checkout remains disabled/);
});
test('original commercial backend still refuses synthetic checkout or unapproved exams',()=>{
  const backend=load('api/jrei-exam-commercial-catalogue.php');
  const readiness=load('api/jrei-exam-product-readiness.php');
  assert.match(backend,/'checkoutEnabled'=>false/);
  assert.match(backend,/'availableForPurchase'=>false/);
  assert.match(readiness,/'publicSaleAuthorized'=>false/);
  assert.match(readiness,/INCOMPLETE_INDEPENDENT_ITEM_AND_KEY_REVIEW/);
  assert.match(readiness,/LIVE_PURCHASE_AND_END_TO_END_ACCEPTANCE_REQUIRED/);
});
