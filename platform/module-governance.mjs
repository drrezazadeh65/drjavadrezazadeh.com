import fs from 'node:fs';
const registry=JSON.parse(fs.readFileSync(new URL('./module-registry.json',import.meta.url),'utf8'));
export {registry};

export function validateModuleGraph(input=registry){
 const modules=Array.isArray(input.modules)?input.modules:[];
 const ids=new Set();
 const failures=[];
 for(const m of modules){
  for(const k of input.extension_template?.required||[]){
   if(m?.[k]===undefined||m?.[k]===null||m?.[k]==='') failures.push((m?.id||'unknown')+': missing '+k);
  }
  if(ids.has(m.id)) failures.push('duplicate module '+m.id);
  ids.add(m.id);
  if(m.authority==='BROWSER'&& !['PUBLIC','PUBLIC_REFERENCE'].includes(m.data_class)) failures.push(m.id+': browser cannot own private authority');
 }
 for(const m of modules) for(const dep of m.depends_on||[]) if(!ids.has(dep)) failures.push(m.id+': unknown dependency '+dep);
 const by=new Map(modules.map(m=>[m.id,m]));
 const visiting=new Set(),done=new Set();
 const visit=id=>{
  if(done.has(id)) return;
  if(visiting.has(id)){ failures.push('dependency cycle at '+id); return; }
  visiting.add(id);
  for(const d of by.get(id)?.depends_on||[]) visit(d);
  visiting.delete(id);done.add(id);
 };
 for(const id of ids) visit(id);
 return {valid:failures.length===0,failures,module_count:modules.length};
}

export function dependencyClosure(moduleId,input=registry){
 const by=new Map((input.modules||[]).map(m=>[m.id,m]));
 if(!by.has(moduleId)) throw new Error('Unknown module '+moduleId);
 const out=new Set();
 const walk=id=>{for(const d of by.get(id)?.depends_on||[]) if(!out.has(d)){out.add(d);walk(d);}};
 walk(moduleId);
 return [...out];
}

export function canActivateModule(moduleId,{release_gate_passed=false,feature_flag='OFF'}={},input=registry){
 const graph=validateModuleGraph(input);
 if(!graph.valid) return {allow:false,reason:'INVALID_MODULE_GRAPH'};
 const m=(input.modules||[]).find(x=>x.id===moduleId);
 if(!m) return {allow:false,reason:'UNKNOWN_MODULE'};
 if(feature_flag!=='ON') return {allow:false,reason:'FEATURE_FLAG_OFF'};
 if(release_gate_passed!==true) return {allow:false,reason:'RELEASE_GATE_REQUIRED'};
 if(['PREVALIDATION','PREINTEGRATION','STAGING','PLANNED_OFF'].includes(m.state)) return {allow:false,reason:'MODULE_STATE_NOT_PRODUCTION'};
 return {allow:true,reason:'ACTIVATION_CONTRACT_SATISFIED'};
}
