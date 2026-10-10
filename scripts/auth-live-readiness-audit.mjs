const ORIGIN='https://drjavadrezazadeh-payment.dr-rezazadeh65.workers.dev';
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),12000);
let response,data;
try{
 response=await fetch(ORIGIN+'/auth/health',{headers:{Accept:'application/json'},cache:'no-store',redirect:'manual',signal:controller.signal});
 if(!response.ok)throw new Error('auth_health_http_'+response.status);
 data=await response.json();
}finally{clearTimeout(timeout)}
if(data?.ok!==true||data?.service!=='auth')throw new Error('auth_health_contract_missing_or_stale');
console.log('Auth health:',JSON.stringify(data));
if(data.ready!==true)throw new Error('auth_runtime_not_ready');
if(data.database!==true)throw new Error('auth_database_not_ready');
if(data.email!==true)throw new Error('auth_email_not_ready');
if(data.passwordKdf!==true)throw new Error('auth_password_kdf_not_ready');
console.log('Unified customer auth runtime is ready for controlled registration testing.');
