import {neon} from '@neondatabase/serverless';
export async function settleVerifiedOrder({orderId,idGet,transId,verification}){
 if(!process.env.DATABASE_URL) throw new Error('database_not_configured');
 if(!verification?.verified||verification.amountRial==null||verification.factorId==null) throw new Error('provider_proof_incomplete');
 if(!/^[0-9]+$/.test(String(idGet))||!/^[0-9]+$/.test(String(transId))) throw new Error('invalid_provider_ids');
 const sql=neon(process.env.DATABASE_URL);
 // Single conditional UPDATE prevents double settlement and rejects mismatched amount/factor/provider identifiers.
 const rows=await sql`UPDATE payment_orders SET state='paid',provider_trans_id=${String(transId)},paid_at=now(),updated_at=now()
 WHERE id=${orderId}::uuid AND state='pending' AND provider_id_get=${String(idGet)}
 AND amount_rial=${verification.amountRial}::bigint AND factor_id=${verification.factorId}::bigint
 RETURNING id,state,paid_at`;
 if(rows.length!==1) throw new Error('settlement_rejected_or_already_processed');
 return rows[0];
}
