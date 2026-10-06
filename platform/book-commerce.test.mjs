import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateBookCatalogue,priceBookCart,planBookFulfilment} from './book-commerce.mjs';

const catalogue=JSON.parse(fs.readFileSync(new URL('./book-catalog.json',import.meta.url),'utf8'));
assert.equal(validateBookCatalogue(catalogue).valid,true);
assert.equal(catalogue.books.filter(x=>x.commerce.sellable).length,0);
assert.throws(()=>priceBookCart({items:[{book_id:'roshanaei'}],catalogue,user_id:'u1'}));

const live=structuredClone(catalogue);
live.books[0].commerce={sellable:true,price:2500000,currency:'IRR',inventory_state:'IN_STOCK',formats_confirmed:['PHYSICAL_BOOK']};
const order=priceBookCart({items:[{book_id:'roshanaei',quantity:2}],catalogue:live,user_id:'u1'});
assert.equal(order.total_minor,5000000);
assert.equal(order.client_totals_ignored,true);
assert.equal(order.payment_success_client_authoritative,false);
assert.equal(planBookFulfilment({order:{id:'o1',status:'PAID'},shipping_address_id:'a1'}).shipment_status,'PENDING');

console.log('Book commerce contract passed');
