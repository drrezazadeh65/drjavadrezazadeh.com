import {getOrder} from '../../lib/orders.js';
import {verifySandboxPayment} from '../../lib/bitpay-verify.js';
import {settleVerifiedOrder} from '../../lib/settlement.js';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('Allow','GET, POST');
 if(req.method!=='GET'&&req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
 if(process.env.BITPAY_SANDBOX_ENABLED!=='true'||!process.env.BITPAY_SANDBOX_API_KEY||!process.env.DATABASE_URL) return res.status(503).json({error:'sandbox_not_configured'});
 const input=req.method==='POST'?req.body:req.query;
 const orderId=input?.order_id, idGet=String(input?.id_get??''),transId=String(input?.trans_id??'');
 if(typeof orderId!=='string'||!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(orderId)||!/^[0-9]+$/.test(idGet)||!/^[0-9]+$/.test(transId)) return res.status(400).json({error:'invalid_callback'});
 try{
  const order=await getOrder(orderId);
  if(!order||order.state!=='pending'||String(order.provider_id_get)!==idGet) return res.status(409).json({error:'order_not_pending'});
  const verification=await verifySandboxPayment({api:process.env.BITPAY_SANDBOX_API_KEY,transId,idGet});
  const settled=await settleVerifiedOrder({orderId,idGet,transId,verification});
  return res.status(200).json({status:'sandbox_paid',orderId:settled.id});
 }catch{return res.status(409).json({error:'verification_failed'});}
}
