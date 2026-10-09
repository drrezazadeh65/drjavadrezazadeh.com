#!/usr/bin/env node
/* SEO release gate: service URLs, images, metadata and sitemap integrity.
   Runs with Node.js built-ins only; exits nonzero for defects. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),domain='https://drjavadrezazadeh.com';
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalog=JSON.parse(read('assets/data/service-catalog.json')).services;
const sitemap=read('sitemap-services.xml'),main=read('sitemap.xml');
const errors=[];
function assert(ok,msg){if(!ok)errors.push(msg)}
assert(main.includes(domain+'/sitemap-services.xml'),'Main sitemap does not reference services sitemap');
const found=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
assert(new Set(found).size===found.length,'Duplicate <loc> in services sitemap');
for(const service of catalog){
 const id=service.id,uri=domain+'/fa/services/'+id+'/',file='fa/services/'+id+'/index.html',image='assets/images/services/'+id+'.svg';
 assert(found.includes(uri),'Missing sitemap URL: '+uri);
 assert(found.includes(domain+'/'+image),'Missing sitemap image URL: '+image);
 if(!fs.existsSync(path.join(root,file))){errors.push('Missing HTML: '+file);continue}
 const html=read(file);
 // Public service pages may describe paid support, but must never expose its Eitaa ID.
 assert(!/https?:\/\/(?:www\.)?eitaa\.com\/|@DrRezazadeh65/i.test(html),'Public Eitaa contact leaked: '+file);
 // Services are part of a researcher's public academic record, not an anonymous shop.
 assert(html.includes('دکتر جواد رضازاده یزدلی'),'Missing full academic identity: '+file);
 for(const link of ['/fa/darbare-man/','/fa/pajouhesh/','/fa/entesharat-elmi/'])
  assert(html.includes('href="'+link+'"'),'Missing academic provenance link '+link+': '+file);
 assert(/<html[^>]+lang="fa"/i.test(html),'Missing lang fa: '+file);
 assert(/<html[^>]+dir="rtl"/i.test(html),'Missing RTL: '+file);
 assert(html.includes('<link rel="canonical" href="'+uri+'">'),'Incorrect self canonical: '+file);
 assert(!/name="robots"[^>]*noindex/i.test(html),'Noindex on indexable service: '+file);
 assert(/<title>[^<]+<\/title>/i.test(html),'Missing title: '+file);
 assert(/name="description" content="[^"]+"/i.test(html),'Missing description: '+file);
 assert(html.includes('href="/fa/services/checkout/"'),'Missing checkout link: '+file);
 assert(html.includes('/'+image),'Missing hero image reference: '+file);
 assert(html.includes(service.title_fa),'Wrong service title: '+file);
 const jsonld=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 assert(jsonld.length>0,'Missing JSON-LD: '+file);
 for(const [,json] of jsonld){try{const obj=JSON.parse(json);assert(JSON.stringify(obj).includes(uri),'Schema URL mismatch: '+file)}catch(e){errors.push('Invalid JSON-LD: '+file)}}
 assert(fs.existsSync(path.join(root,image)),'Missing service image: '+image);
}
assert(found.includes(domain+'/fa/services/'),'Missing services index in sitemap');
const index=read('fa/services/index.html');
assert(!/https?:\/\/(?:www\.)?eitaa\.com\/|@DrRezazadeh65/i.test(index),'Public Eitaa ID in services index');
assert(index.includes('/fa/pajouhesh/') && index.includes('/fa/entesharat-elmi/'),'Services index must lead to academic record');
const en=read('en/services/index.html');
assert(en.includes('../academic-profile/') && en.includes('../publications/'),'English services must lead to academic record');
assert(!/https?:\/\/(?:www\.)?eitaa\.com\/|@DrRezazadeh65/i.test(en),'Public Eitaa ID in English services');
const auth=JSON.parse(read('platform/identity-auth-policy.json'));
assert(auth.primary_login_identifier==='EMAIL' && auth.registration.activation_requires==='EMAIL_VERIFICATION' && auth.registration.phone_is_authenticator===false && auth.recovery.channel==='EMAIL', 'Email-only identity and verification policy was altered');
for(const s of catalog)assert(index.includes('/fa/services/'+s.id+'/'),'Missing hub internal link: '+s.id);
if(errors.length){console.error('SEO GATE FAILED: '+errors.length+' issue(s)\n'+errors.map(x=>' - '+x).join('\n'));process.exit(1)}
console.log('SEO GATE PASSED: '+catalog.length+' service pages, canonical URLs, images, schema and internal links');
