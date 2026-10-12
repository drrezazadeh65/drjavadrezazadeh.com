// Non-destructive source dependency audit. Run: node platform/engine-dependency-audit.mjs
import {readFileSync, existsSync} from 'node:fs';
import {resolve,dirname,relative,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ENGINE_REGISTRY,ENGINE_MODULE_OWNERS,validateEngineOwnership} from './engine-registry.mjs';
import {registry as moduleRegistry,validateModuleGraph} from './module-governance.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const importsFrom=source=>[...source.matchAll(/\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g)].map(m=>m[1]);
export function auditEngineDependencies({engines=ENGINE_REGISTRY,modules=moduleRegistry,sourceReader=null}={}){
 const failures=[],edges=[],owners=new Map(engines.map(e=>[e.module,e.id]));
 const read=sourceReader||((modulePath)=>readFileSync(resolve(root,modulePath),'utf8'));
 const ownership=validateEngineOwnership(modules);
 failures.push(...ownership.failures);
 const graph=validateModuleGraph(modules);
 failures.push(...graph.failures.map(f=>'module: '+f));
 for(const engine of engines){
  let source;
  try {source=read(engine.module);} catch(e){failures.push(engine.id+': source unreadable');continue;}
  for(const specifier of importsFrom(source)){
   if(!specifier.startsWith('.')) continue;
   const target=resolve(dirname(resolve(root,engine.module)),specifier);
   const targetPath='./'+relative(root,target).replaceAll('\\','/');
   if(!sourceReader&&!existsSync(target)) failures.push(engine.id+': missing import '+specifier);
   const dependency=owners.get(targetPath);
   if(dependency) edges.push({from:engine.id,to:dependency});
  }
 }
 return {valid:failures.length===0,engine_count:engines.length,module_count:modules.modules.length,edges,failures};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=auditEngineDependencies();
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(!result.valid) process.exitCode=1;
}
