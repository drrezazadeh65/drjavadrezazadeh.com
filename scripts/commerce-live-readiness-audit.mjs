// Non-mutating Bertina commerce diagnostic. Never creates payment intents or exposes secrets.
const url=new URL('/api/commerce/health','https://drjavadrezazadeh.com');
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),12000);
let response,health;
try{
 response=await fetch(url,{method:'GET',redirect:'manual',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('commerce_health_http_'+response.status);
 health=await response.json();
}finally{clearTimeout(timeout)}
if(health?.ok!==true||health.service!=='commerce'||typeof health.checkout!=='boolean')
 throw new Error('commerce_health_contract_missing_or_stale');
console.log('Deployed health keys:',Object.keys(health).sort().join(', '));
console.log('Advertised checkout:',health.checkout);
for(const key of ['services','vip','books']){
 if(typeof health.capabilities?.[key]!=='boolean')throw new Error('commerce_capability_missing_'+key);
 if(health.capabilities[key]===true&&health.checkout!==true)throw new Error('capability_enabled_without_checkout_'+key);
}
if(typeof health.requirements?.publicTlsConfirmed!=='boolean')throw new Error('public_tls_confirmation_missing');
if(health.checkout===true&&health.requirements.publicTlsConfirmed!==true)throw new Error('checkout_enabled_without_trusted_tls_gate');
console.log('Bertina commerce health contract: reachable, structurally valid.');
console.log('Checkout enabled:',health.checkout,'; category readiness:',JSON.stringify(health.capabilities));
if(!health.checkout)console.log('Public checkout remains intentionally disabled; this is NOT production payment certification.');
console.log('This read-only check does not prove MySQL persistence, local-mail receipts, entitlement authorization or gateway settlement.');
