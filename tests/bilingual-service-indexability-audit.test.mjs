import test from 'node:test';
import assert from 'node:assert/strict';
import {audit,displayedPrice,attr,readServiceSchema,ORIGIN} from '../scripts/bilingual-service-indexability-audit.mjs';

test('money parser handles both Persian and English publication units',()=>{
  assert.equal(displayedPrice('<p class="price">۱۵٬۰۰۰٬۰۰۰ تومان</p>'),15000000);
  assert.equal(displayedPrice('<p class="price">15,000,000 toman — proposed fee</p>'),15000000);
  assert.equal(displayedPrice('<p class="other-price">15,000,000 toman</p>'),null);
});
test('language metadata parsing is order-independent',()=>{
  assert.equal(attr('<link href="https://example.org" hreflang="en" rel="alternate">','hreflang'),'en');
  assert.equal(attr('','href'),null);
});
test('JSON-LD @id can be shared bilingually while URL remains self canonical',()=>{
  const html='<script type="application/ld+json">'+JSON.stringify({
    '@context':'https://schema.org','@type':'Service',
    '@id':ORIGIN+'/fa/services/example/#service',
    url:ORIGIN+'/en/services/example/'})+'</script>';
  assert.equal(readServiceSchema(html).url,ORIGIN+'/en/services/example/');
});
test('existing 27 offers must have 54 valid, self-canonical, language-linked public pages',()=>{
  const report=audit();
  assert.equal(report.offers,27);
  assert.equal(report.bilingualPagesChecked,54);
  assert.equal(report.googleIndexation,'NOT_MEASURED_BY_SOURCE_AUDIT');
  assert.deepEqual(report.failures,[],report.failures.join('\n'));
  assert.equal(report.status,'SOURCE_PASS');
});
