/** Offline catalog quality gates for standalone commerce engine. */
export function validateCommerceCatalog(products=[]){
 if(!Array.isArray(products))throw new TypeError('Expected catalog array');
 const seen=new Set(),issues=[];
 for(const product of products){
  if(!product||typeof product.sku!=='string'||!product.sku.trim()||seen.has(product.sku)){issues.push({sku:product?.sku??null,code:'duplicate-or-missing-sku'});continue}
  seen.add(product.sku);
  if(typeof product.titleFa!=='string'||!product.titleFa.trim())issues.push({sku:product.sku,code:'missing-fa-title'});
  if(typeof product.titleEn!=='string'||!product.titleEn.trim())issues.push({sku:product.sku,code:'missing-en-title'});
  if(!Number.isSafeInteger(product.priceMinor)||product.priceMinor<0)issues.push({sku:product.sku,code:'invalid-price'});
  if(typeof product.currency!=='string'||!['IRR','USD'].includes(product.currency))issues.push({sku:product.sku,code:'invalid-currency'});
 }
 return {valid:issues.length===0,productCount:products.length,issues,checkoutEnabled:false,productionTouched:false};
}
