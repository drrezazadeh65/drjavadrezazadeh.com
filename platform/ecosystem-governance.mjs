import fs from 'node:fs';

const registry=JSON.parse(fs.readFileSync(new URL('./ecosystem-registry.json',import.meta.url),'utf8'));

export {registry};

export function normalizeRoute(input='/'){
 const raw=String(input||'/').split('#')[0].split('?')[0];
 const withLead=raw.startsWith('/')?raw:'/'+raw;
 return withLead==='/'?'/':withLead.replace(/\/+/g,'/').replace(/\/+$/,'')+'/';
}

export function classifyRoute(input='/'){
 const route=normalizeRoute(input);
 const exact=(registry.exact_routes||[]).find(x=>normalizeRoute(x.route)===route);
 const families=[...(registry.route_families||[])].sort((a,b)=>b.prefix.length-a.prefix.length);
 const family=exact?null:families.find(x=>route.startsWith(x.prefix));
 const policyName=exact?.policy||family?.policy||'PUBLIC_CANDIDATE';
 const policy=registry.policies[policyName];
 if(!policy) throw new Error('Unknown route policy '+policyName);
 return {route,family_id:exact?.id||family?.id||'public-fallback',policy:policyName,...policy};
}

export function validateFeatureRegistration(feature={}){
 const required=registry.extension_contract.new_feature_requires||[];
 const missing=required.filter(k=>feature[k]===undefined||feature[k]===null||feature[k]==='');
 if(missing.length) throw new Error('Feature registration missing: '+missing.join(', '));
 if(feature.index_policy==='INDEX'&&feature.lifecycle_state!=='RELEASED') throw new Error('Only RELEASED features may request indexing');
 if(feature.data_class!=='PUBLIC'&&feature.index_policy==='INDEX') throw new Error('Non-public features cannot be indexed');
 if(feature.auth_policy!=='NONE'&&feature.cache_policy!=='NO_STORE') throw new Error('Authenticated/private features must be NO_STORE');
 if(feature.owner_surface==='BROWSER'&&feature.data_class!=='PUBLIC') throw new Error('Browser cannot own private persistence');
 return {valid:true,feature_id:feature.feature_id};
}

export function assertRouteRelease({route,index=false,cache_policy}={}){
 const classification=classifyRoute(route);
 if(index&&classification.indexing!=='EXPLICIT_RELEASE_ONLY') throw new Error('Route policy prohibits indexing');
 if(classification.cache==='NO_STORE'&&cache_policy&&cache_policy!=='NO_STORE') throw new Error('Private route must remain NO_STORE');
 return classification;
}

export function privatePrefixes(){
 return (registry.route_families||[])
  .filter(x=>registry.policies[x.policy]?.cache==='NO_STORE')
  .map(x=>x.prefix);
}
