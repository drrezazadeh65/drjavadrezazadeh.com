import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const ignored=new Set(['.git','node_modules']);
const htmlFiles=[];

function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(ignored.has(ent.name)) continue;
    const full=path.join(dir,ent.name);
    if(ent.isDirectory()) walk(full);
    else if(ent.isFile()&&ent.name.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);

const failures=[];
const warnings=[];
let indexableCount=0;
let imageCount=0;

function attr(tag,name){
  const m=tag.match(new RegExp('\\\\b'+name+'\\\\s*=\\\\s*["\\\']([^"\\\']*)["\\\']','i'));
  return m?m[1]:null;
}

for(const file of htmlFiles){
  const rel=path.relative(root,file).replaceAll(path.sep,'/');
  const html=fs.readFileSync(file,'utf8');
  const noindex=/<meta\\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  if(noindex) continue;
  indexableCount++;

  if(!/<meta\\b[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html)){
    failures.push(rel+': missing responsive viewport meta');
  }

  if(/fonts\\.googleapis\\.com|fonts\\.gstatic\\.com/i.test(html)){
    failures.push(rel+': third-party Google webfont dependency detected');
  }

  const styleLinks=[...html.matchAll(/<link\\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].map(m=>m[0]);
  for(const tag of styleLinks){
    const href=attr(tag,'href')||'';
    if(/^https?:\\/\\//i.test(href) && !/^https:\\/\\/drjavadrezazadeh\\.com\\//i.test(href)){
      failures.push(rel+': third-party render-blocking stylesheet '+href);
    }
  }

  const images=[...html.matchAll(/<img\\b[^>]*>/gi)].map(m=>m[0]);
  imageCount+=images.length;
  let highPriority=0;
  for(const tag of images){
    const src=attr(tag,'src')||'';
    const width=attr(tag,'width');
    const height=attr(tag,'height');
    if(!width||!height) failures.push(rel+': image lacks explicit width/height '+src);
    if(/fetchpriority=["']high["']/i.test(tag)) highPriority++;
  }
  if(highPriority>1) warnings.push(rel+': more than one fetchpriority=high image ('+highPriority+')');

  const scripts=[...html.matchAll(/<script\\b[^>]*src=["'][^"']+["'][^>]*>/gi)].map(m=>m[0]);
  for(const tag of scripts){
    const src=attr(tag,'src')||'';
    if(/^https?:\\/\\//i.test(src) && !/^https:\\/\\/drjavadrezazadeh\\.com\\//i.test(src)){
      failures.push(rel+': third-party executable script '+src);
      continue;
    }
    if(!/\\bdefer\\b/i.test(tag)&&!/\\basync\\b/i.test(tag)&&!/type=["']module["']/i.test(tag)){
      failures.push(rel+': local script can block parsing '+src);
    }
  }

  const inlineStyles=[...html.matchAll(/<style\\b[^>]*>([\\s\\S]*?)<\\/style>/gi)];
  const inlineBytes=inlineStyles.reduce((n,m)=>n+Buffer.byteLength(m[1]||'','utf8'),0);
  if(inlineBytes>32768) warnings.push(rel+': large inline CSS payload '+inlineBytes+' bytes');

  if(Buffer.byteLength(html,'utf8')>350000) warnings.push(rel+': large HTML document '+Buffer.byteLength(html,'utf8')+' bytes');
}

console.log('Performance source audit: '+indexableCount+' indexable HTML pages, '+imageCount+' image tags checked.');
if(warnings.length){
  console.warn('Warnings ('+warnings.length+')');
  warnings.forEach(x=>console.warn('! '+x));
}
if(failures.length){
  console.error('Performance failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('No release-blocking source performance regressions detected.');
