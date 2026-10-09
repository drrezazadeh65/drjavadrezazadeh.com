/** Offline service fulfilment lifecycle; transitions require verified evidence.
 * Pure functions: no DB mutation, email dispatch or live deployment.
 */
const transitions={
 'awaiting-payment':['payment-verified','cancelled'],
 'payment-verified':['access-ready','refund-pending'],
 'access-ready':['in-progress','refund-pending'],
 'in-progress':['completed','refund-pending'],
 'completed':['support-open','closed','refund-pending'],
 'support-open':['closed','refund-pending'],
 'refund-pending':['refunded','in-progress'],
 'cancelled':[],
 'refunded':[],
 'closed':[]
};
const evidenceFor={
 'payment-verified':['gatewayVerificationId'],
 'access-ready':['fulfilmentReceiptId'],
 'in-progress':['staffAssignmentId'],
 'completed':['completionRecordId'],
 'support-open':['supportTicketId'],
 'closed':['closureRecordId'],
 'refund-pending':['refundRequestId'],
 'refunded':['gatewayRefundId'],
 'cancelled':['cancellationRecordId']
};
export function advancePurchasedService({record,to,evidence={},actor='system',occurredAt=new Date().toISOString()}={}){
 const reject=reason=>({accepted:false,reason,record:null,productionTouched:false});
 if(!record||typeof record.orderId!=='string'||typeof record.serviceId!=='string'||!Object.hasOwn(transitions,record.status))return reject('invalid-service-record');
 if(!transitions[record.status].includes(to))return reject('invalid-transition');
 if(!Number.isFinite(Date.parse(occurredAt))||!['system','staff','customer','gateway'].includes(actor))return reject('invalid-event-metadata');
 const required=evidenceFor[to]??[];
 if(required.some(k=>typeof evidence[k]!=='string'||!evidence[k].trim()))return reject('missing-transition-evidence');
 if(to==='payment-verified'&&actor!=='gateway')return reject('gateway-actor-required');
 if(to==='refunded'&&actor!=='gateway')return reject('gateway-refund-confirmation-required');
 if(['access-ready','in-progress','completed','closed'].includes(to)&&actor==='customer')return reject('privileged-transition');
 const event={from:record.status,to,actor,occurredAt,evidence:Object.fromEntries(required.map(k=>[k,evidence[k]]))};
 return {accepted:true,reason:'transition-recorded-offline',record:{...record,status:to,history:[...(Array.isArray(record.history)?record.history:[]),event]},productionTouched:false};
}
export function summarizePurchasedServices(records=[]){
 if(!Array.isArray(records))throw new TypeError('Records must be an array');
 const counts=Object.fromEntries(Object.keys(transitions).map(k=>[k,0])),invalid=[];
 for(const r of records){if(r&&Object.hasOwn(counts,r.status))counts[r.status]++;else invalid.push(r?.orderId??null)}
 return {counts,invalid,realOrdersConnected:false,productionTouched:false};
}
