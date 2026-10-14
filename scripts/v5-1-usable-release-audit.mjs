/**
 * v5.1.0 FIRST-USABLE source contract, never proof of a live Bertina release.
 * Run alongside existing v5 integrity, browser, privacy and MariaDB suites.
 */
import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const exists=path=>fs.existsSync(path);
const failed=[];
const check=(assertion,why)=>{if(!assertion)failed.push(why);};
const count=(text,token)=>text.split(token).length-1;
const fa=read('fa/customer-dashboard/index.html');
const en=read('en/account/index.html');
const faAppointments=read('fa/app/account/appointments/index.html');
const enAppointments=read('en/account/appointments/index.html');
const week=read('assets/js/consultation-week-view.js');
const owner=read('api/consultation-availability.php');
const entry=read('api/index.php');
const paid=read('api/operations-fulfilment.php');
const lead=read('assets/js/customer-consultation-leads.js');
const roles=read('assets/js/consultation-appointments.js');
const rc=read('fa/assessments/golden-talent/start/index.html');
const intakeFa=read('fa/darkhast-moshavere/index.html');
const intakeEn=read('en/request-consultation/index.html');
const manifest=read('docs/releases/V5_1_0_FIRST_USABLE_LAUNCH.md');
check(manifest.includes('NOT RELEASED until exact live Bertina evidence exists'),
  'Release document must not claim production publication before evidence');
check(manifest.includes('v5.1.0'),'Exact target 5.1.0 must be declared');
for(const [code,html,appointment,signup,ownerPath] of [
  ['FA',fa,faAppointments,'/fa/darkhast-moshavere/','/fa/app/account/appointments/'],
  ['EN',en,enAppointments,'/en/request-consultation/','/en/account/appointments/']
]){
  check(count(html,'data-consultation-week aria-labelledby')===1,
    code+': only one owner-published calendar in dashboard');
  check(count(html,'data-consultation-week-days')===1,
    code+': duplicate customer calendar results found');
  check(count(html,'data-customer-consultation-leads')===1,
    code+': customer-owned opt-in enquiry history is not unique');
  check(count(html,'data-consultation-appointments')===1,
    code+': paid-service appointment panel must be unique');
  check(count(html,'consultation-week-view.js?v=')===1,
    code+': exactly one shared calendar script is required');
  check(count(html,'customer-consultation-leads.js?v=')===1,
    code+': exactly one customer lead-history script is required');
  check(html.includes(ownerPath)&&html.includes(signup),
    code+': private appointments and public intake must be linked');
  check(count(appointment,'data-consultation-week aria-labelledby')===1,
    code+': account appointment view should share the week');
  check(count(appointment,'data-consultation-appointments')===1,
    code+': account appointment view should read owner-scoped paid orders');
  check(appointment.includes('consultation-appointments.js?v='),
    code+': appointment history needs its actual API-backed script');
  for(const match of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)){
    const url=match[1].split('?')[0];
    if(!url.startsWith('/')&&!url.startsWith('../../'))continue;
    const pathname=url.startsWith('/')?url.slice(1):
      (code==='FA'?'fa/customer-dashboard/':'en/account/')+url;
    // Normalize relative paths without network fetch, retaining no-404 rule.
    const resolved=pathname.split('/').reduce((stack,p)=>{
      if(p==='..')stack.pop();else if(p!==''&&p!=='.')stack.push(p);
      return stack;
    },[]).join('/');
    check(exists(resolved),code+': missing dashboard script '+resolved);
  }
}
for(const [code,intake] of [['FA',intakeFa],['EN',intakeEn]]){
  check(count(intake,'data-consultation-week aria-labelledby')===1,
    code+': public intake missing shared consultation calendar');
  check(intake.includes('name="preferred_slot"')&&intake.includes('data-consultation-composer'),
    code+': chosen hour cannot reach the reviewed email draft');
}
check(exists('docs/migrations/20261014_consultation_availability.sql'),
  'Reviewed additive capacity migration is absent');
check(owner.includes("maxPublishedDailyHours'=>4")&&owner.includes("daily_capacity_four_hours_max"),
  'Owner must cap real published capacity to four hours a Tehran day');
check(owner.includes("status IN ('booked','in_progress')")&&
  owner.includes("remainingSlots")&&owner.includes("'FULL'"),
  'Public capacity must be calculated from actual booked records');
check(entry.includes("'/commerce/consultation-week'")&&
  entry.includes('operationsConsultationWeeklySnapshot($pdo,time())'),
  'Public week must be backed by no-PII server projection');
check(week.includes("fetch('/api/commerce/consultation-week'")&&
  week.includes("credentials:'same-origin',cache:'no-store'"),
  'Customer calendar must fetch current same-origin server inventory');
check(week.includes('validRequested===slot.startUtc')&&
  week.includes('customerReservationEnabled!==false'),
  'Handoff from dashboard must revalidate and must not assert direct booking');
check(paid.includes('operationsConsultationWithinCapacity'),
  'Paid booking operation must deny undeclared owner hours');
check(roles.includes("fetch('/api/commerce/history'")&&
  roles.includes("fetch('/api/commerce/fulfilment?order='"),
  'Account appointment panel must verify purchase and owner-scoped order details');
check(lead.includes("fetch('/api/growth/leads/mine'")&&
  lead.includes('OWNER_ONLY_NO_PAYMENT_CLAIMS')&&
  !/localStorage|sessionStorage/.test(lead),
  'Private lead viewer must not invent orders, ownership, or persist data');
check(rc.includes('RCAS Start')&&
  read('assets/js/rcas-start.js').includes('sessionStorage'),
  'Free RCAS gateway and its explicit browser-state boundary must exist');
const candidate=read('.github/workflows/v5-release-candidate.yml');
const deploy=read('.github/workflows/deploy-bertina.yml');
for(const [name,workflow] of [['candidate',candidate],['release',deploy]]){
  check(workflow.includes('tests/customer-dashboard-browser.spec.js'),
    name+': e2e customer dashboard test is not a release gate');
  check(workflow.includes('tests/service-request-summary.spec.js'),
    name+': bilingual consultation request test is not a release gate');
  check(workflow.includes('node scripts/v5-1-usable-release-audit.mjs'),
    name+': 5.1.0 launch contract omitted from release gate');
}
try{new Function(week)}catch(e){failed.push('Public calendar JavaScript syntax invalid: '+e.message);}
try{new Function(lead)}catch(e){failed.push('Customer lead JavaScript syntax invalid: '+e.message);}
if(failed.length){
  for(const issue of failed)console.error('FAIL '+issue);
  console.error('v5.1.0 SOURCE AUDIT FAILED: '+failed.length+' failures');
  process.exit(1);
}
console.log('v5.1.0 first-usable SOURCE audit PASS.');
console.log('Not live acceptance: no Bertina migration, real user purchase, payment, customer booking, scientific validity or deployment is certified by this test.');
