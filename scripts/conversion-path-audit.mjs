import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const routes=[
  'fa/moshavere-tahsili/index.html',
  'fa/entekhab-reshteh/index.html',
  'fa/estedaadyabi/index.html',
  'fa/moshavere-konkur/index.html',
  'fa/khadamat-pajouheshi/index.html',
  'fa/hamkari-sazmani/index.html',
  'fa/khadamat/index.html',
  'en/student-guidance/index.html',
  'en/academic-services/index.html',
  'en/invite/index.html',
  'en/services/index.html'
];

function getAttr(tag,name){
  const m=tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\\\']([^"\\\']*)["\\\']','i'));
  return m?m[1]:null;
}

for(const rel of routes){
  const file=path.join(root,rel);
  if(!fs.existsSync(file)){ failures.push(rel+': missing route'); continue; }
  const html=fs.readFileSync(file,'utf8');
  if(/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)){
    failures.push(rel+': high-intent public service page must remain indexable');
  }
  const anchors=[...html.matchAll(/<a\b[^>]*>/gi)].map(m=>m[0]);
  const instrumented=anchors.filter(a=>getAttr(a,'data-conversion-event')&&getAttr(a,'data-conversion-surface'));
  if(!instrumented.length){
    failures.push(rel+': missing instrumented conversion CTA');
    continue;
  }
  const usable=instrumented.filter(a=>{
    const href=getAttr(a,'href')||'';
    return href && href!=='#' && !href.toLowerCase().startsWith('javascript:');
  });
  if(!usable.length) failures.push(rel+': conversion CTA has no usable destination');
  for(const a of usable){
    const href=(getAttr(a,'href')||'').toLowerCase();
    if(/checkout|cart|payment|pay-now|pardakht/.test(href)){
      failures.push(rel+': pre-gateway conversion CTA must not imply active payment '+href);
    }
  }
}

for(const rel of ['fa/darkhast-moshavere/index.html','en/request-consultation/index.html']){
  const file=path.join(root,rel);
  if(!fs.existsSync(file)){ failures.push(rel+': missing intake route'); continue; }
  const html=fs.readFileSync(file,'utf8');
  if(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)){
    failures.push(rel+': transactional intake must remain noindex before secure backend launch');
  }
  if(/<form\b(?![^>]*onsubmit=["']return false["'])[^>]*action=["'][^"']+["']/i.test(html)){
    failures.push(rel+': active form submission detected before secure backend launch');
  }
  if(!/mailto:/i.test(html)){
    failures.push(rel+': safe interim contact path is missing');
  }
}

console.log('Conversion path audit: '+routes.length+' public service journeys + 2 intake routes checked.');
if(failures.length){
  console.error('Conversion path failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('Core service journeys remain measurable, non-dead-end and payment-neutral until gateway activation.');
