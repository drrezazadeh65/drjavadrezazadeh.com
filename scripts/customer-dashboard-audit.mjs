import fs from 'node:fs';

const failures=[];
const read=p=>fs.readFileSync(p,'utf8');
const fa=read('fa/customer-dashboard/index.html');
const en=read('en/account/index.html');
const js=read('assets/js/customer-dashboard.js');
const css=read('assets/css/customer-dashboard-v1.css');
const appointmentClient=read('assets/js/consultation-appointments.js');
const sw=read('sw.js');
const site=read('assets/js/site.js');
const robots=read('robots.txt');
const sitemapFiles=['sitemap.xml','sitemap-services.xml'].filter(p=>fs.existsSync(p));
const sitemaps=sitemapFiles.map(read).join('\n');

function expect(ok,msg){if(!ok)failures.push(msg)}
function count(src,token){return src.split(token).length-1}

for(const [label,html] of [['FA',fa],['EN',en]]){
  expect(/<meta name="robots" content="[^"]*noindex/i.test(html),label+': dashboard must be noindex');
  expect(/<meta name="robots" content="[^"]*nofollow/i.test(html),label+': dashboard must be nofollow');
  expect(/<meta name="robots" content="[^"]*noarchive/i.test(html),label+': dashboard must be noarchive');
  expect(html.includes('rel="manifest" href="/site.webmanifest"'),label+': manifest link missing');
  expect(html.includes('data-dashboard-live-state'),label+': live runtime pill missing');
  expect(html.includes('data-dashboard-command-search'),label+': command search missing');
  expect(html.includes('data-runtime-key="auth"'),label+': auth runtime state missing');
  expect(html.includes('data-runtime-key="commerce"'),label+': commerce runtime state missing');
  expect(html.includes('data-runtime-key="network"'),label+': network runtime state missing');
  expect(html.includes('cd-mobile-dock'),label+': mobile dock missing');
  expect(html.includes('viewport-fit=cover'),label+': safe-area viewport support missing');
  expect(count(html,'data-command-item')>=10,label+': fewer than ten command shortcuts');
  expect(count(html,'data-private-route')>=8,label+': private ecosystem routes are not fully wired');
  expect(html.includes('id="journey"'),label+': client delivery journey missing');
  expect(html.includes('id="access-hub"'),label+': whole-ecosystem access hub missing');
  expect(html.includes('id="assurance"'),label+': trust/assurance section missing');
  expect(html.includes('data-service-catalog-count'),label+': verified service count surface missing');
  expect(html.includes('data-commerce-status'),label+': commerce readiness surface missing');
}

expect(fa.includes('/fa/app/account/inbox/'),'FA: inbox route missing');
expect(fa.includes('/fa/app/account/orders/'),'FA: orders route missing');
expect(fa.includes('/fa/app/account/reports/'),'FA: reports route missing');
expect(en.includes('/en/account/inbox/'),'EN: inbox route missing');
expect(en.includes('/en/account/orders/'),'EN: orders route missing');
expect(en.includes('/en/account/reports/'),'EN: reports route missing');

for(const route of ['/fa/app/account/profile/','/fa/app/account/relationships/','/fa/app/account/consents/','/fa/app/account/appointments/','/fa/app/account/inbox/','/fa/app/account/documents/','/fa/app/account/reports/','/fa/app/account/orders/','/fa/app/account/privacy/','/fa/app/student/','/fa/app/student/integrated-profile/']){
  expect(fa.includes(route),'FA: ecosystem route missing '+route);
}
for(const route of ['/en/account/profile/','/en/account/relationships/','/en/account/consents/','/en/account/appointments/','/en/account/inbox/','/en/account/documents/','/en/account/reports/','/en/account/orders/','/en/account/privacy/','/en/golden-talent/dashboard/']){
  expect(en.includes(route),'EN: ecosystem route missing '+route);
}

expect(css.includes('env(safe-area-inset-bottom)'),'CSS: mobile safe-area handling missing');
expect(css.includes('font-family:"Segoe UI",Arial,"Helvetica Neue",Helvetica,sans-serif'),'CSS: trustworthy English font stack missing');
expect(!css.includes('font-family:Inter,Tahoma,Arial,sans-serif'),'CSS: unsafe first-choice local Inter stack still present');
expect(!css.includes('font:800 10px/1 Inter,Arial,sans-serif'),'CSS: local Inter symbol substitution possible in numeric step labels');
for(const [label,html] of [['FA',fa],['EN',en]]){
  expect(html.includes('customer-dashboard-v1.css?v=20261014-consultations-v5'),label+': updated private dashboard CSS cache key missing');
  expect(count(html,'data-consultation-appointments')===1,label+': verified appointment panel must appear once');
  expect(count(html,'data-consultation-check')===1,label+': explicit buyer lookup control missing');
  expect(count(html,'data-consultation-results')===1,label+': private appointment result region missing');
  expect(count(html,'consultation-appointments.js?v=20261014-portal-verified-v2')===1,
    label+': versioned private appointments runtime must load exactly once');
}

expect(css.includes('.cd-command-center'),'CSS: command centre styles missing');
expect(css.includes('.appointment-private-list'),'CSS: accessible appointment list missing');
expect(css.includes('.appointment-preference'),'CSS: accessible buyer choice controls missing');
expect(appointmentClient.includes("fetch('/api/commerce/history'"),'Appointments must verify buyer order history');
expect(appointmentClient.includes("fetch('/api/commerce/fulfilment?order='"),'Appointments must verify specific order ownership');
expect(appointmentClient.includes("fetch('/api/commerce/consultation-preference'"),'Buyer selection must use server-validated preference route');
expect(appointmentClient.includes("credentials:'same-origin'"),'Appointments must preserve same-origin customer session');
expect(appointmentClient.includes("cache:'no-store'"),'Private appointments must never use stale HTTP responses');
expect(appointmentClient.includes('output.replaceChildren()'),'Appointments must clear stale private details');
expect(css.includes('@media(max-width:920px)'),'CSS: primary mobile breakpoint missing');
expect(css.includes('prefers-reduced-motion'),'CSS: reduced-motion handling missing');
expect(css.includes('.cd-confidence-strip'),'CSS: trust architecture styles missing');
expect(css.includes('.cd-journey-grid'),'CSS: delivery journey styles missing');
expect(css.includes('.cd-access-grid'),'CSS: ecosystem access styles missing');
expect(css.includes('.cd-assurance'),'CSS: assurance styles missing');
expect(css.includes('.cd-service-outcome'),'CSS: service outcome clarity styles missing');

expect(js.includes("credentials:'include'"),'JS: authenticated requests must include credentials');
expect(js.includes('cache:\'no-store\''),'JS: private/runtime requests must avoid stale cache');
expect(js.includes('authNavigation(authenticated)'),'JS: private navigation gating missing');
expect(js.includes("addEventListener('offline'"),'JS: offline state handling missing');
expect(js.includes("addEventListener('online'"),'JS: reconnection handling missing');
expect(js.includes("e.key==='/'"),'JS: keyboard command-search shortcut missing');
expect(js.includes('[data-private-route]'),'JS: private route authentication gate missing');
expect(js.includes('authenticated===true'),'JS: purchase CTA must require an authenticated account');
expect(js.includes('cd-service-outcome'),'JS: service outcome is not surfaced beside pricing');
expect(js.includes('cd-service-boundary'),'JS: service boundary is not surfaced beside pricing');

expect(sw.includes("'/fa/customer-dashboard/'"),'SW: Persian customer dashboard is not classified private');
expect(site.includes("'/fa/customer-dashboard/'"),'site.js: Persian customer dashboard is not classified private');
expect(!/cache\.put\([^\n]*customer-dashboard/.test(sw),'SW: dashboard must never be explicitly cached');

for(const privateUrl of ['/fa/customer-dashboard/','/fa/app/','/en/account/','/en/golden-talent/dashboard/']){
  expect(!sitemaps.includes('drjavadrezazadeh.com'+privateUrl),'SEO: private dashboard route leaked into sitemap '+privateUrl);
}
for(const privatePath of ['/fa/customer-dashboard/','/fa/app/','/en/account/']){
  expect(robots.includes('Disallow: '+privatePath),'robots.txt: private route not disallowed '+privatePath);
}

try{new Function(js)}catch(e){failures.push('JS syntax error: '+e.message)}
try{new Function(appointmentClient)}catch(e){failures.push('Appointment JS syntax error: '+e.message)}

if(failures.length){
  console.error('Customer dashboard audit failed ('+failures.length+')');
  for(const f of failures)console.error('✗ '+f);
  process.exit(1);
}
console.log('Customer dashboard audit PASS');
console.log('FA/EN client OS, ecosystem wiring, authenticated commerce CTA, noindex/noarchive SEO boundaries, privacy caching, trust states, mobile safe areas and JS syntax verified.');
