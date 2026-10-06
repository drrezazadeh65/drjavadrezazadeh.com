// Provider-neutral commerce engine. Server-resolved catalogue/price data only.
export function priceOrder({user_id,items=[],catalogue}={}){
 if(!user_id||!catalogue) throw new Error('Authenticated server catalogue required');
 if(!items.length) throw new Error('Order items required');
 let currency=null,subtotal=0;
 const lines=items.map(input=>{
  const p=catalogue.products?.find(x=>x.id===input.product_id&&x.status==='ACTIVE');
  const price=catalogue.prices?.find(x=>x.id===input.price_id&&x.product_id===input.product_id&&x.status==='ACTIVE');
  if(!p||!price) throw new Error('Active server product and price required');
  if(currency&&currency!==price.currency) throw new Error('Mixed-currency order prohibited');
  currency=price.currency; const quantity=Math.max(1,Math.trunc(input.quantity||1)); const line_total_minor=price.amount_minor*quantity; subtotal+=line_total_minor;
  return {product_id:p.id,price_id:price.id,title_snapshot:p.title,unit_amount_minor:price.amount_minor,quantity,line_total_minor};
 });
 return {user_id,currency,subtotal_minor:subtotal,discount_minor:0,total_minor:subtotal,items:lines,status:'PENDING',client_amount_ignored:true};
}
export function fulfilVerifiedOrder({order,payment,entitlement_specs=[]}={}){
 if(order?.status!=='PAID'&&order?.status!=='FULFILLING') throw new Error('Paid order required');
 if(payment?.status!=='VERIFIED'||payment.amount_minor!==order.total_minor||payment.currency!==order.currency) throw new Error('Persisted verified matching payment required');
 return {order_status:'COMPLETED',entitlements:entitlement_specs.map(x=>({...x,status:'ACTIVE'})),payment_id:payment.id,server_verified:true};
}
export function reconcileRefund({entitlements=[],refund}={}){
 if(refund?.status!=='COMPLETED') throw new Error('Confirmed refund required');
 return entitlements.map(e=>({...e,status:'REVOKED',revocation_reason:'REFUND_RECONCILIATION'}));
}
