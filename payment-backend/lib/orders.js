import {neon} from '@neondatabase/serverless';
import {randomUUID,randomInt} from 'node:crypto';
import {validateCart} from './checkout-validation.js';

function db(){
 const url=process.env.DATABASE_URL;
 if(!url||!/^postgres(ql)?:\/\//.test(url)) throw new Error('database_not_configured');
 return neon(url);
}
export async function createOrder(items){
 const cart=validateCart(items);
 const sql=db();
 const id=randomUUID();
 const factorId=String(randomInt(100000000,2147483647));
 const rows=await sql`INSERT INTO payment_orders (id,factor_id,currency,amount_rial,cart,state)
 VALUES (${id}::uuid,${factorId}::bigint,'IRR',${cart.totalRial}::bigint,${JSON.stringify(cart)}::jsonb,'created')
 RETURNING id,factor_id,amount_rial,state`;
 return rows[0];
}
export async function getOrder(id){
 if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(id)) throw new Error('invalid_order_id');
 const sql=db();
 const rows=await sql`SELECT id,factor_id,amount_rial,state,provider_id_get,provider_trans_id,paid_at FROM payment_orders WHERE id=${id}::uuid LIMIT 1`;
 return rows[0]||null;
}
