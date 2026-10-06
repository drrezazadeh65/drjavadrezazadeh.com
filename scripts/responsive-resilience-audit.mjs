import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const warnings=[];
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const style=read('assets/css/style.css');
const publicCss=read('assets/css/public-v2.css');

for(const token of [
  '@media(max-width:320px)',
  '@media(max-width:360px)',
  '@media(max-width:420px)',
  'prefers-reduced-motion',
  'max-width:100%'
]){
  if(!style.includes(token)) failures.push('assets/css/style.css missing responsive resilience token: '+token);
}

for(const token of [
  '@media(max-width:800px)',
  '@media(max-width:540px)',
  'prefers-reduced-motion'
]){
  if(!publicCss.includes(token)) failures.push('assets/css/public-v2.css missing responsive public token: '+token);
}

const forbidden=[
  {re:/\bwidth:\s*(?:[4-9]\d{2}|[1-9]\d{3,})px\b/g,label:'large fixed width'},
  {re:/\bmin-width:\s*(?:[4-9]\d{2}|[1-9]\d{3,})px\b/g,label:'large fixed min-width'}
];

const htmlFiles=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()&&ent.name.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);

for(const file of htmlFiles){
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  const html=fs.readFileSync(file,'utf8');
  if(!/<meta\b[^>]*name=["']viewport["'][^>]*width=device-width/i.test(html)){
    failures.push('/'+rel+': missing responsive viewport');
  }
  const inline=[...html.matchAll(/style=["']([^"']+)["']/gi)].map(m=>m[1]).join('\n');
  for(const {re,label} of forbidden){
    re.lastIndex=0;
    if(re.test(inline)) warnings.push('/'+rel+': inline '+label+' should be manually reviewed for narrow screens');
  }
}

if(!style.includes('320px hard-floor QA')) failures.push('assets/css/style.css missing named 320px hard-floor contract');
if(!style.includes('.actions .button{width:100%;max-width:100%}')) failures.push('narrow CTA containment contract missing');
if(!style.includes('.app-sheet-panel')||!style.includes('left:8px!important;right:8px!important')) failures.push('mobile sheet containment contract missing');

console.log('Responsive resilience audit: '+htmlFiles.length+' HTML files checked; 320/360/420/540/800 breakpoint contracts verified.');
if(warnings.length){
  console.warn('Responsive warnings ('+warnings.length+')');
  warnings.slice(0,20).forEach(x=>console.warn('! '+x));
}
if(failures.length){
  console.error('Responsive failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
