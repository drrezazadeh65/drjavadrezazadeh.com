import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

const read=path=>readFileSync(path,'utf8');
const pages=[
 ['fa','fa/customer-dashboard/index.html',
  ['/fa/services/','/fa/app/account/orders/','#consultations','/fa/app/account/reports/','#progress']],
 ['en','en/account/index.html',
  ['/en/services/','/en/account/orders/','#consultations','/en/account/reports/','#progress']]
];
const css=read('assets/css/customer-journey-actions-v1.css');
const js=read('assets/js/customer-dashboard.js');

test('both existing private dashboards preserve authentic roles, protected links and design contracts',()=>{
 for(const [locale,path,hrefs] of pages){
  const html=read(path);
  assert.match(html,/name="robots" content="noindex,nofollow,noarchive/);
  assert.match(html,/data-dashboard-panel="overview"/);
  assert.match(html,/data-dashboard-panel="journey"/);
  assert.match(html,/data-dashboard-panel="consultations"/);
  assert.match(html,/data-dashboard-panel="records"/);
  assert.match(html,/data-dashboard-panel="progress"/);
  assert.match(html,/class="cd-mobile-dock"/);
  assert.match(html,/data-dashboard-sheet/);
  assert.match(html,/data-dashboard-command-search/);
  assert.match(html,/customer-journey-actions-v1\.css\?v=20261019-customer-actions-v1/);
  assert.equal((html.match(/data-journey-step="\d"/g)||[]).length,5);
  for(const href of hrefs){
   assert.ok(html.includes('href="'+href+'"'),locale+' missing authentic action '+href);
   if(href.startsWith('/'))assert.ok(existsSync(href.slice(1)+'index.html'),locale+' action destination missing '+href);
  }
  for(const action of ['all','learning','shopping','sponsorship']){
   assert.ok(html.includes('data-command-path="'+action+'"'),locale+' missing filter '+action);
  }
  const cards=[...html.matchAll(/<a class="cd-quick-card"([^>]+)>/g)].map(m=>m[1]);
  assert.equal(cards.length,13,locale+' complete 13 route-shortcut parity');
  for(const card of cards){
    // "guidance" and "bahar" refine learning cards for discovery without
    // creating another permission role or a fourth primary command mode.
    assert.match(card,/data-command-group="(?:learning|shopping|sponsorship|guidance|bahar)(?: (?:learning|shopping|sponsorship|guidance|bahar))*"/);
    const groups=(card.match(/data-command-group="([^"]+)"/)||[])[1]?.split(' ')||[];
    assert.ok(groups.some(x=>['learning','shopping','sponsorship'].includes(x)),
      locale+' every shortcut retains a primary navigation class');
  }
  for(const segment of ['orders/','reports/']){
   const step=html.match(new RegExp('<a class="cd-journey-action"[^>]+href="[^"]*'+segment+'".*?<\\/a>'));
   assert.ok(step,locale+' private journey link '+segment);
   assert.match(step[0],/data-private-route/,'private action always auth-aware');
  }
 }
});

test('quick-filter messages are correctly localised without changing the role model',()=>{
 assert.match(js,/const messages=lang==='en'\?/);
 assert.match(js,/Orders and services selected/);
 assert.match(js,/مسیر خرید و خدمات انتخاب شد/);
 assert.match(js,/modes\.forEach\(b=>b\.addEventListener\('click'/);
 assert.match(js,/card\.hidden=!hit/);
 assert.match(js,/authNavigation\(authenticated\)/);
 assert.match(js,/if\(authenticated&&a\.dataset\.privateHref\)/);
 assert.doesNotMatch(js,/localStorage\.setItem\(['"]journey/);
 const syntax=spawnSync(process.execPath,['--check','assets/js/customer-dashboard.js'],{encoding:'utf8'});
 assert.equal(syntax.status,0,syntax.stderr);
});

test('journey actions remain accessible, phone-first and subordinate to frozen visual identity',()=>{
 assert.match(css,/\.cd-journey-action/);
 assert.match(css, /min-height:48px/);
 assert.match(css, /min-height:50px/);
 assert.match(css, /:focus-visible/);
 assert.match(css, /max-width:390px/);
 assert.match(css, /prefers-reduced-motion:reduce/);
 assert.match(css, /@media print/);
 assert.match(css,/--cd-gold/);
 assert.doesNotMatch(css, /position:fixed|z-index:99999/);
});
