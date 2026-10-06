export function validateBookCatalogue(catalogue={}){
 const ids=new Set();
 for(const b of catalogue.books||[]){
  if(!b.id||!b.slug||!b.title_fa||b.publication_status!=='PUBLISHED') throw new Error('Published book metadata required');
  if(ids.has(b.id)) throw new Error('Duplicate book id');
  ids.add(b.id);
  const c=b.commerce||{};
  if(c.sellable===true){
   if(!Number.isInteger(c.price)||c.price<0||!c.currency) throw new Error('Sellable book requires verified price');
   if(!Array.isArray(c.formats_confirmed)||!c.formats_confirmed.length) throw new Error('Sellable book requires confirmed format');
   if(!['IN_STOCK','DIGITAL'].includes(c.inventory_state)) throw new Error('Sellable book requires fulfilment-ready inventory state');
  }
 }
 return {valid:true,book_count:ids.size};
}
export function priceBookCart({items=[],catalogue,user_id}={}){
 if(!user_id) throw new Error('Authenticated user required for real order');
 validateBookCatalogue(catalogue);
 if(!items.length) throw new Error('Cart items required');
 let currency=null,total=0;
 const lines=items.map(i=>{
  const book=(catalogue.books||[]).find(b=>b.id===i.book_id);
  if(!book||book.commerce?.sellable!==true) throw new Error('Book is not active for sale');
  const c=book.commerce;
  if(currency&&currency!==c.currency) throw new Error('Mixed currency order prohibited');
  currency=c.currency;
  const quantity=Math.max(1,Math.min(20,Math.trunc(i.quantity||1)));
  const line_total_minor=c.price*quantity;
  total+=line_total_minor;
  return {book_id:book.id,product_slug:book.slug,title_snapshot:book.title_fa,unit_amount_minor:c.price,quantity,line_total_minor};
 });
 return {user_id,currency,subtotal_minor:total,discount_minor:0,total_minor:total,lines,client_totals_ignored:true,payment_success_client_authoritative:false};
}
export function planBookFulfilment({order,shipping_address_id=null,digital_asset_ids=[]}={}){
 if(order?.status!=='PAID'&&order?.status!=='FULFILLING') throw new Error('Verified paid order required');
 return {order_id:order.id,shipping_address_id:shipping_address_id||null,digital_asset_ids:[...new Set(digital_asset_ids)],shipment_status:shipping_address_id?'PENDING':'NOT_REQUIRED',download_access:'SERVER_ENTITLEMENT_ONLY'};
}
