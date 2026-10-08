// Read-only readiness check; never expose provider secrets or enable payment by implication.
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
 res.setHeader('Allow','GET');
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 const enabled=process.env.BITPAY_SANDBOX_ENABLED==='true';
 const hasSecret=Boolean(process.env.BITPAY_SANDBOX_API_KEY);
 const hasStore=Boolean(process.env.ORDER_STORE_URL&&process.env.ORDER_STORE_TOKEN);
 return res.status(200).json({service:'payment-api',mode:'sandbox',sandboxEnabled:enabled,credentialsConfigured:hasSecret,orderStoreConfigured:hasStore,checkoutReady:false,reason:'transaction_endpoints_not_implemented'});
}
