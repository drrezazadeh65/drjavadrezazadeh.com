/* JHELA public scholarly policy and visual identity regression gate.
 * Source assurance only: never represents native OJS runtime or payment evidence.
 */
import fs from 'node:fs';
const read=path=>fs.readFileSync(path,'utf8');
const failures=[];
const requirePolicy=(yes,msg)=>{if(!yes) failures.push(msg)};
const home=read('journal/index.html'), dashboard=read('journal/dashboard/index.html');
const fees=read('journal/fees/index.html'), feesFa=read('journal/fa/fees/index.html');
const sub=read('journal/submission/index.html'),subFa=read('journal/fa/submission/index.html');
const master=read('docs/journal/JHELA_EDITORIAL_DESIGN_FINANCE_RELEASE_MASTER_20261016.md');
const manifest=JSON.parse(read('platform/jhela-ojs-activation.json'));
const editorial=JSON.parse(read('platform/jhela-ojs-editorial-workflow-v1.json'));
for(const [path,document] of [['EN fees',fees],['FA fees',feesFa]]){
 for(const price of ['CHF 0','CHF 990','CHF 2,000'])requirePolicy(document.includes(price),path+' missing '+price);
 requirePolicy(/noindex/i.test(sub)&&/noindex/i.test(subFa),'Unreleased submission surfaces must remain noindex');
 requirePolicy(/<link rel="canonical" href="https:\/\/drjavadrezazadeh.com\/journal\//.test(document),path+' canonical missing');
 requirePolicy(!/<form[^>]+action=[^>]*api\/payment/i.test(document),path+' may not add premature public payment form');
}
requirePolicy(fees.includes('100%')&&feesFa.includes('صددرصدی'),'Inaugural full waiver missing');
requirePolicy(fees.includes('after formal APC activation')&&feesFa.includes('غیرفعال'),'Payment must remain prospective and inactive');
requirePolicy(fees.includes('Waiver')||fees.includes('waiver'),'EN waiver missing');
requirePolicy(feesFa.includes('معافیت'),'FA waiver missing');
requirePolicy(master.includes('finance')&&master.includes('reviewer')&&master.includes('DOAJ'),'Master policy missing required subject');
for(const p of ['assets/images/jhela/wordmark-en.svg','assets/images/jhela/wordmark-en-reverse.svg']){
 const logo=read(p);
 requirePolicy(logo.startsWith('<svg ')&&logo.includes('viewBox=')&&logo.includes('JHELA')&&logo.includes('HUMAN-CENTRED'),p+' invalid wordmark');
}
requirePolicy(home.includes('wordmark-en-reverse.svg')&&dashboard.includes('wordmark-en-reverse.svg'),'Journal pages must use scholarly wordmark');
requirePolicy(/name="robots" content="noindex/.test(sub),'English public manuscript intake must remain closed');
requirePolicy(/name="robots" content="noindex/.test(subFa),'Persian public manuscript intake must remain closed');
for(const key of ['ojsInstalled','realReviewEndToEndConfirmed','publicSubmissionsEnabled']){
 requirePolicy(manifest[key]===false,'Unsafe claim: '+key+' was enabled without evidence');
}
requirePolicy(!/https:\/\/journal.drjavadrezazadeh.com/.test(read('journal/sitemap.xml')),'Unverified OJS host leaked into public journal sitemap');
requirePolicy(editorial.panels.length===8,'Journal role-specific panel contract missing');
requirePolicy(editorial.panels.some(p=>p.id==='reviewer'&&p.scope==='ACCEPTED_ASSIGNMENTS_ONLY'),'Reviewer permissions unsafe');
requirePolicy(editorial.panels.some(p=>p.id==='audit_officer'&&p.scope==='REDACTED_EVENT_AUDIT_ONLY'),'Audit role must see redacted events');
requirePolicy(editorial.reviewForm.automaticDecisionByScore===false&&editorial.reviewForm.requireNormallyTwoIndependentReviewers===true,'Independent review contract missing');
requirePolicy(editorial.finance.currency==='CHF'&&editorial.finance.charges.some(c=>c.amount===2000)&&editorial.finance.charges.some(c=>c.amount===990),'Financial policy and public rates diverged');
requirePolicy(editorial.finance.feeActivation.startsWith('DISABLED')&&editorial.liveClaims.publicSubmissionsOpen===false,'Editorial activation must fail closed');
if(failures.length){console.error('JHELA policy/brand contract FAILED:\n'+failures.join('\n'));process.exit(1)}
console.log('JHELA source contracts PASS: two English logo variants, public bilingual fee schedule, waived founding issue, and native-OJS activation safety preserved. Live operation NOT certified.');
