/**
 * Pure public-route inspection only. Does NOT establish bank settlements,
 * authenticated dashboards, scientific validation, delivery or authorisation.
 */
export function inspectPublicServiceRoute(html,{id,locale,origin='https://drjavadrezazadeh.com'}){
  if(typeof html!=='string'||!['fa','en'].includes(locale)
     ||typeof id!=='string'||!/^[a-z0-9_]{3,80}$/.test(id))
    return {ok:false,failures:['invalid_route_input']};
  const url=origin+'/'+locale+'/services/'+id+'/';
  const fa=origin+'/fa/services/'+id+'/';
  const en=origin+'/en/services/'+id+'/';
  const failures=[];
  const require=(ok,key)=>{if(!ok)failures.push(key);};
  require(html.includes('<link rel="canonical" href="'+url+'"'),'canonical');
  require(html.includes('hreflang="fa" href="'+fa+'"'),'hreflang_fa');
  require(html.includes('hreflang="en" href="'+en+'"'),'hreflang_en');
  require(html.includes('hreflang="x-default" href="'+en+'"'),'hreflang_default');
  require(!/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html),'unexpected_noindex');
  require(html.includes('href="/'+locale+'/services/checkout/?service='+id+'"'),'service_checkout_link');
  require(/<h1(?:\s|>)/i.test(html),'visible_h1');
  return {ok:failures.length===0,failures};
}

export function serviceRoutesFromCatalog(catalog){
  if(!catalog||!Array.isArray(catalog.services))throw new Error('service_catalog_missing');
  const ids=catalog.services.filter(s=>s?.sellable===true).map(s=>s.id);
  if(ids.length!==21||new Set(ids).size!==21||ids.some(id=>!/^[a-z0-9_]{3,80}$/.test(id)))
    throw new Error('service_catalog_not_canonical_21');
  return ids.flatMap(id=>['fa','en'].map(locale=>({
    id,locale,path:'/'+locale+'/services/'+id+'/'
  })));
}
