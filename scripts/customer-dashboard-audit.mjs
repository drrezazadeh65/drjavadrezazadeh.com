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
  expect(/customer-dashboard-v1\.css\?v=202610\d{2}-[a-z0-9-]+/i.test(html),label+': updated private dashboard CSS cache key missing');
  expect(count(html,'data-consultation-appointments')===1,label+': verified appointment panel must appear once');
  expect(count(html,'data-consultation-check')===1,label+': explicit buyer lookup control missing');
  expect(count(html,'data-consultation-results')===1,label+': private appointment result region missing');
  expect(count(html,'consultation-appointments.js?v=20261015-partial-record-integrity-v3')===1,
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


// Cross-engine customer integration, October 2026:
// The dashboard remains a presentation layer. User-owned leads, service
// entitlements and actual booked appointments are separate server ledgers.
const publicWeek=read('assets/js/consultation-week-view.js');
const intakeLead=read('assets/js/customer-consultation-leads.js');
const intakeFa=read('fa/darkhast-moshavere/index.html');
const intakeEn=read('en/request-consultation/index.html');
const backend=read('api/index.php');
const growth=read('api/growth-stage14.php');
const ownerCapacity=read('api/consultation-availability.php');
const serviceAdvance=read('api/operations-fulfilment.php');
const bookingCss=read('assets/css/consultation-week.css');

for(const [label,html,accountPrefix,intake] of [
  ['FA',fa,'/fa/app/account/','/fa/darkhast-moshavere/'],
  ['EN',en,'/en/account/','/en/request-consultation/']
]){
  expect(count(html,'data-consultation-week aria-labelledby')===1,
    label+': owner-published week must appear exactly once in private dashboard');
  expect(count(html,'data-consultation-week-days')===1,
    label+': no separate or duplicate public calendar in private dashboard');
  expect(count(html,'data-customer-consultation-leads')===1,
    label+': account-owned consented enquiries must have one private surface');
  expect(count(html,'data-consultation-lead-check')===1,
    label+': enquiries must load only on explicit user request');
  expect(html.includes('consultation-week-view.js?v='),
    label+': shared seven-day consultation logic not loaded');
  expect(html.includes('customer-consultation-leads.js?v='),
    label+': consented enquiry viewer not loaded');
  expect(html.includes('consultation-week.css?v='),
    label+': seven-day consultation styles not loaded');
  expect(html.includes(intake),
    label+': customer journey cannot return to the live intake');
  expect(html.includes(accountPrefix+'orders/'),
    label+': private order history not discoverable from dashboard');
  expect(html.includes(accountPrefix+'appointments/'),
    label+': appointment and preference history not discoverable');
  expect(html.includes(accountPrefix+'consents/'),
    label+': account consent and privacy navigation missing');
  expect(html.includes('data-consultation-appointments'),
    label+': genuine paid booking statuses must remain linked');
  const p=label==='FA'?'fa/customer-dashboard/index.html':'en/account/index.html';
  const localPaths=[...html.matchAll(/\bhref="(\/(?:fa|en)\/[^"#?]+\/)(?:[?#][^"]*)?"/g)].map(m=>m[1]);
  for(const route of new Set(localPaths)){
    expect(fs.existsSync(route.slice(1)+'index.html'),
      p+': navigation target is missing / would be 404: '+route);
  }
}
expect(fa.includes('/fa/assessments/golden-talent/start/'),
  'FA: public free RCAS introductory assessment must be discoverable in customer dashboard');
expect(en.includes('/en/golden-talent/assessment/'),
  'EN: Golden Talent assessment pathway must be discoverable');
expect(en.includes('data-private-route href="/en/golden-talent/dashboard/"'),
  'EN: restricted Golden Talent workspace must keep account navigation gating');
expect(fs.existsSync('fa/assessments/golden-talent/start/index.html'),
  'FA free RCAS start route does not resolve');
expect(fs.existsSync('en/golden-talent/dashboard/index.html'),
  'EN Golden Talent customer route does not resolve');
expect(intakeFa.includes('data-consultation-week')
  &&intakeEn.includes('data-consultation-week'),
  'The public intake must reuse exactly the same owner-published calendar contract');
expect(intakeFa.includes('name="preferred_slot"')
  &&intakeEn.includes('name="preferred_slot"'),
  'Chosen slot must survive into the same reviewed enquiry form in both languages');
expect(publicWeek.includes("fetch('/api/commerce/consultation-week'"),
  'The public and customer dashboard must read the same no-store API');
expect(publicWeek.includes('customerReservationEnabled!==false')
  &&publicWeek.includes('externalCalendarConfirmed!==false'),
  'Calendar must fail closed if server claims direct booking or external synchronization');
expect(publicWeek.includes("location.assign(requestPath+'?slot='")
  &&publicWeek.includes('validRequested===slot.startUtc'),
  'Dashboard handoff must revalidate a user-supplied preferred hour against live inventory');
expect(publicWeek.includes('chosen.dispatchEvent(new Event'),
  'A selected hour must invalidate already reviewed email previews');
expect(intakeLead.includes("fetch('/api/growth/leads/mine'")
  &&intakeLead.includes("credentials:'same-origin'")
  &&intakeLead.includes("cache:'no-store'"),
  'Private lead read must be authenticated, owner scoped and cache safe');
expect(intakeLead.includes('OWNER_ONLY_NO_PAYMENT_CLAIMS')
  &&intakeLead.includes('output.replaceChildren()'),
  'Lead UI must fail closed and clear stale private records on failure');
expect(!/localStorage|sessionStorage/.test(intakeLead),
  'Private enquiry records must not persist in browser storage');
expect(growth.includes("$path==='/growth/leads/mine'")
  &&growth.includes('WHERE account_id=? AND expires_at>?'),
  'Backend lead listing must scope rows to the signed-in account');
expect(backend.includes("'/commerce/consultation-week'")
  &&backend.includes('operationsConsultationWeeklySnapshot($pdo,time())'),
  'The shared seven-day calendar must be backed by the internal booking/capacity ledger');
expect(serviceAdvance.includes('operationsConsultationWithinCapacity'),
  'Booking transition must reject hours not explicitly published by owner');
expect(ownerCapacity.includes("maxPublishedDailyHours'=>4")
  &&ownerCapacity.includes("['booked','in_progress']")===false,
  'Daily capacity must remain bounded and sourced from actual server bookings');
expect(bookingCss.includes('.cw-free')
  &&bookingCss.includes('.cw-full')
  &&bookingCss.includes(':focus-visible'),
  'Public and dashboard calendar must distinguish available/full states accessibly');

if(failures.length){
  console.error('Customer dashboard audit failed ('+failures.length+')');
  for(const f of failures)console.error('✗ '+f);
  process.exit(1);
}
console.log('Customer dashboard audit PASS');
console.log('FA/EN client OS, ecosystem wiring, authenticated commerce CTA, noindex/noarchive SEO boundaries, privacy caching, trust states, mobile safe areas and JS syntax verified.');
