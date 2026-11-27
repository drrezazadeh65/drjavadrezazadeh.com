/* Final assembled-release boundary: independent product identities are not
 * interchangeable with the public commercial JREI catalogue. Preserve the
 * approved authoring design and exact local artwork, including all locales. */
import fs from 'node:fs';
import path from 'node:path';
const products=Object.freeze([['forge','forge'],['jrei-academic','academic'],['jrei/seo','seo']]);
const locales=['fa','en','ar'];
const section=(html,pattern,label)=>{
 const m=html.match(pattern);
 if(!m)throw Error('Missing independent product '+label);
 return m[0];
};
export function verifyProductPage(relative,original,packaged,product){
 const required=['/assets/jrei-launch/product-foundation-v1.css','/assets/jrei-launch/'+product+'-studio-v1.css','/assets/images/jrei-launch/'+product+'-hero.webp','/assets/images/jrei-launch/'+product+'-showcase.webp','/assets/jrei-launch/style.css','/assets/jrei-launch/'+product+'-logo.svg','/assets/jrei-launch/'+product+'-hero.svg','data-jrei-launch="coming-soon"'];
 for(const marker of required)if(!packaged.includes(marker))throw Error(relative+' lost '+marker);
 if(/jrei-experience-v2\.(?:css|js)|jrei-premium-cards[^"']*\.(?:css|js)|data-jp-premium=|data-jx-studio|class="jx-nav"|data-jrei-public-centre=/.test(packaged))throw Error(relative+' received generic commercial design');
 for(const [label,pattern] of [
  ['body identity',/<body\b[^>]*>/i],
  ['original header',/<header class="parent">[\s\S]*?<\/header>/i],
  ['product navigation',/<div class="productbar">[\s\S]*?<\/nav><\/div><\/div>/i],
  ['hero',/<section class="hero">[\s\S]*?<\/section>/i],
  ['feature cards',/<section id="features"[\s\S]*?<\/section>/i],
  ['readiness notice',/<p class="notice" role="status">[\s\S]*?<\/p>/i],
  ['footer',/<footer class="footer">[\s\S]*?<\/footer>/i],
  ['canonical',/<link rel="canonical"[^>]*>/i],
  ...['workspaces','workflow','use-cases','product-faq'].map(id=>[id,new RegExp('<section class="product-section" id="'+id+'"[\\s\\S]*?</section>','i')])
 ]){
  if(section(original,pattern,label)!==section(packaged,pattern,label))throw Error(relative+' changed protected '+label);
 }
 if((packaged.match(/<h1\b/gi)||[]).length!==1)throw Error(relative+' invalid heading hierarchy');
 // JSON-LD metadata is allowed, executable commercial/concierge scripts are not.
 for(const m of packaged.matchAll(/<script\b[^>]*>/gi))if(!/\btype=["']application\/ld\+json["']/i.test(m[0]))throw Error(relative+' received executable script');
 return true;
}
export function verifyIndependentProducts(root,out){
 const identities=new Set();let pages=0;
 for(const [route,product] of products){
  for(const kind of ['logo','hero']){
   const rel='assets/jrei-launch/'+product+'-'+kind+'.svg';
   const source=fs.readFileSync(path.join(root,rel)),actual=fs.readFileSync(path.join(out,rel));
   if(!source.equals(actual))throw Error('Independent product artwork changed: '+rel);
   if(identities.has(actual.toString('utf8')))throw Error('Independent product artwork duplicated: '+rel);
   identities.add(actual.toString('utf8'));
  }
  for(const lang of locales){
   const rel=lang+'/'+route+'/index.html';
   verifyProductPage(rel,fs.readFileSync(path.join(root,rel),'utf8'),fs.readFileSync(path.join(out,rel),'utf8'),product);
   pages++;
  }
 }
 for(const file of ['style.css','product-foundation-v1.css',...products.map(([,p])=>p+'-studio-v1.css'),...products.flatMap(([,p])=>[p+'-hero.webp',p+'-showcase.webp'])]){
 const rel=(file.endsWith('.webp')?'assets/images/jrei-launch/':'assets/jrei-launch/')+file,source=fs.readFileSync(path.join(root,rel)),actual=fs.readFileSync(path.join(out,rel));
 if(!source.equals(actual))throw Error('Independent product asset changed: '+rel);
 if(file.endsWith('.webp')&&(actual.length>100000||actual.toString('ascii',8,12)!=='WEBP'))throw Error('Invalid premium art '+rel);
 }
 return {pages,distinctArtwork:identities.size,originalLayoutPreserved:true};
}
