// Server-only bridge. Inputs must be retrieved from trusted persisted records.
import {fulfilVerifiedOrder} from './commerce-engine.mjs';
import {confirmConsultation} from './consultation-engine.mjs';
export function confirmPaidConsultation({booking,order,payment,consultation_user_id}={}){
 if(!booking||!order?.id||!payment?.id||!consultation_user_id) throw new Error('Trusted records required');
 if(order.user_id!==consultation_user_id) throw new Error('Consultation and order user mismatch');
 if(payment.order_id!==order.id) throw new Error('Payment and order mismatch');
 const verified=fulfilVerifiedOrder({order,payment,entitlement_specs:[]});
 const confirmed=confirmConsultation({booking,payment_required:true,payment_state:'COMPLETED'});
 return {consultation:confirmed,order_id:order.id,payment_id:verified.payment_id,server_verified:true,persisted:false};
}
