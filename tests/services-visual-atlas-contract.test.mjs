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

test('each of the 21 paid services has its own substantive SVG infographic and accessible figure', () => {
  const seen = new Set();
  const css = read('assets/css/service-detail-brand-2026.css');
  assert.ok(css.includes('.service-science-figure'));
  for (const service of catalogue.services) {
    const filename = `assets/images/services/infographics/${service.id}-workflow.svg`;
    assert.ok(fs.existsSync(path.join(root, filename)), 'missing scholarly infographic: ' + service.id);
    const svg = read(filename);
    const page = read(`fa/services/${service.id}/index.html`);
    assert.ok(svg.includes('xmlns="http://www.w3.org/2000/svg"'), filename);
    assert.ok(svg.includes('<title id="title">') && svg.includes('<desc id="desc">'), filename);
    assert.ok(svg.includes('مسئله و مخاطب') && svg.includes('خروجی قابل انتظار') &&
      svg.includes('مرز حرفه‌ای'), filename);
    assert.doesNotMatch(svg, /<script\b|onload=|javascript:|<foreignObject\b/i, filename);
    assert.ok(page.includes(`data-jr-service-infographic="${service.id}"`), 'figure not mounted: ' + service.id);
    assert.ok(page.includes('/' + filename), 'missing exact image link: ' + service.id);
    assert.ok(page.includes('<figcaption>') && page.includes('loading="lazy"'), service.id);
    assert.ok(!seen.has(svg), 'duplicate infographic: ' + service.id);
    seen.add(svg);
  }
  assert.equal(seen.size, 21);
});

test('priced comparison cards link to verified specific service pages', () => {
  const pricing = read('assets/js/service-pricing.js');
  const page = read('fa/khadamat/index.html');
  assert.ok(pricing.includes('href="/fa/services/checkout/?service='), 'service-specific guarded checkout route missing');
  assert.ok(pricing.includes('href="/fa/services/'), 'service detail route missing');
  assert.ok(pricing.includes('بررسی سفارش امن این خدمت'), 'clear selected-order CTA missing');
  assert.ok(pricing.includes('شرح علمی، شرایط و محدودیت‌ها'), 'separate evidence and limitations CTA missing');
  assert.ok(!pricing.includes('/fa/darkhast-moshavere/?service='));
  assert.ok(page.includes('service-pricing.js?v=20261016-verified-service-details-v2'));
});


test('all Persian specialist academic essays remain inside their semantic service article', () => {
  for (const item of catalogue.services) {
    const page=read(`fa/services/${item.id}/index.html`);
    const editorial=page.indexOf('data-editorial');
    const close=page.indexOf('</article>');
    const mainClose=page.lastIndexOf('</main>');
    assert.ok(editorial>0,item.id+' must preserve its established scholarly essay');
    assert.ok(close>editorial,item.id+' academic essay must not render after </article>');
    assert.ok(mainClose>close,item.id+' service article must remain inside <main>');
    const trailing=page.slice(close,mainClose);
    assert.doesNotMatch(trailing,/<section[^>]+data-editorial/,
       item.id+' must not have orphaned scholarly sections outside the article');
  }
});


test('each Persian paid service cites two directly accessible primary scholarly organisations',()=>{
 const authorisedDomains=new Set([
  'www.aera.net','www.oecd.org','schoolcounselor.org',
  'learningpolicyinstitute.org','udlguidelines.cast.org',
  'www.icmje.org','publicationethics.org','sfdora.org'
 ]);
 for(const service of catalogue.services){
  const html=read(`fa/services/${service.id}/index.html`);
  const identifier=`data-jr-academic-evidence="${service.id}"`;
  const begin=html.indexOf(identifier),articleClose=html.indexOf('</article>');
  assert.ok(begin>0&&begin<articleClose,'missing in-article academic bibliography '+service.id);
  const finish=html.indexOf('</section>',begin);
  assert.ok(finish>begin&&finish<articleClose,'academic sources outside article '+service.id);
  const section=html.slice(begin,finish);
  const refs=[...section.matchAll(/<a href="(https:\/\/[^"]+)"[^>]*>/g)].map(m=>m[1]);
  assert.equal(refs.length,2,'two scientific primary references required per service: '+service.id);
  assert.equal(new Set(refs).size,2,'repeated academic source '+service.id);
  for(const link of refs){
    const url=new URL(link);
    assert.ok(authorisedDomains.has(url.hostname),'unreviewed source domain in '+service.id+': '+link);
    assert.ok(!url.username&&!url.password&&!url.hash,'unsafe public scholarly URL '+service.id);
  }
  assert.match(section,/به معنای|نباید به معنای/,
    'scholarly bibliography must not imply external endorsement '+service.id);
 }
});


test('all 21 English service essays include two independently traceable scholarly sources',()=>{
 const allowed=new Set([
  'www.aera.net','www.oecd.org','schoolcounselor.org','learningpolicyinstitute.org',
  'udlguidelines.cast.org','www.icmje.org','publicationethics.org','sfdora.org'
 ]);
 for(const item of catalogue.services){
  const html=read(`en/services/${item.id}/index.html`);
  const start=html.indexOf(`data-jr-academic-evidence="${item.id}"`);
  const end=html.indexOf('</section>',start);
  const articleClose=html.indexOf('</article>');
  assert.ok(start>0&&end>start&&articleClose>end,item.id+' EN sources must appear within article');
  const section=html.slice(start,end);
  const urls=[...section.matchAll(/<a href="(https:\/\/[^"]+)"[^>]*>/g)].map(m=>m[1]);
  assert.equal(urls.length,2,'two English scholarly references required for '+item.id);
  assert.equal(new Set(urls).size,2,'duplicate EN reference '+item.id);
  for(const link of urls){
   const parsed=new URL(link);
   assert.ok(allowed.has(parsed.hostname),'unreviewed scholarly source '+item.id);
   assert.ok(!parsed.username&&!parsed.password&&!parsed.hash,'unexpected URL payload '+item.id);
  }
  assert.match(section,/\b(?:does\s+not|do\s+not|not\s+(?:(?:an?\s+)?independent\s+)?(?:endorsement|validation|represent))/i,
    'source citation should never imply independent endorsement '+item.id);
 }
});
