import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const failures=[];
const securityPath=path.join(root,'.well-known','security.txt');
const expectedOrigin='https://drjavadrezazadeh.com';

if(!fs.existsSync(securityPath)){
  failures.push('.well-known/security.txt is missing');
}else{
  const text=fs.readFileSync(securityPath,'utf8');
  const lines=Object.fromEntries(text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(x=>{
    const i=x.indexOf(':');
    return i>0?[x.slice(0,i),x.slice(i+1).trim()]:[x,''];
  }));
  if(!/^mailto:/i.test(lines.Contact||'')) failures.push('security.txt Contact must be a mailto address');
  if(lines.Canonical!==expectedOrigin+'/.well-known/security.txt') failures.push('security.txt Canonical mismatch');
  if(lines.Policy!==expectedOrigin+'/privacy/') failures.push('security.txt Policy must point to production privacy page');
  if(!/\ben\b/i.test(lines['Preferred-Languages']||'')||!/\bfa\b/i.test(lines['Preferred-Languages']||'')) failures.push('security.txt Preferred-Languages must include en and fa');
  const expires=Date.parse(lines.Expires||'');
  if(!Number.isFinite(expires)) failures.push('security.txt Expires must be a valid timestamp');
  else if(expires-Date.now()<90*24*60*60*1000) failures.push('security.txt expires in less than 90 days');
}

for(const rel of ['privacy/index.html','terms/index.html','fa/harim-khosusi/index.html','fa/sharayet-estefade/index.html']){
  const file=path.join(root,rel);
  if(!fs.existsSync(file)){ failures.push(rel+': required legal/trust page is missing'); continue; }
  const html=fs.readFileSync(file,'utf8');
  if(!/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)){
    failures.push(rel+': legal/trust baseline page should remain noindex until final jurisdictional review');
  }
  if(!/<meta\b[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(html)){
    failures.push(rel+': missing responsive viewport');
  }
}

for(const rel of ['fa/index.html','en/index.html']){
  const file=path.join(root,rel);
  if(!fs.existsSync(file)){ failures.push(rel+': homepage missing'); continue; }
  const html=fs.readFileSync(file,'utf8');
  const wantsFa=rel.startsWith('fa/');
  if(wantsFa){
    if(!html.includes('./harim-khosusi/')) failures.push(rel+': Persian privacy link missing from public footer/surface');
    if(!html.includes('./sharayet-estefade/')) failures.push(rel+': Persian terms link missing from public footer/surface');
  }else{
    if(!html.includes('../privacy/')&&!html.includes('/privacy/')) failures.push(rel+': English privacy link missing from public footer/surface');
    if(!html.includes('../terms/')&&!html.includes('/terms/')) failures.push(rel+': English terms link missing from public footer/surface');
  }
}

console.log('Trust/legal metadata audit completed.');
if(failures.length){
  console.error('Trust/legal failures ('+failures.length+')');
  failures.forEach(x=>console.error('✗ '+x));
  process.exit(1);
}
console.log('security.txt, legal baselines and public legal discoverability are consistent.');
