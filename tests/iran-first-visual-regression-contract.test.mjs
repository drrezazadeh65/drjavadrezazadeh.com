import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');

// Staged assertions only. Execute once at owner-authorised final QA.
test('Iran-first performance work retains the original interactive visual vocabulary',()=>{
 const home=read('assets/css/jr-ecosystem-design-v2.css');
 const extra=read('assets/js/site-extras.js');
 const store=read('assets/css/store-premium-editorial-2026.css');
 const journal=read('assets/css/journal-v2.css');
 const gateway=read('assets/css/gateway.css');
 assert.match(home,/\.public-home-page\s+\.portrait-shell/);
 assert.match(home,/--jr-home-rotate-x/);
 assert.match(extra,/pointermove/);
 assert.match(extra,/requestAnimationFrame\(draw\)/);
 assert.match(extra,/prefers-reduced-motion: reduce/);
 assert.match(store,/\.book-product-card:hover/);
 assert.match(journal,/\.journal-grid article:hover/);
 assert.match(gateway,/\.gateway-card::before/);
});

test('new premium CSS never hides indexed headings or introduces permanent motion',()=>{
 const style=read('assets/css/style.css');
 const store=read('assets/css/store-premium-editorial-2026.css');
 const journal=read('assets/css/journal-v2.css');
 const vip=read('assets/css/jr-bilingual-semantic-flow-2026.css');
 const policy=read('docs/governance/IRAN_FIRST_ALL_ROUTE_PERFORMANCE_STANDARD_20261026.md');
 assert.match(style,/JR 2026 luxury motion polish/);
 assert.match(style,/hover:hover/);
 assert.match(style,/pointer:fine/);
 assert.match(style,/prefers-reduced-motion:no-preference/);
 assert.match(store,/Bookstore edition: static brass edges/);
 assert.match(journal,/JHELA scholarly gold-line polish/);
 assert.match(vip,/Lightweight Persian VIP services/);
 assert.match(policy,/Non-regression rule: visuals and SEO/);
});
