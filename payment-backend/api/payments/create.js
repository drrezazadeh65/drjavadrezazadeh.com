import {createOrder} from '../../lib/orders.js';
import {requestIntent} from '../../lib/bitpay-sandbox.js';
import {neon} from '@neondatabase/serverless';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Robots-Tag','noindex');
 res.setHeader('Allow','POST');
 if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
 if(process.env.BITPAY_SANDBOX_ENABLED!=='true'||!process.env.BITPAY_SANDBOX_API_KEY||!process.env.DATABASE_URL) return res.status(503).json({error:'sandbox_not_configured'});
 const origin=req.headers.origin;
 if(origin&&origin!=='https://drjavadrezazadeh.com') return res.status(403).json({error:'origin_denied'});
 if(!req.headers['content-type']?.startsWith('application/json')) return res.status(415).json({error:'json_required'});
 try{
  const items=req.body?.items;
  const order=await createOrder(items);
  const redirect='https://drjavadrezazadeh-payment-api.vercel.app/api/payments/callback?order_id='+encodeURIComponent(order.id);
  const intent=await requestIntent({api:process.env.BITPAY_SANDBOX_API_KEY,amountRial:Number(order.amount_rial),factorId:order.factor_id,redirect});
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql`UPDATE payment_orders SET state='pending',provider_id_get=${intent.idGet},updated_at=now() WHERE id=${order.id}::uuid AND state='created' RETURNING id`;
  if(rows.length!==1) throw new Error('intent_persistence_failed');
  return res.status(200).json({orderId:order.id,paymentUrl:intent.url,mode:'sandbox'});
 }catch(e){
  if(['invalid_cart','invalid_item','invalid_total'].includes(e.message)) return res.status(400).json({error:e.message});
  return res.status(502).json({error:'sandbox_checkout_failed'});
 }
}
