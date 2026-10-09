/** Pure, offline checkout quote builder. No gateway or customer data is transmitted. */
const emailOk=value=>typeof value==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function createCheckoutQuote({items=[],catalog=[],email}={}){
 if(!emailOk(email))throw new Error('A valid email is required; phone verification is not supported');
 if(!Array.isArray(items)||items.length===0||!Array.isArray(catalog))throw new Error('Cart and catalog required');
 const products=new Map();
 for(const product of catalog){
  if(!product||typeof product.sku!=='string'||!product.sku.trim()||products.has(product.sku))throw new Error('Invalid or duplicate catalog SKU');
  if(!Number.isSafeInteger(product.priceMinor)||product.priceMinor<0||!['IRR','USD'].includes(product.currency))throw new Error('Invalid catalog price or currency');
  products.set(product.sku,product);
 }
 const currency=products.get(items[0]?.sku)?.currency;
 if(!currency)throw new Error('Unknown product');
 const lines=items.map(item=>{
  const product=products.get(item?.sku);
  if(!product)throw new Error('Unknown product');
  if(!Number.isSafeInteger(item.quantity)||item.quantity<1||item.quantity>100)throw new Error('Invalid quantity');
  if(product.currency!==currency)throw new Error('Mixed-currency checkout is not supported');
  const amountMinor=product.priceMinor*item.quantity;
  if(!Number.isSafeInteger(amountMinor))throw new Error('Amount overflow');
  return {sku:product.sku,titleFa:product.titleFa??'',titleEn:product.titleEn??'',quantity:item.quantity,unitPriceMinor:product.priceMinor,amountMinor};
 });
 const totalMinor=lines.reduce((sum,line)=>sum+line.amountMinor,0);
 if(!Number.isSafeInteger(totalMinor))throw new Error('Amount overflow');
 return {email,lines,currency,subtotalMinor:totalMinor,totalMinor,taxMinor:0,taxStatus:'not-calculated',quoteOnly:true,paymentInitiated:false,invoiceIssued:false,networkCalled:false,productionTouched:false};
}
