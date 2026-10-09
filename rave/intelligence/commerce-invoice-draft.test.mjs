import test from 'node:test';
import assert from 'node:assert/strict';
import {preparePaidOrderInvoice,renderInvoiceHtml} from './commerce-invoice-draft.mjs';
const paid={orderId:'o-1',email:'buyer@example.com',status:'paid',providerReference:'txn-1',verifiedAt:'2026-10-09T10:00:00Z',currency:'IRR',amountMinor:1000,lines:[{sku:'s1',titleFa:'خدمت',quantity:1,unitPriceMinor:1000,amountMinor:1000}]};
const metadata={invoiceNumber:'INV-1',issuedAt:'2026-10-09',sellerNameFa:'مرکز علمی',sellerNameEn:'Academic Centre'};
test('prepares print-ready receipt draft only for paid order',()=>{
 const invoice=preparePaidOrderInvoice(paid,metadata);
 assert.equal(invoice.totalMinor,1000);
 assert.equal(invoice.officialTaxInvoice,false);
 assert.equal(invoice.emailSent,false);
 assert.match(renderInvoiceHtml(invoice),/print/);
});
test('rejects unpaid and mismatched orders',()=>{
 assert.throws(()=>preparePaidOrderInvoice({...paid,status:'pending-payment'},metadata));
 assert.throws(()=>preparePaidOrderInvoice({...paid,amountMinor:2000},metadata));
});
test('escapes untrusted invoice text before HTML rendering',()=>{
 const invoice=preparePaidOrderInvoice({...paid,lines:[{...paid.lines[0],titleFa:'<script>alert(1)</script>'}]},metadata);
 const html=renderInvoiceHtml(invoice);
 assert.ok(!html.includes('<script>'));
 assert.ok(html.includes('&lt;script&gt;'));
});
