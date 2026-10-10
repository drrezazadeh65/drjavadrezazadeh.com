import fs from 'node:fs/promises';
const origin=process.env.PUBLIC_SITE_ORIGIN||'https://drjavadrezazadeh.com';
const endpoints=['/robots.txt','/llms.txt','/sitemap.xml','/sitemap-fa.xml','/sitemap-en.xml','/sitemap-services.xml'];
const checks=[];
for(const path of endpoints){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
 try{
  const r=await fetch(new URL(path,origin),{signal:controller.signal,redirect:'follow'});
  const body=await r.text();
  const entry={path,status:r.status,ok:r.ok,bytes:Buffer.byteLength(body),finalUrl:r.url};
  if(path==='/robots.txt')entry.sitemapDeclared=/^Sitemap:\s*https?:\/\//im.test(body);
  if(path==='/llms.txt')entry.hasOfficialIdentity=/Rezazadeh/i.test(body);
  if(path.endsWith('.xml')){entry.locCount=(body.match(/<loc>/g)||[]).length;entry.looksLikeSitemap=/<(?:urlset|sitemapindex)\b/.test(body);}
  checks.push(entry);
 }catch(e){checks.push({path,ok:false,error:String(e.message||e)})}
 finally{clearTimeout(timer)}
}
const result={schema:'rave.search-audit.v1',at:new Date().toISOString(),origin,checks,summary:{ok:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length}};
await fs.mkdir('rave/reports',{recursive:true});
await fs.writeFile('rave/reports/search-audit.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary));
if(result.summary.failed)process.exitCode=1;
