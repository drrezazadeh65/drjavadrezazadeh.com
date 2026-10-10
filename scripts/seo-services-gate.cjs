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
const imageFound=[...sitemap.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(x=>x[1]);
assert(new Set(found).size===found.length,'Duplicate <loc> in services sitemap');
assert(new Set(imageFound).size===imageFound.length,'Duplicate <image:loc> in services sitemap');
for(const service of catalog){
 const id=service.id,uri=domain+'/fa/services/'+id+'/',file='fa/services/'+id+'/index.html',image='assets/images/services/'+id+'.svg';
 assert(found.includes(uri),'Missing sitemap URL: '+uri);
 assert(imageFound.includes(domain+'/'+image),'Missing sitemap image URL: '+image);
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
 assert(/href="\/fa\/services\/checkout\/(?:\?[^"]*)?"/.test(html),'Missing checkout link: '+file);
 assert(html.includes('/'+image),'Missing hero image reference: '+file);
 assert(html.includes(service.title_fa),'Wrong service title: '+file);
 const jsonld=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 assert(jsonld.length>0,'Missing JSON-LD: '+file);
 for(const [,json] of jsonld){
   try{
    const obj=JSON.parse(json),nodes=obj['@graph']||[obj];
    assert(JSON.stringify(obj).includes(uri),'Schema URL mismatch: '+file);
    const serviceNode=nodes.find(n=>n['@type']==='Service');
    assert(serviceNode?.url===uri,'Service schema canonical URL mismatch: '+file);
    assert(serviceNode?.image===domain+'/'+image,'Service schema image missing or incorrect: '+file);
    assert(!serviceNode||!Object.prototype.hasOwnProperty.call(serviceNode,'offers'),'Unverified commercial Offer in service schema: '+file);
   }catch(e){errors.push('Invalid JSON-LD: '+file)}
  }
  assert(html.includes('class="service-booking-disclosure"'),'Service must disclose unverified booking/payment readiness: '+file);
  assert(html.includes('مبنای تعرفه و ارزش خدمت'),'Each service must justify its fee through its defined scope and deliverables: '+file);
  assert(!html.includes('انتخاب خدمت و پرداخت'),'Service must not imply live checkout: '+file);
  assert(fs.existsSync(path.join(root,image)),'Missing service image: '+image);
}
// The six distinct VIP offers complete the 27-offer public catalogue.
const vip=JSON.parse(read('assets/data/vip-catalog.json')).services;
assert(catalog.length===21 && vip.length===6,'Expected 21 standard and six VIP offers');
for(const v of vip){
 const id=v.id,file='fa/vip/'+id+'/index.html',image='assets/images/vip-'+id+'.svg',uri=domain+'/fa/vip/'+id+'/';
 assert(found.includes(uri),'Missing VIP sitemap URL: '+uri);
 assert(imageFound.includes(domain+'/'+image),'Missing VIP sitemap image URL: '+image);
 if(!fs.existsSync(path.join(root,file))){errors.push('Missing VIP page: '+file);continue}
 const html=read(file);
 assert(fs.existsSync(path.join(root,image)),'Missing VIP illustration: '+image);
 assert(html.includes('<link rel="canonical" href="'+uri+'">'),'VIP canonical mismatch: '+file);
 assert(html.includes('/'+image),'Missing VIP image reference: '+file);
 assert(html.includes('دکتر جواد رضازاده یزدلی'),'Missing academic author in VIP service: '+file);
 const schemas=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x=>{try{return JSON.parse(x[1])}catch{errors.push('Invalid VIP JSON-LD: '+file);return null}}).filter(Boolean);
 const nodes=schemas.flatMap(x=>x['@graph']||[x]);
 const serviceNode=nodes.find(x=>x['@type']==='Service');
 assert(!!serviceNode && serviceNode.url===uri,'Missing canonical VIP Service JSON-LD: '+file);
 assert(!!serviceNode && serviceNode.image===domain+'/'+image,'Wrong VIP Service schema image: '+file);
  assert(!serviceNode||!Object.prototype.hasOwnProperty.call(serviceNode,'offers'),'Unverified commercial Offer in VIP schema: '+file);
 assert(!!serviceNode && serviceNode.provider?.['@id']===domain+'/#person','VIP schema must reference academic Person: '+file);
 assert(nodes.some(x=>x['@type']==='BreadcrumbList'),'VIP breadcrumb schema missing: '+file);
 for(const link of ['/fa/darbare-man/','/fa/pajouhesh/','/fa/entesharat-elmi/'])
  assert(html.includes('href="'+link+'"'),'Missing VIP academic link '+link+': '+file);
 assert(!/https?:\/\/(?:www\.)?eitaa\.com\/|@DrRezazadeh65/i.test(html),'Public VIP Eitaa contact leaked: '+file);
}
assert(found.includes(domain+'/fa/services/'),'Missing services index in sitemap');
const index=read('fa/services/index.html');
assert(!/https?:\/\/(?:www\.)?eitaa\.com\/|@DrRezazadeh65/i.test(index),'Public Eitaa ID in services index');
assert(index.includes('/fa/pajouhesh/') && index.includes('/fa/entesharat-elmi/'),'Services index must lead to academic record');
const en=read('en/services/index.html');
assert(en.includes('../academic-profile/') && en.includes('../publications/'),'English services must lead to academic record');
assert(!/https?:\/\/(?:www\.)?eitaa\.com\/|@DrRezazadeh65/i.test(en),'Public Eitaa ID in English services');
// Client JavaScript is world-readable: buyer-only support IDs must not ship in it.
for(const filename of fs.readdirSync(path.join(root,'assets/js')).filter(n=>n.endsWith('.js'))){
 const script=read('assets/js/'+filename);
 assert(!/https?:\/\/(?:www\.)?eitaa\.com\/|@DrRezazadeh65/i.test(script),'Public Eitaa contact leaked in JavaScript: '+filename);
}
const checkoutClient=read('assets/js/commerce-checkout.js');
assert(!checkoutClient.includes('customerEmail'),'Checkout must not request an email field ignored by the server');
assert(checkoutClient.includes("'/commerce/health'"),'Checkout must verify live readiness before enabling payment');
assert(checkoutClient.includes('button.disabled=true'),'Checkout buttons must default to disabled');
assert(checkoutClient.includes('health?.capabilities?.[kind]'),'Checkout must respect service-specific readiness');
assert(checkoutClient.includes('channel===true'),'Absent service capability must fail closed');
assert(checkoutClient.includes("image.src=kind==='service'"),'Service and VIP checkout cards must show owned per-service artwork');
assert(checkoutClient.includes('card.append(image,title,fit,price,details,button,live)'),'Checkout cards must display the individual illustration and service fit');
assert(checkoutClient.includes("item.fit_fa"),'Checkout must explain which student/researcher each standard service fits');
assert(!checkoutClient.includes('channel===undefined'),'Unspecified capability cannot authorize checkout');

const backend=read('api/index.php');
const readiness=backend.match(/function commerceReady\(\): bool \{([\s\S]*?)\n\}/)?.[1]||'';
for(const flag of ['public_tls_confirmed','commerce_enabled','order_email_fulfilment_confirmed']){
 assert(readiness.includes("$c['"+flag+"']===true"),'Bertina health must enforce '+flag);
 assert(read('api/config.example.php').includes("'"+flag+"' => false"),'Bertina '+flag+' must default to false');
}
assert(backend.includes("if(!commerceReady())fail('checkout_disabled',503)"),'Bertina create must reject unavailable commerce');
for(const [kind,flag] of [['book','book_shipping_confirmed'],['service','service_booking_confirmed'],['vip','vip_booking_confirmed']]){
 assert(backend.includes("$c['"+flag+"']!==true)fail('"+(kind==='book'?'book_shipping':kind+'_booking')+"_not_configured',503)"),'Bertina create must enforce '+kind+' operational readiness');
}


assert(checkoutClient.includes("'/fa/vip/'+encodeURIComponent(item.id)"),'VIP purchase card must link to its specific detail page');
const auth=JSON.parse(read('platform/identity-auth-policy.json'));
assert(auth.primary_login_identifier==='EMAIL' && auth.registration.activation_requires==='EMAIL_VERIFICATION' && auth.registration.phone_is_authenticator===false && auth.recovery.channel==='EMAIL', 'Email-only identity and verification policy was altered');
for(const s of catalog){
 assert(index.includes('/fa/services/'+s.id+'/'),'Missing hub internal link: '+s.id);
 assert(index.includes('/assets/images/services/'+s.id+'.svg'),'Missing illustrated service card: '+s.id);
}
assert(found.includes(domain+'/fa/vip/'),'Missing VIP hub in services sitemap');
const vipHub=read('fa/vip/index.html');
const hubSchemaScripts=[...vipHub.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
const hubNodes=hubSchemaScripts.flatMap(x=>{try{const z=JSON.parse(x[1]);return z['@graph']||[z]}catch{errors.push('Invalid VIP hub JSON-LD');return []}});
const hubList=hubNodes.find(x=>x['@type']==='ItemList');
assert(hubList?.itemListElement?.length===vip.length,'VIP hub ItemList must include six services');
for(const v of vip){
 assert(vipHub.includes('/assets/images/vip-'+v.id+'.svg'),'Missing illustrated VIP card: '+v.id);
 assert(vipHub.includes('./'+v.id+'/'),'Missing VIP offer in hub: '+v.id);
}

if(errors.length){console.error('SEO GATE FAILED: '+errors.length+' issue(s)\n'+errors.map(x=>' - '+x).join('\n'));process.exit(1)}
console.log('SEO GATE PASSED: '+catalog.length+' standard and '+vip.length+' VIP service pages, academic provenance, canonical URLs, images, schema and internal links');
