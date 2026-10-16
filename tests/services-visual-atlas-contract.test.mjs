import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const catalogue = JSON.parse(read('assets/data/service-catalog.json'));
const atlas = read('fa/services/index.html');
const marker = 'data-jr-services-learning-atlas="20261016"';
const cardStyle = '/assets/css/service-detail-brand-2026.css?v=20261016-v1';

test('all 21 approved priced services have a real detail page and shared brand styles', () => {
  assert.equal(catalogue.services.length, 21);
  for (const service of catalogue.services) {
    assert.equal(service.sellable, true, service.id);
    const filepath = `fa/services/${service.id}/index.html`;
    const page = read(filepath);
    assert.ok(page.includes('service-detail-brand-2026.css'), filepath);
    assert.ok(page.includes('/fa/services/checkout/?service=' + service.id), filepath);
    assert.ok(page.includes('assets/images/services/' + service.id + '.svg'), filepath);
    assert.ok(fs.existsSync(path.join(root, `assets/images/services/${service.id}.svg`)), 'missing real service visual: ' + service.id);
  }
  assert.ok(fs.existsSync(path.join(root, cardStyle.split('?')[0].replace(/^\//, ''))));
});

test('service atlas contains exactly 40 distinct existing local destinations', () => {
  const begin = atlas.indexOf(marker);
  assert.ok(begin > -1, 'branded atlas missing');
  const end = atlas.indexOf('</section>', begin);
  assert.ok(end > begin, 'branded atlas section close missing');
  const section = atlas.slice(begin, end);
  const targets = [...section.matchAll(/<a href="(\/fa\/(?:services|rahnamaha)\/[^"]+\/)"[^>]*>/g)].map(match => match[1]);
  assert.equal(targets.length, 40, 'exactly 21 paid service routes and 19 helpful academic guides');
  assert.equal(new Set(targets).size, 40, 'duplicate internal destinations');
  for (const url of targets) {
    const filename = path.join(root, url.slice(1), 'index.html');
    assert.ok(fs.existsSync(filename), 'link has no committed destination: ' + url);
  }
  for (const svc of catalogue.services) {
    assert.ok(targets.includes(`/fa/services/${svc.id}/`), 'priced service omitted: ' + svc.id);
  }
  assert.equal(targets.filter(s => s.startsWith('/fa/rahnamaha/')).length, 19);
});

test('atlas has dedicated responsive visual styling and its canonical catalogue URL is unchanged', () => {
  const css = read('assets/css/services-catalog-v2.css');
  assert.ok(css.includes('.jr-service-path-atlas'));
  assert.ok(css.includes('@media(max-width:620px)'));
  assert.ok(atlas.includes('href="https://drjavadrezazadeh.com/fa/services/"'));
  assert.ok(atlas.includes('data-jr-services-learning-atlas'));
});
