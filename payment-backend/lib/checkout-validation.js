import {createHash, timingSafeEqual} from 'node:crypto';

export const CATALOG = Object.freeze({
  roshanaei:{title:'سپید',price:2000000,currency:'IRT'},
  tariki:{title:'تاریکی',price:2000000,currency:'IRT'},
  bonbast:{title:'بن‌بست',price:2000000,currency:'IRT'}
});
export function validateCart(items){
  if(!Array.isArray(items)||items.length===0||items.length>10) throw new Error('invalid_cart');
  const seen=new Set(); let total=0;
  const lines=items.map(item=>{
    if(!item||typeof item.id!=='string'||!Object.hasOwn(CATALOG,item.id)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>5||seen.has(item.id)) throw new Error('invalid_item');
    seen.add(item.id);
    const book=CATALOG[item.id]; const subtotal=book.price*item.quantity;
    total+=subtotal;
    return {id:item.id,quantity:item.quantity,unitPrice:book.price,subtotal};
  });
  if(!Number.isSafeInteger(total)||total<=0) throw new Error('invalid_total');
  return {lines,totalToman:total,totalRial:total*10,currency:'IRT'};
}
export function constantTimeTokenEqual(actual,expected){
  if(typeof actual!=='string'||typeof expected!=='string'||!expected) return false;
  const a=createHash('sha256').update(actual).digest();
  const b=createHash('sha256').update(expected).digest();
  return timingSafeEqual(a,b);
}
