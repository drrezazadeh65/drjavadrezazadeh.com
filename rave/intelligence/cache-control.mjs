/** Cache control-plane helpers aligned with CACHE_STANDARD.md; no vendor assumptions. */
const PRIVATE=/\/(?:admin|account|login|register|checkout|payment|orders|crm|api\/private)(?:\/|$)/i;
const VERSIONED=/[.-][a-f0-9]{8,}\.(?:avif|webp|png|jpe?g|svg|woff2?)$/i;
export function cachePolicy(path,{authenticated=false}={}){
 if(typeof path!=='string'||!path.startsWith('/'))throw new Error('Invalid path');
 if(authenticated||PRIVATE.test(path))return Object.freeze({strategy:'network-only',http:'no-store',storage:false});
 if(VERSIONED.test(path))return Object.freeze({strategy:'cache-first',http:'public, max-age=31536000, immutable',storage:true});
 return Object.freeze({strategy:'network-first',http:'no-cache',storage:true});
}
export function planCacheInvalidation({changedPaths=[],references=[]}={}){
 if(!Array.isArray(changedPaths)||!Array.isArray(references))throw new Error('Invalid invalidation inputs');
 const targets=new Set();
 for(const path of changedPaths){
  if(typeof path!=='string'||!path.startsWith('/')||path.includes('..')||path.includes('?'))throw new Error('Invalid changed path');
  targets.add(path);
  for(const ref of references)if(ref&&ref.asset===path&&typeof ref.page==='string'&&ref.page.startsWith('/')&&!ref.page.includes('..'))targets.add(ref.page);
 }
 return Object.freeze({targets:[...targets].sort(),bumpServiceWorkerVersion:changedPaths.length>0,privateDataPurge:false});
}
