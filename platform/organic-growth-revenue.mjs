/** Stage 14: PURE settlement reporting contract, not a provider connector.
 * No production accounting rows are fetched by this module. Unverified coverage
 * produces null, never a synthetic zero or a click-derived revenue claim.
 */
export function reconcileOrganicRevenue({orders=[],settlements=[],refunds=[],coverage=null}={}) {
  const unknown=(reason,exceptions=[])=>({status:'UNVERIFIED',netSettledToman:null,grossSettledToman:null,refundedToman:null,settledOrderCount:null,reason,exceptions});
  if (!coverage || coverage.verified!==true || coverage.source!=='BANK_OR_MERCHANT_STATEMENT'
      || typeof coverage.evidenceDigest!=='string' || !/^[a-f0-9]{64}$/i.test(coverage.evidenceDigest)
      || typeof coverage.periodStart!=='string'||typeof coverage.periodEnd!=='string'
      || !coverage.reviewedBy || coverage.periodEnd<coverage.periodStart) return unknown('verified_complete_settlement_coverage_required');
  if (![orders,settlements,refunds].every(Array.isArray))return unknown('invalid_ledger_type');
  const money=v=>Number.isSafeInteger(v)&&v>=0;
  const seenOrders=new Set(),seenTrans=new Set(),pairs=new Map(),exceptions=[];
  for(const row of orders) {
    if(!row || typeof row.id!=='string'||!row.id || seenOrders.has(row.id)){exceptions.push('duplicate_order_id');continue;}
    seenOrders.add(row.id);pairs.set(row.id,row);
  }
  let gross=0,count=0;
  for(const s of settlements) {
    const o=pairs.get(s?.orderId);
    if (!o || s.status!=='SETTLED' || s.currency!=='IRT' || o.state!=='paid' || o.currency!=='IRT'
      || typeof s.transactionId!=='string'||!s.transactionId
      || seenTrans.has(s.transactionId)
      || typeof s.bankReference!=='string'||!s.bankReference
      || s.transactionId!==o.providerTransactionId
      || !money(s.amountToman)||!money(o.amountToman)||s.amountToman!==o.amountToman
      || !s.settledAt || !o.paidAt) {exceptions.push('unreconciled_settlement');continue;}
    seenTrans.add(s.transactionId);
    if(!Number.isSafeInteger(gross+s.amountToman)){exceptions.push('amount_overflow');continue;}
    gross+=s.amountToman;count++;
  }
  const refundIds=new Set();let refunded=0;
  for(const r of refunds) {
    if (!r||!pairs.has(r.orderId)||r.status!=='SETTLED'||!money(r.amountToman)
      ||!r.bankReference||refundIds.has(r.bankReference)
      ||!settlements.some(s=>s.orderId===r.orderId&&s.status==='SETTLED')
      ||!Number.isSafeInteger(refunded+r.amountToman)){exceptions.push('unreconciled_refund');continue;}
    refundIds.add(r.bankReference);refunded+=r.amountToman;
  }
  if(count!==orders.filter(o=>o?.state==='paid').length || exceptions.length ||refunded>gross)
    return unknown('ledger_mismatch_requires_human_review',exceptions);
  return {status:'SETTLEMENT_RECONCILED_FOR_VERIFIED_PERIOD',netSettledToman:gross-refunded,
    grossSettledToman:gross,refundedToman:refunded,settledOrderCount:count,periodStart:coverage.periodStart,
    periodEnd:coverage.periodEnd,evidenceDigest:coverage.evidenceDigest,reason:null,exceptions:[]};
}
