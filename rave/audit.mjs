import fs from 'node:fs/promises';
const cfg=JSON.parse(await fs.readFile(new URL('./config.json',import.meta.url),'utf8'));
const origin=process.env.PUBLIC_SITE_ORIGIN||cfg.publicSiteOrigin;
const result={schema:'rave.audit.v1',at:new Date().toISOString(),origin,mode:'observe',checks:[]};
for(const path of cfg.paths){
 const target=new URL(path,origin).href;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),cfg.timeoutMs);
 try{
  const response=await fetch(target,{signal:controller.signal,redirect:'follow'});
  const type=response.headers.get('content-type')||'';
  const html=type.includes('text/html')?await response.text():'';
  const canonical=html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1]||null;
  result.checks.push({path,status:response.status,ok:response.ok,finalUrl:response.url,canonical});
 }catch(e){result.checks.push({path,ok:false,error:String(e.message||e)})}
 finally{clearTimeout(timer)}
}
result.summary={passed:result.checks.filter(x=>x.ok).length,failed:result.checks.filter(x=>!x.ok).length};
await fs.mkdir('rave/reports',{recursive:true});
await fs.writeFile('rave/reports/latest.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result.summary));
if(result.summary.failed)process.exitCode=1;
