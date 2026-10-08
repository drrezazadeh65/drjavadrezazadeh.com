// Never trust a browser redirect as proof of payment.
// Production implementation must verify with BitPay server-to-server,
// compare expected amount/order/currency and atomically record settlement.
export default function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Allow','POST');
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  return res.status(503).json({error:'payment_not_configured'});
}
