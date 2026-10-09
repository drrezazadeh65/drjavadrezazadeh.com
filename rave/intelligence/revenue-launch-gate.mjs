/** Commercial launch gate for the 27-service business; offline only. */
import {auditServiceCatalog} from './service-catalog-readiness.mjs';
import {auditServiceJourney} from './service-seo-checkout-journey.mjs';
import {validateCommerceCatalog} from './commerce-catalog-quality.mjs';
export function assessRevenueLaunch({services=[],products=[]}={}){
 const catalog=auditServiceCatalog(services,{expectedCount:27});
 const journey=auditServiceJourney(services);
 const commerce=validateCommerceCatalog(products);
 const sku=new Set(products.map(p=>p?.sku).filter(Boolean));
 const issues=[...catalog.issues.map(i=>({...i,source:'catalog'})),...journey.findings.map(i=>({...i,source:'journey'})),...commerce.issues.map(i=>({...i,source:'commerce'}))];
 for(const s of services){
  if(!s?.checkout?.productId||!sku.has(s.checkout.productId))issues.push({id:s?.id??null,source:'commerce',code:'missing-linked-product'});
  const p=products.find(p=>p?.sku===s?.checkout?.productId);
  if(p&&(p.priceMinor!==s.priceMinor||p.currency!==s.currency))issues.push({id:s?.id??null,source:'commerce',code:'service-product-price-mismatch'});
 }
 return {readyForPayments:false,requiresGatewayVerification:true,requiresInvoiceDeliveryTest:true,requiresEmailVerificationTest:true,catalog,journal:journey,commerce,issues,blockingCount:issues.length,networkCalled:false,productionTouched:false};
}
