import fs from 'node:fs';
const required=[['fa','کتاب‌هایی برای روشن‌ماندن چراغ استعداد','مشارکت نویسندگان و ناشران'],['en','Books that help talented students flourish','For authors and publishers']];
const css=fs.readFileSync('assets/css/store-mission.css','utf8');
for(const selector of ['.store-mission','.store-collaboration','.store-collaboration-action'])if(!css.includes(selector))throw Error('Style missing: '+selector);
for(const [locale,title,cta] of required){
 for(const root of ['','.public-site/']){
  const p=root+locale+'/shop/index.html';
  const html=fs.readFileSync(p,'utf8');
  for(const marker of [title,cta,'id="store-mission-title"','id="publish-for-talent"','id="book-catalog"','href="#book-catalog"','href="#publish-for-talent"','store-mission.css?v=approved-original-20261011-v3','mailto:info@drjavadrezazadeh.com']){
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
// Verify that both bookstore routes and both safeguarded student-support entry points
// expose the same production payment contract, without relying on stale UI fixtures.
for(const route of ['fa/shop/index.html','en/shop/index.html','fa/support-talented-students/index.html','en/support-talented-students/index.html']){
 for(const root of ['','.public-site/']){
  const name=root+route;
  const html=fs.readFileSync(name,'utf8');
  for(const marker of ['max="10000000"','min="1000"','step="1"','value="500000"','data-support-amount="200000"','data-support-amount="500000"','data-support-amount="1000000"','data-support-amount="2000000"','data-support-amount="5000000"','data-support-amount="10000000"']){
   if(!html.includes(marker))throw Error('Donation amount contract missing '+marker+' in '+name);
  }
  if((html.match(/data-support-amount="/g)||[]).length!==6)throw Error('Donation preset count mismatch in '+name);
 }
}
const donationClient=fs.readFileSync('assets/js/donation-payment.js','utf8');
const donationApi=fs.readFileSync('api/index.php','utf8');
if(!donationClient.includes('data.maxToman!==10000000')||!donationApi.includes("'maxToman'=>10000000"))throw Error('Server/browser donation limit drift');
console.log('Store mission, mobile-first donation contracts, collaboration, anchor links and SEO: PASS');
