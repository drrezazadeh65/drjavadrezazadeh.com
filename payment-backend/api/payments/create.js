// Fail closed until a verified BitPay API adapter, persistent order store,
// server-side price catalogue and rate limiting have been deployed.
export default function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Allow','POST');
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  return res.status(503).json({error:'payment_not_configured'});
}
