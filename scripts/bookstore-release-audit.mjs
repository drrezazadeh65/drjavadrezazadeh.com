import fs from 'node:fs';
const required=[['fa','کتاب‌هایی برای روشن‌ماندن چراغ استعداد','مشارکت نویسندگان و ناشران'],['en','Books that help talented students flourish','For authors and publishers']];
const css=fs.readFileSync('assets/css/store-mission.css','utf8');
for(const selector of ['.store-mission','.store-collaboration','.store-collaboration-action'])if(!css.includes(selector))throw Error('Style missing: '+selector);
for(const [locale,title,cta] of required){
 for(const root of ['','.public-site/']){
  const p=root+locale+'/shop/index.html';
  const html=fs.readFileSync(p,'utf8');
  for(const marker of [title,cta,'id="store-mission-title"','id="publish-for-talent"','id="book-catalog"','href="#book-catalog"','href="#publish-for-talent"','store-mission.css?v=approved-original-20261011-v2','mailto:info@drjavadrezazadeh.com']){
   if(!html.includes(marker))throw Error('Missing '+marker+' from '+p);
  }
  if(!html.includes('rel="canonical" href="https://drjavadrezazadeh.com/'+locale+'/shop/"'))throw Error('Canonical mismatch '+p);
  const data=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if(!data)throw Error('JSON-LD missing '+p);JSON.parse(data[1]);
 }
}
const approved=fs.readFileSync('.public-site/fa/shop/index.html','utf8');
if(!approved.includes('cinema-original-hero')||!approved.includes('bookstore-talent-cinematic-approved-20261011.webp')||!approved.includes('bookstore-talent-cinematic-approved-original-20261011.png'))throw Error('Approved original photograph missing from FA storefront');
if(approved.includes('talent-bookstore-hero-3d.svg'))throw Error('Rejected SVG still rendered in storefront');
if(!fs.existsSync('.public-site/assets/css/store-mission.css'))throw Error('CSS omitted from release');
console.log('Store mission bilingual contract, legal collaboration, anchor links and SEO: PASS');
