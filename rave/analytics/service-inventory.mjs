import fs from 'node:fs/promises';
const files=['fa/services/index.html','en/services/index.html'];
const report={schema:'rave.service-inventory.v1',generatedAt:new Date().toISOString(),pages:[],warnings:[]};
for(const path of files){
 try{
  const html=await fs.readFile(path,'utf8');
  const title=html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]||'';
  const declaredCounts=[...html.matchAll(/(?:۲[۰-۹]|[12][0-9])\s*(?:خدمت|services?)/gi)].map(x=>x[0]);
  const urls=[...new Set([...html.matchAll(/href=["']([^"'#?]+)["']/g)].map(x=>x[1]).filter(x=>!x.startsWith('javascript:')))];
  report.pages.push({path,title,declaredCounts,linkCount:urls.length,localLinks:urls.filter(x=>!/^https?:\/\//.test(x)).length});
  if(declaredCounts.length>1&&new Set(declaredCounts).size>1)report.warnings.push({path,code:'INCONSISTENT_SERVICE_COUNTS',values:[...new Set(declaredCounts)]});
 }catch(e){report.warnings.push({path,code:'MISSING_FILE',message:String(e.message||e)})}
}
await fs.mkdir('rave/reports',{recursive:true});
await fs.writeFile('rave/reports/service-inventory.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({pages:report.pages.length,warnings:report.warnings.length}));
