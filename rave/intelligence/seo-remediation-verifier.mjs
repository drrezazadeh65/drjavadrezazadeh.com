/** Offline remediation verification: rerun bilingual SEO audit against simulated pages. */
import {auditBilingualPages} from './master-seo-audit.mjs';
import {applySeoPlanInSandbox,rollbackSeoSandbox} from './seo-remediation-sandbox.mjs';
const key=f=>[f.code,f.path,f.severity].join('|');
export function verifySeoRemediation(pages,plan){
 const baseline=auditBilingualPages(pages);
 const simulation=applySeoPlanInSandbox(pages,plan);
 const candidate=auditBilingualPages(simulation.after);
 const previous=new Set(baseline.findings.map(key));
 const current=new Set(candidate.findings.map(key));
 const resolved=baseline.findings.filter(f=>!current.has(key(f)));
 const introduced=candidate.findings.filter(f=>!previous.has(key(f)));
 const safe=introduced.filter(f=>f.severity==='error').length===0;
 return {baseline,candidate,resolved,introduced,accepted:safe&&resolved.length>0,
  outcome:safe&&resolved.length>0?'improved':'rejected',
  resultingPages:safe&&resolved.length>0?simulation.after:rollbackSeoSandbox(simulation),
  simulatedOperations:simulation.log,productionTouched:false};
}
