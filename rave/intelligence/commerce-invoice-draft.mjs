/** Offline invoice document, issued only from a paid order; no email or PDF side effects. */
const nonempty=s=>typeof s==='string'&&s.trim().length>0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function preparePaidOrderInvoice(order,{invoiceNumber,issuedAt,sellerNameFa,sellerNameEn}={}){
 if(!order||order.status!=='paid'||!nonempty(order.providerReference)||!nonempty(order.verifiedAt)||!nonempty(order.orderId)||!nonempty(order.email)||!Array.isArray(order.lines)||!order.lines.length||!Number.isSafeInteger(order.amountMinor)||order.amountMinor<0)throw new Error('A verified paid order is required');
 if(![invoiceNumber,issuedAt,sellerNameFa,sellerNameEn].every(nonempty))throw new Error('Invoice identity, date and bilingual seller details required');
 const lines=order.lines.map(l=>({...l}));
 if(lines.some(l=>!nonempty(l.sku)||!Number.isSafeInteger(l.quantity)||l.quantity<1||!Number.isSafeInteger(l.unitPriceMinor)||l.unitPriceMinor<0||!Number.isSafeInteger(l.amountMinor)||l.amountMinor!==l.unitPriceMinor*l.quantity))throw new Error('Invalid order lines');
 const total=lines.reduce((n,l)=>n+l.amountMinor,0);
 if(!Number.isSafeInteger(total)||total!==order.amountMinor)throw new Error('Invoice amount must match verified order');
 return {invoiceNumber,issuedAt,orderId:order.orderId,buyerEmail:order.email,sellerNameFa,sellerNameEn,lines,currency:order.currency,totalMinor:total,paymentReference:order.providerReference,paymentVerifiedAt:order.verifiedAt,taxStatus:'not-calculated',documentType:'payment-receipt-draft',officialTaxInvoice:false,emailSent:false,productionTouched:false};
}
export function renderInvoiceHtml(invoice){
 if(!invoice||invoice.documentType!=='payment-receipt-draft'||!Array.isArray(invoice.lines))throw new TypeError('Invalid invoice draft');
 const rows=invoice.lines.map(l=>'<tr><td>'+esc(l.titleFa||l.titleEn||l.sku)+'</td><td>'+esc(l.quantity)+'</td><td>'+esc(l.unitPriceMinor)+'</td><td>'+esc(l.amountMinor)+'</td></tr>').join('');
 return '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>رسید پرداخت '+esc(invoice.invoiceNumber)+'</title><style>body{font-family:system-ui,sans-serif;max-width:850px;margin:40px auto;padding:24px;color:#172033}header{border-bottom:2px solid #172033;padding-bottom:20px}table{border-collapse:collapse;width:100%;margin:24px 0}td,th{border-bottom:1px solid #ddd;padding:12px;text-align:right}@media print{body{margin:0;max-width:none}.no-print{display:none}}</style></head><body><header><h1>'+esc(invoice.sellerNameFa)+'</h1><p lang="en">'+esc(invoice.sellerNameEn)+'</p><h2>رسید پرداخت — پیش‌نویس غیرمالیاتی</h2></header><p>شماره: '+esc(invoice.invoiceNumber)+'</p><p>تاریخ: '+esc(invoice.issuedAt)+'</p><p>ایمیل خریدار: '+esc(invoice.buyerEmail)+'</p><p>سفارش: '+esc(invoice.orderId)+'</p><table><thead><tr><th>شرح</th><th>تعداد</th><th>مبلغ واحد</th><th>جمع</th></tr></thead><tbody>'+rows+'</tbody></table><strong>مبلغ پرداخت: '+esc(invoice.totalMinor)+' '+esc(invoice.currency)+'</strong><p>شناسه تراکنش: '+esc(invoice.paymentReference)+'</p><p>وضعیت مالیات: محاسبه نشده. این سند فاکتور رسمی مالیاتی نیست.</p></body></html>';
}
