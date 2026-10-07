import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateBookCatalogue,priceBookCart,planBookFulfilment} from './book-commerce.mjs';

const catalogue=JSON.parse(fs.readFileSync(new URL('./book-catalog.json',import.meta.url),'utf8'));
assert.equal(validateBookCatalogue(catalogue).valid,true);

const sellable=catalogue.books.filter(x=>x.commerce?.sellable===true);
assert.equal(sellable.length,3);
for(const book of sellable){
 const c=book.commerce;
 assert.equal(Number.isInteger(c.price)&&c.price>0,true);
 assert.equal(c.currency,'IRT');
 assert.equal(c.inventory_state,'IN_STOCK');
 assert.equal(Array.isArray(c.formats_confirmed)&&c.formats_confirmed.includes('PRINT'),true);
}

const order=priceBookCart({items:[{book_id:'roshanaei',quantity:2}],catalogue,user_id:'u1'});
assert.equal(order.total_minor,4000000);
assert.equal(order.currency,'IRT');
assert.equal(order.client_totals_ignored,true);
assert.equal(order.payment_success_client_authoritative,false);
assert.equal(planBookFulfilment({order:{id:'o1',status:'PAID'},shipping_address_id:'a1'}).shipment_status,'PENDING');

console.log('Book commerce contract passed');
